import redis, { ensureConnected } from "@/lib/redis";
import {
  AuthSession,
  LuxBridgeUser,
  PlatformLink,
} from "@/lib/types/luxbridge-auth";
import { PlatformType } from "@/lib/types/platformAsset";

const SESSION_TTL = 24 * 60 * 60; // 24 hours in seconds

export async function createAuthSession(
  luxUserId: string,
  privyToken: string,
): Promise<string> {
  await ensureConnected();
  
  const sessionId = `lux_session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL * 1000);

  const session: AuthSession = {
    sessionId,
    luxUserId,
    privyToken,
    platforms: {
      splint_invest: null,
      masterworks: null,
      realt: null,
    },
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };

  const key = `session:${sessionId}`;
  await redis.setEx(key, SESSION_TTL, JSON.stringify(session));

  await addSessionToUser(luxUserId, sessionId);

  return sessionId;
}

export async function getAuthSession(
  sessionId: string,
): Promise<AuthSession | null> {
  try {
    await ensureConnected();
    
    const key = `session:${sessionId}`;
    const sessionData = await redis.get(key);

    if (!sessionData) {
      return null;
    }

    const session = JSON.parse(sessionData) as AuthSession;

    if (new Date(session.expiresAt) < new Date()) {
      await deleteAuthSession(sessionId);
      return null;
    }

    return session;
  } catch (error) {
    console.error("Failed to get auth session:", error);
    return null;
  }
}

export async function deleteAuthSession(sessionId: string): Promise<void> {
  try {
    const session = await getAuthSession(sessionId);
    if (session) {
      await removeSessionFromUser(session.luxUserId, sessionId);
    }

    await ensureConnected();
    const key = `session:${sessionId}`;
    await redis.del(key);
  } catch (error) {
    console.error("Failed to delete auth session:", error);
  }
}

export async function extendSession(sessionId: string): Promise<void> {
  try {
    const session = await getAuthSession(sessionId);
    if (!session) {
      return;
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_TTL * 1000);
    session.expiresAt = expiresAt.toISOString();

    await ensureConnected();
    const key = `session:${sessionId}`;
    await redis.setEx(key, SESSION_TTL, JSON.stringify(session));
  } catch (error) {
    console.error("Failed to extend session:", error);
  }
}

export async function updateSessionPlatformLink(
  sessionId: string,
  platform: PlatformType,
  platformLink: PlatformLink,
): Promise<void> {
  try {
    const session = await getAuthSession(sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    session.platforms[platform] = platformLink;

    const key = `session:${sessionId}`;
    const ttl = Math.floor(
      (new Date(session.expiresAt).getTime() - Date.now()) / 1000,
    );

    if (ttl > 0) {
      await ensureConnected();
      await redis.setEx(key, ttl, JSON.stringify(session));
    }
  } catch (error) {
    console.error("Failed to update session platform link:", error);
    throw error;
  }
}

export async function removeSessionPlatformLink(
  sessionId: string,
  platform: PlatformType,
): Promise<void> {
  try {
    const session = await getAuthSession(sessionId);
    if (!session) {
      return;
    }

    session.platforms[platform] = null;

    const key = `session:${sessionId}`;
    const ttl = Math.floor(
      (new Date(session.expiresAt).getTime() - Date.now()) / 1000,
    );

    if (ttl > 0) {
      await ensureConnected();
      await redis.setEx(key, ttl, JSON.stringify(session));
    }
  } catch (error) {
    console.error("Failed to remove session platform link:", error);
  }
}

export async function storeLuxBridgeUser(user: LuxBridgeUser): Promise<void> {
  try {
    await ensureConnected();
    const key = `lux_user:${user.privyId}`;
    await redis.set(key, JSON.stringify(user));
  } catch (error) {
    console.error("Failed to store LuxBridge user:", error);
    throw error;
  }
}

export async function getLuxBridgeUser(
  privyId: string,
): Promise<LuxBridgeUser | null> {
  try {
    await ensureConnected();
    const key = `lux_user:${privyId}`;
    const userData = await redis.get(key);

    if (!userData) {
      return null;
    }

    return JSON.parse(userData) as LuxBridgeUser;
  } catch (error) {
    console.error("Failed to get LuxBridge user:", error);
    return null;
  }
}

export async function updateLuxBridgeUserActivity(
  privyId: string,
): Promise<void> {
  try {
    const user = await getLuxBridgeUser(privyId);
    if (user) {
      user.lastActiveAt = new Date().toISOString();
      await storeLuxBridgeUser(user);
    }
  } catch (error) {
    console.error("Failed to update user activity:", error);
  }
}

async function addSessionToUser(
  luxUserId: string,
  sessionId: string,
): Promise<void> {
  try {
    await ensureConnected();
    const key = `user_sessions:${luxUserId}`;
    const existingSessions = await redis.get(key);

    let sessions: string[] = [];
    if (existingSessions) {
      sessions = JSON.parse(existingSessions);
    }

    sessions.push(sessionId);

    await redis.setEx(key, SESSION_TTL, JSON.stringify(sessions));
  } catch (error) {
    console.error("Failed to add session to user:", error);
  }
}

async function removeSessionFromUser(
  luxUserId: string,
  sessionId: string,
): Promise<void> {
  try {
    await ensureConnected();
    const key = `user_sessions:${luxUserId}`;
    const existingSessions = await redis.get(key);

    if (existingSessions) {
      let sessions: string[] = JSON.parse(existingSessions);
      sessions = sessions.filter((id) => id !== sessionId);

      if (sessions.length > 0) {
        await redis.setEx(key, SESSION_TTL, JSON.stringify(sessions));
      } else {
        await redis.del(key);
      }
    }
  } catch (error) {
    console.error("Failed to remove session from user:", error);
  }
}

export async function getUserActiveSessions(
  luxUserId: string,
): Promise<string[]> {
  try {
    await ensureConnected();
    const key = `user_sessions:${luxUserId}`;
    const sessionsData = await redis.get(key);

    if (!sessionsData) {
      return [];
    }

    const sessionIds = JSON.parse(sessionsData) as string[];
    const activeSessions: string[] = [];

    for (const sessionId of sessionIds) {
      const session = await getAuthSession(sessionId);
      if (session) {
        activeSessions.push(sessionId);
      }
    }

    if (activeSessions.length !== sessionIds.length) {
      if (activeSessions.length > 0) {
        await redis.setEx(key, SESSION_TTL, JSON.stringify(activeSessions));
      } else {
        await redis.del(key);
      }
    }

    return activeSessions;
  } catch (error) {
    console.error("Failed to get user active sessions:", error);
    return [];
  }
}

export async function cleanupExpiredSessions(): Promise<void> {
  try {
    const pattern = "session:*";
    const keys = await redis.keys(pattern);

    for (const key of keys) {
      const sessionData = await redis.get(key);
      if (sessionData) {
        const session = JSON.parse(sessionData) as AuthSession;
        if (new Date(session.expiresAt) < new Date()) {
          await deleteAuthSession(session.sessionId);
        }
      }
    }
  } catch (error) {
    console.error("Failed to cleanup expired sessions:", error);
  }
}
