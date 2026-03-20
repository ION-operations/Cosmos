import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

const ProceduralEarthGPU = lazy(() => import("./pages/ProceduralEarthGPU"));
const SkyLab = lazy(() => import("./pages/SkyLab"));
const CloudLab = lazy(() => import("./pages/CloudLab"));
const TerrainLab = lazy(() => import("./pages/TerrainLab"));
const OceanLab = lazy(() => import("./pages/OceanLab"));
const VegetationLab = lazy(() => import("./pages/VegetationLab"));
const WeatherLab = lazy(() => import("./pages/WeatherLab"));
const EffectsLab = lazy(() => import("./pages/EffectsLab"));

const queryClient = new QueryClient();

const Loading = () => (
  <div className="w-full h-screen flex items-center justify-center bg-background">
    <div className="text-primary text-lg">Loading...</div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/gpu" element={<ProceduralEarthGPU />} />
            <Route path="/sky" element={<SkyLab />} />
            <Route path="/clouds" element={<CloudLab />} />
            <Route path="/terrain" element={<TerrainLab />} />
            <Route path="/ocean" element={<OceanLab />} />
            <Route path="/vegetation" element={<VegetationLab />} />
            <Route path="/weather" element={<WeatherLab />} />
            <Route path="/effects" element={<EffectsLab />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
