import type { UpdateCheckResult, UpdateInfo, UpdateStatus } from '../types';

const CURRENT_VERSION = '1.0.2'; // This should match your current release
const GITHUB_REPO = 'TheJonthinator/frysen';

interface GitHubRelease {
  tag_name: string;
  html_url: string;
  body: string;
  draft: boolean;
  prerelease: boolean;
}

class UpdateService {
  private lastCheckTime: Date | null = null;
  private checkInterval: number | null = null;

  async checkForUpdates(): Promise<UpdateCheckResult> {
    try {
      console.log('Checking for updates...');
      
      // Check if we should skip this check (avoid too frequent API calls)
                   if (this.lastCheckTime && Date.now() - this.lastCheckTime.getTime() < 60 * 60 * 1000) {
               // Less than 1 hour since last check (increased to reduce API calls)
               return { status: 'up_to_date' };
             }

      // Skip update check if no internet connection
      if (!navigator.onLine) {
        console.log('No internet connection - skipping update check');
        return { status: 'up_to_date' };
      }

      const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`);
      
                   if (!response.ok) {
               if (response.status === 404) {
                 // No releases found - this is normal for new repositories
                 console.log('No releases found - repository is new or has no releases yet');
                 return { status: 'up_to_date' };
               }
               if (response.status === 403) {
                 // Rate limited or forbidden - treat as up to date to avoid spam
                 console.log('GitHub API rate limited or forbidden - treating as up to date');
                 this.lastCheckTime = new Date();
                 return { status: 'up_to_date' };
               }
               throw new Error(`GitHub API error: ${response.status}`);
             }

      const release: GitHubRelease = await response.json();
      
      // Skip draft and prerelease versions
      if (release.draft || release.prerelease) {
        return { status: 'up_to_date' };
      }

      const latestVersion = release.tag_name.replace('v', '');
      const currentVersion = CURRENT_VERSION;

      this.lastCheckTime = new Date();

      if (this.isVersionNewer(latestVersion, currentVersion)) {
        const updateInfo: UpdateInfo = {
          currentVersion,
          latestVersion,
          updateUrl: release.html_url,
          releaseNotes: release.body,
          isCritical: this.isCriticalUpdate(latestVersion, currentVersion),
          lastChecked: this.lastCheckTime,
        };

        return {
          status: updateInfo.isCritical ? 'critical_update' : 'update_available',
          updateInfo,
        };
      }

      return { status: 'up_to_date' };
    } catch (error) {
      console.error('Update check failed:', error);
      return {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private isVersionNewer(latest: string, current: string): boolean {
    const latestParts = latest.split('.').map(Number);
    const currentParts = current.split('.').map(Number);

    for (let i = 0; i < Math.max(latestParts.length, currentParts.length); i++) {
      const latestPart = latestParts[i] || 0;
      const currentPart = currentParts[i] || 0;

      if (latestPart > currentPart) return true;
      if (latestPart < currentPart) return false;
    }

    return false; // Versions are equal
  }

  private isCriticalUpdate(latest: string, current: string): boolean {
    // Consider it critical if major or minor version changes
    const latestParts = latest.split('.').map(Number);
    const currentParts = current.split('.').map(Number);

    return latestParts[0] > currentParts[0] || latestParts[1] > currentParts[1];
  }

           startPeriodicChecks(intervalMinutes: number = 120): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    this.checkInterval = window.setInterval(() => {
      this.checkForUpdates();
    }, intervalMinutes * 60 * 1000);
  }

  stopPeriodicChecks(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  getCurrentVersion(): string {
    return CURRENT_VERSION;
  }

  getLastCheckTime(): Date | null {
    return this.lastCheckTime;
  }
}

export const updateService = new UpdateService(); 