import React from "react";
import { useNavigate } from "react-router-dom";

const SolarForecastOptions = () => {
  const navigate = useNavigate();

  return (
    <div className="p-6 bg-gray-100 min-h-screen flex flex-col items-center">
      <h1 className="text-2xl font-bold mb-6">Select Forecast Type</h1>

      <button
        onClick={() => navigate("/HourlySolarForecast")}
        className="mb-4 p-4 bg-blue-500 text-white rounded-md hover:bg-blue-600">
        Hourly Forecast
      </button>

      <button
        onClick={() => navigate("/DailySolarForecast")}
        className="mb-4 p-4 bg-yellow-500 text-white rounded-md hover:bg-yellow-600">
        Daily Forecast
      </button>

      <button
        onClick={() => navigate("/WeeklySolarForecast")}
        className="mb-4 p-4 bg-purple-500 text-white rounded-md hover:bg-purple-600">
        Weekly Forecast
      </button>
    </div>
  );
};

export default SolarForecastOptions;
