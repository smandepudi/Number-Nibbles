
import React, { useState, useCallback } from 'react';
import { GeneratedProblem } from './types';
import { generateProblemsFromImage } from './services/geminiService';
import Loader from './components/Loader';
import ProgressBar from './components/ProgressBar';

declare global {
  interface Window {
    jspdf: any;
    html2canvas: any;
  }
}

const App: React.FC = () => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [numProblemsStr, setNumProblemsStr] = useState<string>('5');
  const [generatedProblems, setGeneratedProblems] = useState<GeneratedProblem[]>([]);
  const [history, setHistory] = useState<GeneratedProblem[][]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [downloadStatusText, setDownloadStatusText] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const numProblems = parseInt(numProblemsStr, 10);
  const isNumProblemsInvalid = isNaN(numProblems) || numProblems < 1 || numProblems > 20;

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setPreviewUrl(null);
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const handleSubmit = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    if (!imageFile || isNumProblemsInvalid) {
      setError('Please upload a screenshot and specify a number of problems between 1 and 20.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setGeneratedProblems([]);

    try {
      const result = await generateProblemsFromImage(imageFile, numProblems);
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(result.problems);
      
      setHistory(newHistory);
      const newIndex = newHistory.length - 1;
      setHistoryIndex(newIndex);
      setGeneratedProblems(result.problems);

    } catch (e: unknown) {
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError('An unexpected error occurred.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [imageFile, numProblemsStr, isNumProblemsInvalid, numProblems, history, historyIndex]);

  const handleDownload = async () => {
    if (generatedProblems.length === 0 || isDownloading) return;

    const problemsElement = document.getElementById('problems-container');
    const answersElement = document.getElementById('answers-container');

    if (!problemsElement || !answersElement) {
      setError("Could not find content to download.");
      return;
    }
    
    setIsDownloading(true);
    setDownloadProgress(0);
    setDownloadStatusText('Initializing...');
    setError(null);

    const createPdfCanvas = async (element: HTMLElement) => {
      const clone = element.cloneNode(true) as HTMLElement;
      clone.classList.add('pdf-export');
      clone.style.position = 'absolute';
      clone.style.left = '-9999px';
      clone.style.top = '0px';
      clone.style.width = `${element.offsetWidth}px`;
      
      document.body.appendChild(clone);
      const canvas = await window.html2canvas(clone, { scale: 2 });
      document.body.removeChild(clone);
      return canvas;
    };

    try {
      setDownloadProgress(10);
      setDownloadStatusText('Creating PDF document...');
      await new Promise(resolve => setTimeout(resolve, 50));
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pdfWidth - margin * 2;

      // Page 1: Problems
      setDownloadProgress(25);
      setDownloadStatusText('Processing problems...');
      const problemsCanvas = await createPdfCanvas(problemsElement);
      const problemsImgData = problemsCanvas.toDataURL('image/png');
      const problemsImgProps = pdf.getImageProperties(problemsImgData);
      let problemsHeight = (problemsImgProps.height * contentWidth) / problemsImgProps.width;
      
      if (problemsHeight > pdfHeight - margin * 2) {
          console.warn("Problems content is taller than a single PDF page. It may be scaled down to fit.");
          problemsHeight = pdfHeight - margin * 2;
      }
      
      setDownloadProgress(50);
      setDownloadStatusText('Adding problems to PDF...');
      await new Promise(resolve => setTimeout(resolve, 50));
      pdf.addImage(problemsImgData, 'PNG', margin, margin, contentWidth, problemsHeight, undefined, 'FAST');


      // Page 2: Answers
      pdf.addPage();
      setDownloadProgress(65);
      setDownloadStatusText('Processing answers...');
      const answersCanvas = await createPdfCanvas(answersElement);
      const answersImgData = answersCanvas.toDataURL('image/png');
      const answersImgProps = pdf.getImageProperties(answersImgData);
      let answersHeight = (answersImgProps.height * contentWidth) / answersImgProps.width;

      if (answersHeight > pdfHeight - margin * 2) {
          console.warn("Answers content is taller than a single PDF page. It may be scaled down to fit.");
          answersHeight = pdfHeight - margin * 2;
      }

      setDownloadProgress(80);
      setDownloadStatusText('Adding answers to PDF...');
      await new Promise(resolve => setTimeout(resolve, 50));
      pdf.addImage(answersImgData, 'PNG', margin, margin, contentWidth, answersHeight, undefined, 'FAST');


      setDownloadProgress(100);
      setDownloadStatusText('Finalizing PDF...');
      pdf.save('math-problems.pdf');
      
      setTimeout(() => {
        setIsDownloading(false);
      }, 1000);

    } catch (e) {
      console.error("Failed to generate PDF:", e);
      if (e instanceof Error) {
        setError(`Failed to generate PDF: ${e.message}`);
      } else {
        setError('An unexpected error occurred while generating the PDF.');
      }
      setIsDownloading(false);
    }
  };

  const handleBack = () => {
    setGeneratedProblems([]);
    setError(null);
    setIsDownloading(false);
    setDownloadProgress(0);
    setDownloadStatusText('');
    setHistoryIndex(-1);
  };

  const handleHistoryBack = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setGeneratedProblems(history[newIndex]);
    } else {
      handleBack();
    }
  };

  const handleHistoryForward = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setGeneratedProblems(history[newIndex]);
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return <Loader />;
    }

    if (generatedProblems.length > 0) {
      return (
        <>
          <div className="flex justify-between items-center mb-6">
            <button
              onClick={handleBack}
              className="inline-flex items-center text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-900 rounded-md transition-colors"
              aria-label="Go back to create new problems"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Start Over
            </button>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleHistoryBack}
                disabled={historyIndex < 0}
                className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Previous problem set"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={handleHistoryForward}
                disabled={historyIndex >= history.length - 1}
                className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Next problem set"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
          <section>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div id="problems-container" className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Generated Problems</h2>
                <ul className="space-y-6">
                  {generatedProblems.map((p, index) => (
                    <li key={index} className="p-4 bg-gray-100 dark:bg-slate-800 rounded-lg">
                      <p className="font-semibold text-indigo-600 dark:text-indigo-400 mb-2">Problem {index + 1}</p>
                      <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{p.problem}</p>
                    </li>
                  ))}
                </ul>
              </div>
              <div id="answers-container" className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Answer Key</h2>
                <ul className="space-y-6">
                  {generatedProblems.map((p, index) => (
                    <li key={index} className="p-4 bg-gray-100 dark:bg-slate-800 rounded-lg">
                       <p className="font-semibold text-indigo-600 dark:text-indigo-400 mb-2">Answer {index + 1}</p>
                      <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{p.answer}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="mt-8 text-center">
              <button
                onClick={handleDownload}
                disabled={isDownloading}
                className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-green-400 dark:disabled:bg-green-800 disabled:cursor-not-allowed transition-colors min-w-[240px]"
              >
                {isDownloading ? (
                   <span>Downloading PDF...</span>
                ) : (
                    <>
                        <svg className="-ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                        <span>Download Problems</span>
                    </>
                )}
              </button>
              {isDownloading && (
                <div className="mt-4 max-w-sm mx-auto px-4 text-center">
                  <ProgressBar progress={downloadProgress} />
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    {downloadStatusText} ({Math.round(downloadProgress)}%)
                  </p>
                </div>
              )}
            </div>
          </section>
        </>
      );
    }

    return (
      <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 md:p-8 border border-gray-200 dark:border-gray-700">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="screenshot" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              1. Upload Problem Screenshot
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-md">
              <div className="space-y-1 text-center">
                {previewUrl ? (
                  <div className="relative inline-block">
                    <img src={previewUrl} alt="Problem preview" className="mx-auto h-40 w-auto rounded-md object-contain" />
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute top-0 right-0 -mt-2 -mr-2 bg-red-600 text-white rounded-full p-1 leading-none hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      aria-label="Remove image"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
                <div className="flex justify-center text-sm text-gray-600 dark:text-gray-400">
                  <label htmlFor="file-upload" className="relative cursor-pointer bg-white dark:bg-gray-800 rounded-md font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                    <span>{previewUrl ? 'Change file' : 'Upload a file'}</span>
                    <input id="file-upload" name="file-upload" type="file" className="sr-only" accept="image/*" onChange={handleImageChange} />
                  </label>
                  {!previewUrl && <p className="pl-1">or drag and drop</p>}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">PNG, JPG, GIF up to 10MB</p>
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="num-problems" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              2. Number of Problems to Generate
            </label>
            <input
              type="number"
              id="num-problems"
              value={numProblemsStr}
              onChange={(e) => setNumProblemsStr(e.target.value)}
              min="1"
              max="20"
              className="mt-1 block w-full bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-3"
            />
          </div>
          
          <button
            type="submit"
            disabled={isLoading || !imageFile || isNumProblemsInvalid}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 dark:disabled:bg-indigo-800 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Generating...' : 'Generate Problems'}
          </button>
        </form>
      </div>
    );
  };
  
  const navContainerClasses = [
    "mb-4",
    "flex",
    "justify-end",
    "max-w-2xl mx-auto"
  ].filter(Boolean).join(" ");

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans">
      <main className="container mx-auto px-4 py-8">
        <header className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white">
            Number<span className="text-indigo-600 dark:text-indigo-400"><i>Nibbles</i></span>
          </h1>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Upload a math problem screenshot, and our AI instructor will create similar, engaging problems for you.
          </p>
        </header>

        {history.length > 0 && generatedProblems.length === 0 && (
          <div className={navContainerClasses}>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleHistoryBack}
                disabled={historyIndex <= -1}
                className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Previous problem set"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={handleHistoryForward}
                disabled={historyIndex >= history.length - 1}
                className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Next problem set"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {renderContent()}

        {error && (
            <div className="mt-8 max-w-4xl mx-auto bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 px-4 py-3 rounded-lg relative" role="alert">
                <strong className="font-bold">Error: </strong>
                <span className="block sm:inline">{error}</span>
            </div>
        )}
      </main>
    </div>
  );
};

export default App;
