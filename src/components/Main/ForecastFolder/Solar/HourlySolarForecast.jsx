import React, { useState } from "react";

const HourlySolarForecast = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    setFile(selectedFile);

    if (selectedFile) {
      setIsProcessing(true);

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
          uploadJsonToStorage(data); // Insert JSON into storage folder when done
          setIsProcessing(false);
        } else if (type === "error") {
          console.error("Error processing file:", error);
          worker.terminate();
          setIsProcessing(false);
        }
      };

      // Pass the file to the worker
      worker.postMessage({ file: selectedFile });
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage("Please select a file.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("http://127.0.0.1:8000/upload/", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      if (response.ok) {
        setMessage(`File uploaded successfully. Path: ${result.json_path}`);
      } else {
        setMessage(`Error: ${result.detail}`);
      }
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    }
  };

  const uploadJsonToStorage = async (data) => {
    const formData = new FormData();

    // Create a unique filename using a timestamp
    const timestamp = new Date().toISOString().replace(/[:.-]/g, "_");
    const filename = `hourly_solar_data_${timestamp}.json`;

    // Convert data to a Blob
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });

    // Append the file to the FormData with the unique filename
    formData.append("file", blob, filename);

    try {
      const response = await fetch("http://127.0.0.1:8000/storage/upload/", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      if (response.ok) {
        setMessage(`JSON file successfully stored.`);
      } else {
        setMessage(`Error: ${result.detail}`);
      }
    } catch (error) {
      setMessage(`Error storing JSON: ${error.message}`);
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
      {message && <p className="mb-6 text-red-500">{message}</p>}
      {isProcessing && <p>Processing file... Please wait.</p>}
    </div>
  );
};

export default HourlySolarForecast; // Ensure default export is used
