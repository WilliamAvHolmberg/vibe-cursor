# 🎨 Walter's Web - Interactive 3D Learning App

An interactive 3D educational web application built with React Three Fiber for young children to learn letters and numbers in a fun, engaging 3D environment.

## 🌟 Features

- **3D Interactive Letters & Numbers**: Beautiful 3D animated characters (A-Z and 1-9)
- **Easy Navigation**: Simple arrow buttons to move between letters/numbers
- **Color Customization**: Pick any color for each letter/number
- **Personal Images**: Attach photos to letters (like grandma's photo on "G"!)
- **Smooth Animations**: Floating and rotating 3D characters
- **Touch-Friendly**: Great for tablets and touch devices
- **LocalStorage**: All customizations are saved locally

## 🚀 Getting Started

### Install Dependencies
```bash
npm install
```

### Run Development Server
```bash
npm run dev
```

### Build for Production
```bash
npm run build
```

## 🎮 How to Use

1. **Navigate**: Use the ← and → arrow buttons (or keyboard arrow keys) to move through letters or numbers
2. **Switch Mode**: Click the "ABC" or "123" button (or press Space/Enter) to toggle between letters and numbers
3. **Change Color**: Click the color picker at the top to choose a color for the current character
4. **Change Background**: Select from 8 different **REAL 3D environments** (Ocean with animated water, Space with planets, Forest with trees, and more!)
5. **Add Photo**: Click "Add Photo" to upload an image for the current character
6. **Remove Photo**: Click the trash icon to remove the attached photo

### Keyboard Shortcuts
- **← Arrow Key**: Previous letter/number
- **→ Arrow Key**: Next letter/number
- **Space or Enter**: Toggle between letters and numbers

### Available 3D Backgrounds
- 🌊 **Ocean** - Animated water waves with sky (default)
- 🚀 **Space** - Outer space with 10,000 stars and floating planets
- 🌲 **Forest** - Surrounded by 20 real 3D trees
- 🌈 **Rainbow** - Beautiful 3D rainbow arc
- 🌙 **Night Sky** - Dark sky with 7,000 stars and a glowing moon
- ☁️ **Clouds** - Blue sky with 4 floating 3D clouds
- 🌅 **Sunset** - Warm sunset atmosphere
- ⭐ **Starfield** - Deep space with two layers of stars

## 🛠️ Tech Stack

- **React** - UI framework
- **TypeScript** - Type safety
- **Three.js** - 3D graphics
- **@react-three/fiber** - React renderer for Three.js
- **@react-three/drei** - Useful helpers for react-three-fiber
- **Vite** - Build tool

## 📁 Project Structure

```
walters-web/
├── src/
│   ├── components/
│   │   ├── Character3D.tsx    # 3D letter/number component
│   │   ├── ImagePlane.tsx     # 3D image display
│   │   └── Scene3D.tsx        # Main 3D scene setup
│   ├── hooks/
│   │   └── useCharacterStorage.ts  # LocalStorage management
│   ├── types.ts               # TypeScript types
│   ├── App.tsx                # Main app component
│   └── main.tsx               # Entry point
└── public/
    └── fonts/                 # Three.js fonts
```

## 🎓 Educational Benefits

- **Letter Recognition**: Learn the alphabet in a fun 3D environment
- **Number Recognition**: Count from 1 to 9 with animated numbers
- **Color Learning**: Experiment with different colors
- **Personal Connection**: Attach family photos to create emotional connections with letters
- **Motor Skills**: Navigate and interact with the interface

## 💡 Future Ideas

- Add sounds for each letter/number
- Include words that start with each letter
- Add more complex shapes and objects
- Multiple language support
- Mini-games for each character

## 👨‍👦 Made with Love

Created for Walter's learning journey! 🚀

Enjoy exploring letters and numbers in 3D! 🎉
