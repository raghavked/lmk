import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Keyboard } from '@capacitor/keyboard';
import { SplashScreen } from '@capacitor/splash-screen';
import { Geolocation } from '@capacitor/geolocation';

export const initializeMobilePlugins = async () => {
  if (!Capacitor.isNativePlatform()) return;

  try {
    await SplashScreen.hide();
    
    if (Capacitor.getPlatform() === 'ios' || Capacitor.getPlatform() === 'android') {
      await StatusBar.setStyle({ style: Style.Dark });
      await StatusBar.setBackgroundColor({ color: '#0D1117' });
    }
  } catch (error) {
    console.warn('Error initializing mobile plugins:', error);
  }
};

export const triggerHaptic = async (style: 'light' | 'medium' | 'heavy' = 'medium') => {
  if (!Capacitor.isNativePlatform()) return;
  
  try {
    const impactStyle = {
      light: ImpactStyle.Light,
      medium: ImpactStyle.Medium,
      heavy: ImpactStyle.Heavy,
    }[style];
    
    await Haptics.impact({ style: impactStyle });
  } catch (error) {
    console.warn('Haptics not available:', error);
  }
};

export const getCurrentPosition = async (): Promise<{ lat: number; lng: number } | null> => {
  try {
    if (Capacitor.isNativePlatform()) {
      const permission = await Geolocation.checkPermissions();
      if (permission.location !== 'granted') {
        const request = await Geolocation.requestPermissions();
        if (request.location !== 'granted') {
          return null;
        }
      }
      
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
      });
      
      return {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };
    } else {
      return new Promise((resolve) => {
        if (!navigator.geolocation) {
          resolve(null);
          return;
        }
        
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          () => resolve(null),
          { enableHighAccuracy: true, timeout: 10000 }
        );
      });
    }
  } catch (error) {
    console.warn('Error getting location:', error);
    return null;
  }
};

export const hideKeyboard = async () => {
  if (!Capacitor.isNativePlatform()) return;
  
  try {
    await Keyboard.hide();
  } catch (error) {
    console.warn('Error hiding keyboard:', error);
  }
};
