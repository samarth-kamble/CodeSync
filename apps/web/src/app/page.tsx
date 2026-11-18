export default function HomePage() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 text-xs font-mono">
          CodeSync v0.1.0
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white">
          CodeSync Platform
        </h1>
        <p className="text-sm text-slate-400">
          The automated background bridge between your LeetCode practice and your personal GitHub repository.
        </p>
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400 text-left space-y-2">
          <p className="font-semibold text-slate-200">Active Services:</p>
          <ul className="list-disc list-inside space-y-1 font-mono text-[11px] text-slate-400">
            <li>GET /api/health (Operational)</li>
            <li>POST /api/oauth/exchange (Operational)</li>
            <li>Web Dashboard & Subscriptions (Coming soon)</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
