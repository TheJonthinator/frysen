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
  drawerNumber: number;
  items: Item[];
  onEdit: (drawer: number, idx: number, updates: Partial<Item>) => void;
  onDelete: (drawer: number, idx: number) => void;
  onDeleteAndAddToShoppingList: (drawer: number, idx: number) => void;
  onIncreaseQuantity: (drawer: number, idx: number) => void;
  onDecreaseQuantity: (drawer: number, idx: number) => void;
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

