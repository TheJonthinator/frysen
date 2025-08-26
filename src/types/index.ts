export type Item = {
  id: string;
  name: string;
  addedDate: Date;
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