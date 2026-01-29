// Haptic feedback utility for mobile devices
const haptics = {
  selection: () => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(10);
    }
  },
  notification: (type: 'success' | 'warning' | 'error' = 'success') => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      const patterns: Record<string, number[]> = {
        success: [10, 20, 10],
        warning: [20, 10, 20],
        error: [30, 10, 30],
      };
      navigator.vibrate(patterns[type]);
    }
  },
  impact: (intensity: 'light' | 'medium' | 'heavy' = 'medium') => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      const durations: Record<string, number> = {
        light: 10,
        medium: 20,
        heavy: 30,
      };
      navigator.vibrate(durations[intensity]);
    }
  },
};

export default haptics;
