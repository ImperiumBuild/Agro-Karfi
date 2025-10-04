// src/pages/HomePage.tsx
import { Link } from "react-router-dom";

const HomePage = () => {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
      <h1 className="text-3xl font-bold mb-6">Welcome to the Mapping App</h1>
      <Link
        to="/map"
        className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
      >
        Go to Map
      </Link>
    </div>
  );
};

export default HomePage;
