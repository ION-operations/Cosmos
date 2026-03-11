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
            {/* Future lab pages: /clouds, /terrain, /ocean, /vegetation, /weather, /effects */}
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
