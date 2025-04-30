import { useState, useRef } from 'react';
import axios from 'axios';

// Create axios instance with base URL
const api = axios.create({
  baseURL: '/',  // Use relative paths for both local and production
});

function App() {
  const [response, setResponse] = useState("");
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [insight, setInsight] = useState(null);
  const [isGeneratingInsight, setIsGeneratingInsight] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [exportFormat, setExportFormat] = useState('json');

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

    // Check file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError("Please upload a CSV file");
      return;
    }

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

  // Simple visualization component
  const GenderBarChart = ({ male, female, malePercent, femalePercent }) => {
    return (
      <div className="mt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Distribution Visualization</h4>
        <div className="h-8 w-full bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-blue-500 float-left flex items-center justify-center text-white text-xs font-medium px-2"
            style={{ width: `${malePercent}%`, minWidth: '40px' }}
          >
            {malePercent}%
          </div>
          <div 
            className="h-full bg-pink-500 float-left flex items-center justify-center text-white text-xs font-medium px-2"
            style={{ width: `${femalePercent}%`, minWidth: '40px' }}
          >
            {femalePercent}%
          </div>
        </div>
        <div className="flex justify-between text-xs text-gray-600 mt-1">
          <div>Male ({male})</div>
          <div>Female ({female})</div>
        </div>
      </div>
    );
  };

  // Age Distribution Component
  const AgeDistributionCard = ({ ageAnalysis }) => {
    if (!ageAnalysis) return null;
    
    // Get age groups and sort them for display
    const ageGroups = Object.keys(ageAnalysis.age_groups).map(group => ({
      label: group,
      count: ageAnalysis.age_groups[group].count,
      percent: ageAnalysis.age_groups[group].percent
    }));
    
    return (
      <div className="bg-white p-5 rounded-lg border border-gray-200 mt-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">Age Distribution</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
          <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-200">
            <p className="text-xs text-indigo-600 font-medium">Mean Age</p>
            <p className="text-xl font-bold text-gray-800">{ageAnalysis.mean_age}</p>
          </div>
          
          <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-200">
            <p className="text-xs text-indigo-600 font-medium">Median Age</p>
            <p className="text-xl font-bold text-gray-800">{ageAnalysis.median_age}</p>
          </div>
          
          <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-200">
            <p className="text-xs text-indigo-600 font-medium">Age Range</p>
            <p className="text-xl font-bold text-gray-800">{ageAnalysis.min_age}-{ageAnalysis.max_age}</p>
          </div>
        </div>
        
        <h4 className="text-sm font-medium text-gray-700 mt-4 mb-2">Age Group Distribution</h4>
        
        {/* Age group bars */}
        <div className="space-y-3">
          {ageGroups.map((group, index) => (
            <div key={index} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-medium">{group.label}</span>
                <span>{group.count} ({group.percent}%)</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-indigo-600 h-2.5 rounded-full" 
                  style={{ width: `${group.percent}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const exportResults = () => {
    if (!results) return;
    
    if (exportFormat === 'json') {
      // Export as JSON
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(results, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", "equalcare_analysis.json");
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
    }
    else if (exportFormat === 'csv') {
      // Simple CSV export
      const rows = [];
      
      // Header
      rows.push(['Analysis Type', 'Metric', 'Value']);
      
      // Gender data
      rows.push(['Gender', 'Male Count', results.male]);
      rows.push(['Gender', 'Female Count', results.female]);
      rows.push(['Gender', 'Male Percent', results.male_percent]);
      rows.push(['Gender', 'Female Percent', results.female_percent]);
      rows.push(['Gender', 'Bias Score', results.bias_score]);
      rows.push(['Gender', 'Bias Label', results.bias_label]);
      
      // Age data if available
      if (results.age_analysis) {
        rows.push(['Age', 'Mean Age', results.age_analysis.mean_age]);
        rows.push(['Age', 'Median Age', results.age_analysis.median_age]);
        rows.push(['Age', 'Min Age', results.age_analysis.min_age]);
        rows.push(['Age', 'Max Age', results.age_analysis.max_age]);
        
        // Age groups
        Object.entries(results.age_analysis.age_groups).forEach(([group, data]) => {
          rows.push(['Age Group', group, data.count]);
          rows.push(['Age Group Percent', group, data.percent]);
        });
      }
      
      // Convert to CSV
      const csvContent = rows.map(row => row.join(',')).join('\n');
      const dataStr = "data:text/csv;charset=utf-8," + encodeURIComponent(csvContent);
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", "equalcare_analysis.csv");
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-blue-800">EqualCare</h1>
        <p className="text-gray-600 mt-2">Gender Bias Analysis for Healthcare Research</p>
      </div>
      
      {/* Instructions Section */}
      <div className="mb-8 p-5 border rounded-lg bg-white shadow-sm">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800">About EqualCare</h2>
          <button 
            onClick={() => setShowInstructions(!showInstructions)}
            className="text-blue-500 hover:text-blue-700 text-sm font-medium"
          >
            {showInstructions ? 'Hide Instructions' : 'Show Instructions'}
          </button>
        </div>
        
        {showInstructions && (
          <div className="mt-4 text-sm text-gray-700 space-y-2">
            <p>EqualCare helps analyze gender representation in healthcare datasets:</p>
            <ol className="list-decimal pl-5 space-y-1">
              <li>Upload a CSV file containing your dataset</li>
              <li>The system will automatically identify gender-related columns</li>
              <li>View the analysis of gender distribution and bias assessment</li>
              <li>Read AI-generated insights about potential implications</li>
            </ol>
            <p className="font-medium mt-2">Supported formats:</p>
            <ul className="list-disc pl-5">
              <li>CSV files with columns named: gender, sex, gndr, g, or s</li>
              <li>Values can be: male/female, m/f, 1/0, or similar variations</li>
            </ul>
          </div>
        )}
      </div>

      {/* File Upload Section */}
      <div className="mb-8 p-5 border rounded-lg bg-white shadow-sm">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">Upload Dataset</h2>
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
          <div className="mt-4 flex items-center text-blue-600">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Analyzing file...
          </div>
        )}
        
        {error && (
          <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-md border border-red-200">
            Error: {error}
          </div>
        )}
        
        {results && (
          <div className="mt-6 space-y-6">
            {/* Column Info */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-700 font-medium">
                Using column: <span className="font-mono bg-blue-100 px-1 py-0.5 rounded">{results.used_column}</span>
              </p>
              {/* Debug Info */}
              <div className="mt-2 text-xs text-blue-600">
                <p>Raw values found: {results.raw_values.join(", ")}</p>
                <p className="mt-1">Normalized values: {results.normalized_values.join(", ")}</p>
              </div>
            </div>
            
            {/* Gender Distribution */}
            <div className="bg-white p-5 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold mb-4 text-gray-800">Gender Distribution</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Male Card */}
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="font-semibold text-blue-800">Male</p>
                  <p className="text-3xl font-bold text-gray-800 mt-1">{results.male}</p>
                  <p className="text-sm text-blue-600">{results.male_percent}% of total</p>
                </div>
                
                {/* Female Card */}
                <div className="p-4 bg-pink-50 rounded-lg border border-pink-200">
                  <p className="font-semibold text-pink-800">Female</p>
                  <p className="text-3xl font-bold text-gray-800 mt-1">{results.female}</p>
                  <p className="text-sm text-pink-600">{results.female_percent}% of total</p>
                </div>
                
                {/* Total Card */}
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="font-semibold text-gray-800">Total</p>
                  <p className="text-3xl font-bold text-gray-800 mt-1">{results.total}</p>
                  <p className="text-sm text-gray-600">participants</p>
                </div>
              </div>
              
              {/* Bar Chart */}
              <GenderBarChart 
                male={results.male}
                female={results.female}
                malePercent={results.male_percent}
                femalePercent={results.female_percent}
              />
            </div>
            
            {/* Bias Rating */}
            <div className="bg-white p-5 rounded-lg border border-gray-200">
              <div className="flex items-center mb-3">
                <h3 className="text-lg font-semibold text-gray-800">Bias Assessment</h3>
                <span className={`ml-2 text-sm px-3 py-1 rounded-full font-medium ${
                  results.bias_label === 'Balanced' ? 'bg-green-100 text-green-800' :
                  results.bias_label === 'Mildly Imbalanced' ? 'bg-yellow-100 text-yellow-800' :
                  results.bias_label === 'Significantly Imbalanced' ? 'bg-orange-100 text-orange-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {results.bias_label}
                </span>
              </div>
              
              <div className="mt-2">
                <div className="flex items-center mb-2">
                  <div className="w-32 text-sm font-medium text-gray-700">Bias Score:</div>
                  <div className="font-bold">{results.bias_score}</div>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  {results.bias_label === 'Balanced' ? 
                    'This dataset has a good balance between genders, which should provide representative results.' :
                    results.bias_label === 'Mildly Imbalanced' ?
                    'This dataset shows some gender imbalance. Consider this when interpreting results.' :
                    results.bias_label === 'Significantly Imbalanced' ?
                    'This dataset has substantial gender imbalance that may affect the reliability of findings.' :
                    'This dataset is highly skewed by gender, which could significantly impact the validity of results.'
                  }
                </p>
              </div>
            </div>

            {/* AI Insight Section */}
            <div className="mt-6">
              {isGeneratingInsight && (
                <div className="flex items-center text-blue-600 bg-blue-50 p-4 rounded-lg">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating AI insight...
                </div>
              )}
              
              {insight && (
                <div className="p-5 bg-white rounded-lg border border-purple-200 shadow-sm">
                  <h3 className="text-lg font-bold text-purple-800 mb-3">AI Analysis & Recommendations</h3>
                  <div className="prose prose-sm max-w-none text-gray-700">
                    <p className="whitespace-pre-line">{insight}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Add Age Distribution Card after the gender bias assessment */}
            {results.age_analysis && (
              <AgeDistributionCard ageAnalysis={results.age_analysis} />
            )}

            {/* Add Export Section after all analysis cards */}
            <div className="bg-white p-5 rounded-lg border border-gray-200 mt-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-800">Export Results</h3>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <label className="text-sm text-gray-700">Format:</label>
                  <select 
                    value={exportFormat} 
                    onChange={(e) => setExportFormat(e.target.value)}
                    className="border border-gray-300 rounded px-2 py-1 text-sm"
                  >
                    <option value="json">JSON</option>
                    <option value="csv">CSV</option>
                  </select>
                </div>
                <button
                  onClick={exportResults}
                  className="bg-green-500 hover:bg-green-600 text-white text-sm px-4 py-2 rounded"
                >
                  Export Analysis
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* API Status Section - Moved to bottom and styled more subtly */}
      <div className="p-4 border rounded-lg bg-gray-50">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-700">API Status</h3>
          <button
            className="bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs px-3 py-1 rounded"
            onClick={handlePing}
          >
            Check API
          </button>
        </div>
        {response && <p className="mt-2 text-sm text-green-600">Response: {response}</p>}
      </div>
    </div>
  );
}

export default App;
