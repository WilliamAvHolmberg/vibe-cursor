import { useEffect, useRef, useState } from 'react';
import * as signalR from '@microsoft/signalr';

const HUB_URL = import.meta.env.VITE_WS_URL || '/hubs/orchestration';

export interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

export function useWebSocket(orchestrationId?: string) {
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const connectionRef = useRef<signalR.HubConnection | null>(null);

  useEffect(() => {
    if (!orchestrationId) return;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(HUB_URL, {
        withCredentials: false,
        skipNegotiation: true,
        transport: signalR.HttpTransportType.WebSockets
      })
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: (retryContext) => {
          if (retryContext.elapsedMilliseconds < 60000) {
            return Math.random() * 10000;
          } else {
            return null;
          }
        }
      })
      .configureLogging(signalR.LogLevel.Information)
      .build();

    connection.on('BroadcastToOrchestration', (message: WebSocketMessage) => {
      console.log('Received SignalR message:', message);
      setLastMessage(message);
    });

    connection.on('Subscribed', (data) => {
      console.log('Subscribed to orchestration:', data);
    });

    connection.onreconnecting((error) => {
      console.log('SignalR reconnecting...', error);
      setConnected(false);
    });

    connection.onreconnected((connectionId) => {
      console.log('SignalR reconnected:', connectionId);
      setConnected(true);
      connection.invoke('SubscribeToOrchestration', orchestrationId)
        .catch(err => console.error('Error resubscribing:', err));
    });

    connection.onclose((error) => {
      console.log('SignalR disconnected', error);
      setConnected(false);
    });

    connection.start()
      .then(() => {
        console.log('SignalR connected');
        setConnected(true);
        return connection.invoke('SubscribeToOrchestration', orchestrationId);
      })
      .then(() => {
        console.log('Subscribed to orchestration:', orchestrationId);
      })
      .catch(err => {
        console.error('SignalR connection error:', err);
        setConnected(false);
      });

    connectionRef.current = connection;

    return () => {
      if (connectionRef.current) {
        console.log('Cleaning up SignalR connection');
        connectionRef.current.invoke('UnsubscribeFromOrchestration', orchestrationId)
          .catch(err => console.error('Error unsubscribing:', err))
          .finally(() => {
            connectionRef.current?.stop();
          });
      }
    };
  }, [orchestrationId]);

  const sendMessage = (_message: WebSocketMessage) => {
    console.warn('sendMessage not implemented for SignalR - messages are server-driven');
  };

  return { connected, lastMessage, sendMessage };
}
