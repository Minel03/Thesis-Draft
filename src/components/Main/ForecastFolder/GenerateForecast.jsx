import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const GenerateForecast = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fileData, setFileData] = useState(null);

  // Get data type from filename
  const getDataType = (filename) => {
    if (filename?.includes("weekly")) return "weekly";
    if (filename?.includes("daily")) return "daily";
    if (filename?.includes("hourly")) return "hourly";
    return null;
  };

  // Determine granularity from filename
  const getGranularityFromFilename = (filename) => {
    if (!filename) return "Hourly";
    if (filename.includes("hourly")) return "Hourly";
    if (filename.includes("daily")) return "Daily";
    if (filename.includes("weekly")) return "Weekly";
    return "Hourly";
  };

  const [formData, setFormData] = useState({
    filename: location.state?.filename || null,
    granularity: getGranularityFromFilename(location.state?.filename),
    steps: "24 (1-day Horizon)",
    modelType: "Single",
    singleModel: "DHR",
    hybridModel: "DHR-ESN",
  });

  useEffect(() => {
    const fetchFileData = async () => {
      try {
        setLoading(true);
        const filename = location.state?.filename;

        if (!filename) {
          throw new Error("No filename provided");
        }

        // Use the exact filename from location.state
        setFileData({
          filename: filename,
          upload_date: new Date().toISOString(), // Since we don't have the actual upload date
        });

        setFormData((prev) => ({
          ...prev,
          filename: filename,
          granularity: getGranularityFromFilename(filename),
        }));
      } catch (err) {
        console.error("Error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchFileData();
  }, [location.state?.filename]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!fileData) return;

    try {
      // Fetch the actual file content
      const response = await fetch(
        `http://localhost:8000/storage/read/${fileData.filename}`
      );

      if (!response.ok) {
        throw new Error("Failed to read file data");
      }

      const data = await response.json();

      // Navigate to result page with the data
      navigate("/forecast-result", {
        state: { ...formData, forecastData: data },
      });
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-500">Error: {error}</div>;
  }

  return (
    <div className="p-6 bg-gray-100 min-h-screen flex justify-center items-center">
      <form
        onSubmit={handleGenerate}
        className="bg-white p-6 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">
          Generate Forecast
        </h1>

        {/* File Information */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Current File
          </label>
          <div className="p-3 bg-gray-50 rounded-md">
            <p className="text-sm text-gray-600">
              {fileData?.filename || "No file selected"}
            </p>
            {fileData?.upload_date && (
              <p className="text-xs text-gray-500">
                Uploaded: {new Date(fileData.upload_date).toLocaleString()}
              </p>
            )}
          </div>
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

        {/* Single Model Options */}
        {formData.modelType === "Single" && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Single Model
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

        {/* Hybrid Model Options */}
        {formData.modelType === "Hybrid" && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hybrid Model
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
            disabled={!fileData}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            Submit
          </button>
        </div>
      </form>
    </div>
  );
};

export default GenerateForecast;
