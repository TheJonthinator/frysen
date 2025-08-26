import { create } from "zustand";
import localforage from "localforage";
import type { Item, DrawerMap, DateDisplayMode, ShoppingItem, UpdateStatus, UpdateInfo } from "./types";
import { DRAWER_COUNT } from "./types";
import { updateService } from "./services/updateService";

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
  checkForUpdates: () => Promise<void>;
  getCurrentVersion: () => string;
  getLastCheckTime: () => Date | null;
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
  load: async () => {
    const [data, dateDisplay, history, shoppingList] = await Promise.all([
      localforage.getItem<DrawerMap>(KEY),
      localforage.getItem<DateDisplayMode>(DATE_DISPLAY_KEY),
      localforage.getItem<string[]>(ITEM_HISTORY_KEY),
      localforage.getItem<ShoppingItem[]>(SHOPPING_LIST_KEY)
    ]);
    set({ 
      drawers: data || empty(),
      dateDisplayMode: dateDisplay || 'date',
      itemHistory: history || [],
      shoppingList: shoppingList || []
    });
  },
  addItem: async (d: number, name: string) => {
    const s = { ...get().drawers };
    const item: Item = {
      id: generateId(),
      name,
      addedDate: new Date(),
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
}));
