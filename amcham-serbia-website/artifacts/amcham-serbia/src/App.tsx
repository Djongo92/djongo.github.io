import { lazy, Suspense, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';
import { MotionConfig } from 'framer-motion';

import { I18nProvider } from '@/lib/i18n';
import { Shell } from '@/components/layout/shell';
import { ShowcaseProvider } from '@/components/showcase-tour';

import Home from '@/pages/home';
import Membership from '@/pages/membership';
import Events from '@/pages/events';
import EventDetail from '@/pages/event-detail';
import Members from '@/pages/members';
import MemberDetail from '@/pages/member-detail';
import Insights from '@/pages/insights';
import InsightDetail from '@/pages/insight-detail';
import Advocacy from '@/pages/advocacy';
import About from '@/pages/about';
import News from '@/pages/news';
import NewsDetail from '@/pages/news-detail';
import SearchPage from '@/pages/search';
import { PrivacyPage, CookiesPage } from '@/pages/legal';
import NotFound from '@/pages/not-found';

// Heavier pages load their code on first visit.
const Impact = lazy(() => import('@/pages/impact'));
const Proposal = lazy(() => import('@/pages/proposal'));
const PlatformHub = lazy(() => import('@/pages/platform/index'));
const PlatformConsole = lazy(() => import('@/pages/platform/console'));
const PlatformPortal = lazy(() => import('@/pages/platform/portal'));
const PlatformSeam = lazy(() => import('@/pages/platform/seam'));
const BlueprintOverview = lazy(() => import('@/pages/blueprint/index'));
const BlueprintDiagnostic = lazy(() => import('@/pages/blueprint/diagnostic'));
const BlueprintRoadmap = lazy(() => import('@/pages/blueprint/roadmap'));
const BlueprintDirection = lazy(() => import('@/pages/blueprint/direction'));
const BlueprintPages = lazy(() => import('@/pages/blueprint/pages'));

const queryClient = new QueryClient();

function Router() {
  return (
    <Shell>
      <RoutedErrorBoundary>
        {/* The public pages ship with the first load; the heavier ones (the
            join form, the platform, the Blueprint) load their code on first visit. */}
        <Suspense fallback={<div className="min-h-[60vh]" aria-busy="true" />}>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/membership" component={Membership} />
          <Route path="/events" component={Events} />
          <Route path="/events/:id" component={EventDetail} />
          <Route path="/members" component={Members} />
          <Route path="/members/:id" component={MemberDetail} />
          <Route path="/insights" component={Insights} />
          <Route path="/insights/:id" component={InsightDetail} />
          <Route path="/advocacy" component={Advocacy} />
          <Route path="/about" component={About} />
          <Route path="/impact" component={Impact} />
          <Route path="/news" component={News} />
          <Route path="/news/:id" component={NewsDetail} />
          <Route path="/search" component={SearchPage} />
          <Route path="/privacy" component={PrivacyPage} />
          <Route path="/cookies" component={CookiesPage} />
          <Route path="/ai" component={Proposal} />
          <Route path="/proposal" component={Proposal} />
          <Route path="/platform" component={PlatformHub} />
          <Route path="/platform/console" component={PlatformConsole} />
          <Route path="/platform/portal" component={PlatformPortal} />
          <Route path="/platform/seam" component={PlatformSeam} />
          <Route path="/blueprint" component={BlueprintOverview} />
          <Route path="/blueprint/diagnostic" component={BlueprintDiagnostic} />
          <Route path="/blueprint/roadmap" component={BlueprintRoadmap} />
          <Route path="/blueprint/direction" component={BlueprintDirection} />
          <Route path="/blueprint/pages" component={BlueprintPages} />
          <Route component={NotFound} />
        </Switch>
        </Suspense>
      </RoutedErrorBoundary>
    </Shell>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <I18nProvider>
            <MotionConfig reducedMotion="user">
              <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
                <ShowcaseProvider>
                  <Router />
                </ShowcaseProvider>
              </WouterRouter>
            </MotionConfig>
            <Toaster />
          </I18nProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
