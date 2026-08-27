// Lightweight, privacy-friendly analytics wrapper.
//
// Works with Umami (window.umami.track) and Plausible (window.plausible) — the
// script is injected in _app.tsx only when the env vars are set, so with no
// config this is a complete no-op and ships safely. Pageviews are tracked
// automatically by the provider script; use track() for custom game events.
//
// Analytics must NEVER break the game, so every call is wrapped in try/catch.

type Props = Record<string, string | number | boolean | undefined | null>;

interface AnalyticsWindow {
  umami?: { track?: (event: string, data?: Record<string, unknown>) => void };
  plausible?: (event: string, opts?: { props?: Record<string, unknown> }) => void;
}

/** Fire a custom event to whichever provider is loaded. Safe to call anywhere. */
export function track(event: string, props?: Props): void {
  if (typeof window === 'undefined') return;
  try {
    const clean = props
      ? Object.fromEntries(Object.entries(props).filter(([, v]) => v !== undefined && v !== null))
      : undefined;
    const w = window as unknown as AnalyticsWindow;
    w.umami?.track?.(event, clean);
    w.plausible?.(event, clean ? { props: clean } : undefined);
  } catch {
    /* never let analytics throw into the app */
  }
}

// Named helpers so event names stay consistent across the codebase.
export const analytics = {
  roomCreated: (p: Props) => track('room_created', p),
  roomJoined:  (p?: Props) => track('room_joined', p),
  demoStarted: (p: Props) => track('demo_started', p),
  gameStarted: (p?: Props) => track('game_started', p),
  gameOver:    (p?: Props) => track('game_over', p),
};
