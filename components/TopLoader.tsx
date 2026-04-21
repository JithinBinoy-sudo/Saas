'use client';

import NextTopLoader from 'nextjs-toploader';

export function TopLoader() {
  return (
    <NextTopLoader
      color="#85adff"
      height={3}
      showSpinner={false}
      easing="ease"
      speed={220}
      shadow="0 0 16px rgba(133, 173, 255, 0.35), 0 0 8px rgba(193, 128, 255, 0.25)"
    />
  );
}

