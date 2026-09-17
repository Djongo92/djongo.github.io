import { type ReactNode } from 'react';
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
import { GuidedTourProvider } from '@/components/guided-tour';

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
import Impact from '@/pages/impact';
import News from '@/pages/news';
import NewsDetail from '@/pages/news-detail';
import SearchPage from '@/pages/search';
import StatusPage from '@/pages/status';
import PlatformHub from '@/pages/platform/index';
import PlatformConsole from '@/pages/platform/console';
import PlatformPortal from '@/pages/platform/portal';
import PlatformSeam from '@/pages/platform/seam';
import NotFound from '@/pages/not-found';
import BlueprintOverview from '@/pages/blueprint/index';
import BlueprintDiagnostic from '@/pages/blueprint/diagnostic';
import BlueprintRoadmap from '@/pages/blueprint/roadmap';
import BlueprintDirection from '@/pages/blueprint/direction';
import BlueprintPages from '@/pages/blueprint/pages';

const queryClient = new QueryClient();

function Router() {
  return (
    <Shell>
      <RoutedErrorBoundary>
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
          <Route path="/status" component={StatusPage} />
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
                <GuidedTourProvider>
                  <Router />
                </GuidedTourProvider>
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
