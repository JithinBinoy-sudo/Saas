import { cn } from '@/lib/utils';

type Props = {
  children: React.ReactNode;
  className?: string;
  size?: 'default' | 'wide';
};

export function Container({ children, className, size = 'default' }: Props) {
  return (
    <div
      className={cn(
        'mx-auto w-full px-6 sm:px-8',
        size === 'default' && 'max-w-6xl',
        size === 'wide' && 'max-w-7xl',
        className
      )}
    >
      {children}
    </div>
  );
}

