import { useState } from "react";
import { Sun, Moon, Coffee, Type, X, Settings as SettingsIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useReadingTheme, ReadingTheme, FontScale } from "@/hooks/useReadingTheme";

const themes: { id: ReadingTheme; label: string; icon: typeof Sun }[] = [
  { id: "dark", label: "Dark", icon: Moon },
  { id: "light", label: "Light", icon: Sun },
  { id: "sepia", label: "Sepia", icon: Coffee },
];

const fontSizes: { id: FontScale; label: string }[] = [
  { id: "sm", label: "S" },
  { id: "md", label: "M" },
  { id: "lg", label: "L" },
  { id: "xl", label: "XL" },
];

const ReadingControls = () => {
  const [open, setOpen] = useState(false);
  const { theme, setTheme, fontScale, setFontScale, pageTransitions, setPageTransitions } = useReadingTheme();

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="p-2 text-muted-foreground hover:text-primary transition-colors"
        aria-label="Reading settings"
      >
        <SettingsIcon className="w-4 h-4" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/70 backdrop-blur-sm flex items-center justify-center p-4 print:hidden"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-card border border-border rounded-lg shadow-2xl overflow-hidden"
            >
              <div className="px-5 py-3 border-b border-border/50 flex items-center justify-between">
                <h3 className="font-display text-base text-foreground">Reading settings</h3>
                <button onClick={() => setOpen(false)} className="p-1.5 text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-5 space-y-5">
                <div>
                  <p className="text-[10px] tracking-wider uppercase text-muted-foreground font-body mb-2">Theme</p>
                  <div className="grid grid-cols-3 gap-2">
                    {themes.map(({ id, label, icon: Icon }) => (
                      <button
                        key={id}
                        onClick={() => setTheme(id)}
                        className={`flex flex-col items-center gap-1.5 py-3 rounded-sm border text-xs font-body transition-colors ${
                          theme === id
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-border/50 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-[10px] tracking-wider uppercase text-muted-foreground font-body mb-2">
                    <Type className="inline w-3 h-3 mr-1" /> Text size
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {fontSizes.map(({ id, label }) => (
                      <button
                        key={id}
                        onClick={() => setFontScale(id)}
                        className={`py-2 rounded-sm border font-body transition-colors ${
                          fontScale === id
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-border/50 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                        }`}
                        style={{ fontSize: id === "sm" ? "11px" : id === "md" ? "13px" : id === "lg" ? "15px" : "17px" }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border/30">
                  <div>
                    <p className="font-body text-sm text-foreground">Page-turn transitions</p>
                    <p className="text-[10px] text-muted-foreground font-body">Cinematic slide between chapters</p>
                  </div>
                  <button
                    onClick={() => setPageTransitions(!pageTransitions)}
                    className={`relative w-10 h-5 rounded-full transition-colors ${pageTransitions ? "bg-primary" : "bg-muted"}`}
                    aria-label="Toggle page transitions"
                  >
                    <motion.span
                      className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-card"
                      animate={{ x: pageTransitions ? 20 : 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ReadingControls;
