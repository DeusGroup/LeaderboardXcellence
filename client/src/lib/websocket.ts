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
      // Use secure WebSocket if the page is served over HTTPS
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      console.log('[WebSocket] Connecting to:', wsUrl);
      
      ws = new WebSocket(wsUrl);
      
      // Set a connection timeout
      const connectionTimeout = setTimeout(() => {
        if (ws?.readyState !== WebSocket.OPEN) {
          console.log('[WebSocket] Connection timeout');
          ws?.close();
        }
      }, 5000);
      
      ws.onopen = () => {
        clearTimeout(connectionTimeout);
        console.log('[WebSocket] Connected successfully');
        reconnectAttempts = 0;
        if (reconnectTimeout) {
          clearTimeout(reconnectTimeout);
          reconnectTimeout = null;
        }
        
        // Send initial heartbeat
        sendWebSocketMessage({ type: 'PING' });
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[WebSocket] Received message:', data.type);
          
          switch (data.type) {
            case 'CONNECTION_ESTABLISHED':
              console.log('[WebSocket] Connection confirmed by server');
              break;
            case 'PONG':
              console.log('[WebSocket] Server heartbeat received');
              break;
            case 'ERROR':
              console.error('[WebSocket] Server reported error:', data.message);
              break;
            default:
              handleWebSocketMessage(data);
          }
        } catch (error) {
          console.error('[WebSocket] Error parsing message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('[WebSocket] Connection error:', error);
        clearTimeout(connectionTimeout);
      };

      ws.onclose = (event) => {
        clearTimeout(connectionTimeout);
        console.log('[WebSocket] Connection closed', event.code, event.reason);
        ws = null;
        
        if (document.visibilityState === 'visible' && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000); // Exponential backoff
          reconnectAttempts++;
          console.log(`[WebSocket] Attempting to reconnect (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}) in ${delay}ms`);
          reconnectTimeout = setTimeout(connect, delay);
        }
      };
    } catch (error) {
      console.error('[WebSocket] Setup error:', error);
      ws = null;
      
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000);
        reconnectTimeout = setTimeout(connect, delay);
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
