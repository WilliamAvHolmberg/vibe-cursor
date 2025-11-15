import { useState, useEffect } from 'react';
import type { StorageData, CharacterData, ImageData } from '../types';

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
      images: [],
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

  const addImage = (character: string, url: string) => {
    const currentData = getCharacterData(character);
    const newImage: ImageData = {
      id: `${Date.now()}-${Math.random()}`,
      url,
      position: [4, 0, 0],
      scale: 1,
    };
    
    updateCharacter(character, {
      images: [...currentData.images, newImage],
    });
  };

  const updateImage = (
    character: string, 
    imageId: string, 
    position: [number, number, number], 
    scale: number
  ) => {
    const currentData = getCharacterData(character);
    const updatedImages = currentData.images.map(img =>
      img.id === imageId ? { ...img, position, scale } : img
    );
    
    updateCharacter(character, { images: updatedImages });
  };

  const removeImage = (character: string, imageId: string) => {
    const currentData = getCharacterData(character);
    const filteredImages = currentData.images.filter(img => img.id !== imageId);
    
    updateCharacter(character, { images: filteredImages });
  };

  return { 
    getCharacterData, 
    updateCharacter, 
    addImage, 
    updateImage, 
    removeImage 
  };
};
