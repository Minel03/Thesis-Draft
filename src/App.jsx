import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Sidebar from "@/components/Sidebar/Sidebar"; // Adjust path as needed
import { Dashboard, Models, Forecast } from "@/components/Main"; // Adjust path as needed
import { SolarForecast } from "./components/Main";
import { WindForecast } from "./components/Main";

const App = () => {
  return (
    <Router>
      <div className="flex">
        <Sidebar /> {/* This is where you display the sidebar */}
        <div className="flex-grow">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/model" element={<Models />} />
            <Route path="/forecast" element={<Forecast />} />
            <Route path="/SolarForecast" element={<SolarForecast />} />
            <Route path="/WindForecast" element={<WindForecast />} />
            {/* Add other routes here */}
          </Routes>
        </div>
      </div>
    </Router>
  );
};

export default App;
