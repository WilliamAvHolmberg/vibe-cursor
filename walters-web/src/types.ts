export type Mode = 'letters' | 'numbers';

export interface CharacterData {
  character: string;
  color: string;
  imageUrl: string | null;
}

export interface StorageData {
  [key: string]: CharacterData;
}
