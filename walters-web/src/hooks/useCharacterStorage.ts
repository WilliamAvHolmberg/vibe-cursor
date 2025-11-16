import { useState, useEffect } from 'react';
import type { StorageData, CharacterData, ImageData, TextData, AnimalData, AnimalType } from '../types';
import { 
  initDB, 
  saveCharacterData, 
  getAllCharacterData,
  migrateFromLocalStorage 
} from '../lib/db';
import { defaultColorPalettes } from '../lib/animalDefinitions';

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
      texts: [],
      animals: [],
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
      id: `img-${Date.now()}-${Math.random()}`,
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

  const addText = async (character: string, text: string, color: string) => {
    const currentData = getCharacterDataSync(character);
    const newText: TextData = {
      id: `text-${Date.now()}-${Math.random()}`,
      text,
      position: [-4, 0, 0],
      scale: 1,
      color,
    };
    
    await updateCharacter(character, {
      texts: [...currentData.texts ?? [], newText],
    });
  };

  const updateText = async (
    character: string, 
    textId: string, 
    position: [number, number, number], 
    scale: number
  ) => {
    const currentData = getCharacterDataSync(character);
    const updatedTexts = currentData.texts.map(txt =>
      txt.id === textId ? { ...txt, position, scale } : txt
    );
    
    await updateCharacter(character, { texts: updatedTexts });
  };

  const removeText = async (character: string, textId: string) => {
    const currentData = getCharacterDataSync(character);
    const filteredTexts = currentData.texts.filter(txt => txt.id !== textId);
    
    await updateCharacter(character, { texts: filteredTexts });
  };

  const addAnimal = async (character: string, type: AnimalType) => {
    const currentData = getCharacterDataSync(character);
    const newAnimal: AnimalData = {
      id: `animal-${Date.now()}-${Math.random()}`,
      type,
      position: [0, -2, 0],
      scale: 2,
      colorPalette: defaultColorPalettes[type],
    };
    
    await updateCharacter(character, {
      animals: [...currentData.animals, newAnimal],
    });
  };

  const updateAnimal = async (
    character: string, 
    animalId: string, 
    updates: Partial<AnimalData>
  ) => {
    const currentData = getCharacterDataSync(character);
    const updatedAnimals = currentData.animals.map(animal =>
      animal.id === animalId ? { ...animal, ...updates } : animal
    );
    
    await updateCharacter(character, { animals: updatedAnimals });
  };

  const removeAnimal = async (character: string, animalId: string) => {
    const currentData = getCharacterDataSync(character);
    const filteredAnimals = currentData.animals.filter(animal => animal.id !== animalId);
    
    await updateCharacter(character, { animals: filteredAnimals });
  };

  return { 
    getCharacterData: getCharacterDataSync,
    updateCharacter, 
    addImage, 
    updateImage, 
    removeImage,
    addText,
    updateText,
    removeText,
    addAnimal,
    updateAnimal,
    removeAnimal,
    isLoading
  };
};
