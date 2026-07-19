import { useRef, useState } from "react";
import { Play, Pause, Mic } from "lucide-react";
import { motion } from "framer-motion";

export interface VoiceNoteData {
  title: string;
  duration: string;
  audioUrl?: string; // Optional: when not provided, shows "coming soon" state
}

const VoiceNote = ({ data }: { data: VoiceNoteData }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  const toggle = () => {
    if (!data.audioUrl || !audioRef.current) return;
    if (playing) audioRef.current.pause();
    else audioRef.current.play();
    setPlaying(!playing);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="my-6 flex items-center gap-4 px-5 py-4 border border-border/40 rounded-sm bg-card"
    >
      <button
        onClick={toggle}
        disabled={!data.audioUrl}
        className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50 hover:bg-primary/90 transition-colors shrink-0"
        aria-label={playing ? "Pause" : "Play"}
      >
        {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <Mic className="w-3 h-3 text-primary" />
          <span className="text-[10px] tracking-wider uppercase text-primary font-body">Office Hours</span>
        </div>
        <p className="font-display text-sm text-foreground font-medium truncate">{data.title}</p>
        <p className="text-[10px] text-muted-foreground font-body">
          {data.audioUrl ? data.duration : "Coming soon · Voice notes from the author"}
        </p>
      </div>
      {data.audioUrl && (
        <audio
          ref={audioRef}
          src={data.audioUrl}
          onEnded={() => setPlaying(false)}
        />
      )}
    </motion.div>
  );
};

export default VoiceNote;
