import { getSettingsManager } from "./settings-manager";
import { ChatEntry } from "../agent/super-agent";
import * as fs from "fs-extra";
import * as path from "path";

export class ChatManager {
  private static instance: ChatManager;
  private chatDirectory: string;

  private constructor() {
    const settingsManager = getSettingsManager();
    this.chatDirectory = path.join(
      settingsManager.getStorageDirectory(),
      "chats",
    );
    this.ensureDirectoryExists();
  }

  public static getInstance(): ChatManager {
    if (!ChatManager.instance) {
      ChatManager.instance = new ChatManager();
    }
    return ChatManager.instance;
  }

  private ensureDirectoryExists(): void {
    if (!fs.existsSync(this.chatDirectory)) {
      fs.mkdirSync(this.chatDirectory, { recursive: true, mode: 0o700 });
    }
  }

  private getChatPath(name: string): string {
    return path.join(this.chatDirectory, `${name}.json`);
  }

  public async saveChat(name: string, history: ChatEntry[]): Promise<void> {
    const filePath = this.getChatPath(name);
    await fs.writeJson(
      filePath,
      {
        name,
        updatedAt: new Date().toISOString(),
        history,
      },
      { spaces: 2, mode: 0o600 },
    );
  }

  public async loadChat(name: string): Promise<ChatEntry[]> {
    const filePath = this.getChatPath(name);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Chat session '${name}' not found.`);
    }
    const data = await fs.readJson(filePath);
    return data.history.map((entry: any) => ({
      ...entry,
      timestamp: new Date(entry.timestamp),
    }));
  }

  public async listChats(): Promise<string[]> {
    if (!fs.existsSync(this.chatDirectory)) {
      return [];
    }
    const files = await fs.readdir(this.chatDirectory);
    return files
      .filter(file => file.endsWith(".json"))
      .map(file => file.replace(".json", ""));
  }

  public async deleteChat(name: string): Promise<void> {
    const filePath = this.getChatPath(name);
    if (fs.existsSync(filePath)) {
      await fs.unlink(filePath);
    } else {
      throw new Error(`Chat session '${name}' not found.`);
    }
  }
}

export function getChatManager(): ChatManager {
  return ChatManager.getInstance();
}
