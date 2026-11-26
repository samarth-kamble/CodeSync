import Link from 'next/link';
import { Logo } from '@/components/Logo';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <header className="border-b border-zinc-800 bg-zinc-950">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo className="w-8 h-[18px]" />
            <span className="text-sm font-semibold tracking-tight text-zinc-100">CodeSync</span>
          </Link>
          <Link href="/" className="text-xs text-zinc-400 hover:text-zinc-100 transition-colors">
            Home
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto px-6 py-12 space-y-8">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-white">Privacy Policy</h1>
          <p className="text-xs text-zinc-500 font-mono">Last Updated: 2026-11-26</p>
        </div>

        <section className="space-y-2.5 text-sm text-zinc-300 leading-relaxed">
          <h2 className="text-base font-semibold text-white">1. Data Collection and Storage</h2>
          <ul className="list-disc list-inside space-y-1.5 text-xs text-zinc-400">
            <li>
              <strong className="text-zinc-200">No Telemetry or Tracking:</strong> CodeSync does not
              collect, sell, or transmit browsing history or usage analytics to third parties.
            </li>
            <li>
              <strong className="text-zinc-200">Local-Only Storage:</strong> Your GitHub OAuth
              token, repository selection, preferences, and sync history remain on your device in{' '}
              <code className="text-orange-400">chrome.storage.local</code>.
            </li>
          </ul>
        </section>

        <section className="space-y-2.5 text-sm text-zinc-300 leading-relaxed">
          <h2 className="text-base font-semibold text-white">2. Permissions</h2>
          <ul className="list-disc list-inside space-y-1.5 text-xs text-zinc-400">
            <li>
              <code className="text-orange-400">storage</code>: Stores local settings, selected
              repository, and sync history.
            </li>
            <li>
              <code className="text-orange-400">notifications</code>: Displays optional desktop
              notifications when a submission is synced or fails.
            </li>
            <li>
              <code className="text-orange-400">identity</code>: Handles GitHub OAuth sign-in via{' '}
              <code className="text-orange-400">chrome.identity</code>.
            </li>
            <li>
              <strong className="text-zinc-200">Host Permissions:</strong> Scoped strictly to{' '}
              <code className="text-zinc-200">leetcode.com</code> and{' '}
              <code className="text-zinc-200">api.github.com</code>.
            </li>
          </ul>
        </section>

        <section className="space-y-2.5 text-sm text-zinc-300 leading-relaxed">
          <h2 className="text-base font-semibold text-white">3. Data Deletion</h2>
          <p className="text-xs text-zinc-400">
            Disconnect your GitHub account or wipe all local extension data anytime from{' '}
            <strong className="text-zinc-200">Settings: Account: Disconnect</strong> or{' '}
            <strong className="text-zinc-200">Settings: About &amp; Help: Reset All Data</strong>.
          </p>
        </section>
      </main>
    </div>
  );
}
