import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';

/**
 * UI primitives for Signal vs Noise.
 *
 * Fhenix dark theme (navy-teal ground #001623):
 *  - Cyan (#0ad9dc) primary brand color.
 *  - Gilbert Qualifi Demo (display) + Product Sans (body); sentence case.
 *  - Sharp corners, hairline teal borders, restrained cyan glows.
 *  - Team A = pink (#ff6b8a), Team B = blue (#02c8ff).
 *
 * Tokens live in tailwind.config.js (bg.*, outline.*, ink.*, primary.*, accent.*).
 */

// ── utils ──────────────────────────────────────────────────────────────────

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

type AccentColor = 'green' | 'blue' | 'red' | 'yellow' | 'purple';
export type TeamColor = 'A' | 'B';

// Static maps — Tailwind only generates classes it can see as literal strings.
const ACCENT_TEXT: Record<AccentColor, string> = {
  green: 'text-accent-green',
  blue: 'text-accent-blue',
  red: 'text-accent-red',
  yellow: 'text-accent-yellow',
  purple: 'text-accent-purple',
};
const ACCENT_DOT: Record<AccentColor, string> = {
  green: 'bg-accent-green',
  blue: 'bg-accent-blue',
  red: 'bg-accent-red',
  yellow: 'bg-accent-yellow',
  purple: 'bg-accent-purple',
};

// ── Button ───────────────────────────────────────────────────────────────────

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

const BTN_BASE =
  'inline-flex items-center justify-center gap-2 font-semibold rounded-lg select-none ' +
  'transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed ' +
  'disabled:hover:scale-100 active:scale-[0.97] hover:scale-[1.02] ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50';

const BTN_SIZES: Record<ButtonSize, string> = {
  sm: 'text-sm px-4 min-h-[40px] py-2',
  md: 'text-sm px-6 min-h-[48px] py-3',
  lg: 'text-base px-6 min-h-[56px] py-4',
};

const BTN_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-bg hover:bg-primary/90 glow-green',
  secondary: 'bg-bg-elevated text-ink border border-outline hover:border-outline-strong hover:bg-bg-bright',
  outline: 'bg-transparent border border-primary/60 text-primary hover:bg-primary/10 hover:border-primary',
  danger: 'bg-accent-red text-white hover:bg-accent-red/90',
  ghost: 'bg-transparent text-ink-variant hover:text-ink',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', fullWidth, className, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cx(BTN_BASE, BTN_SIZES[size], BTN_VARIANTS[variant], fullWidth && 'w-full', className)}
      {...props}
    />
  );
});

// ── WalletButton (placeholder until RainbowKit in Phase 3) ───────────────────

export function WalletButton({
  address,
  onClick,
  className,
}: {
  address?: string | null;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cx(
        'flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-all',
        'border border-outline text-ink hover:border-primary/60 hover:text-primary',
        className,
      )}
    >
      <span aria-hidden>◈</span>
      {address ? address : 'Connect wallet'}
    </button>
  );
}

// ── Card ───────────────────────────────────────────────────────────────────

interface CardProps {
  children: ReactNode;
  glass?: boolean;
  className?: string;
  glow?: 'green' | 'blue' | 'red' | null;
}

const GLOW_BORDER: Record<'green' | 'blue' | 'red', string> = {
  green: 'glow-border-green',
  blue: 'glow-border-blue',
  red: 'glow-border-red',
};

export function Card({ children, glass, className, glow }: CardProps) {
  return (
    <div
      className={cx(
        'rounded-xl',
        glass ? 'bg-bg-surface/70 backdrop-blur-md' : 'bg-bg-card',
        glow ? GLOW_BORDER[glow] : 'border border-outline',
        className,
      )}
    >
      {children}
    </div>
  );
}

// ── Input ──────────────────────────────────────────────────────────────────

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  accent?: AccentColor;
  label?: string;
}

const INPUT_FOCUS: Record<AccentColor, string> = {
  green: 'focus:border-primary',
  blue: 'focus:border-accent-blue',
  red: 'focus:border-accent-red',
  yellow: 'focus:border-accent-yellow',
  purple: 'focus:border-accent-purple',
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { accent = 'green', label, className, ...props },
  ref,
) {
  return (
    <label className="block w-full">
      {label && <span className="block text-sm font-medium text-ink-variant mb-2">{label}</span>}
      <input
        ref={ref}
        className={cx(
          'w-full bg-bg-surface border border-outline rounded-lg px-4 min-h-[48px] py-3',
          'text-ink placeholder-ink-variant/40 outline-none transition-colors',
          // 16px base prevents iOS Safari auto-zoom
          'text-base',
          INPUT_FOCUS[accent],
          className,
        )}
        {...props}
      />
    </label>
  );
});

// ── Badge ─────────────────────────────────────────────────────────────────

interface BadgeProps {
  children: ReactNode;
  color?: AccentColor;
  dot?: boolean;
  pulse?: boolean;
  className?: string;
}

export function Badge({ children, color = 'green', dot, pulse, className }: BadgeProps) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-outline text-sm font-medium',
        'bg-bg-surface/60',
        ACCENT_TEXT[color],
        className,
      )}
    >
      {dot && <span className={cx('w-1.5 h-1.5 rounded-full', ACCENT_DOT[color], pulse && 'animate-pulse')} />}
      {children}
    </span>
  );
}

// ── BlockProgress (segmented progress bar) ───────────────────────────────────

export function BlockProgress({ total = 8, active = 0 }: { total?: number; active?: number }) {
  return (
    <div className="block-progress-container flex gap-[3px]">
      {Array.from({ length: total }).map((_, i) => (
        <span key={i} className={i < active ? 'active' : ''} />
      ))}
    </div>
  );
}

// ── PlayerAvatar ─────────────────────────────────────────────────────────────

interface PlayerAvatarProps {
  name: string;
  team?: TeamColor | null;
  size?: 'sm' | 'md';
}

export function PlayerAvatar({ name, team, size = 'md' }: PlayerAvatarProps) {
  const dims = size === 'sm' ? 'w-5 h-5 text-[10px]' : 'w-8 h-8 text-xs';
  const tone =
    team === 'A'
      ? 'border border-accent-red/40 text-accent-red bg-accent-red/10'
      : team === 'B'
        ? 'border border-accent-blue/40 text-accent-blue bg-accent-blue/10'
        : 'border border-outline text-ink-variant bg-bg-surface';
  return (
    <div className={cx('rounded-full flex items-center justify-center font-semibold shrink-0', dims, tone)}>
      {name[0]?.toUpperCase() ?? '?'}
    </div>
  );
}

// ── Screen ─────────────────────────────────────────────────────────────────

export function Screen({
  children,
  className,
  center = true,
}: {
  children: ReactNode;
  className?: string;
  center?: boolean;
}) {
  return (
    <div
      className={cx(
        'min-h-[100dvh] bg-bg px-4 sm:px-6',
        'pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]',
        center && 'flex flex-col items-center justify-center',
        className,
      )}
    >
      {children}
    </div>
  );
}
