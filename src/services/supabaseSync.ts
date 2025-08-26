import { createClient } from '@supabase/supabase-js';
import type { DrawerMap, ShoppingItem } from '../types';

interface SyncData {
  drawers: DrawerMap;
  shoppingList: ShoppingItem[];
  lastUpdated: string;
  version: string;
  familyId?: string;
  device_id?: string;
}

const SUPABASE_PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID || '';
const SUPABASE_PROJECT_URL = import.meta.env.VITE_SUPABASE_PROJECT_URL || '';
const SUPABASE_API_KEY = import.meta.env.VITE_SUPABASE_API_KEY || '';

const SUPABASE_URL = SUPABASE_PROJECT_URL || (SUPABASE_PROJECT_ID ? `https://${SUPABASE_PROJECT_ID}.supabase.co` : '');
const SUPABASE_KEY = SUPABASE_API_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  global: {
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  }
});

export class SupabaseSync {
  private familyId: string | null = null;
  private lastSyncTime: Date | null = null;
  private isSyncing = false;
  private observers: Set<(data?: SyncData) => void> = new Set();
  private realtimeSubscription: any = null;
  private deviceId: string;

  constructor() {
    this.familyId = localStorage.getItem('frysen_family_id');
    
    // Generate a unique device ID
    this.deviceId = localStorage.getItem('frysen_device_id') || 
      `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('frysen_device_id', this.deviceId);
    
    // Start real-time sync if we have a family ID
    if (this.familyId) {
      setTimeout(() => {
        this.startRealtimeSync();
      }, 0);
    }
  }

  async setFamilyId(familyId: string) {
    this.familyId = familyId;
    localStorage.setItem('frysen_family_id', familyId);
    await this.startRealtimeSync();
  }

  getFamilyId(): string | null {
    return this.familyId;
  }

  subscribe(callback: (data?: SyncData) => void) {
    this.observers.add(callback);
    return () => {
      this.observers.delete(callback);
    };
  }

  private notifyObservers(data?: SyncData) {
    console.log(`🔔 Notifying ${this.observers.size} observers with data:`, data ? 'present' : 'undefined');
    this.observers.forEach((callback) => {
      try {
        callback(data);
      } catch (error) {
        console.error('Observer failed:', error);
      }
    });
  }

  private async startRealtimeSync() {
    console.log('🌐 startRealtimeSync() called');
    
    if (!this.familyId) {
      console.log('🌐 No family ID, skipping real-time sync');
      return;
    }

    this.stopRealtimeSync();

    console.log('🌐 Starting real-time sync for family:', this.familyId);

    // Test basic connectivity first
    console.log('🌐 Testing basic Supabase connectivity...');
    try {
      const { error } = await supabase
        .from('frysen_data')
        .select('count')
        .limit(1);
      
      if (error) {
        console.error('❌ Basic connectivity test failed:', error);
        console.error('🌐 Cannot reach Supabase database');
        return;
      } else {
        console.log('✅ Basic connectivity test passed');
      }
    } catch (error) {
      console.error('❌ Basic connectivity test failed:', error);
      console.error('🌐 Network or configuration issue');
      return;
    }

    // Fetch current data
    const currentData = await this.readFromDatabase();
    if (currentData) {
      console.log('🌐 Fetched current data, notifying observers');
      this.notifyObservers(currentData);
    }

    // Subscribe to real-time updates
    console.log('🌐 Creating real-time subscription for family:', this.familyId);
    console.log('🌐 Filter: family_id only (no device filter)');
    
    // Add timeout to detect hanging subscriptions
    const subscriptionTimeout = setTimeout(() => {
      console.error('⏰ Realtime subscription timeout - no response after 10 seconds');
      console.error('🌐 This suggests:');
      console.error('   - Network connectivity issues');
      console.error('   - Supabase real-time service problems');
      console.error('   - Mobile network restrictions');
    }, 10000);
    
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
          console.log('📡 [REMOTE] Real-time update received:', {
            eventType: payload.eventType,
            device_id: (payload.new as any)?.device_id,
            last_updated: (payload.new as any)?.last_updated
          });
          
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const r = payload.new;
            const syncData: SyncData = {
              drawers: r.drawers ?? {},
              shoppingList: r.shopping_list ?? [],
              lastUpdated: r.last_updated ?? new Date().toISOString(),
              version: r.version ?? '1.0.0',
              familyId: this.familyId!,
              device_id: r.device_id
            };
            
            console.log('📡 [REMOTE] Notifying observers of remote update from device:', r.device_id);
            this.lastSyncTime = new Date();
            this.notifyObservers(syncData);
          }
        }
      )
      .subscribe((status) => {
        clearTimeout(subscriptionTimeout); // Clear timeout when we get a status
        
        console.log('🌐 Realtime subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Realtime subscription active for family:', this.familyId);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Realtime subscription failed for family:', this.familyId);
          console.error('🌐 This could be due to:');
          console.error('   - Network connectivity issues');
          console.error('   - Supabase service down');
          console.error('   - Authentication problems');
          console.error('   - Database policy restrictions');
        } else if (status === 'CLOSED') {
          console.error('🚪 Realtime subscription closed');
          console.error('🌐 Connection was closed unexpectedly');
        } else if (status === 'TIMED_OUT') {
          console.error('⏰ Realtime subscription timed out');
          console.error('🌐 Network connection is too slow or unstable');
        } else if (status === 'RETRYING') {
          console.log('🔄 Realtime subscription retrying...');
        } else {
          console.log('🌐 Realtime subscription status:', status);
        }
      });
  }

  private stopRealtimeSync() {
    if (this.realtimeSubscription) {
      supabase.removeChannel(this.realtimeSubscription);
      this.realtimeSubscription = null;
    }
  }

  async readFromDatabase(): Promise<SyncData | null> {
    if (!this.familyId) return null;

    try {
      console.log('📖 [LOCAL] Reading from database for family:', this.familyId);
      console.log('📖 [LOCAL] Supabase URL:', SUPABASE_URL);
      console.log('📖 [LOCAL] Supabase Key length:', SUPABASE_KEY.length);
      
      const { data, error } = await supabase
        .from('frysen_data')
        .select('*')
        .eq('family_id', this.familyId)
        .single();

      if (error) {
        console.error('❌ [LOCAL] Read failed:', error);
        console.error('❌ [LOCAL] Error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        
        if (error.code === 'PGRST116') {
          console.log('📖 [LOCAL] No data found, returning empty data');
          return {
            drawers: {},
            shoppingList: [],
            lastUpdated: new Date().toISOString(),
            version: '1.0.0',
            familyId: this.familyId
          };
        }
        
        // Only throw if it's not a PGRST116 error
        console.error('❌ [LOCAL] Unexpected error, throwing:', error);
        throw error;
      }

      console.log('✅ [LOCAL] Read successful:', {
        family_id: data.family_id,
        last_updated: data.last_updated,
        device_id: data.device_id
      });

      this.lastSyncTime = new Date();
      
      return {
        drawers: data.drawers || {},
        shoppingList: data.shopping_list || [],
        lastUpdated: data.last_updated || new Date().toISOString(),
        version: data.version || '1.0.0',
        familyId: this.familyId,
        device_id: data.device_id
      };
    } catch (error) {
      console.error('❌ [LOCAL] Read failed:', error);
      return null;
    }
  }

  async writeToDatabase(data: SyncData): Promise<boolean> {
    if (!this.familyId || this.isSyncing) return false;

    try {
      this.isSyncing = true;
      console.log('📝 [LOCAL] Writing to database...');

      const syncData = {
        family_id: this.familyId,
        drawers: data.drawers,
        shopping_list: data.shoppingList,
        last_updated: new Date().toISOString(),
        version: '1.0.0',
        device_id: this.deviceId
      };

      const { data: row, error } = await supabase
        .from('frysen_data')
        .upsert(syncData, { onConflict: 'family_id' })
        .select('family_id, device_id, last_updated, drawers, shopping_list')
        .single();

      if (error) throw error;

      console.log('✅ [LOCAL] Database write completed:', {
        device_id: row?.device_id,
        last_updated: row?.last_updated
      });

      // Notify observers with the actual database data
      console.log('📤 [LOCAL] Notifying observers of local update');
      this.notifyObservers({
        drawers: data.drawers,
        shoppingList: data.shoppingList,
        lastUpdated: row?.last_updated ?? syncData.last_updated,
        version: '1.0.0',
        familyId: this.familyId!,
        device_id: row?.device_id
      });

      this.lastSyncTime = new Date();
      console.log('✅ [LOCAL] Write operation completed successfully');
      return true;
    } catch (error) {
      console.error('Write failed:', error);
      return false;
    } finally {
      this.isSyncing = false;
    }
  }

  async createFamily(familyName: string): Promise<string | null> {
    try {
      console.log('🏠 Creating new family:', familyName);
      const familyId = `family_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const { error: familyError } = await supabase
        .from('frysen_families')
        .insert({
          family_id: familyId,
          name: familyName,
          created_at: new Date().toISOString()
        });

      if (familyError) throw familyError;

      console.log('✅ Family created successfully:', familyId);

      // Initialize the family with empty data
      console.log('📝 Initializing family with empty data...');
      const { error: dataError } = await supabase
        .from('frysen_data')
        .insert({
          family_id: familyId,
          drawers: {},
          shopping_list: [],
          device_id: this.deviceId
        });

      if (dataError) {
        console.error('❌ Failed to initialize family data:', dataError);
        throw dataError;
      }

      console.log('✅ Family data initialized successfully');

      await this.setFamilyId(familyId);
      return familyId;
    } catch (error) {
      console.error('❌ Failed to create family:', error);
      return null;
    }
  }

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

      await this.setFamilyId(familyId);
      return true;
    } catch (error) {
      console.error('Failed to join family:', error);
      return false;
    }
  }

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
  }
}

export const supabaseSync = new SupabaseSync(); 