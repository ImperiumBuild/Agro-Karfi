import React, { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom"; // Use real router imports

// --- Dashboard Data and Component ---

interface ApiResult {
    status: string;
    area_sq_m: number;
    image_tile_url: string;
    climatology: string; // e.g., "Average Climatology: Temp 25.2°C (Mean Air Temp), Precip 1314 mm (Avg Annual Total)"
    soil_pH: string; // e.g., "Average Topsoil (ISRIC 250m): pH 6.03 (Area: 85788.19 ha)"
    polygon_bounds: number[][];
}

interface DashboardMetrics {
    temperature: number | string;
    rainfall: number | string; // Note: API gives ANNUAL precip, keeping mock daily for context
    predictedCrop: string;
    soil_pH: number | string;
    landAreaHa: string;
    calculationDate: string;
}

/**
 * Renders the primary dashboard view, including weather predictions and field metrics.
 * Simulates the contents of src/pages/dashboard.tsx
 */
const DashboardPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const apiResult = location.state?.apiResult as ApiResult | undefined;

  // Function to extract numerical data from the string fields
  const parseMetrics = (result: ApiResult): DashboardMetrics => {
    // 1. Extract Temperature
    const tempMatch = result.climatology.match(/Temp\s(\d+\.\d+)°C/);
    const temperature = tempMatch ? parseFloat(tempMatch[1]) : "N/A";

    // 2. Extract Soil pH
    const pHMatch = result.soil_pH.match(/pH\s(\d+\.\d+)/);
    const soil_pH = pHMatch ? parseFloat(pHMatch[1]) : "N/A";
    
    // 3. Extract Land Area (convert sq_m to ha)
    const landAreaHa = (result.area_sq_m / 10000).toFixed(2);
    
    // 4. Mock/Inferred Data (since the API doesn't provide these directly)
    const predictedCrop = (soil_pH as number) >= 5.5 && (soil_pH as number) <= 7.5 ? "Maize (Corn)" : "Custom Blend";
    const rainfall = 5.5; // Keeping the mock daily rainfall for "Today's" context
    const calculationDate = new Date().toLocaleDateString('en-US', { 
        year: 'numeric', month: 'short', day: 'numeric' 
    });

    return { temperature, rainfall, predictedCrop, soil_pH, landAreaHa, calculationDate };
  };

  const metrics = useMemo(() => {
    if (apiResult) {
        return parseMetrics(apiResult);
    }
    // Fallback/Placeholder data if accessed directly without calculation
    return {
        temperature: "—",
        rainfall: "—",
        predictedCrop: "Run Calculation First",
        soil_pH: "—",
        landAreaHa: "—",
        calculationDate: "N/A",
    };
  }, [apiResult]);


  const HeroSection = () => {
    const isDataReady = !!apiResult;

    return (
        <div className="bg-white p-6 rounded-xl shadow-2xl mb-8 border-t-8 border-green-600">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
                ✨ Field Analysis & Prediction
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                {/* Temperature */}
                <div className="p-4 bg-red-50 rounded-lg">
                    <p className="text-sm font-medium text-gray-500">Avg Air Temperature</p>
                    <p className="text-4xl font-extrabold text-red-600 mt-1">
                        {metrics.temperature}<span className="text-xl align-top">{metrics.temperature !== '—' ? '°C' : ''}</span>
                    </p>
                </div>

                {/* Soil pH (Replaced Rainfall for real API data) */}
                <div className="p-4 bg-yellow-50 rounded-lg">
                    <p className="text-sm font-medium text-gray-500">Avg Topsoil pH</p>
                    <p className="text-4xl font-extrabold text-yellow-600 mt-1">
                        {metrics.soil_pH}
                    </p>
                </div>

                {/* Predicted Crop */}
                <div className="p-4 bg-green-50 rounded-lg border-2 border-green-300">
                    <p className="text-sm font-medium text-gray-500">Predicted Optimal Crop</p>
                    <p className="text-2xl md:text-3xl font-extrabold text-green-700 mt-1">
                        {metrics.predictedCrop}
                    </p>
                </div>
            </div>
        </div>
    );
  };


  return (
    <div className="flex flex-col h-full bg-gray-50 p-6 md:p-10 overflow-y-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Farming Analysis Dashboard</h1>
      
      {/* Hero Section: Temperature, Soil pH, and Predicted Crop */}
      <HeroSection />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Land Area Card (now uses actual area from API) */}
        <div className="bg-white p-4 rounded-xl shadow-lg border-l-4 border-green-500">
          <p className="text-sm text-gray-500">Total Land Area (Hectares)</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{metrics.landAreaHa} ha</p>
        </div>
        
        {/* Date Card (now uses current date, or N/A) */}
        <div className="bg-white p-4 rounded-xl shadow-lg border-l-4 border-blue-500">
          <p className="text-sm text-gray-500">Calculation Date</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{metrics.calculationDate}</p>
        </div>
        
        {/* Placeholder for Rainfall or other metric */}
        <div className="bg-white p-4 rounded-xl shadow-lg border-l-4 border-indigo-500">
          <p className="text-sm text-gray-500">Mock Daily Rainfall</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">
            {metrics.rainfall}<span className="text-sm ml-1">mm</span>
          </p>
        </div>
      </div>

      {/* Placeholder for future charts/reports */}
      <div className="flex-1 bg-white p-6 rounded-xl shadow-lg flex items-center justify-center min-h-[300px]">
        <h2 className="text-xl font-semibold text-gray-800 mb-4 absolute top-10">Historical Analysis</h2>
        <div className="h-full w-full flex items-center justify-center text-gray-400 border-2 border-dashed rounded p-4">
          [Chart Placeholder: Soil Moisture vs. Yield Over Time]
          <p className="text-xs mt-2">API Image Tile URL: {apiResult?.image_tile_url || 'N/A'}</p>
        </div>
      </div>

      <button
        onClick={() => navigate('/map')} // Note: changed from /mapping to /map to match your provided Routes
        className="mt-6 p-3 rounded-lg w-full md:w-auto bg-teal-500 text-white hover:bg-teal-600 shadow-md transition duration-150"
      >
        ⬅️ Go Back to Mapping
      </button>
    </div>
  );
};

export default DashboardPage;
