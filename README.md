# NumberNibbles - Math Problem Generator

NumberNibbles is an AI-powered application that takes a screenshot of a math problem and generates similar practice problems with an answer key.

## Setup & Running Independently

### Option 1: Deploy to the Web (Vercel) - Recommended
This is the easiest way to share your app.

1. Push this code to a GitHub repository.
2. Go to [Vercel](https://vercel.com) and sign up/login.
3. Click "Add New Project" and import your GitHub repository.
4. **Important:** In the "Environment Variables" section:
   - **Name:** `VITE_API_KEY`
   - **Value:** Your Google Gemini API Key (from AI Studio).
5. Click "Deploy".

### Option 2: Run Locally (On your Computer)

1. Install [Node.js](https://nodejs.org/).
2. Clone this repository or download the files.
3. Open a terminal/command prompt in the project folder.
4. Install dependencies:
   ```bash
   npm install
   ```
5. Create a file named `.env` in the root folder and add your API key:
   ```
   VITE_API_KEY=AIzaSy...YourKeyHere...
   ```
6. Start the app:
   ```bash
   npm run dev
   ```
7. Open the link shown in the terminal (usually http://localhost:5173).

## Technologies Used
- React + TypeScript
- Vite
- Google Gemini API (@google/genai)
- TailwindCSS
- jsPDF & html2canvas (for PDF export)
