'use client';

import { useEffect } from 'react';

export default function ErudaInit() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('eruda').then((mod) => {
        const eruda = mod.default; // берём default
        if (!document.getElementById('eruda-container')) {
          eruda.init();
        }
      });
    }
  }, []);

  return null;
}
