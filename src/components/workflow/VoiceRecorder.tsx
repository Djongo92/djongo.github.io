// §8 — Workflow: records a short voice comment via MediaRecorder and hands
// the caller back a base64 data URL (no object storage in this codebase
// yet — see the workflow migration's comment; same data-URL precedent as
// useFirmLogo.ts). This is genuinely new recording infra: the pre-existing
// VoiceNote.tsx is playback-only (an <audio> tag plus a static audioUrl
// prop) and isn't used anywhere in the app today — it has nothing to record
// with. This component's preview reuses that same play/pause-button-plus-
// <audio> shape once a take exists.
import { useEffect, useRef, useState } from "react";
import { Mic, Square, Play, Pause, Trash2 } from "lucide-react";

interface Props {
  onRecorded: (dataUrl: string | null) => void;
  disabled?: boolean;
}

const MAX_SECONDS = 120;

const VoiceRecorder = ({ onRecorded, disabled }: Props) => {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }, []);

  const startRecording = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          setDataUrl(result);
          onRecorded(result);
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach((t) => t.stop());
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s + 1 >= MAX_SECONDS) stopRecording();
          return s + 1;
        });
      }, 1000);
    } catch {
      setError("Couldn't access the microphone — check your browser permissions.");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const clear = () => {
    setDataUrl(null);
    setPlaying(false);
    onRecorded(null);
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) audioRef.current.pause();
    else audioRef.current.play();
    setPlaying((p) => !p);
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  if (dataUrl) {
    return (
      <div className="flex items-center gap-2 bg-secondary/40 border border-border/40 rounded-sm px-3 py-2">
        <button type="button" onClick={togglePlay} className="text-primary hover:text-gold-light shrink-0">
          {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>
        <span className="text-xs font-body text-muted-foreground flex-1">Voice note recorded</span>
        <audio ref={audioRef} src={dataUrl} onEnded={() => setPlaying(false)} className="hidden" />
        <button type="button" onClick={clear} disabled={disabled} className="text-muted-foreground hover:text-destructive shrink-0">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={recording ? stopRecording : startRecording}
        disabled={disabled}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-body border transition-colors disabled:opacity-50 ${
          recording ? "border-destructive/50 bg-destructive/10 text-destructive" : "border-border/50 text-muted-foreground hover:text-primary hover:border-primary/40"
        }`}
      >
        {recording ? <><Square className="w-3 h-3" /> Stop ({formatTime(seconds)})</> : <><Mic className="w-3 h-3" /> Record a voice note</>}
      </button>
      {error && <p className="text-[11px] text-destructive font-body mt-1">{error}</p>}
    </div>
  );
};

export default VoiceRecorder;
