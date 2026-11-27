import { GithubIcon } from '../../components/icons/GithubIcon';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { LogOut, AlertTriangle, RefreshCw } from 'lucide-react';
import type { AuthState } from '@leetsync/shared';

interface AccountStatusCardProps {
  auth: AuthState;
  onConnect: () => void;
  onDisconnect: () => void;
}

export function AccountStatusCard({ auth, onConnect, onDisconnect }: AccountStatusCardProps) {
  const isExpired = Boolean(auth.isConnected && auth.sessionExpired);

  return (
    <Card className={isExpired ? 'border-amber-500/40 bg-amber-950/10' : undefined}>
      <CardHeader>
        <CardTitle>GitHub Account</CardTitle>
        <Badge variant={!auth.isConnected || isExpired ? 'warning' : 'success'}>
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              !auth.isConnected || isExpired ? 'bg-amber-400' : 'bg-emerald-400'
            }`}
          />
          {isExpired ? 'Session Expired' : auth.isConnected ? 'Connected' : 'Not Connected'}
        </Badge>
      </CardHeader>

      <CardContent className="space-y-2.5">
        {isExpired && (
          <div className="p-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 space-y-2">
            <div className="flex items-start gap-2 text-[11px] text-amber-200">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
              <span>GitHub rejected your token (401). Reconnect to resume syncing.</span>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={onConnect}
              className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reconnect GitHub
            </Button>
          </div>
        )}
        {!auth.isConnected ? (
          <Button
            type="button"
            variant="outline"
            className="w-full bg-white text-slate-950 font-medium hover:bg-slate-200 hover:text-black border-transparent shadow-xs"
            onClick={onConnect}
          >
            <GithubIcon className="w-4 h-4 text-slate-950" />
            Continue with GitHub
          </Button>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {auth.user?.avatarUrl ? (
                <img
                  src={auth.user.avatarUrl}
                  alt={auth.user.login}
                  className="w-8 h-8 rounded-full border border-slate-700 object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                  <GithubIcon className="w-4 h-4" />
                </div>
              )}
              <div className="text-xs">
                <a
                  href={auth.user?.htmlUrl || `https://github.com/${auth.user?.login}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-slate-200 hover:text-orange-400 hover:underline transition-colors block"
                >
                  {auth.user?.login || 'Authenticated'}
                </a>
                <span className="text-slate-500 text-[11px]">Authorized for repo sync</span>
              </div>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              title="Disconnect account"
              onClick={onDisconnect}
              className="text-slate-500 hover:text-red-400"
            >
              <LogOut className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

