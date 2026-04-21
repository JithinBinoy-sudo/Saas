'use client';

import { cn } from '@/lib/utils';
import { motion, useReducedMotion } from 'framer-motion';

type Props = {
  children: React.ReactNode;
  className?: string;
  speedSeconds?: number;
};

export function Marquee({ children, className, speedSeconds = 24 }: Props) {
  const reduce = useReducedMotion();

  if (reduce) {
    return <div className={cn('overflow-hidden', className)}>{children}</div>;
  }

  return (
    <div className={cn('relative overflow-hidden', className)}>
      <motion.div
        className="flex w-max gap-6"
        animate={{ x: ['0%', '-50%'] }}
        transition={{ duration: speedSeconds, ease: 'linear', repeat: Infinity }}
      >
        <div className="flex gap-6">{children}</div>
        <div className="flex gap-6" aria-hidden>
          {children}
        </div>
      </motion.div>
    </div>
  );
}

