import { motion } from "framer-motion";
import { Award, Flame, Clock } from "lucide-react";

interface Badge { id: string; label: string; earned: boolean; description: string }

interface Props {
  streak: number;
  totalMinutes: number;
  thisWeekMinutes: number;
  badges: Badge[];
}

const Achievements = ({ streak, totalMinutes, thisWeekMinutes, badges }: Props) => {
  const earned = badges.filter((b) => b.earned).length;

  return (
    <div className="space-y-4">
      {/* Streak/time strip */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-border/40 rounded-sm p-4">
          <Flame className={`w-4 h-4 mb-2 ${streak > 0 ? "text-primary" : "text-muted-foreground"}`} />
          <div className="font-display text-2xl text-foreground font-semibold">{streak}d</div>
          <p className="text-[10px] text-muted-foreground font-body mt-0.5">Current streak</p>
        </div>
        <div className="bg-card border border-border/40 rounded-sm p-4">
          <Clock className="w-4 h-4 text-primary mb-2" />
          <div className="font-display text-2xl text-foreground font-semibold">{thisWeekMinutes}m</div>
          <p className="text-[10px] text-muted-foreground font-body mt-0.5">This week invested</p>
        </div>
        <div className="bg-card border border-border/40 rounded-sm p-4">
          <Award className="w-4 h-4 text-primary mb-2" />
          <div className="font-display text-2xl text-foreground font-semibold">{earned}/{badges.length}</div>
          <p className="text-[10px] text-muted-foreground font-body mt-0.5">Badges earned</p>
        </div>
      </div>

      {/* Badges */}
      <div>
        <h3 className="font-display text-base text-foreground mb-3">Badges</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {badges.map((b, i) => (
            <motion.div
              key={b.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.04 }}
              className={`relative p-4 rounded-sm border text-center transition-all ${
                b.earned
                  ? "border-primary/40 bg-gradient-to-br from-primary/10 to-card"
                  : "border-border/30 bg-muted/20 opacity-50"
              }`}
            >
              <Award className={`w-5 h-5 mx-auto mb-2 ${b.earned ? "text-primary" : "text-muted-foreground"}`} />
              <p className={`font-display text-xs font-medium ${b.earned ? "text-foreground" : "text-muted-foreground"}`}>
                {b.label}
              </p>
              <p className="text-[9px] text-muted-foreground font-body mt-1 leading-tight">{b.description}</p>
            </motion.div>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground font-body mt-2 italic">
          Total time invested across all sessions: {Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m
        </p>
      </div>
    </div>
  );
};

export default Achievements;
