import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navigation from "@/components/Navigation/Navigation";
import { Dashboard, Models, Forecast } from "@/components/Main";
import {
  ModelOption,
  SelectForecast,
  GenerateForecast,
} from "./components/Main";

const App = () => {
  return (
    <Router>
      <Navigation />
      <Routes>
        {/* Main routes */}
        <Route path="/" element={<Dashboard />} />
        <Route path="/Model" element={<Models />} />
        <Route path="/Forecast" element={<Forecast />} />

        {/* Forecast and model configuration routes */}
        <Route path="/ModelOption" element={<ModelOption />} />
        <Route path="/SelectForecast" element={<SelectForecast />} />
        <Route path="/GenerateForecast" element={<GenerateForecast />} />
      </Routes>
    </Router>
  );
};

export default App;
