import type { AnimalType } from '../types';

export interface VoxelBlock {
  position: [number, number, number];
  colorType: 'primary' | 'secondary' | 'accent';
}

export interface AnimalDefinition {
  blocks: VoxelBlock[];
}

export const animalDefinitions: Record<AnimalType, AnimalDefinition> = {
  monkey: {
    blocks: [
      // Head
      { position: [0, 2, 0], colorType: 'primary' },
      { position: [0, 2, 1], colorType: 'primary' },
      { position: [1, 2, 0], colorType: 'primary' },
      { position: [1, 2, 1], colorType: 'primary' },
      { position: [0, 3, 0], colorType: 'primary' },
      { position: [0, 3, 1], colorType: 'primary' },
      { position: [1, 3, 0], colorType: 'primary' },
      { position: [1, 3, 1], colorType: 'primary' },
      
      // Face
      { position: [0, 2, 2], colorType: 'secondary' },
      { position: [1, 2, 2], colorType: 'secondary' },
      
      // Eyes (accent)
      { position: [0, 3, 2], colorType: 'accent' },
      { position: [1, 3, 2], colorType: 'accent' },
      
      // Body
      { position: [0, 1, 0], colorType: 'primary' },
      { position: [1, 1, 0], colorType: 'primary' },
      { position: [0, 1, 1], colorType: 'secondary' },
      { position: [1, 1, 1], colorType: 'secondary' },
      
      { position: [0, 0, 0], colorType: 'primary' },
      { position: [1, 0, 0], colorType: 'primary' },
      { position: [0, 0, 1], colorType: 'secondary' },
      { position: [1, 0, 1], colorType: 'secondary' },
      
      // Arms
      { position: [-1, 1, 0], colorType: 'primary' },
      { position: [2, 1, 0], colorType: 'primary' },
      { position: [-1, 0, 0], colorType: 'primary' },
      { position: [2, 0, 0], colorType: 'primary' },
      
      // Legs
      { position: [0, -1, 0], colorType: 'primary' },
      { position: [1, -1, 0], colorType: 'primary' },
      { position: [0, -2, 0], colorType: 'primary' },
      { position: [1, -2, 0], colorType: 'primary' },
    ],
  },
};

export const defaultColorPalettes: Record<AnimalType, { primary: string; secondary: string; accent: string }> = {
  monkey: {
    primary: '#8B4513', // Brown
    secondary: '#FFE4B5', // Light peach
    accent: '#000000', // Black (eyes)
  },
};
