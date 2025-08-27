import { create } from "zustand";
import localforage from "localforage";
import type { 
  Item, 
  DrawerMap, 
  DateDisplayMode, 
  ShoppingItem, 
  UpdateStatus, 
  UpdateInfo,
  AppData,
  DefaultDrawer,
  Container as ContainerType
} from "./types";
import { isModularData, isLegacyData } from "./types";
import { DRAWER_COUNT, CURRENT_SCHEMA_VERSION } from "./types";
import { updateService } from "./services/updateService";
import { supabaseSync } from "./services/supabaseSync";

const KEY = "frysen_v6"; // Updated key for modular data structure

const DATE_DISPLAY_KEY = "frysen_date_display";
const ITEM_HISTORY_KEY = "frysen_item_history";
const SHOPPING_LIST_KEY = "frysen_shopping_list";
localforage.config({ name: "frysen" });

type State = {
  // Legacy data (for backward compatibility)
  drawers: DrawerMap;
  
  // New modular data
  defaultDrawer: DefaultDrawer;
  containers: Record<string, ContainerType>;
  
  // Common data
  dateDisplayMode: DateDisplayMode;
  itemHistory: string[];
  shoppingList: ShoppingItem[];
  updateStatus: UpdateStatus;
  updateInfo: UpdateInfo | null;
  
  // Data management
  load: () => Promise<void>;
  save: () => Promise<void>;
  refetchFromLegacy: () => Promise<void>;
  
  // Legacy methods (for backward compatibility)
  addItem: (drawer: number, name: string) => Promise<void>;
  editItem: (drawer: number, idx: number, updates: Partial<Item>) => Promise<void>;
  removeItem: (drawer: number, idx: number) => Promise<void>;
  increaseQuantity: (drawer: number, idx: number) => Promise<void>;
  decreaseQuantity: (drawer: number, idx: number) => Promise<void>;
  deleteAndAddToShoppingList: (drawer: number, idx: number) => Promise<void>;
  moveItem: (fromDrawer: number, fromIdx: number, toDrawer: number, toIdx?: number) => Promise<void>;
  replaceAll: (data: DrawerMap) => Promise<void>;
  
  // New modular methods
  addItemToDefaultDrawer: (name: string) => Promise<void>;
  editItemInDrawer: (drawerId: string, idx: number, updates: Partial<Item>) => Promise<void>;
  removeItemFromDrawer: (drawerId: string, idx: number) => Promise<void>;
  increaseQuantityInDrawer: (drawerId: string, idx: number) => Promise<void>;
  decreaseQuantityInDrawer: (drawerId: string, idx: number) => Promise<void>;
  deleteAndAddToShoppingListFromDrawer: (drawerId: string, idx: number) => Promise<void>;
  moveItemBetweenDrawers: (fromDrawerId: string, fromIdx: number, toDrawerId: string) => Promise<void>;
  syncModularDataToSupabase: () => void;
  
  // Container management
  addContainer: (container: Omit<ContainerType, "id">) => Promise<void>;
  updateContainer: (id: string, updates: Partial<ContainerType>) => Promise<void>;
  deleteContainer: (id: string) => Promise<void>;
  addDrawerToContainer: (containerId: string, drawer: Omit<ContainerType["drawers"][string], "id">) => Promise<void>;
  updateDrawerInContainer: (containerId: string, drawerId: string, updates: Partial<ContainerType["drawers"][string]>) => Promise<void>;
  deleteDrawerFromContainer: (containerId: string, drawerId: string) => Promise<void>;
  reorderDrawersInContainer: (containerId: string, drawerIds: string[]) => Promise<void>;
  
  // Common methods
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

// Debounced auto-save for modular data
let modularAutoSaveTimeout: NodeJS.Timeout | null = null;
const debouncedModularAutoSave = (defaultDrawer: DefaultDrawer, containers: Record<string, ContainerType>, shoppingList: ShoppingItem[]) => {
  if (modularAutoSaveTimeout) {
    clearTimeout(modularAutoSaveTimeout);
  }
  modularAutoSaveTimeout = setTimeout(async () => {
    // Save the full modular data structure as JSON in the drawers field
    const modularStructure = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      defaultDrawer,
      containers,
      shoppingList,
      lastUpdated: new Date().toISOString(),
      version: '1.0.0',
    };
    
    const syncData = {
      drawers: modularStructure, // Store modular structure as JSON in drawers
      shoppingList,
      lastUpdated: new Date().toISOString(),
      version: '1.0.0',
      schemaVersion: CURRENT_SCHEMA_VERSION,
    };
    
    await supabaseSync.writeToDatabase(syncData);
  }, 2000); // 2 second delay to prevent rapid updates
};

export const useStore = create<State>((set, get) => ({
  // Legacy data
  drawers: empty(),
  
  // New modular data
  defaultDrawer: {
    id: "default",
    name: "Köksbänken",
    items: [],
  },
  containers: {},
  
  // Common data
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
    console.log("🔄 [STORE] Starting load process...");
    console.log("🔄 [STORE] Looking for data with key:", KEY);
    
    // Try to load from new key first, then fall back to old keys
    let data = await localforage.getItem<AppData>(KEY);
    console.log("🔄 [STORE] Data from new key:", data);
    

    
    // If no data found with new key, try old keys
    if (!data) {
      console.log("🔄 [STORE] No data found with new key, trying old keys...");
      const oldKeys = ["frysen_v5", "frysen_v4", "frysen_v3", "frysen_v2", "frysen_v1", "frysen"];
      
      for (const oldKey of oldKeys) {
        console.log(`🔄 [STORE] About to read key: ${oldKey}`);
        const oldData = await localforage.getItem<any>(oldKey);
        console.log(`🔄 [STORE] Raw data from ${oldKey}:`, oldData);
        console.log(`🔄 [STORE] Type of data:`, typeof oldData);
        console.log(`🔄 [STORE] Is object:`, oldData && typeof oldData === 'object');
        if (oldData && typeof oldData === 'object') {
          // If it's under an old key, assume it's legacy structure
          console.log(`🔄 [STORE] Found legacy data with key: ${oldKey}`);
          console.log(`🔄 [STORE] Raw legacy data:`, JSON.stringify(oldData, null, 2));
          data = oldData;
          break;
        }
      }
    }
    
    const [dateDisplay, history, shoppingList] = await Promise.all([
      localforage.getItem<DateDisplayMode>(DATE_DISPLAY_KEY),
      localforage.getItem<string[]>(ITEM_HISTORY_KEY),
      localforage.getItem<ShoppingItem[]>(SHOPPING_LIST_KEY)
    ]);
    
    if (data && isModularData(data)) {
      // New modular data format
      console.log("🔄 [STORE] isModularData returned true");
      console.log("🔄 [STORE] data has schemaVersion:", 'schemaVersion' in data);
      console.log("🔄 [STORE] schemaVersion value:", data.schemaVersion);
      console.log("🔄 [STORE] CURRENT_SCHEMA_VERSION:", CURRENT_SCHEMA_VERSION);
      
      // Helper function to preserve drawer order
      const preserveDrawerOrder = (containers: Record<string, ContainerType>) => {
        const orderedContainers: Record<string, ContainerType> = {};
        Object.entries(containers).forEach(([containerId, container]) => {
          const drawerIds = Object.keys(container.drawers);
          const orderedDrawers: Record<string, any> = {};
          
          drawerIds.forEach(drawerId => {
            if (container.drawers[drawerId]) {
              orderedDrawers[drawerId] = container.drawers[drawerId];
            }
          });
          
          orderedContainers[containerId] = {
            ...container,
            drawers: orderedDrawers,
          };
        });
        return orderedContainers;
      };
      
      // TEMPORARY: Force re-migration if containers are empty
      if (Object.keys(data.containers).length === 0) {
        console.log("🔄 [STORE] Found empty containers, forcing re-migration...");
        // Clear the new key data to force legacy data lookup
        await localforage.removeItem(KEY);
        data = null; // This will trigger the legacy data lookup below
      } else {
        set({ 
          drawers: empty(), // Keep legacy drawers empty for backward compatibility
          defaultDrawer: data.defaultDrawer,
          containers: preserveDrawerOrder(data.containers),
          dateDisplayMode: dateDisplay || 'date',
          itemHistory: history || [],
          shoppingList: data.shoppingList || shoppingList || []
        });
      }
    } else if (data && isLegacyData(data)) {
      // Legacy data format - convert to modular
      console.log("🔄 [STORE] isLegacyData returned true");
      console.log("🔄 [STORE] data has schemaVersion:", 'schemaVersion' in data);
      console.log("🔄 [STORE] Loading legacy data format, converting to modular", data);
      console.log("🔄 [STORE] data.drawers:", data.drawers);
      console.log("🔄 [STORE] typeof data.drawers:", typeof data.drawers);
      console.log("🔄 [STORE] Object.keys(data):", Object.keys(data));
      
      // Handle both legacy formats: data.drawers and data with direct drawer properties
      let normalizedDrawers: DrawerMap;
      if (data.drawers) {
        // Legacy format with drawers property
        normalizedDrawers = data.drawers;
      } else {
        // Legacy format with direct drawer properties (your case)
        normalizedDrawers = data as unknown as DrawerMap;
      }
      
      // Ensure all drawers exist, even if empty
      for (let i = 1; i <= DRAWER_COUNT; i++) {
        if (!Array.isArray(normalizedDrawers[i])) {
          normalizedDrawers[i] = [];
        }
      }
      
      console.log("🔄 [STORE] Normalized drawers:", normalizedDrawers);
      for (let i = 1; i <= DRAWER_COUNT; i++) {
        if (!Array.isArray(normalizedDrawers[i])) {
          console.warn(`Drawer ${i} is not an array during load, initializing as empty array`);
          normalizedDrawers[i] = [];
        }
      }
      
      // Convert legacy drawers to modular format
      const defaultDrawer: DefaultDrawer = {
        id: "default",
        name: "Köksbänken",
        items: normalizedDrawers[1] || [], // Drawer 1 becomes default drawer
      };
      
      const containers: Record<string, ContainerType> = {};
      let containerOrder = 0;
      
              // Convert remaining drawers to a "Frys" container
        const frysDrawers: Record<string, any> = {};
        Object.entries(normalizedDrawers).forEach(([drawerKey, items]) => {
          const drawerNum = parseInt(drawerKey);
          if (drawerNum !== 1 && items.length > 0) { // Skip drawer 1 (now default)
            const drawerId = `drawer-${drawerNum.toString().padStart(3, '0')}`;
            frysDrawers[drawerId] = {
              id: drawerId,
              name: drawerNum === 2 ? "Fack 1" : drawerNum === 3 ? "Fack 2" : `Låda ${drawerNum - 1}`,
              items,
            };
          }
        });
      
      if (Object.keys(frysDrawers).length > 0) {
        containers["frys"] = {
          id: "frys",
          title: "Frys",
          drawers: frysDrawers,
          drawerOrder: Object.keys(frysDrawers), // Initialize with current order
          order: containerOrder++,
        };
      }
      
      set({ 
        drawers: normalizedDrawers, // Keep for backward compatibility
        defaultDrawer,
        containers,
        dateDisplayMode: dateDisplay || 'date',
        itemHistory: history || [],
        shoppingList: data.shoppingList || shoppingList || []
      });
      
      // Auto-save the converted data in new format
      setTimeout(() => {
        get().save();
      }, 100);
    } else {
      // No data or invalid format - initialize with empty modular structure
      console.log("🔄 [STORE] No data found or invalid format, initializing empty modular structure");
      console.log("🔄 [STORE] Final data value:", data);
      console.log("🔄 [STORE] isModularData result:", data ? isModularData(data) : "no data");
      console.log("🔄 [STORE] isLegacyData result:", data ? isLegacyData(data) : "no data");
    set({ 
        drawers: empty(),
        defaultDrawer: {
          id: "default",
          name: "Köksbänken",
          items: [],
        },
        containers: {},
      dateDisplayMode: dateDisplay || 'date',
        itemHistory: history || [],
        shoppingList: shoppingList || []
    });
    }
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
  getDurationText: (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - dateObj.getTime());
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
  
  // New modular methods
  save: async () => {
    const state = get();
    const data: AppData = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      defaultDrawer: state.defaultDrawer,
      containers: state.containers,
      shoppingList: state.shoppingList,
      lastUpdated: new Date().toISOString(),
      version: "1.0.0",
    };
    await localforage.setItem(KEY, data);
  },
  
  refetchFromLegacy: async () => {
    console.log("🔄 [STORE] Refetching from legacy data...");
    
    // Clear current modular data
    await localforage.removeItem(KEY);
    
    // Also clear all old keys to start fresh
    const keysToClear = ["frysen_v5", "frysen_v4", "frysen_v3", "frysen_v2", "frysen_v1", "frysen"];
    for (const oldKey of keysToClear) {
      await localforage.removeItem(oldKey);
    }
    console.log("🔄 [STORE] Cleared all data keys");
    
    // Try to get data from Supabase first
    console.log("🔄 [STORE] Checking Supabase for data...");
    const supabaseData = await supabaseSync.readFromDatabase();
    
    if (supabaseData) {
      // Check if it's modular data stored in drawers as JSON
      if (supabaseData.drawers && typeof supabaseData.drawers === 'object' && 'schemaVersion' in supabaseData.drawers) {
        console.log("🔄 [STORE] Found modular data in Supabase:", supabaseData.drawers);
        
        // Load modular data from drawers JSON
        const modularData = supabaseData.drawers as any;
        set({
          defaultDrawer: modularData.defaultDrawer,
          containers: modularData.containers,
          dateDisplayMode: get().dateDisplayMode,
          itemHistory: get().itemHistory,
          shoppingList: supabaseData.shoppingList || get().shoppingList
        });
        
        // Save to localForage
        await get().save();
        console.log("🔄 [STORE] Modular data loaded from Supabase");
        return;
      }
      
      // Check if it's legacy data
      if (supabaseData.drawers) {
        console.log("🔄 [STORE] Found legacy data in Supabase:", supabaseData.drawers);
        // Run migration on Supabase data
        const normalizedDrawers = supabaseData.drawers;
        
        // Convert legacy drawers to modular format
        const defaultDrawer: DefaultDrawer = {
          id: "default",
          name: "Köksbänken",
          items: (normalizedDrawers[1] || []).map(item => ({
            ...item,
            addedDate: new Date(item.addedDate)
          })), // Drawer 1 becomes default drawer
        };
        
        const containers: Record<string, ContainerType> = {};
        let containerOrder = 0;
        
        // Convert remaining drawers to a "Frys" container
        const frysDrawers: Record<string, any> = {};
        Object.entries(normalizedDrawers).forEach(([drawerKey, items]) => {
          const drawerNum = parseInt(drawerKey);
          if (drawerNum !== 1 && (items as Item[]).length > 0) { // Skip drawer 1 (now default)
            const drawerId = `drawer-${drawerNum.toString().padStart(3, '0')}`;
            frysDrawers[drawerId] = {
              id: drawerId,
              name: drawerNum === 2 ? "Fack 1" : drawerNum === 3 ? "Fack 2" : `Låda ${drawerNum - 1}`,
              items: (items as Item[]).map(item => ({
                ...item,
                addedDate: new Date(item.addedDate)
              })),
            };
          }
        });
        
        if (Object.keys(frysDrawers).length > 0) {
          containers["frys"] = {
            id: "frys",
            title: "Frys",
            drawers: frysDrawers,
            drawerOrder: Object.keys(frysDrawers), // Initialize with current order
            order: containerOrder++,
          };
        }
        
        // Update state with migrated data
        set({ 
          drawers: normalizedDrawers, // Keep for backward compatibility
          defaultDrawer,
          containers,
          dateDisplayMode: get().dateDisplayMode,
          itemHistory: get().itemHistory,
          shoppingList: supabaseData.shoppingList || get().shoppingList
        });
        
        // Save the migrated data
        await get().save();
        
        // Also save to Supabase to update the database with modular format
        const syncData = {
          schemaVersion: CURRENT_SCHEMA_VERSION,
          defaultDrawer,
          containers,
          shoppingList: supabaseData.shoppingList || get().shoppingList,
          lastUpdated: new Date().toISOString(),
          version: '1.0.0',
        };
        await supabaseSync.writeToDatabase(syncData);
        console.log("🔄 [STORE] Migration from Supabase complete and saved to database");
        return;
      }
    }
    
    // If no Supabase data, try localForage old keys
    console.log("🔄 [STORE] No Supabase data found, checking localForage old keys...");
    for (const oldKey of keysToClear) {
      const oldData = await localforage.getItem(oldKey);
      if (oldData && typeof oldData === 'object') {
        console.log("🔄 [STORE] Found legacy data in localForage:", oldKey, oldData);
        
        // Handle legacy data from localForage
        const data = oldData as any;
        const normalizedDrawers = data.drawers || data;
        
        // Ensure all drawers exist, even if empty
        for (let i = 1; i <= DRAWER_COUNT; i++) {
          if (!Array.isArray(normalizedDrawers[i])) {
            normalizedDrawers[i] = [];
          }
        }
        
        // Convert legacy drawers to modular format
        const defaultDrawer: DefaultDrawer = {
          id: "default",
          name: "Köksbänken",
          items: (normalizedDrawers[1] || []).map((item: any) => ({
            ...item,
            addedDate: new Date(item.addedDate)
          })),
        };
        
        const containers: Record<string, ContainerType> = {};
        let containerOrder = 0;
        
        // Convert remaining drawers to a "Frys" container
        const frysDrawers: Record<string, any> = {};
        Object.entries(normalizedDrawers).forEach(([drawerKey, items]) => {
          const drawerNum = parseInt(drawerKey);
          if (drawerNum !== 1 && (items as Item[]).length > 0) {
            const drawerId = `drawer-${drawerNum.toString().padStart(3, '0')}`;
            frysDrawers[drawerId] = {
              id: drawerId,
              name: drawerNum === 2 ? "Fack 1" : drawerNum === 3 ? "Fack 2" : `Låda ${drawerNum - 1}`,
              items: (items as Item[]).map(item => ({
                ...item,
                addedDate: new Date(item.addedDate)
              })),
            };
          }
        });
        
        if (Object.keys(frysDrawers).length > 0) {
          containers["frys"] = {
            id: "frys",
            title: "Frys",
            drawers: frysDrawers,
            drawerOrder: Object.keys(frysDrawers), // Initialize with current order
            order: containerOrder++,
          };
        }
        
        // Update state with migrated data
        set({ 
          drawers: normalizedDrawers,
          defaultDrawer,
          containers,
          dateDisplayMode: get().dateDisplayMode,
          itemHistory: get().itemHistory,
          shoppingList: get().shoppingList
        });
        
        // Save the migrated data
        await get().save();
        console.log("🔄 [STORE] Refetch and migration complete");
        return;
      }
    }
    
    console.log("🔄 [STORE] No legacy data found to refetch");
  },
  
  addItemToDefaultDrawer: async (name: string) => {
    const item: Item = {
      id: generateId(),
      name,
      addedDate: new Date(),
      quantity: 1,
    };
    const state = get();
    const newDefaultDrawer = {
      ...state.defaultDrawer,
      items: [...state.defaultDrawer.items, item],
    };
    set({ defaultDrawer: newDefaultDrawer });
    await get().save();
    await get().addToHistory(name);
    
    // Auto-save to Supabase
    debouncedModularAutoSave(newDefaultDrawer, state.containers, state.shoppingList);
  },
  
  editItemInDrawer: async (drawerId: string, idx: number, updates: Partial<Item>) => {
    const state = get();
    
    if (drawerId === state.defaultDrawer.id) {
      const newDefaultDrawer = {
        ...state.defaultDrawer,
        items: state.defaultDrawer.items.map((item, i) => 
          i === idx ? { ...item, ...updates } : item
        ),
      };
      set({ defaultDrawer: newDefaultDrawer });
    } else {
      // Find drawer in containers
      const newContainers = { ...state.containers };
      for (const containerId in newContainers) {
        if (newContainers[containerId].drawers[drawerId]) {
          newContainers[containerId] = {
            ...newContainers[containerId],
            drawers: {
              ...newContainers[containerId].drawers,
              [drawerId]: {
                ...newContainers[containerId].drawers[drawerId],
                items: newContainers[containerId].drawers[drawerId].items.map((item, i) =>
                  i === idx ? { ...item, ...updates } : item
                ),
              },
            },
          };
          break;
        }
      }
      set({ containers: newContainers });
    }
    await get().save();
  },
  
  // Helper function to sync modular data to Supabase
  syncModularDataToSupabase: () => {
    const state = get();
    debouncedModularAutoSave(state.defaultDrawer, state.containers, state.shoppingList);
  },
  
  removeItemFromDrawer: async (drawerId: string, idx: number) => {
    const state = get();
    
    if (drawerId === state.defaultDrawer.id) {
      const newDefaultDrawer = {
        ...state.defaultDrawer,
        items: state.defaultDrawer.items.filter((_, i) => i !== idx),
      };
      set({ defaultDrawer: newDefaultDrawer });
    } else {
      // Find drawer in containers
      const newContainers = { ...state.containers };
      for (const containerId in newContainers) {
        if (newContainers[containerId].drawers[drawerId]) {
          newContainers[containerId] = {
            ...newContainers[containerId],
            drawers: {
              ...newContainers[containerId].drawers,
              [drawerId]: {
                ...newContainers[containerId].drawers[drawerId],
                items: newContainers[containerId].drawers[drawerId].items.filter((_, i) => i !== idx),
              },
            },
          };
          break;
        }
      }
      set({ containers: newContainers });
    }
    await get().save();
    get().syncModularDataToSupabase();
  },
  
  increaseQuantityInDrawer: async (drawerId: string, idx: number) => {
    const state = get();
    
    if (drawerId === state.defaultDrawer.id) {
      const newDefaultDrawer = {
        ...state.defaultDrawer,
        items: state.defaultDrawer.items.map((item, i) =>
          i === idx ? { ...item, quantity: item.quantity + 1 } : item
        ),
      };
      set({ defaultDrawer: newDefaultDrawer });
    } else {
      // Find drawer in containers
      const newContainers = { ...state.containers };
      for (const containerId in newContainers) {
        if (newContainers[containerId].drawers[drawerId]) {
          newContainers[containerId] = {
            ...newContainers[containerId],
            drawers: {
              ...newContainers[containerId].drawers,
              [drawerId]: {
                ...newContainers[containerId].drawers[drawerId],
                items: newContainers[containerId].drawers[drawerId].items.map((item, i) =>
                  i === idx ? { ...item, quantity: item.quantity + 1 } : item
                ),
              },
            },
          };
          break;
        }
      }
      set({ containers: newContainers });
    }
    await get().save();
    get().syncModularDataToSupabase();
  },
  
  decreaseQuantityInDrawer: async (drawerId: string, idx: number) => {
    const state = get();
    
    if (drawerId === state.defaultDrawer.id) {
      const newDefaultDrawer = {
        ...state.defaultDrawer,
        items: state.defaultDrawer.items.map((item, i) =>
          i === idx ? { ...item, quantity: Math.max(0, item.quantity - 1) } : item
        ),
      };
      set({ defaultDrawer: newDefaultDrawer });
    } else {
      // Find drawer in containers
      const newContainers = { ...state.containers };
      for (const containerId in newContainers) {
        if (newContainers[containerId].drawers[drawerId]) {
          newContainers[containerId] = {
            ...newContainers[containerId],
            drawers: {
              ...newContainers[containerId].drawers,
              [drawerId]: {
                ...newContainers[containerId].drawers[drawerId],
                items: newContainers[containerId].drawers[drawerId].items.map((item, i) =>
                  i === idx ? { ...item, quantity: Math.max(0, item.quantity - 1) } : item
                ),
              },
            },
          };
          break;
        }
      }
      set({ containers: newContainers });
    }
    await get().save();
    get().syncModularDataToSupabase();
  },
  
  deleteAndAddToShoppingListFromDrawer: async (drawerId: string, idx: number) => {
    const state = get();
    let itemToAdd: Item | null = null;
    
    if (drawerId === state.defaultDrawer.id) {
      itemToAdd = state.defaultDrawer.items[idx];
      const newDefaultDrawer = {
        ...state.defaultDrawer,
        items: state.defaultDrawer.items.filter((_, i) => i !== idx),
      };
      set({ defaultDrawer: newDefaultDrawer });
    } else {
      // Find drawer in containers
      const newContainers = { ...state.containers };
      for (const containerId in newContainers) {
        if (newContainers[containerId].drawers[drawerId]) {
          itemToAdd = newContainers[containerId].drawers[drawerId].items[idx];
          newContainers[containerId] = {
            ...newContainers[containerId],
            drawers: {
              ...newContainers[containerId].drawers,
              [drawerId]: {
                ...newContainers[containerId].drawers[drawerId],
                items: newContainers[containerId].drawers[drawerId].items.filter((_, i) => i !== idx),
              },
            },
          };
          break;
        }
      }
      set({ containers: newContainers });
    }
    
    if (itemToAdd) {
      await get().addShoppingItem(itemToAdd.name);
    }
    await get().save();
  },
  
  moveItemBetweenDrawers: async (fromDrawerId: string, fromIdx: number, toDrawerId: string) => {
    const state = get();
    let sourceItem: Item | null = null;
    
    // Find source item and remove from source
    let newDefaultDrawer = { ...state.defaultDrawer };
    let newContainers = { ...state.containers };
    
    if (fromDrawerId === state.defaultDrawer.id) {
      sourceItem = state.defaultDrawer.items[fromIdx];
      newDefaultDrawer = {
        ...state.defaultDrawer,
        items: state.defaultDrawer.items.filter((_, i) => i !== fromIdx),
      };
    } else {
      // Find source drawer in containers
      for (const containerId in newContainers) {
        if (newContainers[containerId].drawers[fromDrawerId]) {
          sourceItem = newContainers[containerId].drawers[fromDrawerId].items[fromIdx];
          newContainers[containerId] = {
            ...newContainers[containerId],
            drawers: {
              ...newContainers[containerId].drawers,
              [fromDrawerId]: {
                ...newContainers[containerId].drawers[fromDrawerId],
                items: newContainers[containerId].drawers[fromDrawerId].items.filter((_, i) => i !== fromIdx),
              },
            },
          };
          break;
        }
      }
    }
    
    if (!sourceItem) return;
    
    // Add to target
    if (toDrawerId === state.defaultDrawer.id) {
      newDefaultDrawer = {
        ...newDefaultDrawer,
        items: [...newDefaultDrawer.items, sourceItem],
      };
    } else {
      // Find target drawer in containers
      for (const containerId in newContainers) {
        if (newContainers[containerId].drawers[toDrawerId]) {
          newContainers[containerId] = {
            ...newContainers[containerId],
            drawers: {
              ...newContainers[containerId].drawers,
              [toDrawerId]: {
                ...newContainers[containerId].drawers[toDrawerId],
                items: [...newContainers[containerId].drawers[toDrawerId].items, sourceItem],
              },
            },
          };
          break;
        }
      }
    }
    
    // Update state once with both changes
    set({ defaultDrawer: newDefaultDrawer, containers: newContainers });
    await get().save();
    get().syncModularDataToSupabase();
  },
  
  // Container management methods
  addContainer: async (container: Omit<ContainerType, "id">) => {
    const state = get();
    const newId = (Object.keys(state.containers).length + 1).toString();
    const newContainer: ContainerType = {
      ...container,
      id: newId,
    };
    const newContainers = { ...state.containers, [newId]: newContainer };
    set({ containers: newContainers });
    await get().save();
    get().syncModularDataToSupabase();
  },
  
  updateContainer: async (id: string, updates: Partial<ContainerType>) => {
    const state = get();
    const newContainers = {
      ...state.containers,
      [id]: { ...state.containers[id], ...updates },
    };
    set({ containers: newContainers });
    await get().save();
  },
  
  deleteContainer: async (id: string) => {
    const state = get();
    const newContainers = { ...state.containers };
    delete newContainers[id];
    set({ containers: newContainers });
    await get().save();
  },
  
  addDrawerToContainer: async (containerId: string, drawer: Omit<ContainerType["drawers"][string], "id">) => {
    const state = get();
    const container = state.containers[containerId];
    if (!container) return;
    
    const newDrawerId = `drawer-${Date.now()}`;
    const newDrawer = {
      ...drawer,
      id: newDrawerId,
    };
    
    const newContainers = {
      ...state.containers,
      [containerId]: {
        ...container,
        drawers: {
          ...container.drawers,
          [newDrawerId]: newDrawer,
        },
        drawerOrder: [...(container.drawerOrder || []), newDrawerId], // Add to order array
      },
    };
    set({ containers: newContainers });
    await get().save();
  },
  
  updateDrawerInContainer: async (containerId: string, drawerId: string, updates: Partial<ContainerType["drawers"][string]>) => {
    const state = get();
    const newContainers = {
      ...state.containers,
      [containerId]: {
        ...state.containers[containerId],
        drawers: {
          ...state.containers[containerId].drawers,
          [drawerId]: { ...state.containers[containerId].drawers[drawerId], ...updates },
        },
      },
    };
    set({ containers: newContainers });
    await get().save();
  },
  
  deleteDrawerFromContainer: async (containerId: string, drawerId: string) => {
    const state = get();
    const newContainers = {
      ...state.containers,
      [containerId]: {
        ...state.containers[containerId],
        drawers: Object.fromEntries(
          Object.entries(state.containers[containerId].drawers).filter(([id]) => id !== drawerId)
        ),
      },
    };
    set({ containers: newContainers });
    await get().save();
  },
  
  reorderDrawersInContainer: async (containerId: string, drawerIds: string[]) => {
    const state = get();
    const container = state.containers[containerId];
    if (!container) return;
    
    // Create new drawers object with the specified order
    const reorderedDrawers: Record<string, ContainerType["drawers"][string]> = {};
    drawerIds.forEach(drawerId => {
      if (container.drawers[drawerId]) {
        reorderedDrawers[drawerId] = container.drawers[drawerId];
      }
    });
    
    const newContainers = {
      ...state.containers,
      [containerId]: {
        ...container,
        drawers: reorderedDrawers,
        drawerOrder: drawerIds, // Store the order explicitly
      },
    };
    set({ containers: newContainers });
    await get().save();
    get().syncModularDataToSupabase();
  },
}));
