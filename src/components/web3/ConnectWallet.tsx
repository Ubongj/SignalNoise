import { ConnectButton } from '@rainbow-me/rainbowkit';
import { cx } from '@/components/ui/primitives';

/**
 * Wallet connect control, styled to match the app (green accent, rounded, mono
 * address). Wraps RainbowKit's headless ConnectButton.Custom so the markup is
 * ours. Handles: disconnected, wrong network, and connected states.
 */
export function ConnectWallet({ className }: { className?: string }) {
  return (
    <ConnectButton.Custom>
      {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
        const ready = mounted;
        const connected = ready && account && chain;

        const base =
          'flex items-center gap-2 whitespace-nowrap rounded-lg px-3 sm:px-4 py-2 text-sm font-medium transition-all';

        return (
          <div
            className={cx(className)}
            {...(!ready && { 'aria-hidden': true, style: { opacity: 0, pointerEvents: 'none' } })}
          >
            {!connected ? (
              <button
                onClick={openConnectModal}
                className={cx(base, 'bg-primary text-bg hover:bg-primary/90')}
              >
                <span aria-hidden>◈</span>
                Connect wallet
              </button>
            ) : chain.unsupported ? (
              <button
                onClick={openChainModal}
                className={cx(base, 'border border-accent-red/50 text-accent-red hover:bg-accent-red/10')}
              >
                Wrong network
              </button>
            ) : (
              <button
                onClick={openAccountModal}
                className={cx(base, 'border border-outline text-ink hover:border-primary/60')}
              >
                <span className="w-2 h-2 rounded-full bg-primary" aria-hidden />
                <span className="font-mono">{account.displayName}</span>
                {account.displayBalance ? (
                  <span className="hidden sm:inline text-ink-variant">· {account.displayBalance}</span>
                ) : null}
              </button>
            )}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
