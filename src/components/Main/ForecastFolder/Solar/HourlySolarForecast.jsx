import React, { useState } from "react";

const HourlySolarForecast = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [file, setFile] = useState(null);
  const [jsonPath, setJsonPath] = useState("");
  const [tableName, setTableName] = useState("");
  const [message, setMessage] = useState("");

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage("Please select a file.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("http://127.0.0.1:8000/storage/upload/", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      if (response.ok) {
        setMessage(`File uploaded successfully.`);
        setJsonPath(result.json_path);
        setTableName(result.table_name);
      } else {
        setMessage(`Error: ${result.detail}`);
      }
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    }
  };

  const handleNext = async () => {
    if (!jsonPath) {
      setMessage("Upload the file first before proceeding.");
      return;
    }

    try {
      const response = await fetch("http://127.0.0.1:8000/insert_database/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ json_path: jsonPath, table_name: tableName }),
      });

      const result = await response.json();
      if (response.ok) {
        setMessage(`Data inserted into database successfully.`);
      } else {
        setMessage(`Error inserting into database: ${result.detail}`);
      }
    } catch (error) {
      setMessage(`Error: ${error.message}`);
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
      <button
        onClick={handleUpload}
        className="mt-4 bg-green-500 text-white px-4 py-2 rounded-md shadow-md hover:bg-green-600 transition"
        disabled={!file}>
        Upload CSV
      </button>
      {message && <p className="mt-4 text-red-500">{message}</p>}
      <button
        onClick={handleNext}
        className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-md shadow-md hover:bg-blue-600 transition"
        disabled={!jsonPath}>
        Next
      </button>
    </div>
  );
};

export default HourlySolarForecast;
