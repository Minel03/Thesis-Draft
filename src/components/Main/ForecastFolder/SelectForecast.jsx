import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const SelectForecast = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [filename, setFilename] = useState("No file selected");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (location.state?.filename) {
      setFilename(location.state.filename);
    }
    setLoading(false);
  }, [location.state?.filename]);

  const handleModelSelect = async (modelType) => {
    try {
      setLoading(true);
      console.log("Fetching file:", filename);
      const response = await fetch(
        `http://localhost:8000/storage/read/${filename}`
      );
      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          "Fetch failed with status:",
          response.status,
          "Response:",
          errorText
        );
        throw new Error(`Failed to read file: ${errorText}`);
      }
      const data = await response.json();
      console.log("Fetched data:", data);

      if (!Array.isArray(data) || data.length === 0) {
        throw new Error("Data is empty or not an array");
      }

      // Define regex patterns for time-related fields
      const timePatterns = {
        date: /^\d{4}-\d{2}-\d{2}$/,
        time: /^\d{4}-\d{2}-\d{2}T\d{2}:00:00$/,
        week: /^\d{4}-W\d{2}$/,
      };

      // Define required fields for each model type
      const requiredFields = {
        Solar: [
          "solar_power",
          "dhi",
          "dni",
          "ghi",
          "temperature",
          "relative_humidity",
          "solar_zenith_angle",
        ],
        Wind: ["wind_power", "wind_speed", "dew_point"],
      };

      // Determine which time-related field to use based on the first row
      const firstRow = data[0];
      let selectedTimeField = null;
      let folderPrefix = null;
      for (const [field, regex] of Object.entries(timePatterns)) {
        if (firstRow[field] && regex.test(firstRow[field])) {
          selectedTimeField = field;
          folderPrefix =
            field === "time" ? "hourly" : field === "date" ? "daily" : "weekly";
          console.log(
            `Selected time field: ${field} (e.g., ${firstRow[field]}), folder: ${folderPrefix}`
          );
          break;
        }
      }
      if (!selectedTimeField) {
        throw new Error(
          "No valid time-related field (time, date, week) found in data"
        );
      }

      // Filter data to include only the selected time field and model-specific fields
      const filteredData = data.map((row) => {
        const newRow = { [selectedTimeField]: row[selectedTimeField] };
        requiredFields[modelType].forEach((field) => {
          if (row[field] !== undefined) {
            newRow[field] = row[field];
          }
        });
        return newRow;
      });
      console.log("Filtered data:", filteredData);

      // Validate filtered data
      if (filteredData.every((row) => Object.keys(row).length <= 1)) {
        throw new Error("Filtered data lacks required fields");
      }

      // Create new filename with folder prefix and timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, "_");
      const newFilename = `${folderPrefix}_${modelType.toLowerCase()}_data_${timestamp}.json`;
      console.log("New filename:", newFilename);

      // Create and upload new JSON file
      const formData = new FormData();
      formData.append(
        "file",
        new Blob([JSON.stringify(filteredData, null, 2)], {
          type: "application/json",
        }),
        newFilename
      );

      const uploadResponse = await fetch(
        "http://localhost:8000/storage/process_model_data/",
        {
          method: "POST",
          body: formData,
        }
      );
      if (!uploadResponse.ok) {
        const uploadErrorText = await uploadResponse.text();
        console.error("Upload failed:", uploadErrorText);
        throw new Error(`Failed to upload filtered data: ${uploadErrorText}`);
      }
      const uploadResult = await uploadResponse.json();
      console.log("Upload result:", uploadResult);

      // Navigate to format generation
      navigate("/GenerateForecast", {
        state: { filename: newFilename, modelType: modelType.toLowerCase() },
      });
    } catch (err) {
      console.error("Error details:", err);
      setError(`Error processing data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const modelButtons = [
    { name: "Solar", path: "/SolarForecastOptions", color: "blue" },
    { name: "Wind", path: "/WindForecastOptions", color: "green" },
  ];

  return (
    <div className="p-6 bg-gray-100 min-h-screen flex flex-col items-center">
      <p>Selected File: {loading ? "Loading..." : filename}</p>
      {error && <p className="text-red-500">{error}</p>}
      <h1 className="text-2xl font-bold mb-6">Model Options</h1>
      {modelButtons.map((button, index) => (
        <button
          key={index}
          onClick={() => handleModelSelect(button.name)}
          className={`mb-4 p-4 bg-${button.color}-500 text-white rounded-md hover:bg-${button.color}-600`}>
          {button.name}
        </button>
      ))}
    </div>
  );
};

export default SelectForecast;
