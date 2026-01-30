import { IncomingMessage, Server, ServerResponse, createServer } from "http";
import { SuperAgent } from "../agent/super-agent";
import { WebSocket, WebSocketServer } from "ws";
import * as fs from "fs-extra";
import * as path from "path";
import open from "open";
import mime from "mime";

export interface WebServerOptions {
  hostname?: string;
  port?: number;
  agent: SuperAgent;
  openBrowser?: boolean;
}

export class WebServer {
  private httpServer: Server;
  private wss: WebSocketServer;
  private agent: SuperAgent;
  private hostname: string;
  private port: number;
  private clients: Set<WebSocket> = new Set();

  constructor(options: WebServerOptions) {
    this.hostname = options.hostname || "localhost";
    this.port = options.port || 3000;
    this.agent = options.agent;

    // Create HTTP server
    this.httpServer = createServer((req, res) => {
      this.handleHttpRequest(req, res);
    });

    // Create WebSocket server
    this.wss = new WebSocketServer({ server: this.httpServer });
    this.wss.on("connection", ws => {
      this.handleWebSocketConnection(ws);
    });
  }

  private async handleHttpRequest(
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> {
    const url = req.url || "/";
    let filePath = path.join(
      __dirname,
      "../web/client",
      url === "/" ? "index.html" : url,
    );

    try {
      if (await fs.pathExists(filePath)) {
        const stat = await fs.stat(filePath);
        if (stat.isDirectory()) {
          filePath = path.join(filePath, "index.html");
        }

        const content = await fs.readFile(filePath);
        const mimeType = mime.getType(filePath) || "application/octet-stream";

        res.writeHead(200, { "Content-Type": mimeType });
        res.end(content);
      } else {
        res.writeHead(404);
        res.end("Not Found");
      }
    } catch (error) {
      console.error("Error serving file:", error);
      res.writeHead(500);
      res.end("Internal Server Error");
    }
  }

  private handleWebSocketConnection(ws: WebSocket): void {
    this.clients.add(ws);
    console.log(`📡 Web client connected (${this.clients.size} total)`);

    ws.on("message", async data => {
      try {
        const message = JSON.parse(data.toString());

        if (message.type === "prompt") {
          await this.handlePrompt(message.content, ws);
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
        ws.send(
          JSON.stringify({ type: "error", content: "Invalid message format" }),
        );
      }
    });

    ws.on("close", () => {
      this.clients.delete(ws);
      console.log(
        `📡 Web client disconnected (${this.clients.size} remaining)`,
      );
    });

    ws.on("error", error => {
      console.error("WebSocket error:", error);
    });
  }

  private async handlePrompt(prompt: string, ws: WebSocket): Promise<void> {
    try {
      // Send acknowledgment
      ws.send(JSON.stringify({ type: "user_message", content: prompt }));

      // Process the message (non-streaming for now)
      const entries = await this.agent.processUserMessage(prompt);

      // Send each entry back
      for (const entry of entries) {
        if (entry.type === "assistant") {
          ws.send(
            JSON.stringify({
              type: "assistant_message",
              content: entry.content,
            }),
          );
        } else if (entry.type === "tool_call") {
          ws.send(
            JSON.stringify({
              type: "tool_call",
              tool: entry.toolCall?.function.name,
              content: "Executing...",
            }),
          );
        } else if (entry.type === "tool_result") {
          ws.send(
            JSON.stringify({
              type: "tool_result",
              tool: entry.toolCall?.function.name,
              content: entry.content,
            }),
          );
        }
      }

      ws.send(JSON.stringify({ type: "done" }));
    } catch (error: any) {
      ws.send(
        JSON.stringify({
          type: "error",
          content: error.message,
        }),
      );
    }
  }

  public async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.httpServer.listen(this.port, this.hostname, () => {
        const url = `http://${this.hostname}:${this.port}`;
        console.log(`🌐 Web interface available at ${url}`);
        resolve();
      });

      this.httpServer.on("error", error => {
        reject(error);
      });
    });
  }

  public async openBrowser(): Promise<void> {
    const url = `http://${this.hostname}:${this.port}`;
    try {
      await open(url);
      console.log(`🚀 Opened browser at ${url}`);
    } catch (error) {
      console.warn(`Could not open browser automatically. Please visit ${url}`);
    }
  }

  public stop(): void {
    this.clients.forEach(client => {
      client.close();
    });
    this.wss.close();
    this.httpServer.close();
    console.log("🛑 Web server stopped");
  }
}
