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

export type TabType = 'inventory' | 'shopping' | 'family';

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

// Family sync types
export interface FamilyMember {
  email: string;
  name: string;
  joinedAt: Date;
  isHost: boolean;
}

export interface Family {
  id: string;
  name: string;
  hostEmail: string;
  syncFileId: string;
  registryFileId: string;
  members: FamilyMember[];
  createdAt: Date;
  lastUpdated: Date;
}

export interface FamilyRegistry {
  version: string;
  families: Record<string, Family>;
  lastUpdated: Date;
}

export interface SyncStatus {
  isConnected: boolean;
  familyId: string | null;
  lastSync: Date | null;
  syncError: string | null;
  isHost: boolean;
}