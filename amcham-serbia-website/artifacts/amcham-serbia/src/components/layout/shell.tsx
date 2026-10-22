import React, { useEffect } from 'react';
import { useLocation } from 'wouter';
import { Header } from './header';
import { Footer } from './footer';
import { ChatBubble } from './chat-bubble';
import { CookieConsent } from '@/components/cookie-consent';
import { AnimatePresence, motion } from 'framer-motion';

export function Shell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);

  // The console and portal are apps with their own chrome; the site header,
  // footer and chat bubble would stack a second navigation bar on top.
  if (/^\/platform\/(console|portal)/.test(location)) {
    return <div className="min-h-[100dvh] bg-background selection:bg-primary/20 selection:text-primary">{children}</div>;
  }

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background selection:bg-primary/20 selection:text-primary">
      <Header />
      <main className="flex-1 w-full relative">
        {/* No fade on the first page load, so content paints straight away. */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="w-full h-full"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
      <Footer />
      <ChatBubble />
      <CookieConsent />
    </div>
  );
}
