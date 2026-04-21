import { cn } from '@/lib/utils';

type Props = {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
};

export function GlassCard({ children, className, hover = true }: Props) {
  return (
    <div
      className={cn(
        'ghost-border rounded-3xl bg-white/5 backdrop-blur-xl ring-1 ring-white/10',
        hover &&
          'transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/[0.06] hover:ring-white/20 hover:shadow-[0px_24px_60px_rgba(0,0,0,0.45)]',
        className
      )}
    >
      {children}
    </div>
  );
}

