import * as http from "http";
import type { State, AppEvent } from '../shared/types.ts';

export class Api {
  private apiEventQueue: AppEvent[] = [];
  private sseClients = new Set<http.ServerResponse>();

  // State broadcasting for SSE
  broadcastState(state: State): void {
    const stateData = `data: ${JSON.stringify(state)}\n\n`;
    this.sseClients.forEach((client) => {
        client.write(stateData);
    });
  }

  // Get next event from API queue
  getNextAPIEvent(): AppEvent | undefined {
    return this.apiEventQueue.shift();
  }

  // Check if API queue has events
  hasAPIEvents(): boolean {
    return this.apiEventQueue.length > 0;
  }

  // Handle complete API request flow
  handleRequest(req: http.IncomingMessage, res: http.ServerResponse, currentState: State): boolean {
    if (req.method === "POST") {
      this.handlePostAppEvent(req, res);
      return true;
    }
    
    if (req.method === "GET") {
      this.handleSubscribeAppEvent(req, res, currentState);
      return true;
    }

    return false;
  }

  // Handle POST /api requests (event submission)
  private handlePostAppEvent(req: http.IncomingMessage, res: http.ServerResponse): void {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", () => {
      try {
        const event: AppEvent = JSON.parse(body);
        this.apiEventQueue.push(event);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.write(JSON.stringify({ success: true }));
        res.end();
      } catch (error) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.write(JSON.stringify({ error: "Invalid JSON" }));
        res.end();
      }
    });
  }

  // Handle GET /api requests (SSE connections)
  private handleSubscribeAppEvent(req: http.IncomingMessage, res: http.ServerResponse, currentState: State): void {
    // Server-Sent Events for state snapshots
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*",
    });
    
    this.sseClients.add(res);
    
    // Send initial state
    res.write(`data: ${JSON.stringify(currentState)}\n\n`);
    
    req.on("close", () => {
      this.sseClients.delete(res);
    });
  }
}
