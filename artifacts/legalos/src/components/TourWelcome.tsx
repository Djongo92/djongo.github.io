// The tour's front door.
//
// The tour used to simply begin — an overlay that seized the screen a moment
// after the dashboard settled, which is a popup nobody asked for however good
// the content is. Asking first costs one click and changes what the tour is:
// something the visitor chose, rather than something that happened to them.
//
// Declining is a first-class answer, not a failure state. That's why "Just
// explore" sits next to the primary as a real button rather than a grey
// dismiss link, and why the footnote names exactly how to get the tour back —
// the offer has to be cheap to refuse or it's just a popup with extra steps.
//
// Built on ModalShell rather than the tour's own overlay: this is a true
// modal that blocks the app until answered, where CoachMarks deliberately
// leaves the real UI visible and interactive behind its spotlight. ModalShell
// already owns focus trapping, Escape, focus restoration and the accessible
// name, so none of that is re-implemented here.
import ModalShell from "@/components/ui/modal-shell";
import type { TourVariant } from "@/hooks/useCoachMarks";

interface Props {
  open: boolean;
  variant: TourVariant;
  /** The fictional firm the showcase runs on, named in the demo framing. */
  firmName: string;
  onAccept: () => void;
  /** Also fires on Escape and on a backdrop click — see Index.tsx, which
   *  treats every one of those as the visitor answering "no". */
  onDecline: () => void;
}

const TourWelcome = ({ open, variant, firmName, onAccept, onDecline }: Props) => {
  const demo = variant === "demo";
  const eyebrow = demo ? "Product showcase" : "Welcome";
  const title = demo ? "You're looking at the real product." : "Welcome to Uvid.";
  // The showcase bar directly above already says "sample firm, synthetic
  // data" — repeating it here would waste the one moment the visitor is
  // actually reading. This says the thing the bar doesn't: it's the product
  // itself, not a mockup of it.
  const body = demo
    ? `Every number you're about to see was computed by the same audit that runs on paying firms — ${firmName} is invented, but nothing on this screen is a mockup, and nothing you click touches a real account.`
    : "Your dashboard is ready. The tour walks through your score, the eleven workshop tools, and the battle plan they roll into.";

  return (
    <ModalShell open={open} onClose={onDecline} maxWidthClass="max-w-[440px]" zIndexClass="z-[60]">
      <div className="p-6">
        <p className="text-[10px] eyebrow text-primary mb-2">{eyebrow}</p>
        {/* ModalShell borrows its accessible name from this heading. */}
        <h2 className="font-display text-2xl text-foreground leading-snug mb-2">{title}</h2>
        <p className="text-sm text-muted-foreground font-body leading-relaxed mb-6">{body}</p>

        <div className="flex flex-col sm:flex-row gap-2.5">
          <button
            onClick={onAccept}
            className="flex-1 bg-primary text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-body tap-scale"
          >
            Take the 2-min tour
          </button>
          <button
            onClick={onDecline}
            className="flex-1 bg-secondary text-foreground px-4 py-2.5 rounded-lg text-sm font-body tap-scale hairline border"
          >
            Just explore
          </button>
        </div>

        <p className="mt-4 text-[11px] text-muted-foreground/70 font-body text-center">
          You can start the tour any time from ⌘K or the sidebar.
        </p>
      </div>
    </ModalShell>
  );
};

export default TourWelcome;
