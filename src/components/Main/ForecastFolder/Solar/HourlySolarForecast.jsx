import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const HourlySolarForecast = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");
  const [isUploadDisabled, setIsUploadDisabled] = useState(false);
  const [isNextDisabled, setIsNextDisabled] = useState(true);
  const navigate = useNavigate();

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];

    if (!selectedFile) {
      setMessage("Please select a valid file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split("\n");

      if (lines.length < 2) {
        setMessage("Invalid CSV format.");
        return;
      }

      // Extract header and rows
      const headers = lines[0].split(",").map((h) => h.trim());
      const rows = lines
        .slice(1)
        .map((line) => line.split(",").map((v) => v.trim()));

      const timeIndex = headers.indexOf("time");
      if (timeIndex === -1) {
        setMessage("CSV must contain a 'time' column.");
        return;
      }

      // Check all rows' timestamps for hourly format
      for (let i = 0; i < rows.length; i++) {
        const timestamp = rows[i][timeIndex];
        if (!/^\d{4}-\d{2}-\d{2}T\d{2}:00:00$/.test(timestamp)) {
          setMessage(
            `Timestamp on row ${
              i + 1
            } is not on the hour (e.g., 2024-02-05T14:00:00).`
          );
          return;
        }
      }

      // Check for missing required fields and notify the user
      const requiredColumns = [
        "solar_power",
        "dhi",
        "dni",
        "ghi",
        "temperature",
        "relative_humidity",
        "solar_zenith_angle",
      ];

      const missingColumns = requiredColumns.filter(
        (col) => !headers.includes(col)
      );

      if (missingColumns.length > 0) {
        setMessage(`Missing required columns: ${missingColumns.join(", ")}`);
        return;
      }

      setFile(selectedFile);
      setMessage("");
      setIsUploadDisabled(false);
    };

    reader.readAsText(selectedFile);
  };

  const handleUpload = () => {
    if (!file) {
      setMessage("Please select a file before uploading.");
      return;
    }

    setIsProcessing(true);
    setIsUploadDisabled(true);

    // Create a worker
    const worker = new Worker(
      new URL(
        "../../../../config/SolarConfig/workerSolarHourly.js",
        import.meta.url
      )
    );

    worker.onmessage = (e) => {
      const { type, data, error } = e.data;

      if (type === "complete") {
        worker.terminate();
        uploadJsonToStorage(data);
        setIsProcessing(false);
        setIsNextDisabled(false);
      } else if (type === "error") {
        console.error("Error processing file:", error);
        worker.terminate();
        setIsProcessing(false);
        setMessage(error); // Show error from worker
      }
    };

    // Pass the file to the worker
    worker.postMessage({ file });
  };

  const uploadJsonToStorage = async (data) => {
    const formData = new FormData();
    const timestamp = new Date().toISOString().replace(/[:.-]/g, "_");

    const filename = `hourly_solar_data_${timestamp}.json`;
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });

    formData.append("file", blob, filename);

    try {
      const response = await fetch("http://127.0.0.1:8000/storage/upload/", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      if (response.ok) {
        setMessage("JSON file successfully stored.");
        await fetchLatestFilename(); // Fetch filename after uploading
      } else {
        setMessage(`Error: ${result.detail}`);
      }
    } catch (error) {
      setMessage(`Error storing JSON: ${error.message}`);
    }
  };

  const fetchLatestFilename = async () => {
    const dataType = "hourly"; // This could be dynamically set based on user selection
    try {
      const response = await fetch(
        `http://127.0.0.1:8000/storage/latest-file/?data_type=${dataType}`
      );
      const result = await response.json();

      if (result.filename) {
        setTimeout(() => {
          // Pass the filename and id directly to the ModelOption page via location.state
          navigate("/ModelOption", {
            state: { filename: result.filename, id: result.id },
          });
        }, 3000); // 3-second delay for smooth transition
      } else {
        setMessage("Error retrieving filename.");
      }
    } catch (error) {
      setMessage(`Error fetching filename: ${error.message}`);
    }
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen flex flex-col items-center">
      <h1 className="text-2xl font-bold mb-6">
        CSV Reader & File Uploader for Solar Data (Hourly)
      </h1>
      <input
        type="file"
        accept=".csv"
        onChange={handleFileChange}
        className="mb-4 p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        disabled={isProcessing}
      />
      {message && <p className="mb-4 text-red-500">{message}</p>}
      <button
        onClick={handleUpload}
        className="px-4 py-2 bg-blue-500 text-white rounded-md shadow-md hover:bg-blue-600 disabled:bg-gray-400"
        disabled={isProcessing || !file || isUploadDisabled}>
        {isProcessing ? "Processing..." : "Next"}
      </button>
    </div>
  );
};

export default HourlySolarForecast;
