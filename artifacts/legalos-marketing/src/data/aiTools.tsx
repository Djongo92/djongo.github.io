// The AI Workshop tool list — shared so every "N-tool" mention on the site
// (landing headline, feature list, FAQ) derives from one source and can't
// drift when tools are added or removed.
import {
  FileText, Crosshair, BarChart, Newspaper, Globe, BookOpen,
  Users, TrendingUp, Target, Award, MapPin,
} from 'lucide-react';

export const AI_TOOLS = [
  { icon: <FileText className="w-4 h-4" />, name: "Bio Optimizer",        desc: "Craft partner bios that surface in directory searches" },
  { icon: <Crosshair className="w-4 h-4" />, name: "Pitch Generator",     desc: "Generate client-facing capability statements by practice area" },
  { icon: <BarChart className="w-4 h-4" />, name: "Competitor Intel",      desc: "Map the gaps between you and the market leaders" },
  { icon: <Newspaper className="w-4 h-4" />, name: "PR Story Drafter",    desc: "Produce press-ready narratives from deal or case outcomes" },
  { icon: <Globe className="w-4 h-4" />, name: "Website Audit",           desc: "Identify technical and content gaps vs. the most visible firms" },
  { icon: <BookOpen className="w-4 h-4" />, name: "Directory Optimizer",  desc: "Maximise placement in Chambers, Legal 500, and IFLR" },
  { icon: <Users className="w-4 h-4" />, name: "Referral Map Builder",    desc: "Identify and prioritise high-value referral relationships" },
  { icon: <TrendingUp className="w-4 h-4" />, name: "Score Forecaster",   desc: "Model score changes from planned improvements" },
  { icon: <Target className="w-4 h-4" />, name: "Practice Area Benchmark", desc: "Benchmark each practice against peer specialists" },
  { icon: <Award className="w-4 h-4" />, name: "Award Submission Writer", desc: "Draft award and ranking submissions from your matter data" },
  { icon: <MapPin className="w-4 h-4" />, name: "Market Entry Analyst",   desc: "Evaluate expansion readiness into new CEE jurisdictions" },
];
