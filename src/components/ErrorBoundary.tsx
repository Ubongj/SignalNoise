import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

/**
 * Catches uncaught render errors anywhere below it and shows a themed recovery
 * screen instead of a blank white crash. Wraps the page in _app.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: unknown) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-screen bg-bg text-ink flex flex-col items-center justify-center px-6 text-center gap-4">
        <div className="text-5xl" aria-hidden>
          ⚠️
        </div>
        <h1 className="font-display font-bold text-2xl">Something went wrong</h1>
        <p className="text-ink-variant text-sm max-w-sm leading-relaxed">
          An unexpected error interrupted the app. Reloading usually fixes it — any live game will
          reconnect automatically.
        </p>
        <div className="flex gap-3 mt-1">
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg bg-primary text-bg font-semibold px-5 py-2.5 text-sm hover:bg-primary/90 transition-colors"
          >
            Reload
          </button>
          <button
            onClick={() => (window.location.href = '/')}
            className="rounded-lg border border-outline text-ink-variant hover:text-ink font-medium px-5 py-2.5 text-sm transition-colors"
          >
            Back to home
          </button>
        </div>
      </div>
    );
  }
}
