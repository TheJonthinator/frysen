# Frysen - Personal Inventory Management App

A modern, mobile-first inventory management application built with React, TypeScript, and Capacitor. Frysen helps you organize items into drawers and manage shopping lists with an intuitive drag-and-drop interface.

## Features

### 🗄️ Inventory Management

- **8 Drawer System**: Organize items into numbered drawers
- **Drag & Drop**: Intuitive item movement between drawers
- **Date Tracking**: See when items were added (date or duration display)
- **Bulk Operations**: Select and manage multiple items at once
- **Smart Suggestions**: Autocomplete based on item history

### 🛒 Shopping List

- **Add/Remove Items**: Simple shopping list management
- **Check Off Items**: Mark items as completed
- **Edit Items**: Click to edit item names
- **Separate Sections**: View active and completed items separately

### 📱 Mobile Optimized

- **Cross-Platform**: Works on web, Android, and iOS
- **Touch-Friendly**: Optimized for mobile interactions
- **Offline-First**: Works without internet connection
- **AOD Bubble**: Custom plugin for Always-On Display functionality

### 🎨 Modern UI

- **Material-UI**: Clean, modern interface
- **Swedish Language**: Localized for Swedish users
- **Responsive Design**: Adapts to different screen sizes
- **Performance Optimized**: Smooth scrolling and interactions

## Technology Stack

- **Frontend**: React 19 + TypeScript + Vite
- **UI Framework**: Material-UI (MUI)
- **State Management**: Zustand
- **Mobile**: Capacitor
- **Storage**: LocalForage (IndexedDB)
- **Drag & Drop**: @dnd-kit
- **Date Handling**: date-fns

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Android Studio (for Android builds)
- Xcode (for iOS builds, macOS only)

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd frysen
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Start development server**

   ```bash
   npm run dev
   ```

4. **Build for production**
   ```bash
   npm run build
   ```

### Mobile Development

1. **Add platforms**

   ```bash
   npx cap add android
   npx cap add ios  # macOS only
   ```

2. **Sync changes**

   ```bash
   npx cap sync
   ```

3. **Open in IDE**
   ```bash
   npx cap open android
   npx cap open ios  # macOS only
   ```

## Project Structure

```
frysen/
├── src/                    # Main application source
│   ├── components/         # React components
│   ├── types/             # TypeScript type definitions
│   ├── store.ts           # Zustand state management
│   ├── theme.ts           # MUI theme configuration
│   └── App.tsx            # Main application component
├── plugins/aod-bubble/    # Custom Capacitor plugin
├── android/               # Android-specific files
├── dist/                  # Built web assets
└── package.json           # Dependencies and scripts
```

## Data Structure

### Inventory Items

```typescript
type Item = {
  id: string;
  name: string;
  addedDate: Date;
};
```

### Shopping Items

```typescript
type ShoppingItem = {
  id: string;
  name: string;
  addedDate: Date;
  completed: boolean;
};
```

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

### Code Style

- TypeScript for type safety
- ESLint for code quality
- Prettier for code formatting

## Future Features

- [ ] **Cloud Sync**: Google Drive integration for data backup
- [ ] **App Updates**: GitHub Releases for easy distribution
- [ ] **Multi-User**: Share lists with family members
- [ ] **Barcode Scanning**: Add items by scanning barcodes
- [ ] **Categories**: Organize items by categories
- [ ] **Statistics**: Usage analytics and insights

## Contributing

This is a personal project, but contributions are welcome! Please feel free to submit issues or pull requests.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Version

Current version: 1.0.0
