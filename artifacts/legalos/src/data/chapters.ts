// The guidebook — the doctrine layer the entire Workshop grounds on.
// One module per chapter under ./chapters/ (a 21-chapter book cannot live in
// a single file); this barrel preserves the "@/data/chapters" import surface
// for every consumer (ChapterView, chapterToText, quizzes, mobile parity).
export type {
  ActionItem,
  RichCallout,
  RichStat,
  AuditCategory,
  ChapterArtifact,
  RichComparison,
  RichDeepDive,
  ChapterSection,
  Chapter,
} from "./chapters/types";

import type { Chapter } from "./chapters/types";
import { eventMarketing } from "./chapters/event-marketing";
import { googleSearchConsole } from "./chapters/google-search-console";
import { summerMarketing } from "./chapters/summer-marketing";
import { marketerLeadershipGap } from "./chapters/marketer-leadership-gap";
import { thoughtLeadership } from "./chapters/thought-leadership";
import { writingThatResonates } from "./chapters/writing-that-resonates";
import { websiteChecklist } from "./chapters/website-checklist";
import { practiceAreaPages } from "./chapters/practice-area-pages";
import { websiteOwnership } from "./chapters/website-ownership";
import { messagingPositioning } from "./chapters/messaging-positioning";
import { marketingAsStrategy } from "./chapters/marketing-as-strategy";
import { buildingCredibility } from "./chapters/building-credibility";
import { whatGcsWant } from "./chapters/what-gcs-want";
import { commonMistakes } from "./chapters/common-mistakes";
import { reputationReviews } from "./chapters/reputation-reviews";
import { referralsAlumni } from "./chapters/referrals-alumni";
import { intakeConversion } from "./chapters/intake-conversion";
import { emailNurture } from "./chapters/email-nurture";
import { aiSearchVisibility } from "./chapters/ai-search-visibility";
import { pricingPackaging } from "./chapters/pricing-packaging";
import { measurement } from "./chapters/measurement";

export const chapters: Chapter[] = [
  eventMarketing,
  googleSearchConsole,
  summerMarketing,
  marketerLeadershipGap,
  thoughtLeadership,
  writingThatResonates,
  websiteChecklist,
  practiceAreaPages,
  websiteOwnership,
  messagingPositioning,
  marketingAsStrategy,
  buildingCredibility,
  whatGcsWant,
  commonMistakes,
  reputationReviews,
  referralsAlumni,
  intakeConversion,
  emailNurture,
  aiSearchVisibility,
  pricingPackaging,
  measurement,
];
