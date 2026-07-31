import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

type ToastKind = 'info' | 'success' | 'error' | 'pending';

interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
  href?: string;
}

interface ToastApi {
  /** Show a toast. Pass an existing `id` to update one in place (e.g. pending → success). */
  show: (kind: ToastKind, message: string, opts?: { id?: number; duration?: number; href?: string }) => number;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}

let _nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const show = useCallback<ToastApi['show']>(
    (kind, message, opts = {}) => {
      const id = opts.id ?? ++_nextId;
      setToasts((t) => [...t.filter((x) => x.id !== id), { id, kind, message, href: opts.href }]);
      // pending toasts stay until updated/dismissed; others auto-clear
      if (kind !== 'pending' && opts.duration !== 0) {
        setTimeout(() => dismiss(id), opts.duration ?? 4500);
      }
      return id;
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ show, dismiss }}>
      {children}
      <div className="fixed z-[60] bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 w-[calc(100%-2rem)] max-w-sm pointer-events-none">
        {toasts.map((t) => (
          <ToastRow key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastRow({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const icon =
    toast.kind === 'pending' ? (
      <span className="w-3.5 h-3.5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    ) : toast.kind === 'success' ? (
      <span className="text-primary">✓</span>
    ) : toast.kind === 'error' ? (
      <span className="text-accent-red">✕</span>
    ) : (
      <span className="w-2 h-2 rounded-full bg-ink-variant" />
    );

  return (
    <div className="pointer-events-auto w-full flex items-center gap-3 rounded-xl border border-outline bg-bg-card/95 backdrop-blur px-4 py-3 text-sm shadow-lg animate-slide-up">
      <span className="shrink-0 flex items-center justify-center w-4">{icon}</span>
      <span className="flex-1 text-ink leading-snug">
        {toast.message}
        {toast.href && (
          <>
            {' '}
            <a href={toast.href} target="_blank" rel="noreferrer" className="text-primary hover:underline">
              view ↗
            </a>
          </>
        )}
      </span>
      <button onClick={onDismiss} className="shrink-0 text-ink-variant/60 hover:text-ink text-xs" aria-label="Dismiss">
        ✕
      </button>
    </div>
  );
}
