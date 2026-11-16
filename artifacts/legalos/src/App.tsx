import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useReadingTheme } from "@/hooks/useReadingTheme";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";
import { lazyWithReload } from "@/lib/lazyWithReload";
import { Suspense } from "react";

// Every page is its own chunk: a visitor opening a public link (Visibility
// Index, teaser, a share link) downloads that page, not the whole dashboard.
const Index = lazyWithReload(() => import("./pages/Index.tsx"));
const NotFound = lazyWithReload(() => import("./pages/NotFound.tsx"));
const Share = lazyWithReload(() => import("./pages/Share.tsx"));
const MarketIndex = lazyWithReload(() => import("./pages/MarketIndex.tsx"));
const Teaser = lazyWithReload(() => import("./pages/Teaser.tsx"));
const ShowcaseGate = lazyWithReload(() => import("./pages/ShowcaseGate.tsx"));
const OpsDirectoryQueue = lazyWithReload(() => import("./pages/OpsDirectoryQueue.tsx"));
const OpsRateLimits = lazyWithReload(() => import("./pages/OpsRateLimits.tsx"));
const JoinFirm = lazyWithReload(() => import("./pages/JoinFirm.tsx"));
const PartnerReview = lazyWithReload(() => import("./pages/PartnerReview.tsx"));
const RoastShare = lazyWithReload(() => import("./pages/RoastShare.tsx"));
const TeamGtm = lazyWithReload(() => import("./pages/TeamGtm.tsx"));

// Shown for the moment a page's chunk is downloading. Same background as the
// app so the switch doesn't flash.
const PageLoading = () => (
  <div className="flex min-h-screen items-center justify-center bg-background" aria-busy="true">
    <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary" />
  </div>
);

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
  <AppErrorBoundary>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      {/* Keep BASE_URL's trailing slash: with a slash-less basename React
          Router serializes the app root as "/app" (no slash) on every
          query-param navigation, and a reload of that URL misses Vite's
          /app/ base — an error page in place of the app. */}
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Suspense fallback={<PageLoading />}>
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
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </AppErrorBoundary>
  );
};

export default App;
