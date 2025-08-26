import { create } from "zustand";
import localforage from "localforage";
import type { Item, DrawerMap, DateDisplayMode, ShoppingItem, UpdateStatus, UpdateInfo } from "./types";
import { DRAWER_COUNT } from "./types";
import { updateService } from "./services/updateService";
import { supabaseSync } from "./services/supabaseSync";

const KEY = "frysen_v5";

const DATE_DISPLAY_KEY = "frysen_date_display";
const ITEM_HISTORY_KEY = "frysen_item_history";
const SHOPPING_LIST_KEY = "frysen_shopping_list";
localforage.config({ name: "frysen" });

type State = {
  drawers: DrawerMap;
  dateDisplayMode: DateDisplayMode;
  itemHistory: string[];
  shoppingList: ShoppingItem[];
  updateStatus: UpdateStatus;
  updateInfo: UpdateInfo | null;
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
  applySyncSnapshot: (data: { drawers: DrawerMap; shoppingList: ShoppingItem[] }) => Promise<void>;

};

const empty = (): DrawerMap => {
  const m: DrawerMap = {} as any;
  for (let i = 1; i <= DRAWER_COUNT; i++) m[i] = [];
  return m;
};

const generateId = () => Math.random().toString(36).substr(2, 9);

// Helper function for auto-saving to Supabase
const autoSaveToSupabase = (drawers: DrawerMap, shoppingList: ShoppingItem[]) => {
  const syncStatus = supabaseSync.getSyncStatus();
  if (syncStatus.isConfigured) {
    const data = {
      drawers,
      shoppingList,
      lastUpdated: new Date().toISOString(),
      version: "1.0.0",
    };
    supabaseSync.writeToDatabase(data).catch(console.error);
  }
};

// Debounced auto-save to prevent rapid database calls
let autoSaveTimeout: NodeJS.Timeout | null = null;
const debouncedAutoSave = (drawers: DrawerMap, shoppingList: ShoppingItem[]) => {
  if (autoSaveTimeout) {
    clearTimeout(autoSaveTimeout);
  }
  autoSaveTimeout = setTimeout(() => {
    autoSaveToSupabase(drawers, shoppingList);
  }, 2000); // 2 second delay to prevent rapid updates
};

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
    const [data, dateDisplay, history, shoppingList] = await Promise.all([
      localforage.getItem<DrawerMap>(KEY),
      localforage.getItem<DateDisplayMode>(DATE_DISPLAY_KEY),
      localforage.getItem<string[]>(ITEM_HISTORY_KEY),
      localforage.getItem<ShoppingItem[]>(SHOPPING_LIST_KEY)
    ]);
    
    // Ensure all drawers are arrays
    const normalizedDrawers = data || empty();
    for (let i = 1; i <= DRAWER_COUNT; i++) {
      if (!Array.isArray(normalizedDrawers[i])) {
        console.warn(`Drawer ${i} is not an array during load, initializing as empty array`);
        normalizedDrawers[i] = [];
      }
    }
    
    set({ 
      drawers: normalizedDrawers,
      dateDisplayMode: dateDisplay || 'date',
      itemHistory: history || [],
      shoppingList: shoppingList || []
    });
  },
  addItem: async (d: number, name: string) => {
    const s = { ...get().drawers };
    
    // Ensure s[d] is always an array
    if (!Array.isArray(s[d])) {
      console.warn(`Drawer ${d} is not an array, initializing as empty array`);
      s[d] = [];
    }
    
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
    
    // Auto-save to Supabase if configured
    debouncedAutoSave(s, get().shoppingList);
  },
  editItem: async (d: number, idx: number, updates: Partial<Item>) => {
    const s = { ...get().drawers };
    
    // Ensure s[d] is always an array
    if (!Array.isArray(s[d])) {
      console.warn(`Drawer ${d} is not an array, initializing as empty array`);
      s[d] = [];
    }
    
    s[d] = s[d].map((v, i) => (i === idx ? { ...v, ...updates } : v));
    set({ drawers: s });
    await localforage.setItem(KEY, s);
    
    // Auto-save to Supabase if configured
    debouncedAutoSave(s, get().shoppingList);
  },
  removeItem: async (d: number, idx: number) => {
    const s = { ...get().drawers };
    
    // Ensure s[d] is always an array
    if (!Array.isArray(s[d])) {
      console.warn(`Drawer ${d} is not an array, initializing as empty array`);
      s[d] = [];
    }
    
    s[d] = s[d].filter((_, i) => i !== idx);
    set({ drawers: s });
    await localforage.setItem(KEY, s);
    
    // Auto-save to Supabase if configured
    debouncedAutoSave(s, get().shoppingList);
  },
  increaseQuantity: async (d: number, idx: number) => {
    const s = { ...get().drawers };
    
    // Ensure s[d] is always an array
    if (!Array.isArray(s[d])) {
      console.warn(`Drawer ${d} is not an array, initializing as empty array`);
      s[d] = [];
    }
    
    const item = s[d][idx];
    s[d][idx] = { ...item, quantity: item.quantity + 1 };
    set({ drawers: s });
    await localforage.setItem(KEY, s);
    
    // Auto-save to Supabase if configured
    debouncedAutoSave(s, get().shoppingList);
  },
  decreaseQuantity: async (d: number, idx: number) => {
    const s = { ...get().drawers };
    
    // Ensure s[d] is always an array
    if (!Array.isArray(s[d])) {
      console.warn(`Drawer ${d} is not an array, initializing as empty array`);
      s[d] = [];
    }
    
    const item = s[d][idx];
    if (item.quantity > 1) {
      s[d][idx] = { ...item, quantity: item.quantity - 1 };
      set({ drawers: s });
      await localforage.setItem(KEY, s);
      
      // Auto-save to Supabase if configured
      debouncedAutoSave(s, get().shoppingList);
    }
  },
  deleteAndAddToShoppingList: async (d: number, idx: number) => {
    const s = { ...get().drawers };
    
    // Ensure s[d] is always an array
    if (!Array.isArray(s[d])) {
      console.warn(`Drawer ${d} is not an array, initializing as empty array`);
      s[d] = [];
    }
    
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
    
    // Auto-save to Supabase if configured
    const syncStatus = supabaseSync.getSyncStatus();
    if (syncStatus.isConfigured) {
      const data = {
        drawers: s,
        shoppingList: newShoppingList,
        lastUpdated: new Date().toISOString(),
        version: "1.0.0",
      };
      supabaseSync.writeToDatabase(data).catch(console.error);
    }
  },
  moveItem: async (fromDrawer: number, fromIdx: number, toDrawer: number, toIdx?: number) => {
    const s = { ...get().drawers };
    
    // Ensure both drawers are always arrays
    if (!Array.isArray(s[fromDrawer])) {
      console.warn(`From drawer ${fromDrawer} is not an array, initializing as empty array`);
      s[fromDrawer] = [];
    }
    if (!Array.isArray(s[toDrawer])) {
      console.warn(`To drawer ${toDrawer} is not an array, initializing as empty array`);
      s[toDrawer] = [];
    }
    
    const item = s[fromDrawer][fromIdx];
    s[fromDrawer] = s[fromDrawer].filter((_, i) => i !== fromIdx);
    
    if (toIdx !== undefined) {
      s[toDrawer] = [...s[toDrawer].slice(0, toIdx), item, ...s[toDrawer].slice(toIdx)];
    } else {
      s[toDrawer] = [...s[toDrawer], item];
    }
    
    set({ drawers: s });
    await localforage.setItem(KEY, s);
    
    // Auto-save to Supabase if configured
    debouncedAutoSave(s, get().shoppingList);
  },
  replaceAll: async (data: DrawerMap) => {
    set({ drawers: data });
    await localforage.setItem(KEY, data);
    
    // Auto-save to Supabase if configured
    debouncedAutoSave(data, get().shoppingList);
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
    
    // Auto-save to Supabase if configured
    debouncedAutoSave(get().drawers, newList);
  },
  toggleShoppingItem: async (id: string) => {
    const newList = get().shoppingList.map(item =>
      item.id === id ? { ...item, completed: !item.completed } : item
    );
    set({ shoppingList: newList });
    await localforage.setItem(SHOPPING_LIST_KEY, newList);
    
    // Auto-save to Supabase if configured
    debouncedAutoSave(get().drawers, newList);
  },
  removeShoppingItem: async (id: string) => {
    const newList = get().shoppingList.filter(item => item.id !== id);
    set({ shoppingList: newList });
    await localforage.setItem(SHOPPING_LIST_KEY, newList);
    
    // Auto-save to Supabase if configured
    debouncedAutoSave(get().drawers, newList);
  },
  editShoppingItem: async (id: string, name: string) => {
    const newList = get().shoppingList.map(item =>
      item.id === id ? { ...item, name } : item
    );
    set({ shoppingList: newList });
    await localforage.setItem(SHOPPING_LIST_KEY, newList);
    
    // Auto-save to Supabase if configured
    debouncedAutoSave(get().drawers, newList);
  },
  
  clearCompletedShoppingItems: async () => {
    const newList = get().shoppingList.filter(item => !item.completed);
    set({ shoppingList: newList });
    await localforage.setItem(SHOPPING_LIST_KEY, newList);
    
    // Auto-save to Supabase if configured
    debouncedAutoSave(get().drawers, newList);
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
  applySyncSnapshot: async ({ drawers, shoppingList }) => {
    // Ensure all drawers are arrays before applying
    const normalizedDrawers: DrawerMap = {} as any;
    for (let i = 1; i <= DRAWER_COUNT; i++) {
      normalizedDrawers[i] = Array.isArray(drawers[i]) ? drawers[i] : [];
    }
    
    // uppdatera lokalt och persistera – men INTE Supabase
    set({ drawers: normalizedDrawers, shoppingList });
    await Promise.all([
      localforage.setItem(KEY, normalizedDrawers),
      localforage.setItem(SHOPPING_LIST_KEY, shoppingList),
    ]);
  },
}));
