import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { primeDemoFromLocation, revokeUngrantedDemo } from "./lib/demoMode.ts";
import "./index.css";

// Close out any showcase session whose grant has expired with its tab, before
// the fixtures it left behind can be read as a live one.
revokeUngrantedDemo();

// Runs before the first render on purpose: a visitor arriving on /demo from
// the marketing site gets their fixtures seeded and the URL rewritten to the
// dashboard here, so the app boots straight into the populated Command Center
// instead of mounting once, redirecting, and mounting again.
primeDemoFromLocation();

createRoot(document.getElementById("root")!).render(<App />);
