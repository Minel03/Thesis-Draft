import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Sidebar from "@/components/Sidebar/Sidebar"; // Adjust path as needed
import { Dashboard, Models, Forecast } from "@/components/Main"; // Adjust path as needed
import {
  HourlySolarForecast,
  HourlyWindForecast,
  DailyWindForecast,
  DailySolarForecast,
  WeeklyWindForecast,
  WeeklySolarForecast,
} from "./components/Main";
import { SolarForecastOptions } from "./components/Main";
import { WindForecastOptions } from "./components/Main";
import { ModelOption } from "./components/Main";

const App = () => {
  return (
    <Router>
      <div className="flex">
        <Sidebar /> {/* This is where you display the sidebar */}
        <div className="flex-grow">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/Model" element={<Models />} />
            <Route path="/Forecast" element={<Forecast />} />
            <Route
              path="/SolarForecastOptions"
              element={<SolarForecastOptions />}
            />
            <Route
              path="/WindForecastOptions"
              element={<WindForecastOptions />}
            />
            <Route
              path="/HourlySolarForecast"
              element={<HourlySolarForecast />}
            />
            <Route
              path="/HourlyWindForecast"
              element={<HourlyWindForecast />}
            />
            <Route path="/DailyWindForecast" element={<DailyWindForecast />} />
            <Route
              path="/DailySolarForecast"
              element={<DailySolarForecast />}
            />
            <Route
              path="/WeeklyWindForecast"
              element={<WeeklyWindForecast />}
            />
            <Route
              path="/WeeklySolarForecast"
              element={<WeeklySolarForecast />}
            />
            <Route path="/ModelOption" element={<ModelOption />} />
            {/* Add other routes here */}
          </Routes>
        </div>
      </div>
    </Router>
  );
};

export default App;
