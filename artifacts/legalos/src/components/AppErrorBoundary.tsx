import { Component, type ErrorInfo, type ReactNode } from "react";
import { reportError } from "@/lib/errorReporting";
import { MARKETING_HOME } from "@/lib/marketingSite";

// Last line of defence for render errors. Without it a single component
// throwing while rendering unmounts the whole app and leaves a blank page.
// The error is reported (src/lib/errorReporting.ts) and the visitor gets a
// way forward: reload, or go back to the site.

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Keep the component stack: the JS stack of a render error is mostly
    // React internals; the component stack says which component threw.
    const withComponents = Object.assign(new Error(error.message), {
      name: error.name,
      stack: `${error.stack ?? ""}\nComponent stack:${info.componentStack ?? ""}`,
    });
    reportError(withComponents, "boundary");
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <h1 className="mb-3 text-2xl font-semibold text-foreground">Something went wrong on this page</h1>
          <p className="mb-6 text-muted-foreground">
            The problem has been reported. Reloading the page usually fixes it.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Reload the page
            </button>
            <a
              href={MARKETING_HOME}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
            >
              Back to Uvid home
            </a>
          </div>
        </div>
      </div>
    );
  }
}
