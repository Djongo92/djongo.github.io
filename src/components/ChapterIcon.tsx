import {
  Calendar, Globe, Share2, FileText, Mail, Lightbulb,
  Users, Target, BarChart3, Video, Megaphone, Network,
  BookOpen, Shield, LucideIcon,
} from "lucide-react";

const iconComponents: Record<string, LucideIcon> = {
  Calendar, Globe, Share2, FileText, Mail, Lightbulb,
  Users, Target, BarChart3, Video, Megaphone, Network,
  BookOpen, Shield,
};

import { chapterIconMap } from "@/lib/chapterIcons";

interface ChapterIconProps {
  chapterId: string;
  className?: string;
}

const ChapterIcon = ({ chapterId, className = "w-5 h-5" }: ChapterIconProps) => {
  const iconName = chapterIconMap[chapterId];
  const Icon = iconName ? iconComponents[iconName] : BookOpen;
  return <Icon className={className} />;
};

export default ChapterIcon;
