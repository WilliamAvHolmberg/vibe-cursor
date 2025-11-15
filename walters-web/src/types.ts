export type Mode = 'letters' | 'numbers';

export type EnvironmentPreset = 
  | 'sunset'
  | 'dawn'
  | 'night'
  | 'warehouse'
  | 'forest'
  | 'apartment'
  | 'studio'
  | 'city'
  | 'park'
  | 'lobby';

export interface CharacterData {
  character: string;
  color: string;
  imageUrl: string | null;
}

export interface StorageData {
  [key: string]: CharacterData;
}

export interface AppSettings {
  background: EnvironmentPreset;
}
