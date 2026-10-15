export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <div className="text-center px-6">
        <div className="eyebrow text-xs text-primary mb-4">404</div>
        <h1 className="text-3xl md:text-4xl font-serif text-white mb-3">
          Page not found.
        </h1>
        <p className="text-sm text-muted-foreground mb-8">
          That address does not lead to a published page.
        </p>
        <a
          href="/"
          className="inline-flex items-center gap-2 border border-white/20 px-6 py-3 text-sm font-bold text-white uppercase tracking-wider hover:border-primary/50 hover:bg-primary/5 transition-all"
        >
          Return to Uvid
        </a>
      </div>
    </div>
  );
}
