import { useEffect, useRef } from "react";

const GoldParticles = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let paused = document.visibilityState === "hidden";
    const particles: { x: number; y: number; vx: number; vy: number; size: number; opacity: number; life: number }[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // Respect prefers-reduced-motion — draw the particles once, statically,
    // instead of running an indefinite requestAnimationFrame loop.
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Also pause the loop while the tab is hidden — no reason to keep a
    // canvas animation running (and burning battery) in a background tab.
    const handleVisibility = () => {
      paused = document.visibilityState === "hidden";
      if (!paused && !reduceMotion) draw();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    // Initialize particles
    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 2 + 0.5,
        opacity: Math.random() * 0.5 + 0.1,
        life: Math.random() * 1000,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Scroll-velocity damping: particles drift slower while scrolling slowly.
      const v = (window as unknown as { __scrollV?: number }).__scrollV ?? 0;
      const damp = Math.min(1, 0.7 + v * 1.5);

      particles.forEach((p) => {
        p.x += p.vx * damp;
        p.y += p.vy * damp;
        p.life += 0.5;
        p.opacity = 0.1 + Math.sin(p.life * 0.01) * 0.25;

        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(38, 45%, 60%, ${p.opacity})`;
        ctx.fill();
      });

      // Draw connecting lines between nearby particles
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 150) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `hsla(38, 45%, 60%, ${0.06 * (1 - dist / 150)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      if (!reduceMotion && !paused) animationId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ opacity: 0.7 }}
    />
  );
};

export default GoldParticles;
