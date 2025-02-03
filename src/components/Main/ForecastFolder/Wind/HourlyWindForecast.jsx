import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const HourlyWindForecast = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");
  const [isUploadDisabled, setIsUploadDisabled] = useState(false);
  const [isNextDisabled, setIsNextDisabled] = useState(true);
  const navigate = useNavigate();

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    setFile(selectedFile);
    setMessage("");
    setIsUploadDisabled(false);
    setIsNextDisabled(true);
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
        "../../../../config/WindConfig/workerWindHourly.js",
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
      }
    };

    // Pass the file to the worker
    worker.postMessage({ file });
  };

  const uploadJsonToStorage = async (data) => {
    const formData = new FormData();
    const timestamp = new Date().toISOString().replace(/[:.-]/g, "_");
    const filename = `hourly_wind_data_${timestamp}.json`;
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
        setTimeout(() => {
          navigate("/ModelOption");
        }, 1500);
      } else {
        setMessage(`Error: ${result.detail}`);
      }
    } catch (error) {
      setMessage(`Error storing JSON: ${error.message}`);
    }
  };

  const fetchLatestFilename = async () => {
    try {
      const response = await fetch(
        "http://127.0.0.1:8000/storage/latest-file/"
      );
      const result = await response.json();

      if (result.filename) {
        localStorage.setItem("uploadedFilename", result.filename); // ✅ Store in localStorage
        navigate("/ModelOption", { state: { filename: result.filename } });
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
        CSV Reader & File Uploader for Wind Data (Hourly)
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

export default HourlyWindForecast;
