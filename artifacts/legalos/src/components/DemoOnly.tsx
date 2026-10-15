import type { ReactNode } from "react";
import { isDemoMode } from "@/lib/demoMode";

interface Props {
  children: ReactNode;
  /** Rendered instead when this is a real account. Usually nothing. */
  fallback?: ReactNode;
}

/**
 * Renders its children only inside the showcase.
 *
 * This is the sanctioned seam for letting the demo differ from the product —
 * staged copy, a narrated aside, a panel teasing something that isn't built
 * yet, or hiding a surface that isn't ready to be shown to a prospect.
 *
 * It exists so that "the demo should say something different here" never
 * becomes an argument for maintaining a second, mocked copy of the app. A
 * forked demo drifts silently: the real product changes, the mock doesn't, and
 * nothing fails until a prospect is looking at a screen that no longer exists.
 * A conditional inside the real component tree cannot drift, because there is
 * only one tree — delete the surrounding feature and this breaks at compile
 * time, loudly, in front of whoever deleted it.
 *
 * The rule that keeps that true: deviate in *presentation*, never in
 * *substance*. Reframe a number, don't invent one. Anything shown here that
 * the product cannot actually do must say so on its face.
 */
const DemoOnly = ({ children, fallback = null }: Props) => <>{isDemoMode() ? children : fallback}</>;

export default DemoOnly;
