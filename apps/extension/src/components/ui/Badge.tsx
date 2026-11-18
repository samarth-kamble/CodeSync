import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors select-none',
  {
    variants: {
      variant: {
        default: 'bg-slate-800 text-slate-300 border border-slate-700/60',
        secondary: 'bg-slate-900 text-slate-400 border border-slate-800',
        success: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
        warning: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
        destructive: 'bg-red-500/10 text-red-400 border border-red-500/20',
        outline: 'border border-slate-700 text-slate-300',
        brand: 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

