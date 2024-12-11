import { WebSocket, WebSocketServer } from 'ws';
import type { Server } from 'http';
import { db } from '../db';
import { employees, achievements, employeeAchievements } from '@db/schema';
import { eq } from 'drizzle-orm';

let wss: WebSocketServer;

export function initializeWebSocket(server: Server) {
  try {
    wss = new WebSocketServer({ 
      server,
      path: '/ws',
      clientTracking: true,
    });

    console.log('[WebSocket] Server initialized');

    wss.on('connection', (ws, req) => {
      const clientIp = req.socket.remoteAddress;
      console.log(`[WebSocket] Client connected from ${clientIp}`);
      
      // Send initial connection confirmation
      ws.send(JSON.stringify({ 
        type: 'CONNECTION_ESTABLISHED',
        timestamp: new Date().toISOString()
      }));
      
      ws.on('message', async (message) => {
        try {
          const data = JSON.parse(message.toString());
          console.log('[WebSocket] Received message:', data.type);
          
          switch (data.type) {
            case 'POINTS_UPDATE':
              await broadcastPointsUpdate(data);
              await checkAchievements(data.employeeId);
              break;
            case 'PING':
              ws.send(JSON.stringify({ type: 'PONG', timestamp: new Date().toISOString() }));
              break;
            default:
              console.log('[WebSocket] Unknown message type:', data.type);
          }
        } catch (error) {
          console.error('[WebSocket] Error handling message:', error);
          ws.send(JSON.stringify({ 
            type: 'ERROR',
            message: 'Failed to process message'
          }));
        }
      });

      ws.on('error', (error) => {
        console.error('[WebSocket] Client error:', error);
      });

      ws.on('close', (code, reason) => {
        console.log(`[WebSocket] Client disconnected. Code: ${code}, Reason: ${reason}`);
      });

      // Set a ping interval to keep the connection alive
      const pingInterval = setInterval(() => {
        if (ws.readyState === ws.OPEN) {
          ws.ping();
        } else {
          clearInterval(pingInterval);
        }
      }, 30000);

      ws.on('pong', () => {
        // Connection is still alive
        console.log('[WebSocket] Received pong from client');
      });
    });

    wss.on('error', (error) => {
      console.error('[WebSocket] Server error:', error);
    });

  } catch (error) {
    console.error('[WebSocket] Failed to initialize WebSocket server:', error);
    throw error;
  }
}

function broadcastPointsUpdate(data: any) {
  if (!wss) return;
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: 'POINTS_AWARDED',
        ...data
      }));
    }
  });
}

async function checkAchievements(employeeId: number) {
  const employee = await db.query.employees.findFirst({
    where: eq(employees.id, employeeId),
  });

  if (!employee) return;

  const potentialAchievements = await db.query.achievements.findMany({
    where: (fields, { lte }) => lte(fields.pointsRequired, employee.points)
  });

  // Check and award new achievements
  for (const achievement of potentialAchievements) {
    const existing = await db.query.employeeAchievements.findFirst({
      where: (fields, { and }) => and(
        eq(fields.employeeId, employeeId),
        eq(fields.achievementId, achievement.id)
      ),
    });

    if (!existing) {
      await db.insert(employeeAchievements).values({
        employeeId,
        achievementId: achievement.id,
      });

      // Broadcast achievement unlock
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'ACHIEVEMENT_UNLOCKED',
            employeeId,
            achievementName: achievement.name,
          }));
        }
      });
    }
  }
}
