'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';

type FadeInProps = {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
};

export function FadeIn({ children, className, delay = 0, y = 14 }: FadeInProps) {
  const reduce = useReducedMotion();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Some environments/extensions can break IntersectionObserver-driven `whileInView`.
  // Also ensure SSR output is never hidden (avoid blank page before hydration).
  return (
    <motion.div
      className={className}
      initial={reduce || !mounted ? false : { opacity: 0, y }}
      animate={reduce || !mounted ? undefined : { opacity: 1, y: 0 }}
      transition={reduce ? undefined : { duration: 0.6, ease: [0.21, 0.61, 0.35, 1], delay }}
    >
      {children}
    </motion.div>
  );
}

type StaggerProps = {
  children: React.ReactNode;
  className?: string;
  stagger?: number;
  delayChildren?: number;
};

export function Stagger({ children, className, stagger = 0.08, delayChildren = 0 }: StaggerProps) {
  const reduce = useReducedMotion();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (reduce || !mounted) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: {
          transition: { staggerChildren: stagger, delayChildren },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: { children: React.ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (reduce || !mounted) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 14 },
        show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.21, 0.61, 0.35, 1] } },
      }}
    >
      {children}
    </motion.div>
  );
}

