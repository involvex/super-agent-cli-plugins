import { getSettingsManager } from "./settings-manager";
import * as fs from "fs-extra";
import * as path from "path";
import axios from "axios";

interface UpdateInfo {
  currentVersion: string;
  latestVersion: string;
  updateAvailable: boolean;
  lastChecked: number;
}

const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const NPM_REGISTRY_URL = "https://registry.npmjs.org/@involvex/super-agent-cli";

export class UpdateChecker {
  private static instance: UpdateChecker;
  private cacheFile: string;
  private currentVersion: string;

  private constructor(currentVersion: string) {
    const settingsManager = getSettingsManager();
    this.cacheFile = path.join(
      settingsManager.getStorageDirectory(),
      "update-cache.json",
    );
    this.currentVersion = currentVersion;
  }

  public static getInstance(currentVersion: string): UpdateChecker {
    if (!UpdateChecker.instance) {
      UpdateChecker.instance = new UpdateChecker(currentVersion);
    }
    return UpdateChecker.instance;
  }

  private async loadCache(): Promise<UpdateInfo | null> {
    try {
      if (await fs.pathExists(this.cacheFile)) {
        const cache = await fs.readJson(this.cacheFile);
        const now = Date.now();

        // Check if cache is still valid
        if (cache.lastChecked && now - cache.lastChecked < CACHE_DURATION) {
          return cache;
        }
      }
    } catch (error) {
      // Ignore cache errors
    }
    return null;
  }

  private async saveCache(info: UpdateInfo): Promise<void> {
    try {
      await fs.outputJson(this.cacheFile, info);
    } catch (error) {
      // Ignore save errors
    }
  }

  private compareVersions(v1: string, v2: string): number {
    const parts1 = v1.replace(/^v/, "").split(".").map(Number);
    const parts2 = v2.replace(/^v/, "").split(".").map(Number);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const part1 = parts1[i] || 0;
      const part2 = parts2[i] || 0;

      if (part1 > part2) {
        return 1;
      }
      if (part1 < part2) {
        return -1;
      }
    }

    return 0;
  }

  public async checkForUpdates(
    forceCheck: boolean = false,
  ): Promise<UpdateInfo | null> {
    try {
      // Try cache first
      if (!forceCheck) {
        const cached = await this.loadCache();
        if (cached) {
          return cached;
        }
      }

      // Fetch latest version from npm
      const response = await axios.get(NPM_REGISTRY_URL, {
        timeout: 5000,
      });

      const latestVersion = response.data["dist-tags"]?.latest;

      if (!latestVersion) {
        return null;
      }

      const updateInfo: UpdateInfo = {
        currentVersion: this.currentVersion,
        latestVersion,
        updateAvailable:
          this.compareVersions(latestVersion, this.currentVersion) > 0,
        lastChecked: Date.now(),
      };

      // Save to cache
      await this.saveCache(updateInfo);

      return updateInfo;
    } catch (error) {
      // Silently fail - don't block startup
      return null;
    }
  }

  public formatUpdateMessage(info: UpdateInfo): string {
    if (!info.updateAvailable) {
      return "";
    }

    return `
╭─────────────────────────────────────────────────────╮
│  📦 Update Available!                               │
│                                                     │
│  Current: ${info.currentVersion.padEnd(10)} → Latest: ${info.latestVersion.padEnd(10)}    │
│                                                     │
│  Run: npm install -g @involvex/super-agent-cli     │
╰─────────────────────────────────────────────────────╯
`.trim();
  }
}

export function getUpdateChecker(currentVersion: string): UpdateChecker {
  return UpdateChecker.getInstance(currentVersion);
}
