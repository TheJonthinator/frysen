import type { Family, FamilyRegistry, FamilyMember } from '../types';

// Google Drive API configuration
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile'
];

const FAMILY_REGISTRY_FILE_NAME = 'frysen-family-registry.json';
const FAMILY_SYNC_FILE_PREFIX = 'frysen-family-sync-';

const getClientId = () => {
  // For now, use web client ID for all platforms
  // Later we can add platform-specific logic
  return import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID;
};

interface GoogleUser {
  email: string;
  name: string;
  picture?: string;
}

class GoogleDriveService {
  private gapi: any = null;
  private user: GoogleUser | null = null;
  private isInitialized = false;

  async initialize(): Promise<boolean> {
    try {
      // Load Google API
      await this.loadGoogleAPI();
      
      // Initialize the API
      await new Promise((resolve, reject) => {
        gapi.load('auth2:client', {
          callback: resolve,
          onerror: reject
        });
      });

      await gapi.client.init({
        apiKey: API_KEY,
        clientId: getClientId(),
        scope: SCOPES.join(' ')
      });

      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize Google Drive service:', error);
      return false;
    }
  }

  private loadGoogleAPI(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (window.gapi) {
        this.gapi = window.gapi;
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => {
        this.gapi = window.gapi;
        resolve();
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  async signIn(): Promise<GoogleUser | null> {
    if (!this.isInitialized) {
      const initialized = await this.initialize();
      if (!initialized) return null;
    }

    try {
      const auth2 = gapi.auth2.getAuthInstance();
      const googleUser = await auth2.signIn();
      
      const profile = googleUser.getBasicProfile();
      this.user = {
        email: profile.getEmail(),
        name: profile.getName(),
        picture: profile.getImageUrl()
      };

      return this.user;
    } catch (error) {
      console.error('Sign in failed:', error);
      return null;
    }
  }

  async signOut(): Promise<void> {
    if (!this.isInitialized) return;

    try {
      const auth2 = gapi.auth2.getAuthInstance();
      await auth2.signOut();
      this.user = null;
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  }

  getCurrentUser(): GoogleUser | null {
    return this.user;
  }

  async createFamily(familyName: string): Promise<{ success: boolean; family?: Family; error?: string; errorCode?: string }> {
    if (!this.user) {
      console.error('FAMILY_CREATE_ERROR: No user logged in');
      return { success: false, error: 'Ingen användare inloggad', errorCode: 'NO_USER' };
    }

    try {
      console.log('FAMILY_CREATE: Starting family creation for:', familyName);
      
      // Create family sync file
      console.log('FAMILY_CREATE: Creating sync file...');
      const syncFile = await this.createFile(
        `${FAMILY_SYNC_FILE_PREFIX}${familyName}.json`,
        JSON.stringify({
          drawers: {},
          shoppingList: [],
          settings: {},
          lastUpdated: new Date().toISOString()
        })
      );

      if (!syncFile) {
        console.error('FAMILY_CREATE_ERROR: Failed to create sync file');
        return { success: false, error: 'Kunde inte skapa synkroniseringsfil', errorCode: 'SYNC_FILE_CREATE_FAILED' };
      }

      console.log('FAMILY_CREATE: Sync file created with ID:', syncFile.id);

      // Create or update family registry
      console.log('FAMILY_CREATE: Getting family registry...');
      const registry = await this.getFamilyRegistry();
      const familyId = this.generateFamilyId();
      
      console.log('FAMILY_CREATE: Generated family ID:', familyId);
      
      const newFamily: Family = {
        id: familyId,
        name: familyName,
        hostEmail: this.user.email,
        syncFileId: syncFile.id,
        registryFileId: registry.registryFileId,
        members: [{
          email: this.user.email,
          name: this.user.name,
          joinedAt: new Date(),
          isHost: true
        }],
        createdAt: new Date(),
        lastUpdated: new Date()
      };

      registry.families[familyId] = newFamily;
      registry.lastUpdated = new Date();
      
      console.log('FAMILY_CREATE: Updating family registry...');
      await this.updateFamilyRegistry(registry);

      console.log('FAMILY_CREATE: Family created successfully:', newFamily);
      return { success: true, family: newFamily };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorCode = this.getErrorCode(error);
      console.error('FAMILY_CREATE_ERROR:', { error: errorMessage, errorCode, stack: error instanceof Error ? error.stack : undefined });
      return { success: false, error: `Kunde inte skapa familj: ${errorMessage}`, errorCode };
    }
  }

  async joinFamily(inviteCode: string): Promise<Family | null> {
    if (!this.user) return null;

    try {
      // Extract family ID from invite code
      const familyId = this.decodeInviteCode(inviteCode);
      
      // Get family registry
      const registry = await this.getFamilyRegistry();
      const family = registry.families[familyId];
      
      if (!family) {
        throw new Error('Family not found');
      }

      // Check if user is already a member
      const existingMember = family.members.find(m => m.email === this.user!.email);
      if (existingMember) {
        return family;
      }

      // Add user to family
      family.members.push({
        email: this.user.email,
        name: this.user.name,
        joinedAt: new Date(),
        isHost: false
      });

      family.lastUpdated = new Date();
      registry.families[familyId] = family;
      registry.lastUpdated = new Date();

      await this.updateFamilyRegistry(registry);

      return family;
    } catch (error) {
      console.error('Failed to join family:', error);
      return null;
    }
  }

  async getFamilyData(familyId: string): Promise<any | null> {
    try {
      const registry = await this.getFamilyRegistry();
      const family = registry.families[familyId];
      
      if (!family) return null;

      const response = await gapi.client.drive.files.get({
        fileId: family.syncFileId,
        alt: 'media'
      });

      return JSON.parse(response.body);
    } catch (error) {
      console.error('Failed to get family data:', error);
      return null;
    }
  }

  async updateFamilyData(familyId: string, data: any): Promise<boolean> {
    try {
      const registry = await this.getFamilyRegistry();
      const family = registry.families[familyId];
      
      if (!family) return false;

      data.lastUpdated = new Date().toISOString();

      await gapi.client.drive.files.update({
        fileId: family.syncFileId,
        media: {
          mimeType: 'application/json',
          body: JSON.stringify(data)
        }
      });

      return true;
    } catch (error) {
      console.error('Failed to update family data:', error);
      return false;
    }
  }

  private async getFamilyRegistry(): Promise<FamilyRegistry> {
    try {
      // Try to find existing registry file
      const response = await gapi.client.drive.files.list({
        q: `name='${FAMILY_REGISTRY_FILE_NAME}' and trashed=false`,
        spaces: 'drive'
      });

      if (response.result.files && response.result.files.length > 0) {
        const file = response.result.files[0];
        const content = await gapi.client.drive.files.get({
          fileId: file.id,
          alt: 'media'
        });
        
        return JSON.parse(content.body);
      }

      // Create new registry file
      const file = await this.createFile(
        FAMILY_REGISTRY_FILE_NAME,
        JSON.stringify({
          version: '1.0.0',
          families: {},
          lastUpdated: new Date().toISOString()
        })
      );

      return {
        version: '1.0.0',
        families: {},
        lastUpdated: new Date(),
        registryFileId: file.id
      };
    } catch (error) {
      console.error('Failed to get family registry:', error);
      throw error;
    }
  }

  private async updateFamilyRegistry(registry: FamilyRegistry): Promise<void> {
    try {
      await gapi.client.drive.files.update({
        fileId: registry.registryFileId,
        media: {
          mimeType: 'application/json',
          body: JSON.stringify(registry)
        }
      });
    } catch (error) {
      console.error('Failed to update family registry:', error);
      throw error;
    }
  }

  private async createFile(name: string, content: string): Promise<any> {
    const response = await gapi.client.drive.files.create({
      resource: {
        name: name,
        mimeType: 'application/json'
      },
      media: {
        mimeType: 'application/json',
        body: content
      }
    });

    return response.result;
  }

  private generateFamilyId(): string {
    return 'family_' + Math.random().toString(36).substr(2, 9);
  }

  private getErrorCode(error: unknown): string {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      
      if (message.includes('quota')) return 'QUOTA_EXCEEDED';
      if (message.includes('permission')) return 'PERMISSION_DENIED';
      if (message.includes('not found')) return 'NOT_FOUND';
      if (message.includes('network')) return 'NETWORK_ERROR';
      if (message.includes('timeout')) return 'TIMEOUT';
      if (message.includes('unauthorized')) return 'UNAUTHORIZED';
      if (message.includes('forbidden')) return 'FORBIDDEN';
      if (message.includes('rate limit')) return 'RATE_LIMITED';
    }
    
    return 'UNKNOWN_ERROR';
  }

  private encodeInviteCode(familyId: string): string {
    return btoa(familyId).replace(/[+/=]/g, '');
  }

  private decodeInviteCode(inviteCode: string): string {
    return atob(inviteCode.replace(/[^A-Za-z0-9+/=]/g, ''));
  }

  generateInviteLink(familyId: string): string {
    const inviteCode = this.encodeInviteCode(familyId);
    return `${window.location.origin}/join/${inviteCode}`;
  }
}

export const googleDriveService = new GoogleDriveService();

// Add to window for global access
declare global {
  interface Window {
    gapi: any;
  }
} 