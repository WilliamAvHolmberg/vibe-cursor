import { useState, useEffect } from 'react';
import type { StorageData, CharacterData, ImageData } from '../types';
import { 
  initDB, 
  saveCharacterData, 
  getAllCharacterData,
  migrateFromLocalStorage 
} from '../lib/db';

export const useCharacterStorage = () => {
  const [data, setData] = useState<StorageData>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        await initDB();
        await migrateFromLocalStorage();
        
        const allData = await getAllCharacterData();
        const dataMap: StorageData = {};
        
        for (const item of allData) {
          const { character, ...rest } = item;
          dataMap[character] = rest as CharacterData;
        }
        
        setData(dataMap);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const getCharacterDataSync = (character: string): CharacterData => {
    return data[character] || {
      character,
      color: '#ff6b6b',
      images: [],
    };
  };

  const updateCharacter = async (character: string, updates: Partial<CharacterData>) => {
    const currentData = getCharacterDataSync(character);
    const newData = {
      ...currentData,
      ...updates,
    };

    setData(prev => ({
      ...prev,
      [character]: newData,
    }));

    try {
      await saveCharacterData(character, newData);
    } catch (error) {
      console.error('Failed to save character data:', error);
    }
  };

  const addImage = async (character: string, url: string) => {
    const currentData = getCharacterDataSync(character);
    const newImage: ImageData = {
      id: `${Date.now()}-${Math.random()}`,
      url,
      position: [4, 0, 0],
      scale: 1,
    };
    
    await updateCharacter(character, {
      images: [...currentData.images, newImage],
    });
  };

  const updateImage = async (
    character: string, 
    imageId: string, 
    position: [number, number, number], 
    scale: number
  ) => {
    const currentData = getCharacterDataSync(character);
    const updatedImages = currentData.images.map(img =>
      img.id === imageId ? { ...img, position, scale } : img
    );
    
    await updateCharacter(character, { images: updatedImages });
  };

  const removeImage = async (character: string, imageId: string) => {
    const currentData = getCharacterDataSync(character);
    const filteredImages = currentData.images.filter(img => img.id !== imageId);
    
    await updateCharacter(character, { images: filteredImages });
  };

  return { 
    getCharacterData: getCharacterDataSync,
    updateCharacter, 
    addImage, 
    updateImage, 
    removeImage,
    isLoading
  };
};
