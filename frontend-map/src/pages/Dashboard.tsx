import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

// --- Type Definitions ---

interface ApiResult {
  status: string;
  state: string; // Ensure state is present, though it's not used here, it's needed for the backend
  area_sq_m: number;
  image_tile_url: string;
  polygon_bounds: number[][];
  rainfall_total_mm?: number;
  avg_temp_c?: number;
  soil_pH?: number; 
  ndvi_mean?: number;
  soil_org_carbon_pct?: number;
  climatology?: string; 
}

interface DashboardMetrics {
  temperature: number | null;
  rainfall: number | null;
  soil_pH: number | null;
  landAreaHa: string;
  ndvi: number | null;
  soilOrganicCarbon: number | null;
  predictedCrop: string;
  calculationDate: string;
}

// --- Fallback APIs (Unused but kept for completeness) ---

async function fetchOpenMeteo(lat: number, lon: number) {
  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,precipitation`
    );
    const data = await res.json();
    return {
      temperature: data?.current?.temperature_2m ?? null,
      rainfall: data?.current?.precipitation ?? null,
    };
  } catch {
    return null;
  }
}

async function fetchNasaPower(lat: number, lon: number) {
  try {
    const res = await fetch(
      `https://power.larc.nasa.gov/api/temporal/daily/point?parameters=T2M,PRECTOT&community=RE&longitude=${lon}&latitude=${lat}&format=JSON`
    );
    const data = await res.json();
    const dates = Object.keys(data.properties.parameter.T2M);
    const lastDate = dates[dates.length - 1];
    return {
      temperature: data.properties.parameter.T2M[lastDate] ?? null,
      rainfall: data.properties.parameter.PRECTOT[lastDate] ?? null,
    };
  } catch {
    return null;
  }
}

// --- Component for AI Support ---
const AISupportSection: React.FC<{ advice: string | null }> = ({ advice }) => {
    return (
        <div className="bg-white p-6 rounded-xl shadow-2xl mb-8 border-l-8 border-yellow-500 w-full">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                🤖 AI Farming Assistant Advice
            </h2>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                {advice === null ? (
                    <p className="text-gray-500 italic">
                        Generating smart, actionable advice based on your field data...
                    </p>
                ) : (
                    // Use whitespace-pre-wrap to respect line breaks in the AI's response
                    <p className="text-gray-700 whitespace-pre-wrap">{advice}</p>
                )}
            </div>
        </div>
    );
};


// --- Hero Section ---

const HeroSection: React.FC<{ metrics: DashboardMetrics }> = ({ metrics }) => {
  return (
    <div className="bg-white p-6 rounded-xl shadow-2xl mb-8 border-t-8 border-green-600 px-6 md:px-10">
      <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
        ✨ Field Analysis & Prediction
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
        {/* Temperature */}
        <div className="p-4 bg-red-50 rounded-lg">
          <p className="text-sm font-medium text-gray-500">Avg Air Temperature</p>
          <p className="text-4xl font-extrabold text-red-600 mt-1">
            {metrics.temperature !== null ? metrics.temperature : "N/A"}
            {metrics.temperature !== null && <span className="text-xl">°C</span>}
          </p>
        </div>

        {/* Soil pH */}
        <div className="p-4 bg-yellow-50 rounded-lg">
          <p className="text-sm font-medium text-gray-500">Avg Topsoil pH</p>
          <p className="text-4xl font-extrabold text-yellow-600 mt-1">
            {metrics.soil_pH !== null ? metrics.soil_pH : "N/A"}
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

// --- Main Dashboard Page ---
const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const apiResult = location.state?.apiResult as ApiResult | undefined;
  
  // Safely parse userInfo from localStorage
  const [userInfo, setUserInfo] = useState<any>(null);
  useEffect(() => {
    const storedData = localStorage.getItem("farmInfo");
    if (storedData) {
      try {
        setUserInfo(JSON.parse(storedData));
      } catch (e) {
        console.error("Failed to parse userInfo from localStorage:", e);
        setUserInfo({}); // Use empty object as fallback
      }
    } else {
        setUserInfo({}); // Use empty object if nothing is found
    }
  }, []);

  const [metrics, setMetrics] = useState<DashboardMetrics>({
    temperature: null,
    rainfall: null,
    soil_pH: null,
    landAreaHa: "—",
    ndvi: null,
    soilOrganicCarbon: null,
    predictedCrop: "Loading...",
    calculationDate: "N/A",
  });

  const [aiAdvice, setAiAdvice] = useState<string | null>(null); // State for AI advice

  const fetchAiAdvice = async (result: ApiResult, predictedCrop: string) => {
    // We only proceed if prediction is valid and advice hasn't been fetched
    if (predictedCrop === "Calculating..." || predictedCrop === "Error" || aiAdvice !== null) return; 

    setAiAdvice(null); 

    const payload = {
      message: "Provide smart, actionable farming advice for this field, focusing on optimal crop choice and immediate steps for soil and water management.",
      info: {
        ...result, // Unpack all existing geospatial data
        predicted_crop: predictedCrop, // ⬅️ ADDED: Prediction to info object
      },
    };

    try {
      const response = await fetch("http://127.0.0.1:8000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Failed to fetch AI advice");

      const data = await response.json();
      setAiAdvice(data.response || "No advice received from AI.");
    } catch (error) {
      console.error("AI Advice Fetch Error:", error);
      setAiAdvice("Error generating advice. Please try again.");
    }
  };


  useEffect(() => {
    // Only proceed if we have API results AND user info is loaded
    if (!apiResult || userInfo === null) return;

    const parseMetricsAndPredict = async () => {
        // Implement robust numerical fallbacks for the prediction payload.
        const state: string = userInfo?.state ?? apiResult.state ?? "Unknown";

        const temperature: number = apiResult.avg_temp_c ?? 25.0; // Default to 25C
        const rainfall: number = apiResult.rainfall_total_mm ?? 100.0; // Default to 100mm
        const soil_pH: number = apiResult.soil_pH ?? 6.5; // Default to 6.5
        const ndvi: number = apiResult.ndvi_mean ?? 0.45; // Default to 0.45
        const soilOrganicCarbon: number = apiResult.soil_org_carbon_pct ?? 1.2; // Default to 1.2%
        
        // Corrected variable declarations and added fallbacks for user info fields
        const fertilizer_rate: number = userInfo?.fertilizer_rate_kg_per_ha ?? 50.0;
        const pesticide_rate: number = userInfo?.pesticide_rate_l_per_ha ?? 2.0;
        const farm_size: number = userInfo?.farm_size_ha ?? 1.5;
        const irrigated: number = userInfo?.irrigated_area_ha ?? 0.5;

        const landAreaHa = (apiResult.area_sq_m / 10000).toFixed(2);
        let predictedCrop = "Calculating..."; 

        // 🧠 Call backend crop predictor
        try {
            const payload = {
                state: state,
                rainfall_total_mm: rainfall,
                avg_temp_c: temperature,
                ndvi_mean: ndvi,
                soil_ph: soil_pH,
                soil_org_carbon_pct: soilOrganicCarbon,
                fertilizer_rate_kg_per_ha: fertilizer_rate,
                pesticide_rate_l_per_ha: pesticide_rate,
                farm_size_ha: farm_size,
                irrigated_area_ha: irrigated,
            };

            const response = await fetch("http://127.0.0.1:8000/predict", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Prediction failed: ${response.status} - ${errorText}`);
            }

            const result = await response.json();
            predictedCrop = result.predicted_crop || "Unknown";

        } catch (error) {
            console.error("Prediction failed:", error);
            predictedCrop = "Error";
        }

        const calculationDate = new Date().toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });

        // 1. Update Metrics
        setMetrics({
            temperature: apiResult.avg_temp_c ?? null,
            rainfall: apiResult.rainfall_total_mm ?? null,
            soil_pH: apiResult.soil_pH ?? null,
            landAreaHa,
            ndvi: apiResult.ndvi_mean ?? null,
            soilOrganicCarbon: apiResult.soil_org_carbon_pct ?? null,
            predictedCrop, 
            calculationDate,
        });

        // 2. 🎯 CRITICAL FIX: Call AI advice with the final prediction string
        // This ensures the advice runs only after the prediction is calculated.
        fetchAiAdvice(apiResult, predictedCrop); 
    };

    parseMetricsAndPredict();
    // ❌ REMOVED: fetchAiAdvice(apiResult) - it's now called inside the async function.
  }, [apiResult, userInfo]); // Removed aiAdvice from dependencies to prevent infinite loop

  // ... (rest of the component's JSX remains the same)

  return (
    <div className="min-h-screen w-screen flex flex-col bg-gray-50 font-sans">
      <div className="flex-1 flex flex-col overflow-y-auto w-full">
        {/* Title */}
        <div className="pt-6 md:pt-10 px-6 md:px-10">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">
            Farming Analysis Dashboard
          </h1>
        </div>

        {/* Hero Section */}
        <HeroSection metrics={metrics} />

        {/* Metrics Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 w-full px-6 md:px-10">
          <div className="bg-white p-4 rounded-xl shadow-lg border-l-4 border-green-500">
            <p className="text-sm text-gray-500">Total Land Area (Hectares)</p>
            <p className="text-2xl font-semibold text-gray-900 mt-1">
              {metrics.landAreaHa} ha
            </p>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-lg border-l-4 border-blue-500">
            <p className="text-sm text-gray-500">Calculation Date</p>
            <p className="text-2xl font-semibold text-gray-900 mt-1">
              {metrics.calculationDate}
            </p>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-lg border-l-4 border-indigo-500">
            <p className="text-sm text-gray-500">Avg Annual Rainfall</p>
            <p className="text-2xl font-semibold text-gray-900 mt-1">
              {metrics.rainfall !== null ? metrics.rainfall : "N/A"}
              {metrics.rainfall !== null && <span className="text-sm ml-1">mm</span>}
            </p>
          </div>
        </div>

        {/* Satellite Image Section */}
        <div className="flex-1 bg-white p-6 rounded-xl shadow-lg flex flex-col items-center justify-center min-h-[400px] px-6 md:px-10 mb-6 w-full">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
                🛰️ Satellite Analysis
            </h2>
            {apiResult?.image_tile_url ? (
                <img
                src={apiResult.image_tile_url}
                alt="Satellite imagery of field"
                className="rounded-lg shadow-md border border-gray-300 w-full max-w-5xl h-96 object-contain"
                />
            ) : (
                <div className="h-full w-full flex items-center justify-center text-gray-400 border-2 border-dashed rounded p-4">
                No Satellite Image Available
                </div>
            )}
        </div>
        
        {/* AI Support Section (New) */}
        <div className="px-6 md:px-10 w-full">
            <AISupportSection advice={aiAdvice} />
        </div>


        {/* Back Button */}
        <div className="px-6 md:px-10 pb-6 md:pb-10">
          <button
            onClick={() => navigate("/map")}
            className="p-3 rounded-lg w-full md:w-auto bg-teal-500 text-white hover:bg-teal-600 shadow-md transition duration-150"
          >
            ⬅️ Go Back to Mapping
          </button>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;