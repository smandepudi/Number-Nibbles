import { GoogleGenAI, Type } from "@google/genai";
import { ApiResponse, GeneratedProblem } from '../types';

interface IntermediateProblem {
  problem: string;
  answer: string;
  imagePrompt?: string;
}

interface IntermediateApiResponse {
  problems: IntermediateProblem[];
}

const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result.split(',')[1]);
      }
    };
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
};

const generateImageFromPrompt = async (prompt: string, ai: GoogleGenAI): Promise<string> => {
  try {
      const response = await ai.models.generateImages({
          model: 'imagen-4.0-generate-001',
          prompt: `A simple, clear, black and white line drawing for a math problem. Style: textbook diagram. Content: ${prompt}`,
          config: {
            numberOfImages: 1,
            outputMimeType: 'image/png',
            aspectRatio: '1:1',
          },
      });

      if (response.generatedImages && response.generatedImages.length > 0) {
          return response.generatedImages[0].image.imageBytes; // This is a base64 string
      }
      console.warn("Image generation returned no images for prompt:", prompt);
      return "";
  } catch (error) {
      console.error(`Error generating image for prompt "${prompt}":`, error);
      return ""; 
  }
};

export const generateProblemsFromImage = async (
  imageFile: File,
  numberOfProblems: number
): Promise<ApiResponse> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Step 1: Generate problem text and prompts for images
  const imagePart = await fileToGenerativePart(imageFile);
  const textPart = {
    text: `You are an expert math instructor. Analyze the math problem in the image.
First, determine if the image contains a visual component (like a diagram, chart, or picture) that is essential to solving the problem.

If there is no essential visual component, generate ${numberOfProblems} new, similar math problems.

If there IS an essential visual component, generate ${numberOfProblems} new, similar math problems, and for EACH problem, also provide a detailed, descriptive prompt that an AI image generation model could use to create a new, relevant image for that specific problem. The prompt should describe a simple, clear diagram or illustration.

These problems should follow the same mathematical concepts but be creative and engaging. Ensure maximum variation in each problem by using different names, themes, numbers, quantities, years, and months. For each problem you generate, provide a clear problem statement, the corresponding final answer, and the image generation prompt if applicable.`,
  };

  const schema = {
    type: Type.OBJECT,
    properties: {
      problems: {
        type: Type.ARRAY,
        description: `An array of ${numberOfProblems} math problems.`,
        items: {
          type: Type.OBJECT,
          properties: {
            problem: {
              type: Type.STRING,
              description: "The full text of the generated math problem.",
            },
            answer: {
              type: Type.STRING,
              description: "The final answer to the generated math problem.",
            },
            imagePrompt: {
              type: Type.STRING,
              description: "A descriptive prompt for an AI image generation model. Only include if the original problem had an essential visual component.",
            }
          },
          required: ["problem", "answer"],
        },
      },
    },
    required: ["problems"],
  };

  let parsedResponse: IntermediateApiResponse;
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts: [imagePart, textPart] },
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });

    const jsonText = response.text.trim();
    parsedResponse = JSON.parse(jsonText);
    
    if (!parsedResponse.problems || !Array.isArray(parsedResponse.problems)) {
        throw new Error("Invalid response format from API. Expected a 'problems' array.");
    }
  } catch (error) {
    console.error("Error generating problems:", error);
    if (error instanceof Error) {
        throw new Error(`Failed to generate problems: ${error.message}`);
    }
    throw new Error("An unknown error occurred while generating problems.");
  }

  // Step 2: Generate images for problems that have an image prompt
  const finalProblems: GeneratedProblem[] = await Promise.all(
    parsedResponse.problems.map(async (p) => {
        if (p.imagePrompt && p.imagePrompt.trim() !== '') {
            const imageBase64 = await generateImageFromPrompt(p.imagePrompt, ai);
            return {
                problem: p.problem,
                answer: p.answer,
                image: imageBase64 ? `data:image/png;base64,${imageBase64}` : undefined,
            };
        }
        return {
            problem: p.problem,
            answer: p.answer,
        };
    })
  );

  return { problems: finalProblems };
};
