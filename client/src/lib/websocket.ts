import { useToast } from "@/hooks/use-toast";

let ws: WebSocket | null = null;

export function initWebSocket() {
  try {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${protocol}//${window.location.host}`);
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      handleWebSocketMessage(data);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      ws = null;
      setTimeout(() => {
        initWebSocket();
      }, 1000);
    };
  } catch (error) {
    console.error('WebSocket connection error:', error);
    setTimeout(() => {
      initWebSocket();
    }, 1000);
  }
}

export function sendWebSocketMessage(message: any) {
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

function handleWebSocketMessage(data: any) {
  const { toast } = useToast();

  switch (data.type) {
    case "POINTS_AWARDED":
      toast({
        title: "Points Awarded!",
        description: `You've earned ${data.points} points for ${data.reason}`,
      });
      break;
    case "ACHIEVEMENT_UNLOCKED":
      toast({
        title: "Achievement Unlocked!",
        description: data.achievementName,
        variant: "default",
      });
      break;
    case "RANK_CHANGED":
      toast({
        title: "Rank Updated!",
        description: `You're now ranked #${data.newRank}`,
      });
      break;
  }
}

// This duplicate function has been removed as it's already defined above
