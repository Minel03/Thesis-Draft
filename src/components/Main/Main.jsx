import { useState } from "react";

const Main = () => {
  const [dataPreview, setDataPreview] = useState([]); // Preview of parsed data
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setIsProcessing(true);

      // Create a worker
      const worker = new Worker(
        new URL("../../config/worker.js", import.meta.url)
      );
      worker.onmessage = (e) => {
        const { type, data, error } = e.data;

        if (type === "chunk") {
          // Update preview for the first chunk
          if (dataPreview.length === 0) {
            setDataPreview(data.slice(0, 10)); // Display the first 10 rows as a preview
          }
        } else if (type === "complete") {
          worker.terminate();
          downloadJson(data); // Download JSON when done
          setIsProcessing(false);
        } else if (type === "error") {
          console.error("Error processing file:", error);
          worker.terminate();
          setIsProcessing(false);
        }
      };

      // Pass the file to the worker
      worker.postMessage({ file });
    }
  };

  const downloadJson = (data) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "wind_power_data.json"; // File name for download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen flex flex-col items-center">
      <h1 className="text-2xl font-bold mb-6">CSV Reader: Wind Power</h1>
      <input
        type="file"
        accept=".csv"
        onChange={handleFileChange}
        className="mb-6 p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        disabled={isProcessing}
      />
      {isProcessing && <p>Processing file... Please wait.</p>}
      <div className="w-full max-w-2xl">
        <h2 className="text-xl font-semibold mb-4">Preview of Parsed Data:</h2>
        {dataPreview.length > 0 ? (
          <table className="table-auto w-full text-left border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-200">
                <th className="border border-gray-300 px-4 py-2">Wind Power</th>
              </tr>
            </thead>
            <tbody>
              {dataPreview.map((item, index) => (
                <tr key={index} className="even:bg-gray-100">
                  <td className="border border-gray-300 px-4 py-2">{item}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No data to display. Upload a valid CSV file.</p>
        )}
      </div>
    </div>
  );
};

export default Main;
