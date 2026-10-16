import { ArrowRight, ExternalLink } from "lucide-react";
import { MARKETING_HOME } from "@/lib/marketingSite";
import { readShowcaseGrant } from "@/lib/demoAccess";

interface Props {
  /** Leaves the showcase. An anonymous visitor lands on the app's own
   * sign-in; a visitor who is already signed in lands straight on their
   * real firm's dashboard — the label must say which, or the arrival
   * reads as a bug. */
  onLogIn: () => void;
  /** True when the demo visitor also holds a real session in this browser
   * (teardown deliberately never signs a real account out). */
  alreadySignedIn?: boolean;
}

/**
 * The strip across the top of the showcase.
 *
 * Its job is framing, not navigation. A visitor sent a link to "the product"
 * lands inside a full application with a sidebar and a firm name, and without
 * something saying otherwise, there is nothing on screen to tell them whether
 * Petrović & Partners is real, whether they're logged into something, or how
 * this relates to the site they just left. All three answers live here.
 *
 * It also carries the one action the whole showcase exists to produce: the
 * move from watching the product to using it.
 */
const ShowcaseBar = ({ onLogIn, alreadySignedIn = false }: Props) => {
  const grant = readShowcaseGrant();

  return (
    // Fixed rather than in-flow: AppShell's frame is a flex row, and a bar
    // that scrolls away would stop answering "what am I looking at?" exactly
    // when someone is deep enough into the product to wonder. z-40 keeps it
    // under dialogs and the guided tour, which should cover it.
    <div className="fixed top-0 inset-x-0 z-40 h-11 flex items-center gap-4 px-4 border-b hairline bg-card/95 backdrop-blur-sm">
      <div className="flex items-center gap-2.5 shrink-0">
        <span className="text-[10px] eyebrow text-primary">Showcase</span>
        {grant?.label && (
          <span className="hidden sm:inline text-[10px] eyebrow text-muted-foreground">
            for {grant.label}
          </span>
        )}
      </div>

      <p className="flex-1 min-w-0 truncate text-xs text-muted-foreground font-body">
        <span className="hidden md:inline">This is the live Uvid product. </span>
        Sample firm, synthetic data — nothing here is a real business.
      </p>

      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={onLogIn}
          className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-xs font-body tap-scale"
        >
          <span className="hidden sm:inline">{alreadySignedIn ? "Exit demo — back to my firm" : "Run it on my firm"}</span>
          <span className="sm:hidden">{alreadySignedIn ? "My firm" : "Log in"}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
        <a
          href={MARKETING_HOME}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-body text-muted-foreground hover:text-foreground transition-colors tap-scale"
        >
          <span className="hidden sm:inline">Back to site</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
};

export default ShowcaseBar;
