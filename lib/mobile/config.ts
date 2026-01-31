export const isMobile = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    const { Capacitor } = require('@capacitor/core');
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
};

export const isIOS = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    const { Capacitor } = require('@capacitor/core');
    return Capacitor.getPlatform() === 'ios';
  } catch {
    return false;
  }
};

export const isAndroid = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    const { Capacitor } = require('@capacitor/core');
    return Capacitor.getPlatform() === 'android';
  } catch {
    return false;
  }
};

export const getApiBaseUrl = (): string => {
  if (typeof window === 'undefined') return '';
  
  if (isMobile()) {
    return process.env.NEXT_PUBLIC_API_URL || '';
  }
  return '';
};

export const buildApiUrl = (path: string): string => {
  const baseUrl = getApiBaseUrl();
  if (baseUrl) {
    return `${baseUrl}${path}`;
  }
  return path;
};
