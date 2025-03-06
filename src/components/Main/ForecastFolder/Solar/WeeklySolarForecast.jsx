import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useDropzone } from "react-dropzone";

const WeeklySolarForecast = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");
  const [isUploadDisabled, setIsUploadDisabled] = useState(false);
  const navigate = useNavigate();

  const validateFile = useCallback((file) => {
    if (!file) {
      setMessage("Please select a valid file.");
      return false;
    }

    const reader = new FileReader();
    return new Promise((resolve) => {
      reader.onload = (e) => {
        const text = e.target.result;
        const lines = text.split("\n");

        if (lines.length < 2) {
          setMessage("Invalid CSV format.");
          resolve(false);
          return;
        }

        const headers = lines[0].split(",").map((h) => h.trim());
        const timeIndex = headers.indexOf("week");

        if (timeIndex === -1) {
          setMessage("CSV must contain a 'week' column.");
          resolve(false);
          return;
        }

        setFile(file);
        setMessage("");
        setIsUploadDisabled(false);
        resolve(true);
      };
      reader.readAsText(file);
    });
  }, []);

  const onDrop = useCallback(
    async (acceptedFiles) => {
      if (acceptedFiles.length === 0) {
        setMessage("Please drop a valid CSV file.");
        return;
      }

      const selectedFile = acceptedFiles[0];
      const isValid = await validateFile(selectedFile);

      if (isValid) {
        setFile(selectedFile);
        setMessage("");
        setIsUploadDisabled(false);
      }
    },
    [validateFile]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/csv": [".csv"] },
    disabled: isProcessing,
    maxFiles: 1,
  });

  const handleUpload = () => {
    if (!file) {
      setMessage("Please select a file before uploading.");
      return;
    }

    setIsProcessing(true);
    setIsUploadDisabled(true);
    const worker = new Worker(
      new URL(
        "../../../../config/SolarConfig/workerSolarWeekly.js",
        import.meta.url
      ),
      { type: "module" }
    );

    worker.onmessage = (e) => {
      const { type, data, error } = e.data;
      if (type === "complete") {
        worker.terminate();
        uploadJsonToStorage(data);
        setIsProcessing(false);
      } else if (type === "error") {
        console.error("Error processing file:", error);
        worker.terminate();
        setIsProcessing(false);
        setMessage(error);
      }
    };

    worker.postMessage({ file });
  };

  const uploadJsonToStorage = async (data) => {
    const formData = new FormData();
    const timestamp = new Date().toISOString().replace(/[:.-]/g, "_");
    const filename = `weekly_solar_data_${timestamp}.json`;
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
        await fetchLatestFilename();
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
        "http://127.0.0.1:8000/storage/latest-file/?data_type=weekly"
      );
      const result = await response.json();
      if (result.filename) {
        setTimeout(() => {
          navigate("/ModelOption", {
            state: { filename: result.filename, id: result.id },
          });
        }, 3000);
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
        CSV Reader & File Uploader for Solar Data (Weekly)
      </h1>
      <div
        {...getRootProps()}
        className={`w-full max-w-md p-6 mb-4 border-2 border-dashed rounded-lg ${
          isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300"
        } cursor-pointer text-center hover:bg-gray-50 transition-colors`}>
        <input {...getInputProps()} />
        {isDragActive ? (
          <p className="text-blue-500">Drop the CSV file here...</p>
        ) : (
          <div>
            <p className="mb-2">
              Drag & drop a CSV file here, or click to select a file
            </p>
            <p className="text-sm text-gray-500">Only CSV files are accepted</p>
            {file && (
              <p className="mt-2 text-green-600">Selected: {file.name}</p>
            )}
          </div>
        )}
      </div>
      {message && (
        <p
          className={`mb-4 ${
            message.includes("successfully") ? "text-green-500" : "text-red-500"
          }`}>
          {message}
        </p>
      )}
      <button
        onClick={handleUpload}
        className="px-4 py-2 bg-blue-500 text-white rounded-md shadow-md hover:bg-blue-600 disabled:bg-gray-400"
        disabled={isProcessing || !file || isUploadDisabled}>
        {isProcessing ? "Processing..." : "Next"}
      </button>
    </div>
  );
};

export default WeeklySolarForecast;
