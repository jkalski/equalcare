import { useState } from 'react';
import axios from 'axios';

// Create axios instance with base URL
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
});

function App() {
  const [response, setResponse] = useState("");

  const handlePing = async () => {
    try {
      const res = await api.get("/api/ping");
      setResponse(res.data.message);
    } catch (error) {
      console.error("API Error:", error);
      setResponse("Error: " + error.message);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">EqualCare</h1>
      <button
        className="bg-blue-500 text-white px-4 py-2 rounded"
        onClick={handlePing}
      >
        Ping API
      </button>
      {response && <p className="mt-4 text-green-600">Response: {response}</p>}
    </div>
  );
}

export default App;
