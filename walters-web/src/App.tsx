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

const RAINBOW_COLORS = [
  '#ff0000', '#ff7f00', '#ffff00', '#00ff00', 
  '#0000ff', '#4b0082', '#9400d3'
];

function App() {
  const [mode, setMode] = useState<Mode>('letters');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [editingTextValue, setEditingTextValue] = useState('');
  const [typedText, setTypedText] = useState('');
  const { getCharacterData, updateCharacter, addImage, updateImage, removeImage, addText, updateText, removeText } = useCharacterStorage();
  const { background, setBackground } = useAppSettings();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);

  const currentList = mode === 'letters' ? LETTERS : NUMBERS;
  const currentCharacter = currentList[currentIndex];
  const characterData = getCharacterData(currentCharacter);

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : currentList.length - 1));
    setSelectedImageId(null);
    setSelectedTextId(null);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < currentList.length - 1 ? prev + 1 : 0));
    setSelectedImageId(null);
    setSelectedTextId(null);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (mode === 'typing') {
        if (e.key === 'Backspace') {
          setTypedText(prev => prev.slice(0, -1));
        } else if (e.key === 'Escape') {
          setTypedText('');
        } else if (e.key.length === 1 && /[a-zA-Z0-9 ]/.test(e.key)) {
          setTypedText(prev => (prev + e.key.toUpperCase()).slice(0, 15));
        }
      } else {
        if (e.key === 'ArrowLeft') {
          handlePrevious();
        } else if (e.key === 'ArrowRight') {
          handleNext();
        } else if (e.key === 'Delete' && selectedImageId) {
          handleRemoveImage(selectedImageId);
        } else if (e.key === 'Delete' && selectedTextId) {
          handleRemoveText(selectedTextId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, mode, selectedImageId, selectedTextId, typedText]);

  const handleModeToggle = () => {
    if (mode === 'letters') {
      setMode('numbers');
    } else if (mode === 'numbers') {
      setMode('typing');
      setTypedText('');
    } else {
      setMode('letters');
    }
    setCurrentIndex(0);
    setSelectedImageId(null);
    setSelectedTextId(null);
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
        addImage(currentCharacter, imageUrl);
      };
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = (imageId: string) => {
    removeImage(currentCharacter, imageId);
    setSelectedImageId(null);
  };

  const handleBackgroundChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setBackground(e.target.value as EnvironmentPreset);
  };

  const handleUpdateImage = (imageId: string, position: [number, number, number], scale: number) => {
    updateImage(currentCharacter, imageId, position, scale);
  };

  const handleAddText = () => {
    setEditingTextId('new');
    setEditingTextValue('');
    setTimeout(() => textInputRef.current?.focus(), 100);
  };

  const handleEditText = (textId: string, currentText: string) => {
    setEditingTextId(textId);
    setEditingTextValue(currentText);
    setSelectedTextId(textId);
    setTimeout(() => textInputRef.current?.focus(), 100);
  };

  const handleSaveText = () => {
    if (editingTextValue.trim()) {
      if (editingTextId === 'new') {
        addText(currentCharacter, editingTextValue.trim(), characterData.color);
      } else if (editingTextId) {
        const currentData = getCharacterData(currentCharacter);
        const textToUpdate = currentData.texts.find(t => t.id === editingTextId);
        if (textToUpdate) {
          const updatedTexts = currentData.texts.map(txt =>
            txt.id === editingTextId ? { ...txt, text: editingTextValue.trim() } : txt
          );
          updateCharacter(currentCharacter, { texts: updatedTexts });
        }
      }
    }
    setEditingTextId(null);
    setEditingTextValue('');
  };

  const handleCancelEdit = () => {
    setEditingTextId(null);
    setEditingTextValue('');
  };

  const handleUpdateText = (textId: string, position: [number, number, number], scale: number) => {
    updateText(currentCharacter, textId, position, scale);
  };

  const handleRemoveText = (textId: string) => {
    removeText(currentCharacter, textId);
    setSelectedTextId(null);
  };

  const getModeButtonLabel = () => {
    if (mode === 'letters') return '🔤 ABC';
    if (mode === 'numbers') return '🔢 123';
    return '⌨️ TYPE';
  };

  return (
    <div className="app-container">
      <div className="canvas-container">
        <Scene3D 
          mode={mode}
          character={currentCharacter}
          color={characterData.color}
          images={characterData.images}
          texts={characterData.texts}
          background={background}
          selectedImageId={selectedImageId}
          selectedTextId={selectedTextId}
          onSelectImage={setSelectedImageId}
          onSelectText={setSelectedTextId}
          onUpdateImage={handleUpdateImage}
          onUpdateText={handleUpdateText}
          typedText={typedText}
          typedColors={RAINBOW_COLORS}
        />
      </div>

      {mode !== 'typing' && (
        <>
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
              <button 
                className="image-button text-button"
                onClick={handleAddText}
              >
                + Add Text
              </button>
              <span className="image-count">
                {characterData.images.length} photo{characterData.images.length !== 1 ? 's' : ''}
                {characterData.texts.length > 0 && ` • ${characterData.texts.length} text${characterData.texts.length !== 1 ? 's' : ''}`}
              </span>
            </div>
          </div>

          <div className="images-panel">
            {characterData.images.map((img) => (
              <div 
                key={img.id} 
                className={`image-thumbnail ${selectedImageId === img.id ? 'selected' : ''}`}
                onClick={() => {
                  setSelectedImageId(img.id);
                  setSelectedTextId(null);
                }}
              >
                <img src={img.url} alt="Attached" />
                <button 
                  className="delete-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveImage(img.id);
                  }}
                >
                  ×
                </button>
              </div>
            ))}
            {characterData.texts.map((txt) => (
              <div 
                key={txt.id} 
                className={`text-thumbnail ${selectedTextId === txt.id ? 'selected' : ''}`}
                onClick={() => {
                  setSelectedTextId(txt.id);
                  setSelectedImageId(null);
                }}
              >
                <div className="text-preview" style={{ color: txt.color }}>
                  {editingTextId === txt.id ? editingTextValue : txt.text}
                </div>
                <button 
                  className="edit-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditText(txt.id, txt.text);
                  }}
                >
                  ✏️
                </button>
                <button 
                  className="delete-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveText(txt.id);
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="controls-info">
        {editingTextId ? (
          <div className="text-edit-panel">
            <input
              ref={textInputRef}
              type="text"
              value={editingTextValue}
              onChange={(e) => setEditingTextValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveText();
                if (e.key === 'Escape') handleCancelEdit();
              }}
              placeholder="Type text..."
              className="text-edit-input"
              maxLength={30}
            />
            <button onClick={handleSaveText} className="save-btn">
              💾 Save
            </button>
            <button onClick={handleCancelEdit} className="cancel-btn">
              ✕
            </button>
          </div>
        ) : mode === 'typing' ? (
          <div className="help-text">
            ⌨️ Type letters & numbers • Backspace to delete • ESC to clear all
          </div>
        ) : selectedImageId || selectedTextId ? (
          <div className="help-text">
            💡 Drag to move • Hold SHIFT + drag to resize • Press DELETE to remove • Camera locked
          </div>
        ) : (
          <div className="help-text help-text-secondary">
            🎥 Scroll to zoom • Right-click drag to pan
          </div>
        )}
      </div>

      <div className="controls">
        {mode !== 'typing' && (
          <>
            <button onClick={handlePrevious} className="nav-button">
              ←
            </button>
            
            <div className="current-char">{currentCharacter}</div>
            
            <button onClick={handleNext} className="nav-button">
              →
            </button>
          </>
        )}
        
        {mode === 'typing' && (
          <div className="typing-info">
            <div className="typed-display">{typedText || '...'}</div>
            <button 
              onClick={() => setTypedText('')}
              className="clear-button"
            >
              🗑️ Clear
            </button>
          </div>
        )}
        
        <button onClick={handleModeToggle} className="mode-toggle">
          {getModeButtonLabel()}
        </button>
      </div>
    </div>
  );
}

export default App;
