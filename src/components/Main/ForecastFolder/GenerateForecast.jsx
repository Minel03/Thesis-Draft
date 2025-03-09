import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const GenerateForecast = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { filename, data, granularity, steps, modelType, hybridModel } =
    location.state || {};

  // Determine granularity from filename
  const getGranularityFromFilename = (filename) => {
    if (!filename) return "Hourly";
    if (filename.startsWith("hourly_")) return "Hourly";
    if (filename.startsWith("daily_")) return "Daily";
    if (filename.startsWith("weekly_")) return "Weekly";
    return "Hourly"; // Default fallback
  };

  const [forecastData, setForecastData] = useState([]);
  const [formData, setFormData] = useState({
    filename: filename || null,
    granularity: getGranularityFromFilename(filename),
    steps: steps || "24 (1-day Horizon)",
    modelType: modelType || "Single", // Default to Single
    singleModel: hybridModel || "DHR", // For Single: DHR or ESN
    hybridModel: hybridModel || "DHR-ESN", // For Hybrid: DHR-ESN or SARIMA-LSTM
  });

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, filename: file.name });
      // Note: You may need to upload the file to your backend and fetch data here if required
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleGenerate = (e) => {
    e.preventDefault();
    if (!data) return;

    // Simulate generating forecast data (replace with your logic)
    setForecastData(data); // Placeholder: Replace with actual forecast generation
    // For demonstration, navigate to a result page
    navigate("/forecast-result", {
      state: { ...formData, forecastData: data },
    });
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen flex justify-center items-center">
      <form
        onSubmit={handleGenerate}
        className="bg-white p-6 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Generate</h1>

        {/* File Upload */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            File Upload
          </label>
          {formData.filename ? (
            <p className="text-sm text-gray-600">
              Selected File: {formData.filename}
            </p>
          ) : (
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          )}
        </div>

        {/* Granularity - Read Only */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Granularity
          </label>
          <input
            type="text"
            value={formData.granularity}
            disabled
            className="block w-full p-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
          />
        </div>

        {/* Steps */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Steps
          </label>
          <select
            name="steps"
            value={formData.steps}
            onChange={handleChange}
            className="block w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="24 (1-day Horizon)">24 (1-day Horizon)</option>
            <option value="48 (2-day Horizon)">48 (2-day Horizon)</option>
            <option value="72 (3-day Horizon)">72 (3-day Horizon)</option>
          </select>
        </div>

        {/* Model Type (Single/Hybrid) */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Model Type
          </label>
          <div className="flex gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                name="modelType"
                value="Single"
                checked={formData.modelType === "Single"}
                onChange={handleChange}
                className="mr-2"
              />
              Single
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="modelType"
                value="Hybrid"
                checked={formData.modelType === "Hybrid"}
                onChange={handleChange}
                className="mr-2"
              />
              Hybrid
            </label>
          </div>
        </div>

        {/* Single Model Options (DHR/ESN) */}
        {formData.modelType === "Single" && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Single
            </label>
            <select
              name="singleModel"
              value={formData.singleModel}
              onChange={handleChange}
              className="block w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="DHR">DHR</option>
              <option value="ESN">ESN</option>
            </select>
          </div>
        )}

        {/* Hybrid Model Options (DHR-ESN/SARIMA-LSTM) */}
        {formData.modelType === "Hybrid" && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hybrid
            </label>
            <select
              name="hybridModel"
              value={formData.hybridModel}
              onChange={handleChange}
              className="block w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="DHR-ESN">DHR-ESN</option>
              <option value="SARIMA-LSTM">SARIMA-LSTM</option>
            </select>
          </div>
        )}

        {/* Buttons */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors">
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors">
            Submit
          </button>
        </div>
      </form>
    </div>
  );
};

export default GenerateForecast;
