import { useState, useEffect } from 'react';
import type { EnvironmentPreset } from '../types';
import { initDB, getSetting, saveSetting, migrateFromLocalStorage } from '../lib/db';

export const useAppSettings = () => {
  const [background, setBackgroundState] = useState<EnvironmentPreset>('ocean');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        await initDB();
        await migrateFromLocalStorage();
        
        const savedBackground = await getSetting('background');
        if (savedBackground) {
          setBackgroundState(savedBackground as EnvironmentPreset);
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  const setBackground = async (newBackground: EnvironmentPreset) => {
    setBackgroundState(newBackground);
    try {
      await saveSetting('background', newBackground);
    } catch (error) {
      console.error('Failed to save background setting:', error);
    }
  };

  return { background, setBackground, isLoading };
};
