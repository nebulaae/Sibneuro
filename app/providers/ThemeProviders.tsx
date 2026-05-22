'use client';

import { ReactNode, useEffect, useState } from 'react';
import { ThemeProvider } from 'next-themes';

export const ThemeProviders = ({ children }: { children: ReactNode }) => {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return <div style={{ visibility: 'hidden' }}>{children}</div>;
    }

    return (
        <ThemeProvider attribute="class" defaultTheme="dark">
            {children}
        </ThemeProvider>
    );
};