import { WebSocket, WebSocketServer } from 'ws';
import type { Server } from 'http';
import { db } from '../db';
import { employees, achievements, employeeAchievements } from '@db/schema';
import { eq } from 'drizzle-orm';

let wss: WebSocketServer;

export function initializeWebSocket(server: Server) {
  wss = new WebSocketServer({ server });

  wss.on('connection', (ws) => {
    ws.on('message', async (message) => {
      const data = JSON.parse(message.toString());
      
      switch (data.type) {
        case 'POINTS_UPDATE':
          broadcastPointsUpdate(data);
          await checkAchievements(data.employeeId);
          break;
      }
    });
  });
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
