export type Mode = 'letters' | 'numbers' | 'typing';

export type EnvironmentPreset = 
  | 'ocean'
  | 'space'
  | 'sunset'
  | 'forest'
  | 'night'
  | 'clouds'
  | 'rainbow'
  | 'stars';

export interface ImageData {
  id: string;
  url: string;
  position: [number, number, number];
  scale: number;
}

export interface TextData {
  id: string;
  text: string;
  position: [number, number, number];
  scale: number;
  color: string;
}

export interface CharacterData {
  character: string;
  color: string;
  images: ImageData[];
  texts: TextData[];
}

export interface StorageData {
  [key: string]: CharacterData;
}

export interface AppSettings {
  background: EnvironmentPreset;
}
