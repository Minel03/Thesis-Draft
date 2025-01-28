import React from "react";
import { useNavigate } from "react-router-dom"; // For navigation

const Forecast = () => {
  const navigate = useNavigate();

  const handleSolarClick = () => {
    navigate("/SolarForecast"); // Navigate to SolarForecast
  };

  const handleWindClick = () => {
    navigate("/WindForecast"); // Navigate to WindForecast
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen flex flex-col items-center">
      <h1 className="text-2xl font-bold mb-6">Select Forecast Type</h1>

      {/* Buttons to navigate to Solar or Wind Forecast */}
      <button
        onClick={handleSolarClick}
        className="mb-4 p-4 bg-blue-500 text-white rounded-md hover:bg-blue-600">
        Solar Forecast
      </button>

      <button
        onClick={handleWindClick}
        className="mb-4 p-4 bg-green-500 text-white rounded-md hover:bg-green-600">
        Wind Forecast
      </button>
    </div>
  );
};

export default Forecast;
