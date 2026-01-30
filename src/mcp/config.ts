import { getSettingsManager } from "../utils/settings-manager";
import { MCPServerConfig } from "./client";
import * as path from "path";
import * as fs from "fs";

export interface MCPConfig {
  servers: MCPServerConfig[];
}

/**
 * Load MCP configuration from project settings
 */
export function loadMCPConfig(): MCPConfig {
  const manager = getSettingsManager();
  const projectSettings = manager.loadProjectSettings();

  // Start with servers from project settings
  const servers: MCPServerConfig[] = projectSettings.mcpServers
    ? (Object.values(projectSettings.mcpServers) as MCPServerConfig[])
    : [];

  // Look for .mcp.json in current directory
  const mcpJsonPath = path.join(process.cwd(), ".mcp.json");
  if (fs.existsSync(mcpJsonPath)) {
    try {
      const mcpJsonConfig = JSON.parse(fs.readFileSync(mcpJsonPath, "utf-8"));
      if (mcpJsonConfig.mcpServers) {
        // Merge definition from .mcp.json, overriding likely named servers
        const projectServerNames = new Set(servers.map(s => s.name));

        for (const [name, config] of Object.entries(mcpJsonConfig.mcpServers)) {
          // Normalize format if needed. Assuming .mcp.json matches standard format
          // but mapped by key.
          const serverConfig = config as MCPServerConfig;
          serverConfig.name = name; // Ensure name is set

          if (!projectServerNames.has(name)) {
            servers.push(serverConfig);
          } else {
            // Update existing
            const index = servers.findIndex(s => s.name === name);
            if (index !== -1) {
              servers[index] = serverConfig;
            }
          }
        }
      }
    } catch (error) {
      console.warn("Failed to load .mcp.json:", error);
    }
  }

  return { servers };
}

export function saveMCPConfig(config: MCPConfig): void {
  const manager = getSettingsManager();
  const mcpServers: Record<string, MCPServerConfig> = {};

  // Convert servers array to object keyed by name
  for (const server of config.servers) {
    mcpServers[server.name] = server;
  }

  manager.updateProjectSetting("mcpServers", mcpServers);
}

export function addMCPServer(config: MCPServerConfig): void {
  const manager = getSettingsManager();
  const projectSettings = manager.loadProjectSettings();
  const mcpServers = projectSettings.mcpServers || {};

  mcpServers[config.name] = config;
  manager.updateProjectSetting("mcpServers", mcpServers);
}

export function removeMCPServer(serverName: string): void {
  const manager = getSettingsManager();
  const projectSettings = manager.loadProjectSettings();
  const mcpServers = projectSettings.mcpServers;

  if (mcpServers) {
    delete mcpServers[serverName];
    manager.updateProjectSetting("mcpServers", mcpServers);
  }
}

export function getMCPServer(serverName: string): MCPServerConfig | undefined {
  const manager = getSettingsManager();
  const projectSettings = manager.loadProjectSettings();
  return projectSettings.mcpServers?.[serverName];
}

// Predefined server configurations
export const PREDEFINED_SERVERS: Record<string, MCPServerConfig> = {};
