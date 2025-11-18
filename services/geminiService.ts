import { GoogleGenAI, Type } from "@google/genai";
import { ApiResponse } from '../types';

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

export const generateProblemsFromImage = async (
  imageFile: File,
  numberOfProblems: number
): Promise<ApiResponse> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const imagePart = await fileToGenerativePart(imageFile);
  const textPart = {
    text: `You are an expert math instructor. Analyze the math problem in the image. Your task is to generate ${numberOfProblems} new, similar math problems. These problems should follow the same mathematical concepts but be creative and engaging. Ensure maximum variation in each problem by using different names, themes, numbers, quantities, years, and months. For each problem you generate, provide a clear problem statement and the corresponding final answer.`,
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
          },
          required: ["problem", "answer"],
        },
      },
    },
    required: ["problems"],
  };

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
    const parsedResponse: ApiResponse = JSON.parse(jsonText);
    
    if (!parsedResponse.problems || !Array.isArray(parsedResponse.problems)) {
        throw new Error("Invalid response format from API. Expected a 'problems' array.");
    }
    
    return parsedResponse;

  } catch (error) {
    console.error("Error generating problems:", error);
    if (error instanceof Error) {
        throw new Error(`Failed to generate problems: ${error.message}`);
    }
    throw new Error("An unknown error occurred while generating problems.");
  }
};