import { Card, CardContent } from '../../components/ui/Card';
import { CheckCircle2, Languages, ShieldCheck } from 'lucide-react';
import { SUPPORTED_LANGUAGES, type SyncHistoryEntry } from '@leetsync/shared';

interface StatsCardProps {
  syncHistory: SyncHistoryEntry[];
}

export function StatsCard({ syncHistory }: StatsCardProps) {
  const successfulCount = syncHistory.filter((item) => item.status === 'SUCCESS').length;
  const supportedLangCount = Object.keys(SUPPORTED_LANGUAGES).length;

  return (
    <Card className="py-2.5">
      <CardContent className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Total Synced
          </span>
          <span className="font-mono text-slate-200 font-medium">{successfulCount} solutions</span>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <Languages className="w-3.5 h-3.5 text-slate-400" /> Supported Languages
          </span>
          <span className="font-mono text-slate-200">{supportedLangCount} languages</span>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-orange-400" /> Submission Gate
          </span>
          <span className="text-emerald-400 font-mono text-[11px]">Accepted Only</span>
        </div>
      </CardContent>
    </Card>
  );
}

