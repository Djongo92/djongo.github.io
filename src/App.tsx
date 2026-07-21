import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Share from "./pages/Share.tsx";
import Rankings from "./pages/Rankings.tsx";
import Teaser from "./pages/Teaser.tsx";
import DirectoryIndex from "./pages/DirectoryIndex.tsx";
import OpsDirectoryQueue from "./pages/OpsDirectoryQueue.tsx";
import OpsRateLimits from "./pages/OpsRateLimits.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter basename="/djongo.github.io">
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/share/:id" element={<Share />} />
          <Route path="/rankings/:market" element={<Rankings />} />
          <Route path="/directory/:market" element={<DirectoryIndex />} />
          <Route path="/teaser" element={<Teaser />} />
          <Route path="/ops/directory-queue" element={<OpsDirectoryQueue />} />
          <Route path="/ops/rate-limits" element={<OpsRateLimits />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
