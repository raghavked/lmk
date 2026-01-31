'use client';

import { useEffect } from 'react';

export function MobileProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const initMobile = async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (!Capacitor.isNativePlatform()) return;

        const { SplashScreen } = await import('@capacitor/splash-screen');
        const { StatusBar, Style } = await import('@capacitor/status-bar');

        await SplashScreen.hide();
        
        await StatusBar.setStyle({ style: Style.Dark });
        if (Capacitor.getPlatform() === 'android') {
          await StatusBar.setBackgroundColor({ color: '#0D1117' });
        }

        document.body.classList.add('mobile-app');
        document.documentElement.classList.add('mobile-app');
      } catch (error) {
        // Not running on mobile or Capacitor not available
      }
    };

    initMobile();
  }, []);

  return <>{children}</>;
}
