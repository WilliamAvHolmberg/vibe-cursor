import { useState, useEffect } from 'react';
import type { EnvironmentPreset } from '../types';

const SETTINGS_KEY = 'walters-web-settings';

export const useAppSettings = () => {
  const [background, setBackground] = useState<EnvironmentPreset>(() => {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      const settings = JSON.parse(stored);
      return settings.background || 'sunset';
    }
    return 'sunset';
  });

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ background }));
  }, [background]);

  return { background, setBackground };
};
