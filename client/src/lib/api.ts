const API_BASE = "/api";

export async function fetchLeaderboard() {
  const res = await fetch(`${API_BASE}/leaderboard`);
  if (!res.ok) throw new Error("Failed to fetch leaderboard");
  return res.json();
}

export async function fetchProfile(id: string) {
  const res = await fetch(`${API_BASE}/employees/${id}`);
  if (!res.ok) throw new Error("Failed to fetch profile");
  return res.json();
}

export async function awardPoints(employeeId: number, points: number, reason: string) {
  const res = await fetch(`${API_BASE}/points/award`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ employeeId, points, reason })
  });
  if (!res.ok) throw new Error("Failed to award points");
  const data = await res.json();
  return {
    history: data.history,
    employee: data.updated
  };
}

export async function fetchPointsHistory(employeeId: number) {
  const res = await fetch(`${API_BASE}/points/history/${employeeId}`);
  if (!res.ok) throw new Error("Failed to fetch points history");
  return res.json();
}

export async function fetchAchievements(employeeId: number) {
  const res = await fetch(`${API_BASE}/achievements/${employeeId}`);
  if (!res.ok) throw new Error("Failed to fetch achievements");
  return res.json();
}
