import { useState, useEffect } from 'react';
import type { StorageData, CharacterData } from '../types';

const STORAGE_KEY = 'walters-web-characters';

export const useCharacterStorage = () => {
  const [data, setData] = useState<StorageData>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  const getCharacterData = (character: string): CharacterData => {
    return data[character] || {
      character,
      color: '#ff6b6b',
      imageUrl: null,
    };
  };

  const updateCharacter = (character: string, updates: Partial<CharacterData>) => {
    setData(prev => ({
      ...prev,
      [character]: {
        ...getCharacterData(character),
        ...updates,
      },
    }));
  };

  return { getCharacterData, updateCharacter };
};
