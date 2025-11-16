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
      // === HEAD (larger, rounder) ===
      // Bottom layer (y=5)
      { position: [1, 5, 1], colorType: 'primary' },
      { position: [2, 5, 1], colorType: 'primary' },
      { position: [3, 5, 1], colorType: 'primary' },
      { position: [4, 5, 1], colorType: 'primary' },
      { position: [1, 5, 2], colorType: 'primary' },
      { position: [2, 5, 2], colorType: 'primary' },
      { position: [3, 5, 2], colorType: 'primary' },
      { position: [4, 5, 2], colorType: 'primary' },
      { position: [1, 5, 3], colorType: 'primary' },
      { position: [2, 5, 3], colorType: 'primary' },
      { position: [3, 5, 3], colorType: 'primary' },
      { position: [4, 5, 3], colorType: 'primary' },
      
      // Middle layer (y=6)
      { position: [0, 6, 1], colorType: 'primary' },
      { position: [1, 6, 1], colorType: 'primary' },
      { position: [2, 6, 1], colorType: 'primary' },
      { position: [3, 6, 1], colorType: 'primary' },
      { position: [4, 6, 1], colorType: 'primary' },
      { position: [5, 6, 1], colorType: 'primary' },
      { position: [0, 6, 2], colorType: 'primary' },
      { position: [1, 6, 2], colorType: 'primary' },
      { position: [2, 6, 2], colorType: 'primary' },
      { position: [3, 6, 2], colorType: 'primary' },
      { position: [4, 6, 2], colorType: 'primary' },
      { position: [5, 6, 2], colorType: 'primary' },
      { position: [0, 6, 3], colorType: 'primary' },
      { position: [1, 6, 3], colorType: 'primary' },
      { position: [2, 6, 3], colorType: 'primary' },
      { position: [3, 6, 3], colorType: 'primary' },
      { position: [4, 6, 3], colorType: 'primary' },
      { position: [5, 6, 3], colorType: 'primary' },
      
      // Top layer (y=7)
      { position: [1, 7, 1], colorType: 'primary' },
      { position: [2, 7, 1], colorType: 'primary' },
      { position: [3, 7, 1], colorType: 'primary' },
      { position: [4, 7, 1], colorType: 'primary' },
      { position: [1, 7, 2], colorType: 'primary' },
      { position: [2, 7, 2], colorType: 'primary' },
      { position: [3, 7, 2], colorType: 'primary' },
      { position: [4, 7, 2], colorType: 'primary' },
      { position: [1, 7, 3], colorType: 'primary' },
      { position: [2, 7, 3], colorType: 'primary' },
      { position: [3, 7, 3], colorType: 'primary' },
      { position: [4, 7, 3], colorType: 'primary' },
      
      // === FACE (front, peach colored) ===
      { position: [1, 5, 4], colorType: 'secondary' },
      { position: [2, 5, 4], colorType: 'secondary' },
      { position: [3, 5, 4], colorType: 'secondary' },
      { position: [4, 5, 4], colorType: 'secondary' },
      { position: [1, 6, 4], colorType: 'secondary' },
      { position: [2, 6, 4], colorType: 'secondary' },
      { position: [3, 6, 4], colorType: 'secondary' },
      { position: [4, 6, 4], colorType: 'secondary' },
      { position: [2, 7, 4], colorType: 'secondary' },
      { position: [3, 7, 4], colorType: 'secondary' },
      
      // === EYES (black) ===
      { position: [1, 6, 5], colorType: 'accent' },
      { position: [4, 6, 5], colorType: 'accent' },
      
      // === EARS (round, on sides) ===
      // Left ear
      { position: [-1, 6, 2], colorType: 'primary' },
      { position: [-1, 7, 2], colorType: 'primary' },
      { position: [0, 7, 2], colorType: 'primary' },
      
      // Right ear  
      { position: [6, 6, 2], colorType: 'primary' },
      { position: [6, 7, 2], colorType: 'primary' },
      { position: [5, 7, 2], colorType: 'primary' },
      
      // === NECK ===
      { position: [2, 4, 2], colorType: 'primary' },
      { position: [3, 4, 2], colorType: 'primary' },
      
      // === BODY (wider, rounder) ===
      // Top body (y=3)
      { position: [1, 3, 1], colorType: 'primary' },
      { position: [2, 3, 1], colorType: 'primary' },
      { position: [3, 3, 1], colorType: 'primary' },
      { position: [4, 3, 1], colorType: 'primary' },
      { position: [1, 3, 2], colorType: 'secondary' },
      { position: [2, 3, 2], colorType: 'secondary' },
      { position: [3, 3, 2], colorType: 'secondary' },
      { position: [4, 3, 2], colorType: 'secondary' },
      { position: [1, 3, 3], colorType: 'primary' },
      { position: [2, 3, 3], colorType: 'primary' },
      { position: [3, 3, 3], colorType: 'primary' },
      { position: [4, 3, 3], colorType: 'primary' },
      
      // Middle body (y=2)
      { position: [1, 2, 1], colorType: 'primary' },
      { position: [2, 2, 1], colorType: 'primary' },
      { position: [3, 2, 1], colorType: 'primary' },
      { position: [4, 2, 1], colorType: 'primary' },
      { position: [1, 2, 2], colorType: 'secondary' },
      { position: [2, 2, 2], colorType: 'secondary' },
      { position: [3, 2, 2], colorType: 'secondary' },
      { position: [4, 2, 2], colorType: 'secondary' },
      { position: [1, 2, 3], colorType: 'primary' },
      { position: [2, 2, 3], colorType: 'primary' },
      { position: [3, 2, 3], colorType: 'primary' },
      { position: [4, 2, 3], colorType: 'primary' },
      
      // Lower body (y=1)
      { position: [1, 1, 1], colorType: 'primary' },
      { position: [2, 1, 1], colorType: 'primary' },
      { position: [3, 1, 1], colorType: 'primary' },
      { position: [4, 1, 1], colorType: 'primary' },
      { position: [1, 1, 2], colorType: 'secondary' },
      { position: [2, 1, 2], colorType: 'secondary' },
      { position: [3, 1, 2], colorType: 'secondary' },
      { position: [4, 1, 2], colorType: 'secondary' },
      
      // === LEFT ARM ===
      { position: [0, 3, 2], colorType: 'primary' },
      { position: [0, 2, 2], colorType: 'primary' },
      { position: [0, 1, 2], colorType: 'primary' },
      { position: [-1, 1, 2], colorType: 'primary' },
      { position: [-1, 2, 2], colorType: 'primary' },
      
      // === RIGHT ARM ===
      { position: [5, 3, 2], colorType: 'primary' },
      { position: [5, 2, 2], colorType: 'primary' },
      { position: [5, 1, 2], colorType: 'primary' },
      { position: [6, 1, 2], colorType: 'primary' },
      { position: [6, 2, 2], colorType: 'primary' },
      
      // === LEFT LEG ===
      { position: [1, 0, 2], colorType: 'primary' },
      { position: [2, 0, 2], colorType: 'primary' },
      { position: [1, -1, 2], colorType: 'primary' },
      { position: [2, -1, 2], colorType: 'primary' },
      { position: [1, -2, 2], colorType: 'secondary' },
      { position: [2, -2, 2], colorType: 'secondary' },
      
      // === RIGHT LEG ===
      { position: [3, 0, 2], colorType: 'primary' },
      { position: [4, 0, 2], colorType: 'primary' },
      { position: [3, -1, 2], colorType: 'primary' },
      { position: [4, -1, 2], colorType: 'primary' },
      { position: [3, -2, 2], colorType: 'secondary' },
      { position: [4, -2, 2], colorType: 'secondary' },
      
      // === TAIL (curved, behind) ===
      { position: [2, 2, 0], colorType: 'primary' },
      { position: [3, 2, 0], colorType: 'primary' },
      { position: [2, 3, 0], colorType: 'primary' },
      { position: [3, 3, 0], colorType: 'primary' },
      { position: [2, 4, -1], colorType: 'primary' },
      { position: [3, 4, -1], colorType: 'primary' },
      { position: [2, 5, -1], colorType: 'primary' },
      { position: [3, 5, -1], colorType: 'primary' },
      { position: [2, 6, 0], colorType: 'primary' },
      { position: [3, 6, 0], colorType: 'primary' },
      
      // === NOSE/SNOUT ===
      { position: [2, 5, 5], colorType: 'secondary' },
      { position: [3, 5, 5], colorType: 'secondary' },
      { position: [2, 4, 5], colorType: 'accent' },
      { position: [3, 4, 5], colorType: 'accent' },
      
      // === MOUTH ===
      { position: [2, 4, 4], colorType: 'accent' },
      { position: [3, 4, 4], colorType: 'accent' },
      
      // === HANDS (at end of arms) ===
      { position: [-2, 1, 2], colorType: 'secondary' },
      { position: [-2, 1, 3], colorType: 'secondary' },
      { position: [7, 1, 2], colorType: 'secondary' },
      { position: [7, 1, 3], colorType: 'secondary' },
      
      // === FEET (at end of legs) ===
      { position: [1, -2, 3], colorType: 'secondary' },
      { position: [2, -2, 3], colorType: 'secondary' },
      { position: [3, -2, 3], colorType: 'secondary' },
      { position: [4, -2, 3], colorType: 'secondary' },
    ],
  },
};

export const defaultColorPalettes: Record<AnimalType, { primary: string; secondary: string; accent: string }> = {
  monkey: {
    primary: '#8B4513', // Brown body
    secondary: '#FFE4B5', // Light peach face/belly/hands/feet
    accent: '#000000', // Black eyes/nose/mouth
  },
};
