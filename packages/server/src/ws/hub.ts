import type { Server } from "node:http";
import { WebSocket, WebSocketServer } from "ws";
import { logger } from "../lib/logger";
import type { ClientMessage, ServerEvent } from "./types";

interface ClientContext {
  userId?: string;
}

interface WebSocketHub {
  broadcastToUser: (userId: string, event: ServerEvent) => void;
  broadcastAll: (event: ServerEvent) => void;
  close: () => void;
}

let hubInstance: WebSocketHub | null = null;

const parseMessage = (data: Buffer) => {
  try {
    return JSON.parse(data.toString()) as ClientMessage;
  } catch (error) {
    logger.warn("Failed to parse websocket message", { error });
    return null;
  }
};

export const createWebSocketHub = (server: Server): WebSocketHub => {
  const wss = new WebSocketServer({ server, path: "/ws" });
  const clientContexts = new Map<WebSocket, ClientContext>();
  const userConnections = new Map<string, Set<WebSocket>>();

  const registerUser = (ws: WebSocket, userId: string) => {
    clientContexts.set(ws, { userId });
    if (!userConnections.has(userId)) {
      userConnections.set(userId, new Set());
    }
    userConnections.get(userId)?.add(ws);
    logger.info("Websocket client registered", { userId });
  };

  const unregister = (ws: WebSocket) => {
    const context = clientContexts.get(ws);
    if (context?.userId) {
      const sockets = userConnections.get(context.userId);
      if (sockets) {
        sockets.delete(ws);
        if (sockets.size === 0) {
          userConnections.delete(context.userId);
        }
      }
      logger.info("Websocket client disconnected", { userId: context.userId });
    }
    clientContexts.delete(ws);
  };

  wss.on("connection", (ws) => {
    clientContexts.set(ws, {});

    ws.on("message", (raw) => {
      const message = parseMessage(raw as Buffer);
      if (!message) {
        return;
      }

      if (message.type === "hello") {
        registerUser(ws, message.payload.userId);
      }
    });

    ws.on("close", () => unregister(ws));
    ws.on("error", (error) => logger.warn("Websocket error", { error }));
  });

  const broadcast = (targets: Iterable<WebSocket>, event: ServerEvent) => {
    const payload = JSON.stringify(event);
    for (const socket of targets) {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(payload);
      }
    }
  };

  const hub: WebSocketHub = {
    broadcastToUser: (userId, event) => {
      const sockets = userConnections.get(userId);
      if (!sockets) {
        return;
      }
      broadcast(sockets, event);
    },
    broadcastAll: (event) => {
      broadcast(wss.clients, event);
    },
    close: () => {
      for (const socket of wss.clients) {
        socket.close();
      }
      wss.close();
    },
  };

  hubInstance = hub;

  return hub;
};

export const getWebSocketHub = () => {
  if (!hubInstance) {
    throw new Error("Websocket hub has not been initialized");
  }
  return hubInstance;
};
