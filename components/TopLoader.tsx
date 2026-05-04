'use client';

import NextTopLoader from 'nextjs-toploader';

export function TopLoader() {
  return (
    <NextTopLoader
      color="oklch(0.685 0.175 48)"
      height={3}
      showSpinner={false}
      easing="ease"
      speed={220}
      shadow="0 0 12px oklch(0.685 0.175 48 / 0.4)"
    />
  );
}
