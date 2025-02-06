import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const ModelOption = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [filename, setFilename] = useState("No file selected");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Extract id from location state or localStorage
  const fileId = location.state?.id || localStorage.getItem("uploadedFileId");

  // Fetch filename by id
  useEffect(() => {
    if (fileId) {
      fetchFilenameById(fileId);
    } else {
      setLoading(false); // If no id, stop loading
    }
  }, [fileId]);

  const fetchFilenameById = async (id) => {
    try {
      setLoading(true);
      const response = await fetch(
        `http://127.0.0.1:8000/storage/filename/${id}/`
      );
      const result = await response.json();

      if (result.filename) {
        setFilename(result.filename); // Set filename from the backend
        localStorage.setItem("uploadedFilename", result.filename);
        localStorage.setItem("uploadedFileId", id); // Store id in localStorage
      } else {
        setError("Error: No filename found.");
      }
    } catch (error) {
      setError(`Error fetching filename: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen flex flex-col items-center">
      <p>Selected File: {loading ? "Loading..." : filename}</p>
      {error && <p className="text-red-500">{error}</p>}
      <h1 className="text-2xl font-bold mb-6">Model Options</h1>

      <button
        onClick={() => navigate("/SolarForecastOptions")}
        className="mb-4 p-4 bg-blue-500 text-white rounded-md hover:bg-blue-600">
        ESN
      </button>

      <button
        onClick={() => navigate("/WindForecastOptions")}
        className="mb-4 p-4 bg-green-500 text-white rounded-md hover:bg-green-600">
        DHR
      </button>

      <button
        onClick={() => navigate("/WindForecastOptions")}
        className="mb-4 p-4 bg-green-500 text-white rounded-md hover:bg-green-600">
        ESN + DHR
      </button>

      <button
        onClick={() => navigate("/WindForecastOptions")}
        className="mb-4 p-4 bg-green-500 text-white rounded-md hover:bg-green-600">
        Sarima + LSTM
      </button>

      <button
        onClick={() => navigate("/WindForecastOptions")}
        className="mb-4 p-4 bg-green-500 text-white rounded-md hover:bg-green-600">
        Sarima + GRU
      </button>

      <button
        onClick={() => navigate("/WindForecastOptions")}
        className="mb-4 p-4 bg-green-500 text-white rounded-md hover:bg-green-600">
        Sarima + RNN
      </button>

      <button
        onClick={() => navigate("/WindForecastOptions")}
        className="mb-4 p-4 bg-green-500 text-white rounded-md hover:bg-green-600">
        Sarima + TRANSFORMER
      </button>
    </div>
  );
};

export default ModelOption;
