export type Item = {
  id: string;
  name: string;
  addedDate: Date;
  quantity: number;
};

export type DrawerMap = Record<number, Item[]>;

export type DateDisplayMode = 'date' | 'duration';

// Drawer configuration
export const DRAWER_COUNT = 8;
export const KOKSBANKEN_DRAWER = 1; // Special drawer for unassigned items

export interface ItemCardProps {
  item: Item;
  onEdit: (updates: Partial<Item>) => void;
  onDelete: () => void;
  onDeleteAndAddToShoppingList: () => void;
  onIncreaseQuantity: () => void;
  onDecreaseQuantity: () => void;
  isSelected?: boolean;
  onSelect?: () => void;
  isDragging?: boolean;
  dateDisplayMode: DateDisplayMode;
  getDurationText: (date: Date) => string;
}

export interface DraggableItemCardProps {
  item: Item;
  onEdit: (updates: Partial<Item>) => void;
  onDelete: () => void;
  onDeleteAndAddToShoppingList: () => void;
  onIncreaseQuantity: () => void;
  onDecreaseQuantity: () => void;
  isSelected?: boolean;
  onSelect?: () => void;
  dateDisplayMode: DateDisplayMode;
  getDurationText: (date: Date) => string;
}

export interface DroppableDrawerProps {
  drawerNumber: number | string;
  displayName?: string; // Optional display name, falls back to drawerNumber if not provided
  items: Item[];
  onEdit: (drawer: number | string, idx: number, updates: Partial<Item>) => void;
  onDelete: (drawer: number | string, idx: number) => void;
  onDeleteAndAddToShoppingList: (drawer: number | string, idx: number) => void;
  onIncreaseQuantity: (drawer: number | string, idx: number) => void;
  onDecreaseQuantity: (drawer: number | string, idx: number) => void;
  selectedItems: Set<string>;
  onItemSelect: (itemId: string) => void;
  dateDisplayMode: DateDisplayMode;
  getDurationText: (date: Date) => string;
}

export interface AddItemFormProps {
  onAddItems: (items: Array<{ name: string }>) => void;
}

export interface ItemToAdd {
  id: string;
  name: string;
} 

export type ShoppingItem = {
  id: string;
  name: string;
  addedDate: Date;
  completed: boolean;
};

export type TabType = 'inventory' | 'shopping';

// Update system types
export type UpdateStatus = 'checking' | 'up_to_date' | 'update_available' | 'error' | 'critical_update';

export interface UpdateInfo {
  currentVersion: string;
  latestVersion: string;
  updateUrl: string;
  releaseNotes: string;
  isCritical: boolean;
  lastChecked: Date;
}

export interface UpdateCheckResult {
  status: UpdateStatus;
  updateInfo?: UpdateInfo;
  error?: string;
}

// ============================================================================
// MODULAR CONTAINER SYSTEM TYPES (NEW)
// ============================================================================

// Schema versioning for data migration
export const CURRENT_SCHEMA_VERSION = "2.0.0";

// Default drawer (replaces old drawer 1 - köksbänken)
export interface DefaultDrawer {
  id: string;
  name: string;
  items: Item[];
}

// Individual drawer within a container
export interface ContainerDrawer {
  id: string;
  name: string;
  items: Item[];
}

// Container that holds multiple drawers
export interface Container {
  id: string;
  title: string;
  drawers: Record<string, ContainerDrawer>;
  drawerOrder: string[]; // Array of drawer IDs in the correct order
  order: number; // For sorting containers
}

// New modular data structure
export interface ModularData {
  schemaVersion: string;
  defaultDrawer: DefaultDrawer;
  containers: Record<string, Container>;
  shoppingList: ShoppingItem[];
  lastUpdated: string;
  version: string;
  familyId?: string;
  device_id?: string;
}

// Legacy data structure (for backward compatibility)
export interface LegacyData {
  drawers: DrawerMap;
  shoppingList: ShoppingItem[];
  lastUpdated: string;
  version: string;
  familyId?: string;
  device_id?: string;
}

// Union type for both structures
export type AppData = ModularData | LegacyData;

// Helper type guards
export function isModularData(data: AppData): data is ModularData {
  return 'schemaVersion' in data && data.schemaVersion === CURRENT_SCHEMA_VERSION;
}

export function isLegacyData(data: AppData): data is LegacyData {
  // If no schemaVersion key, it's definitely legacy data
  // If schemaVersion exists but doesn't match current version, it's also legacy
  return !('schemaVersion' in data) || data.schemaVersion !== CURRENT_SCHEMA_VERSION;
}

