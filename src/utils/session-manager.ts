import { getSettingsManager } from "./settings-manager";
import * as fs from "fs-extra";
import * as path from "path";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
}

export interface WorkspaceSession {
  id: string;
  workingDirectory: string;
  name: string;
  messages: ChatMessage[];
  lastAccessed: number;
  createdAt: number;
}

export class SessionManager {
  private static instance: SessionManager;
  private sessionsDir: string;
  private currentSession: WorkspaceSession | null = null;

  private constructor() {
    const settingsManager = getSettingsManager();
    this.sessionsDir = path.join(
      settingsManager.getStorageDirectory(),
      "sessions",
    );
    fs.ensureDirSync(this.sessionsDir);
  }

  public static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  private generateSessionId(workingDir: string): string {
    // Create a simple hash from the working directory path
    const normalized = path.normalize(workingDir).toLowerCase();
    return Buffer.from(normalized).toString("base64").replace(/[/+=]/g, "_");
  }

  private getSessionFilePath(sessionId: string): string {
    return path.join(this.sessionsDir, `${sessionId}.json`);
  }

  public async getOrCreateSession(
    workingDirectory: string,
    name?: string,
  ): Promise<WorkspaceSession> {
    const sessionId = this.generateSessionId(workingDirectory);
    const sessionFile = this.getSessionFilePath(sessionId);

    try {
      if (await fs.pathExists(sessionFile)) {
        const session = await fs.readJson(sessionFile);
        session.lastAccessed = Date.now();
        this.currentSession = session;
        await this.saveSession(session);
        return session;
      }
    } catch (error) {
      // If loading fails, create new session
    }

    // Create new session
    const newSession: WorkspaceSession = {
      id: sessionId,
      workingDirectory,
      name: name || path.basename(workingDirectory),
      messages: [],
      lastAccessed: Date.now(),
      createdAt: Date.now(),
    };

    this.currentSession = newSession;
    await this.saveSession(newSession);
    return newSession;
  }

  public async saveSession(session: WorkspaceSession): Promise<void> {
    const sessionFile = this.getSessionFilePath(session.id);
    await fs.outputJson(sessionFile, session, { spaces: 2 });
  }

  public async addMessage(message: ChatMessage): Promise<void> {
    if (!this.currentSession) {
      throw new Error("No active session");
    }

    this.currentSession.messages.push(message);
    this.currentSession.lastAccessed = Date.now();
    await this.saveSession(this.currentSession);
  }

  public async listSessions(): Promise<WorkspaceSession[]> {
    const sessionFiles = await fs.readdir(this.sessionsDir);
    const sessions: WorkspaceSession[] = [];

    for (const file of sessionFiles) {
      if (file.endsWith(".json")) {
        try {
          const session = await fs.readJson(path.join(this.sessionsDir, file));
          sessions.push(session);
        } catch (error) {
          // Skip invalid sessions
        }
      }
    }

    // Sort by last accessed
    sessions.sort((a, b) => b.lastAccessed - a.lastAccessed);
    return sessions;
  }

  public async deleteSession(sessionId: string): Promise<void> {
    const sessionFile = this.getSessionFilePath(sessionId);
    if (await fs.pathExists(sessionFile)) {
      await fs.remove(sessionFile);
    }
  }

  public getCurrentSession(): WorkspaceSession | null {
    return this.currentSession;
  }

  public async switchSession(
    sessionId: string,
  ): Promise<WorkspaceSession | null> {
    const sessionFile = this.getSessionFilePath(sessionId);

    try {
      if (await fs.pathExists(sessionFile)) {
        const session = await fs.readJson(sessionFile);
        session.lastAccessed = Date.now();
        this.currentSession = session;
        await this.saveSession(session);
        return session;
      }
    } catch (error) {
      // Session not found or invalid
    }

    return null;
  }
}

export function getSessionManager(): SessionManager {
  return SessionManager.getInstance();
}
