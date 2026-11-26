import Link from 'next/link';
import { Logo } from '@/components/Logo';

export default function HomePage() {
  const capabilities = [
    {
      title: 'Accepted-Only Verdict Gate',
      desc: 'Intercepts submission checks in the browser and discards Wrong Answer, TLE, MLE, Runtime Error, and Compile Error results.',
    },
    {
      title: 'Single Atomic Commits',
      desc: 'Uses the GitHub Git Data API (Blobs, Trees, Commits, Refs) to push the solution file, problem README, and root index in one commit.',
    },
    {
      title: 'Configurable Folder Structure',
      desc: 'Push to root by default, organize by Topic, Difficulty, or Language, or pick and create folders manually before each push.',
    },
    {
      title: '21+ Supported Languages',
      desc: 'Maps LeetCode language slugs to canonical file extensions and prepends aligned comment headers for C++, Java, Python, TypeScript, Go, Rust, and SQL.',
    },
    {
      title: 'Audit Log and Retry Queue',
      desc: 'Tracks every sync attempt locally with runtime/memory benchmarks, JSON log export, one-click retry, and sequential ref-conflict handling.',
    },
    {
      title: 'Local-Only Token Storage',
      desc: 'OAuth tokens, repository selections, and sync logs stay in chrome.storage.local. No external analytics or tracking scripts.',
    },
  ];

  const setupSteps = [
    {
      num: '01',
      title: 'Install Extension',
      desc: 'Load the Manifest V3 Chrome extension and open Settings.',
    },
    {
      num: '02',
      title: 'Authorize GitHub',
      desc: 'Sign in with GitHub OAuth, pick a target repository and branch, or create a new repository.',
    },
    {
      num: '03',
      title: 'Submit on LeetCode',
      desc: 'Solve problems normally. Accepted submissions commit directly to your repository.',
    },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-950">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo className="w-8 h-[18px]" />
            <span className="text-sm font-semibold tracking-tight text-zinc-100">
              CodeSync
            </span>
            <span className="text-[11px] px-1.5 py-0.5 rounded-md bg-zinc-900 text-zinc-400 font-mono border border-zinc-800">
              v0.1.0
            </span>
          </Link>

          <nav className="flex items-center gap-6 text-xs font-medium text-zinc-400">
            <a href="#features" className="hover:text-zinc-100 transition-colors">
              Features
            </a>
            <a href="#setup" className="hover:text-zinc-100 transition-colors">
              Setup
            </a>
            <Link href="/privacy" className="hover:text-zinc-100 transition-colors">
              Privacy
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="max-w-5xl mx-auto px-6 pt-16 pb-14 grid lg:grid-cols-2 gap-10 items-start">
          <div className="space-y-5">
            <div className="inline-block px-2.5 py-1 rounded-md bg-zinc-900 text-zinc-400 border border-zinc-800 text-xs font-mono">
              Chrome Manifest V3 Extension
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white leading-tight">
              Push accepted LeetCode solutions to GitHub in one atomic commit.
            </h1>

            <p className="text-sm text-zinc-400 leading-relaxed">
              CodeSync monitors LeetCode submission checks, filters out non-accepted verdicts, and
              commits your formatted code, problem README.md, and progress index directly to your
              chosen repository and branch.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <a
                href="#setup"
                className="px-4 py-2 rounded-md bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold transition-colors"
              >
                Get Started
              </a>
              <a
                href="#features"
                className="px-4 py-2 rounded-md bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 text-xs font-medium transition-colors"
              >
                Capabilities
              </a>
            </div>
          </div>

          {/* Concrete Output Preview */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-zinc-800 bg-zinc-900 flex items-center justify-between text-[11px] font-mono">
              <span className="text-zinc-300">Commit Output Preview</span>
              <span className="text-zinc-400">
                Time: 2 ms (98.21%) | Memory: 47.8 MB (78.01%) - CodeSync
              </span>
            </div>

            <div className="p-4 space-y-3 font-mono text-xs">
              <div className="text-zinc-300 space-y-1">
                <div className="text-zinc-500">Repository Tree</div>
                <div className="pl-2 border-l border-zinc-800 space-y-1">
                  <div>0198-house-robber/</div>
                  <div className="pl-4 text-zinc-200">├── house-robber.py</div>
                  <div className="pl-4 text-zinc-400">└── README.md</div>
                  <div className="text-orange-400">README.md</div>
                </div>
              </div>

              <pre className="p-3 rounded-md bg-zinc-950 border border-zinc-800 text-[11px] text-zinc-300 overflow-x-auto leading-relaxed">
{`# Problem  : 198. House Robber
# Link     : https://leetcode.com/problems/house-robber/
# Diff     : Medium
# Language : Python 3
# Runtime  : 2 ms (Beats 98.21%)
# Memory   : 47.8 MB (Beats 78.01%)
# Synced   : CodeSync`}
              </pre>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="max-w-5xl mx-auto px-6 py-14 border-t border-zinc-900">
          <div className="mb-8 space-y-1">
            <h2 className="text-xl font-semibold text-white">Architecture and Capabilities</h2>
            <p className="text-xs text-zinc-400">
              Built for deterministic Git history and local-first privacy.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {capabilities.map((item) => (
              <div
                key={item.title}
                className="p-4 rounded-lg border border-zinc-800 bg-zinc-900/40 space-y-1.5"
              >
                <h3 className="text-sm font-semibold text-zinc-100">{item.title}</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Setup */}
        <section id="setup" className="max-w-5xl mx-auto px-6 py-14 border-t border-zinc-900">
          <div className="mb-8 space-y-1">
            <h2 className="text-xl font-semibold text-white">Setup</h2>
            <p className="text-xs text-zinc-400">Three steps to start syncing.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {setupSteps.map((step) => (
              <div
                key={step.num}
                className="p-4 rounded-lg border border-zinc-800 bg-zinc-900/40 space-y-2"
              >
                <span className="inline-block text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md bg-zinc-950 text-orange-400 border border-zinc-800">
                  Step {step.num}
                </span>
                <h3 className="text-sm font-semibold text-white">{step.title}</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 bg-zinc-950 py-6">
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <span>CodeSync: LeetCode to GitHub Synchronization</span>
          <div className="flex items-center gap-5">
            <Link href="/privacy" className="hover:text-zinc-300 transition-colors">
              Privacy Policy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
