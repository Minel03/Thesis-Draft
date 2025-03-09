import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navigation from "@/components/Navigation/Navigation";
import { Dashboard, Models, Forecast } from "@/components/Main";
import {
  HourlySolarForecast,
  HourlyWindForecast,
  DailyWindForecast,
  DailySolarForecast,
  WeeklyWindForecast,
  WeeklySolarForecast,
  SolarForecastOptions,
  WindForecastOptions,
  ModelOption,
  SelectForecast,
  GenerateForecast,
} from "./components/Main";

const App = () => {
  return (
    <Router>
      <Navigation />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/Model" element={<Models />} />
        <Route path="/Forecast" element={<Forecast />} />
        <Route
          path="/SolarForecastOptions"
          element={<SolarForecastOptions />}
        />
        <Route path="/WindForecastOptions" element={<WindForecastOptions />} />
        <Route path="/HourlySolarForecast" element={<HourlySolarForecast />} />
        <Route path="/HourlyWindForecast" element={<HourlyWindForecast />} />
        <Route path="/DailyWindForecast" element={<DailyWindForecast />} />
        <Route path="/DailySolarForecast" element={<DailySolarForecast />} />
        <Route path="/WeeklyWindForecast" element={<WeeklyWindForecast />} />
        <Route path="/WeeklySolarForecast" element={<WeeklySolarForecast />} />
        <Route path="/ModelOption" element={<ModelOption />} />
        <Route path="/SelectForecast" element={<SelectForecast />} />
        <Route path="/GenerateForecast" element={<GenerateForecast />} />
      </Routes>
    </Router>
  );
};

export default App;
