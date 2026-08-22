import { cx } from '@/components/ui/primitives';

/**
 * A single clue "play" card shown to the guesser.
 *
 * Deliberately minimal: only a C-label (C1, C2, …) and the clue word.
 * The clues arrive already shuffled from the server, so the label order
 * carries no information about which clues are honest vs sabotage.
 *
 * `tone` optionally color-codes real/fake for observer/result views, but
 * the guesser always sees `neutral` — no encrypted / real / fake tags.
 */

// Pick a font size that keeps even long words inside the fixed-width card.
function wordSizeClass(text = ''): string {
  const n = text.length;
  if (n <= 5) return 'text-2xl sm:text-3xl';
  if (n <= 7) return 'text-xl sm:text-2xl';
  if (n <= 9) return 'text-lg sm:text-xl';
  if (n <= 11) return 'text-base sm:text-lg';
  return 'text-sm sm:text-base';
}

export function ClueCard({
  label,
  text,
  tone = 'neutral',
  hidden = false,
  className,
}: {
  label: string;
  text?: string;
  tone?: 'neutral' | 'real' | 'fake';
  hidden?: boolean;
  className?: string;
}) {
  const toneClass =
    tone === 'real'
      ? 'border-accent-green/40 bg-accent-green/[0.08] text-accent-green shadow-[0_0_16px_rgba(10,217,220,0.15)]'
      : tone === 'fake'
        ? 'border-white/10 bg-white/[0.03] text-ink-variant'
        : 'border-white/10 bg-white/[0.06] text-ink hover:border-primary/50 hover:bg-white/[0.09]';

  return (
    <div
      className={cx(
        // glassy: translucent fill + blur + soft top-edge highlight
        'relative flex flex-col justify-between rounded-2xl border p-4 transition-all backdrop-blur-md',
        'w-[128px] h-[168px] sm:w-[144px] sm:h-[188px] overflow-hidden',
        'before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/15 before:content-[""]',
        toneClass,
        className,
      )}
    >
      {/* C-label */}
      <span className="font-mono text-xs text-ink-variant/70">{label}</span>

      {/* Word */}
      <div className="flex-1 flex items-center justify-center px-1 min-w-0">
        {hidden ? (
          <span className="text-4xl font-bold text-ink-variant/40">?</span>
        ) : (
          <span
            className={cx(
              'font-bold text-center leading-tight break-words hyphens-auto w-full',
              wordSizeClass(text),
            )}
          >
            {text}
          </span>
        )}
      </div>

      {/* spacer keeps the word optically centered under the label */}
      <span className="h-4" aria-hidden />
    </div>
  );
}
