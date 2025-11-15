import { useState, useRef, useEffect, type ChangeEvent } from 'react';
import './App.css';
import { Scene3D } from './components/Scene3D';
import { useCharacterStorage } from './hooks/useCharacterStorage';
import { useAppSettings } from './hooks/useAppSettings';
import type { Mode, EnvironmentPreset } from './types';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const NUMBERS = '123456789'.split('');

const BACKGROUNDS: { value: EnvironmentPreset; label: string; emoji: string }[] = [
  { value: 'ocean', label: 'Ocean', emoji: '🌊' },
  { value: 'space', label: 'Space', emoji: '🚀' },
  { value: 'sunset', label: 'Sunset', emoji: '🌅' },
  { value: 'forest', label: 'Forest', emoji: '🌲' },
  { value: 'night', label: 'Night Sky', emoji: '🌙' },
  { value: 'clouds', label: 'Clouds', emoji: '☁️' },
  { value: 'rainbow', label: 'Rainbow', emoji: '🌈' },
  { value: 'stars', label: 'Starfield', emoji: '⭐' },
];

function App() {
  const [mode, setMode] = useState<Mode>('letters');
  const [currentIndex, setCurrentIndex] = useState(0);
  const { getCharacterData, updateCharacter } = useCharacterStorage();
  const { background, setBackground } = useAppSettings();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentList = mode === 'letters' ? LETTERS : NUMBERS;
  const currentCharacter = currentList[currentIndex];
  const characterData = getCharacterData(currentCharacter);

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : currentList.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < currentList.length - 1 ? prev + 1 : 0));
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        handlePrevious();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        handleModeToggle();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, mode]);

  const handleModeToggle = () => {
    setMode((prev) => (prev === 'letters' ? 'numbers' : 'letters'));
    setCurrentIndex(0);
  };

  const handleColorChange = (e: ChangeEvent<HTMLInputElement>) => {
    updateCharacter(currentCharacter, { color: e.target.value });
  };

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageUrl = event.target?.result as string;
        updateCharacter(currentCharacter, { imageUrl });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    updateCharacter(currentCharacter, { imageUrl: null });
  };

  const handleBackgroundChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setBackground(e.target.value as EnvironmentPreset);
  };

  return (
    <div className="app-container">
      <div className="canvas-container">
        <Scene3D 
          character={currentCharacter}
          color={characterData.color}
          imageUrl={characterData.imageUrl}
          background={background}
        />
      </div>

      <div className="top-controls">
        <div className="color-picker-container">
          <span className="color-picker-label">Color:</span>
          <input
            type="color"
            value={characterData.color}
            onChange={handleColorChange}
            className="color-picker"
          />
        </div>

        <div className="background-selector-container">
          <span className="background-label">Background:</span>
          <select
            value={background}
            onChange={handleBackgroundChange}
            className="background-selector"
          >
            {BACKGROUNDS.map((bg) => (
              <option key={bg.value} value={bg.value}>
                {bg.emoji} {bg.label}
              </option>
            ))}
          </select>
        </div>

        <div className="image-controls">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="image-input"
          />
          <button 
            className="image-button"
            onClick={() => fileInputRef.current?.click()}
          >
            📷 Add Photo
          </button>
          {characterData.imageUrl && (
            <>
              <img 
                src={characterData.imageUrl} 
                alt="Preview" 
                className="image-preview"
              />
              <button 
                className="image-button"
                onClick={handleRemoveImage}
              >
                🗑️ Remove
              </button>
            </>
          )}
        </div>
      </div>

      <div className="controls">
        <button onClick={handlePrevious} className="nav-button">
          ←
        </button>
        
        <div className="current-char">{currentCharacter}</div>
        
        <button onClick={handleNext} className="nav-button">
          →
        </button>
        
        <button onClick={handleModeToggle} className="mode-toggle">
          {mode === 'letters' ? '🔤 ABC' : '🔢 123'}
        </button>
      </div>
    </div>
  );
}

export default App;
