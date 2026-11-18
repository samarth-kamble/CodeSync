import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-orange-500 disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer',
  {
    variants: {
      variant: {
        default:
          'bg-orange-500 text-white shadow-sm hover:bg-orange-600 active:bg-orange-700',
        destructive:
          'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20',
        outline:
          'border border-slate-800 bg-slate-900/60 text-slate-200 hover:bg-slate-800 hover:text-white',
        secondary:
          'bg-slate-800 text-slate-200 hover:bg-slate-700',
        ghost:
          'text-slate-400 hover:bg-slate-800/80 hover:text-slate-100',
        link: 'text-orange-400 underline-offset-4 hover:underline p-0 h-auto',
      },
      size: {
        default: 'h-8 px-3 py-1.5',
        sm: 'h-7 px-2.5 text-[11px]',
        lg: 'h-9 px-4 text-sm',
        icon: 'h-7 w-7',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

