import React from "react";
import { useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
const ModelOption = () => {
  const location = useLocation();
  const [filename, setFilename] = useState(
    location.state?.filename ||
      localStorage.getItem("uploadedFilename") ||
      "No file selected"
  );

  return (
    <div className="p-6 bg-gray-100 min-h-screen flex flex-col items-center">
      <p>Selected File: {filename}</p>
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
