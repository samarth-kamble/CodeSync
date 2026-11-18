import { GithubIcon } from '../../components/icons/GithubIcon';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { LogOut } from 'lucide-react';
import type { AuthState } from '@leetsync/shared';

interface AccountStatusCardProps {
  auth: AuthState;
  onConnect: () => void;
  onDisconnect: () => void;
}

export function AccountStatusCard({ auth, onConnect, onDisconnect }: AccountStatusCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>GitHub Account</CardTitle>
        <Badge variant={auth.isConnected ? 'success' : 'warning'}>
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              auth.isConnected ? 'bg-emerald-400' : 'bg-amber-400'
            }`}
          />
          {auth.isConnected ? 'Connected' : 'Not Connected'}
        </Badge>
      </CardHeader>

      <CardContent>
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

