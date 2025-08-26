import { createClient } from '@supabase/supabase-js';
import type { DrawerMap, ShoppingItem } from '../types';

interface SyncData {
  drawers: DrawerMap;
  shoppingList: ShoppingItem[];
  lastUpdated: string;
  version: string;
  familyId?: string;
}

// Using your environment variable naming convention
const SUPABASE_PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID || '';
const SUPABASE_PROJECT_URL = import.meta.env.VITE_SUPABASE_PROJECT_URL || '';
const SUPABASE_SECRET = import.meta.env.VITE_SUPABASE_SECRET || '';
const SUPABASE_API_KEY = import.meta.env.VITE_SUPABASE_API_KEY || '';

// Debug environment variables
console.log('Supabase Config:', {
  projectId: SUPABASE_PROJECT_ID,
  projectUrl: SUPABASE_PROJECT_URL,
  hasSecret: !!SUPABASE_SECRET,
  hasApiKey: !!SUPABASE_API_KEY,
  envVars: {
    VITE_SUPABASE_PROJECT_ID: import.meta.env.VITE_SUPABASE_PROJECT_ID,
    VITE_SUPABASE_PROJECT_URL: import.meta.env.VITE_SUPABASE_PROJECT_URL,
    VITE_SUPABASE_SECRET: import.meta.env.VITE_SUPABASE_SECRET ? '***' : 'missing',
    VITE_SUPABASE_API_KEY: import.meta.env.VITE_SUPABASE_API_KEY ? '***' : 'missing'
  }
});

// Debug all available environment variables
console.log('All available env vars:', Object.keys(import.meta.env).filter(key => key.includes('SUPABASE')));

// Use project URL if available, otherwise construct from project ID
const SUPABASE_URL = SUPABASE_PROJECT_URL || (SUPABASE_PROJECT_ID ? `https://${SUPABASE_PROJECT_ID}.supabase.co` : '');

// Use anon API key for client-side operations (NOT the secret key!)
const SUPABASE_KEY = SUPABASE_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase configuration:', {
    url: SUPABASE_URL,
    hasKey: !!SUPABASE_KEY
  });
  console.error('Please check your .env file has the correct variable names with VITE_ prefix');
  console.error('Use the anon public key (VITE_SUPABASE_API_KEY), NOT the secret key!');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

export class SupabaseSync {
  private familyId: string | null = null;
  private lastSyncTime: Date | null = null;
  private isSyncing = false;
  private observers: Set<(data?: SyncData) => void> = new Set();
  private realtimeSubscription: any = null;
  private lastLocalUpdate: string | null = null;

  constructor() {
    this.familyId = localStorage.getItem('frysen_family_id');
    
    // Clean up any old Google Drive related localStorage data
    this.cleanupOldData();
  }

  // Clean up old Google Drive related data
  private cleanupOldData() {
    const keysToRemove = [
      'frysen_family',
      'frysen_sync_status',
      'google_drive_access_token',
      'google_drive_refresh_token',
      'gapi_access_token',
      'gapi_refresh_token'
    ];
    
    keysToRemove.forEach(key => {
      if (localStorage.getItem(key)) {
        console.log('Removing old localStorage key:', key);
        localStorage.removeItem(key);
      }
    });
  }

  setFamilyId(familyId: string) {
    this.familyId = familyId;
    localStorage.setItem('frysen_family_id', familyId);
    console.log('Family ID set to:', familyId);
    
    // Start real-time sync when family is set
    this.startRealtimeSync();
  }

  getFamilyId(): string | null {
    return this.familyId;
  }

  subscribe(callback: (data?: SyncData) => void) {
    this.observers.add(callback);
    return () => this.observers.delete(callback);
  }

  private notifyObservers(data?: SyncData) {
    this.observers.forEach(callback => callback(data));
  }

  // Start real-time synchronization
  private startRealtimeSync() {
    if (!this.familyId) return;

    // Stop existing subscription
    this.stopRealtimeSync();

    console.log('Starting real-time sync for family:', this.familyId);

    // Subscribe to changes in the frysen_data table
    this.realtimeSubscription = supabase
      .channel(`frysen_data_${this.familyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'frysen_data',
          filter: `family_id=eq.${this.familyId}`
        },
        (payload) => {
          console.log('Real-time update received:', payload);
          
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const newData = payload.new;
            
            // Check if this update is from another device
            if (newData.last_updated !== this.lastLocalUpdate) {
              console.log('Remote update detected, notifying observers');
              
              const syncData: SyncData = {
                drawers: newData.drawers || {},
                shoppingList: newData.shopping_list || [],
                lastUpdated: newData.last_updated || new Date().toISOString(),
                version: newData.version || '1.0.0',
                familyId: this.familyId!
              };
              
              this.lastSyncTime = new Date();
              this.notifyObservers(syncData);
            }
          }
        }
      )
      .subscribe();
  }

  // Stop real-time synchronization
  private stopRealtimeSync() {
    if (this.realtimeSubscription) {
      console.log('Stopping real-time sync');
      supabase.removeChannel(this.realtimeSubscription);
      this.realtimeSubscription = null;
    }
  }

  // Read data from Supabase
  async readFromDatabase(): Promise<SyncData | null> {
    if (!this.familyId) {
      console.log('No family ID configured');
      return null;
    }

    try {
      console.log('Reading from Supabase...');
      
      const { data, error } = await supabase
        .from('frysen_data')
        .select('*')
        .eq('family_id', this.familyId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No data found, return empty structure
          return {
            drawers: {},
            shoppingList: [],
            lastUpdated: new Date().toISOString(),
            version: '1.0.0',
            familyId: this.familyId
          };
        }
        throw error;
      }

      this.lastSyncTime = new Date();
      console.log('Read successful:', data);
      
      return {
        drawers: data.drawers || {},
        shoppingList: data.shopping_list || [],
        lastUpdated: data.last_updated || new Date().toISOString(),
        version: data.version || '1.0.0',
        familyId: this.familyId
      };
    } catch (error) {
      console.error('Read failed:', error);
      return null;
    }
  }

  // Write data to Supabase
  async writeToDatabase(data: SyncData): Promise<boolean> {
    if (!this.familyId) {
      console.log('No family ID configured');
      return false;
    }

    if (this.isSyncing) {
      console.log('Already syncing, skipping write');
      return false;
    }

    try {
      this.isSyncing = true;
      console.log('Writing to Supabase...');

      const syncData = {
        family_id: this.familyId,
        drawers: data.drawers,
        shopping_list: data.shoppingList,
        last_updated: new Date().toISOString(),
        version: '1.0.0'
      };

      // Store the timestamp to avoid triggering our own real-time updates
      this.lastLocalUpdate = syncData.last_updated;

      // Upsert (insert or update) the data
      const { error } = await supabase
        .from('frysen_data')
        .upsert(syncData, { onConflict: 'family_id' });

      if (error) {
        throw error;
      }

      this.lastSyncTime = new Date();
      console.log('Write successful');
      
      this.notifyObservers();
      return true;
    } catch (error) {
      console.error('Write failed:', error);
      return false;
    } finally {
      this.isSyncing = false;
    }
  }

  // Create a new family
  async createFamily(familyName: string): Promise<string | null> {
    try {
      const familyId = `family_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const { error } = await supabase
        .from('frysen_families')
        .insert({
          family_id: familyId,
          name: familyName,
          created_at: new Date().toISOString()
        });

      if (error) {
        throw error;
      }

      this.setFamilyId(familyId);
      console.log('Family created:', familyId);
      return familyId;
    } catch (error) {
      console.error('Failed to create family:', error);
      return null;
    }
  }

  // Join an existing family
  async joinFamily(familyId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('frysen_families')
        .select('*')
        .eq('family_id', familyId)
        .single();

      if (error || !data) {
        throw new Error('Family not found');
      }

      this.setFamilyId(familyId);
      console.log('Joined family:', familyId);
      return true;
    } catch (error) {
      console.error('Failed to join family:', error);
      return false;
    }
  }

  // Get sync status
  getSyncStatus() {
    return {
      isConfigured: !!this.familyId,
      lastSync: this.lastSyncTime,
      isSyncing: this.isSyncing,
      familyId: this.familyId,
      isRealtimeActive: !!this.realtimeSubscription
    };
  }

  clearSync() {
    this.stopRealtimeSync();
    this.familyId = null;
    localStorage.removeItem('frysen_family_id');
    this.lastSyncTime = null;
    this.lastLocalUpdate = null;
    console.log('Sync configuration cleared');
  }
}

export const supabaseSync = new SupabaseSync(); 