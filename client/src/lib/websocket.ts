import { useToast } from "@/hooks/use-toast";

let ws: WebSocket | null = null;
let reconnectTimeout: NodeJS.Timeout | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_INTERVAL = 3000;

export function initWebSocket(): () => void {
  // Clear any existing reconnect timeouts
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }

  // Don't create new connection if we already have one
  if (ws?.readyState === WebSocket.OPEN) {
    return () => cleanupWebSocket();
  }

  // Don't attempt to reconnect if we've exceeded the maximum attempts
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.log('[WebSocket] Max reconnection attempts reached');
    return () => {};
  }

  function connect() {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
      
      ws.onopen = () => {
        console.log('[WebSocket] Connected successfully');
        reconnectAttempts = 0;
        if (reconnectTimeout) {
          clearTimeout(reconnectTimeout);
          reconnectTimeout = null;
        }
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleWebSocketMessage(data);
        } catch (error) {
          console.error('[WebSocket] Error parsing message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('[WebSocket] Connection error:', error);
      };

      ws.onclose = () => {
        console.log('[WebSocket] Connection closed');
        ws = null;
        
        if (document.visibilityState === 'visible' && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempts++;
          console.log(`[WebSocket] Attempting to reconnect (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
          reconnectTimeout = setTimeout(connect, RECONNECT_INTERVAL);
        }
      };
    } catch (error) {
      console.error('[WebSocket] Setup error:', error);
      ws = null;
      
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        reconnectTimeout = setTimeout(connect, RECONNECT_INTERVAL);
      }
    }
  }

  // Initial connection
  connect();

  // Return cleanup function
  return () => cleanupWebSocket();
}

// Add cleanup function
export function cleanupWebSocket() {
  if (ws) {
    ws.close();
    ws = null;
  }
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }
  reconnectAttempts = 0;
}

export function sendWebSocketMessage(message: any) {
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

type MessageHandler = (data: any) => void;
let messageHandler: MessageHandler | null = null;

export function setWebSocketMessageHandler(handler: MessageHandler) {
  messageHandler = handler;
}

function handleWebSocketMessage(data: any) {
  if (messageHandler) {
    messageHandler(data);
  }
}
