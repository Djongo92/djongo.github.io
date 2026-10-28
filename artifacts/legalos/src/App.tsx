import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useReadingTheme } from "@/hooks/useReadingTheme";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Share from "./pages/Share.tsx";
import MarketIndex from "./pages/MarketIndex.tsx";
import Teaser from "./pages/Teaser.tsx";
import ShowcaseGate from "./pages/ShowcaseGate.tsx";
import OpsDirectoryQueue from "./pages/OpsDirectoryQueue.tsx";
import OpsRateLimits from "./pages/OpsRateLimits.tsx";
import JoinFirm from "./pages/JoinFirm.tsx";
import PartnerReview from "./pages/PartnerReview.tsx";
import RoastShare from "./pages/RoastShare.tsx";
import TeamGtm from "./pages/TeamGtm.tsx";

const queryClient = new QueryClient();

const App = () => {
  // The theme/font-scale choice is only ever mutated from Settings or
  // ReadingControls, but the CSS class that actually applies it lived
  // entirely inside useReadingTheme's own effect — which only ran while
  // one of those two components happened to be mounted. Any other route
  // (Dashboard, a public share link, a reload) started from a bare <html>
  // with no class at all, silently reverting a saved Light/Sepia choice
  // back to dark until the user opened Settings again. Calling the hook
  // here, once, for its side effect only, applies the stored theme on
  // every mount regardless of which route or section is active.
  useReadingTheme();

  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      {/* Keep BASE_URL's trailing slash: with a slash-less basename React
          Router serializes the app root as "/app" (no slash) on every
          query-param navigation, and a reload of that URL misses Vite's
          /app/ base — an error page in place of the app. */}
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/share/:id" element={<Share />} />
          {/* Same page, two entry URLs — see MarketIndex.tsx's header comment. */}
          <Route path="/visibility-index/:market" element={<MarketIndex />} />
          <Route path="/recognition-index/:market" element={<MarketIndex />} />
          <Route path="/teaser" element={<Teaser />} />
          {/* Public "See a live demo" entry point from the marketing site. */}
          <Route path="/demo" element={<ShowcaseGate />} />
          <Route path="/join/:token" element={<JoinFirm />} />
          <Route path="/partner-review/:linkId" element={<PartnerReview />} />
          {/* Public read-only Roast My Deck share link (task #136). */}
          <Route path="/roast-share/:linkId" element={<RoastShare />} />
          <Route path="/team/go-to-market" element={<TeamGtm />} />
          <Route path="/ops/directory-queue" element={<OpsDirectoryQueue />} />
          <Route path="/ops/rate-limits" element={<OpsRateLimits />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
