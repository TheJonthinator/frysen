import { create } from "zustand";
import localforage from "localforage";
import type { Item, DrawerMap, DateDisplayMode, ShoppingItem, UpdateStatus, UpdateInfo, Family, SyncStatus } from "./types";
import { DRAWER_COUNT } from "./types";
import { updateService } from "./services/updateService";
import { googleDriveService } from "./services/googleDriveService";

const KEY = "frysen_v5";

const DATE_DISPLAY_KEY = "frysen_date_display";
const ITEM_HISTORY_KEY = "frysen_item_history";
const SHOPPING_LIST_KEY = "frysen_shopping_list";
const FAMILY_KEY = "frysen_family";
const SYNC_STATUS_KEY = "frysen_sync_status";
localforage.config({ name: "frysen" });

type State = {
  drawers: DrawerMap;
  dateDisplayMode: DateDisplayMode;
  itemHistory: string[];
  shoppingList: ShoppingItem[];
  updateStatus: UpdateStatus;
  updateInfo: UpdateInfo | null;
  currentFamily: Family | null;
  syncStatus: SyncStatus;
  load: () => Promise<void>;
  addItem: (drawer: number, name: string) => Promise<void>;
  editItem: (drawer: number, idx: number, updates: Partial<Item>) => Promise<void>;
  removeItem: (drawer: number, idx: number) => Promise<void>;
  increaseQuantity: (drawer: number, idx: number) => Promise<void>;
  decreaseQuantity: (drawer: number, idx: number) => Promise<void>;
  deleteAndAddToShoppingList: (drawer: number, idx: number) => Promise<void>;
  moveItem: (fromDrawer: number, fromIdx: number, toDrawer: number, toIdx?: number) => Promise<void>;
  replaceAll: (data: DrawerMap) => Promise<void>;
  toggleDateDisplay: () => Promise<void>;
  getDurationText: (date: Date) => string;
  addToHistory: (itemName: string) => Promise<void>;
  getSuggestions: (query: string) => string[];
  addShoppingItem: (name: string) => Promise<void>;
  toggleShoppingItem: (id: string) => Promise<void>;
  removeShoppingItem: (id: string) => Promise<void>;
  editShoppingItem: (id: string, name: string) => Promise<void>;
  clearCompletedShoppingItems: () => Promise<void>;
  checkForUpdates: () => Promise<void>;
  getCurrentVersion: () => string;
  getLastCheckTime: () => Date | null;
  setCurrentFamily: (family: Family | null) => Promise<void>;
  syncWithFamily: () => Promise<void>;
  signInWithGoogle: () => Promise<boolean>;
  signOutFromGoogle: () => Promise<void>;
};

const empty = (): DrawerMap => {
  const m: DrawerMap = {} as any;
  for (let i = 1; i <= DRAWER_COUNT; i++) m[i] = [];
  return m;
};

const generateId = () => Math.random().toString(36).substr(2, 9);

export const useStore = create<State>((set, get) => ({
  drawers: empty(),
  dateDisplayMode: 'date',
  itemHistory: [],
  shoppingList: [],
  updateStatus: 'up_to_date',
  updateInfo: null,
  currentFamily: null,
  syncStatus: {
    isConnected: false,
    familyId: null,
    lastSync: null,
    syncError: null,
    isHost: false,
  },
  load: async () => {
    const [data, dateDisplay, history, shoppingList, family, syncStatus] = await Promise.all([
      localforage.getItem<DrawerMap>(KEY),
      localforage.getItem<DateDisplayMode>(DATE_DISPLAY_KEY),
      localforage.getItem<string[]>(ITEM_HISTORY_KEY),
      localforage.getItem<ShoppingItem[]>(SHOPPING_LIST_KEY),
      localforage.getItem<Family>(FAMILY_KEY),
      localforage.getItem<SyncStatus>(SYNC_STATUS_KEY)
    ]);
    set({ 
      drawers: data || empty(),
      dateDisplayMode: dateDisplay || 'date',
      itemHistory: history || [],
      shoppingList: shoppingList || [],
      currentFamily: family || null,
      syncStatus: syncStatus || {
        isConnected: false,
        familyId: null,
        lastSync: null,
        syncError: null,
        isHost: false,
      }
    });
  },
  addItem: async (d: number, name: string) => {
    const s = { ...get().drawers };
    const item: Item = {
      id: generateId(),
      name,
      addedDate: new Date(),
      quantity: 1,
    };
    s[d] = [...s[d], item];
    set({ drawers: s });
    await Promise.all([
      localforage.setItem(KEY, s),
      get().addToHistory(name)
    ]);
  },
  editItem: async (d: number, idx: number, updates: Partial<Item>) => {
    const s = { ...get().drawers };
    s[d] = s[d].map((v, i) => (i === idx ? { ...v, ...updates } : v));
    set({ drawers: s });
    await localforage.setItem(KEY, s);
  },
  removeItem: async (d: number, idx: number) => {
    const s = { ...get().drawers };
    s[d] = s[d].filter((_, i) => i !== idx);
    set({ drawers: s });
    await localforage.setItem(KEY, s);
  },
  increaseQuantity: async (d: number, idx: number) => {
    const s = { ...get().drawers };
    const item = s[d][idx];
    s[d][idx] = { ...item, quantity: item.quantity + 1 };
    set({ drawers: s });
    await localforage.setItem(KEY, s);
  },
  decreaseQuantity: async (d: number, idx: number) => {
    const s = { ...get().drawers };
    const item = s[d][idx];
    if (item.quantity > 1) {
      s[d][idx] = { ...item, quantity: item.quantity - 1 };
      set({ drawers: s });
      await localforage.setItem(KEY, s);
    }
  },
  deleteAndAddToShoppingList: async (d: number, idx: number) => {
    const s = { ...get().drawers };
    const item = s[d][idx];
    
    // Remove from inventory
    s[d] = s[d].filter((_, i) => i !== idx);
    set({ drawers: s });
    
    // Add to shopping list
    const shoppingItem: ShoppingItem = {
      id: generateId(),
      name: item.name,
      addedDate: new Date(),
      completed: false,
    };
    const newShoppingList = [...get().shoppingList, shoppingItem];
    set({ shoppingList: newShoppingList });
    
    // Save both changes
    await Promise.all([
      localforage.setItem(KEY, s),
      localforage.setItem(SHOPPING_LIST_KEY, newShoppingList),
      get().addToHistory(item.name)
    ]);
  },
  moveItem: async (fromDrawer: number, fromIdx: number, toDrawer: number, toIdx?: number) => {
    const s = { ...get().drawers };
    const item = s[fromDrawer][fromIdx];
    s[fromDrawer] = s[fromDrawer].filter((_, i) => i !== fromIdx);
    
    if (toIdx !== undefined) {
      s[toDrawer] = [...s[toDrawer].slice(0, toIdx), item, ...s[toDrawer].slice(toIdx)];
    } else {
      s[toDrawer] = [...s[toDrawer], item];
    }
    
    set({ drawers: s });
    await localforage.setItem(KEY, s);
  },
  replaceAll: async (data: DrawerMap) => {
    set({ drawers: data });
    await localforage.setItem(KEY, data);
  },

  toggleDateDisplay: async () => {
    const newMode = get().dateDisplayMode === 'date' ? 'duration' : 'date';
    set({ dateDisplayMode: newMode });
    await localforage.setItem(DATE_DISPLAY_KEY, newMode);
  },
  getDurationText: (date: Date) => {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Idag';
    if (diffDays === 1) return 'Igår';
    if (diffDays < 7) return `${diffDays} dagar`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} veckor`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} månader`;
    return `${Math.floor(diffDays / 365)} år`;
  },
  addToHistory: async (itemName: string) => {
    const history = get().itemHistory;
    const normalizedName = itemName.trim().toLowerCase();
    
    // Remove if already exists and add to front
    const filteredHistory = history.filter(item => item.toLowerCase() !== normalizedName);
    const newHistory = [itemName, ...filteredHistory].slice(0, 50); // Keep last 50 items
    
    set({ itemHistory: newHistory });
    await localforage.setItem(ITEM_HISTORY_KEY, newHistory);
  },
  getSuggestions: (query: string) => {
    const history = get().itemHistory;
    const normalizedQuery = query.trim().toLowerCase();
    
    if (!normalizedQuery) return [];
    
    return history
      .filter(item => item.toLowerCase().includes(normalizedQuery))
      .slice(0, 5); // Return top 5 matches
  },
  addShoppingItem: async (name: string) => {
    const item: ShoppingItem = {
      id: generateId(),
      name,
      addedDate: new Date(),
      completed: false,
    };
    const newList = [...get().shoppingList, item];
    set({ shoppingList: newList });
    await Promise.all([
      localforage.setItem(SHOPPING_LIST_KEY, newList),
      get().addToHistory(name)
    ]);
  },
  toggleShoppingItem: async (id: string) => {
    const newList = get().shoppingList.map(item =>
      item.id === id ? { ...item, completed: !item.completed } : item
    );
    set({ shoppingList: newList });
    await localforage.setItem(SHOPPING_LIST_KEY, newList);
  },
  removeShoppingItem: async (id: string) => {
    const newList = get().shoppingList.filter(item => item.id !== id);
    set({ shoppingList: newList });
    await localforage.setItem(SHOPPING_LIST_KEY, newList);
  },
  editShoppingItem: async (id: string, name: string) => {
    const newList = get().shoppingList.map(item =>
      item.id === id ? { ...item, name } : item
    );
    set({ shoppingList: newList });
    await localforage.setItem(SHOPPING_LIST_KEY, newList);
  },
  clearCompletedShoppingItems: async () => {
    const newList = get().shoppingList.filter(item => !item.completed);
    set({ shoppingList: newList });
    await localforage.setItem(SHOPPING_LIST_KEY, newList);
  },
  checkForUpdates: async () => {
    set({ updateStatus: 'checking' });
    const result = await updateService.checkForUpdates();
    set({ 
      updateStatus: result.status,
      updateInfo: result.updateInfo || null
    });
  },
  getCurrentVersion: () => updateService.getCurrentVersion(),
  getLastCheckTime: () => updateService.getLastCheckTime(),
      setCurrentFamily: async (family: Family | null) => {
      set({ currentFamily: family });
      await localforage.setItem(FAMILY_KEY, family);
      
      if (family) {
        set({
          syncStatus: {
            isConnected: true,
            familyId: family.id,
            lastSync: null,
            syncError: null,
            isHost: family.members.find(m => m.email === googleDriveService.getCurrentUser()?.email)?.isHost || false,
          }
        });
        await localforage.setItem(SYNC_STATUS_KEY, get().syncStatus);
      } else {
        set({
          syncStatus: {
            isConnected: false,
            familyId: null,
            lastSync: null,
            syncError: null,
            isHost: false,
          }
        });
        await localforage.setItem(SYNC_STATUS_KEY, get().syncStatus);
      }
    },
    createFamily: async (familyName: string) => {
      try {
        const result = await googleDriveService.createFamily(familyName);
        if (result.success && result.family) {
          await get().setCurrentFamily(result.family);
          return { success: true, family: result.family };
        } else {
          console.error('Family creation failed:', result.error, result.errorCode);
          return { success: false, error: result.error, errorCode: result.errorCode };
        }
      } catch (error) {
        console.error('Family creation error:', error);
        return { success: false, error: 'Ett oväntat fel uppstod', errorCode: 'UNKNOWN_ERROR' };
      }
    },
  syncWithFamily: async () => {
    const family = get().currentFamily;
    if (!family) return;

    try {
      set({
        syncStatus: {
          ...get().syncStatus,
          syncError: null,
        }
      });

      // Get current data
      const currentData = {
        drawers: get().drawers,
        shoppingList: get().shoppingList,
        settings: {
          dateDisplayMode: get().dateDisplayMode,
          itemHistory: get().itemHistory,
        },
        lastUpdated: new Date().toISOString(),
      };

      // Update family data
      const success = await googleDriveService.updateFamilyData(family.id, currentData);
      
      if (success) {
        set({
          syncStatus: {
            ...get().syncStatus,
            lastSync: new Date(),
          }
        });
        await localforage.setItem(SYNC_STATUS_KEY, get().syncStatus);
      } else {
        throw new Error('Failed to sync with family');
      }
    } catch (error) {
      set({
        syncStatus: {
          ...get().syncStatus,
          syncError: error instanceof Error ? error.message : 'Sync failed',
        }
      });
      await localforage.setItem(SYNC_STATUS_KEY, get().syncStatus);
    }
  },
  signInWithGoogle: async () => {
    try {
      const user = await googleDriveService.signIn();
      return !!user;
    } catch (error) {
      console.error('Google sign-in failed:', error);
      return false;
    }
  },
  signOutFromGoogle: async () => {
    await googleDriveService.signOut();
    set({
      currentFamily: null,
      syncStatus: {
        isConnected: false,
        familyId: null,
        lastSync: null,
        syncError: null,
        isHost: false,
      }
    });
    await Promise.all([
      localforage.setItem(FAMILY_KEY, null),
      localforage.setItem(SYNC_STATUS_KEY, get().syncStatus),
    ]);
  },
}));
