import { useState } from 'react';
import axios from 'axios';

// Create axios instance with base URL
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
});

function App() {
  const [response, setResponse] = useState("");
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [insight, setInsight] = useState(null);
  const [isGeneratingInsight, setIsGeneratingInsight] = useState(false);

  const handlePing = async () => {
    try {
      const res = await api.get("/api/ping");
      setResponse(res.data.message);
    } catch (error) {
      console.error("API Error:", error);
      setResponse("Error: " + error.message);
    }
  };

  const generateInsight = async (results) => {
    if (!results) return;
    
    setIsGeneratingInsight(true);
    setError(null);
    
    try {
      const response = await api.post("/api/insight", {
        male: results.male,
        female: results.female,
        bias_score: results.bias_score,
        bias_label: results.bias_label,
        male_percent: results.male_percent,
        female_percent: results.female_percent
      });
      
      setInsight(response.data.insight || "No insight returned.");
    } catch (error) {
      console.error("Insight Error:", error);
      setError(error.response?.data?.error || "Failed to generate insight");
    } finally {
      setIsGeneratingInsight(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);
    setResults(null);
    setInsight(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await api.post("/api/upload", formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setResults(response.data);
      // Automatically generate insight after successful upload
      generateInsight(response.data);
    } catch (error) {
      console.error("Upload Error:", error);
      setError(error.response?.data?.error || "Failed to upload file");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">EqualCare</h1>
      
      {/* Ping Test Section */}
      <div className="mb-8 p-4 border rounded">
        <button
          className="bg-blue-500 text-white px-4 py-2 rounded"
          onClick={handlePing}
        >
          Ping API
        </button>
        {response && <p className="mt-4 text-green-600">Response: {response}</p>}
      </div>

      {/* File Upload Section */}
      <div className="mb-8 p-4 border rounded">
        <h2 className="text-xl font-semibold mb-4">Upload CSV File</h2>
        <input
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          className="block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-full file:border-0
            file:text-sm file:font-semibold
            file:bg-blue-50 file:text-blue-700
            hover:file:bg-blue-100"
        />
        
        {isLoading && (
          <div className="mt-4 text-blue-600">Analyzing file...</div>
        )}
        
        {error && (
          <div className="mt-4 text-red-600">Error: {error}</div>
        )}
        
        {results && (
          <div className="mt-4">
            <h3 className="text-lg font-semibold mb-2">Analysis Results</h3>
            
            {/* Column Info */}
            <div className="mb-4 p-4 bg-blue-50 rounded border-l-4 border-blue-400">
              <p className="text-sm text-blue-700">
                Using column: <span className="font-mono">{results.used_column}</span>
              </p>
              {/* Debug Info */}
              <div className="mt-2 text-xs text-blue-600">
                <p>Raw values found: {results.raw_values.join(", ")}</p>
                <p className="mt-1">Normalized values: {results.normalized_values.join(", ")}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded">
                <p className="font-semibold">Male</p>
                <p className="text-2xl">{results.male}</p>
                <p className="text-sm text-gray-600">{results.male_percent}%</p>
              </div>
              <div className="p-4 bg-gray-50 rounded">
                <p className="font-semibold">Female</p>
                <p className="text-2xl">{results.female}</p>
                <p className="text-sm text-gray-600">{results.female_percent}%</p>
              </div>
            </div>
            <div className="mt-4 p-4 bg-gray-50 rounded">
              <p className="font-semibold">Total</p>
              <p className="text-2xl">{results.total}</p>
            </div>
            
            {/* Bias Rating */}
            <div className="mt-4 p-4 bg-yellow-50 rounded border-l-4 border-yellow-400">
              <p className="font-semibold text-yellow-700">Bias Rating</p>
              <p className="text-lg">{results.bias_label}</p>
              <p className="text-sm text-gray-600">Bias Score: {results.bias_score}</p>
            </div>

            {/* AI Insight Section */}
            <div className="mt-6">
              {isGeneratingInsight && (
                <div className="text-blue-500 animate-pulse">Generating AI insight...</div>
              )}
              
              {insight && (
                <div className="p-4 border-l-4 border-purple-500 bg-purple-50 rounded">
                  <h3 className="text-lg font-bold text-purple-800 mb-2">AI Insight</h3>
                  <p className="text-gray-800 whitespace-pre-line">{insight}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
