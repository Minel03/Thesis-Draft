import React from "react";
import { Link } from "react-router-dom"; // For navigation

const Sidebar = () => {
  return (
    <div className="w-64 bg-gray-800 text-white p-4">
      <h2 className="text-xl mb-4">Navigation</h2>
      <ul>
        <li>
          <Link to="/" className="block py-2 px-4 hover:bg-gray-700">
            Dashboard
          </Link>
        </li>
        <li>
          <Link to="/model" className="block py-2 px-4 hover:bg-gray-700">
            Models
          </Link>
        </li>
        <li>
          <Link to="/forecast" className="block py-2 px-4 hover:bg-gray-700">
            Forecast
          </Link>
        </li>
      </ul>
    </div>
  );
};

export default Sidebar;
