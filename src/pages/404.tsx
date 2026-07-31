import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-bg text-ink flex flex-col items-center justify-center px-6 text-center gap-5">
      <p className="font-display font-bold text-[clamp(4rem,20vw,8rem)] leading-none text-ink/90">404</p>
      <div className="space-y-1">
        <h1 className="font-display font-bold text-2xl">Lost in the noise</h1>
        <p className="text-ink-variant text-sm max-w-xs mx-auto leading-relaxed">
          That page doesn&apos;t exist. Let&apos;s get you back to the signal.
        </p>
      </div>
      <Link
        href="/"
        className="rounded-lg bg-primary text-bg font-semibold px-5 py-2.5 text-sm hover:bg-primary/90 transition-colors"
      >
        Back to home
      </Link>
    </div>
  );
}
