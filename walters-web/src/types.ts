export type Mode = 'letters' | 'numbers';

export type EnvironmentPreset = 
  | 'ocean'
  | 'space'
  | 'sunset'
  | 'forest'
  | 'night'
  | 'clouds'
  | 'rainbow'
  | 'stars';

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
