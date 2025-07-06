import redis from "@/lib/redis";
import { PlatformAuthResult, PlatformLink } from "@/lib/types/luxbridge-auth";
import { PlatformType } from "@/lib/types/platformAsset";
import { getAuthSession, updateSessionPlatformLink } from "./session-manager";

const PLATFORM_LINK_TTL = 24 * 60 * 60; // 24 hours in seconds

export async function validatePlatformCredentials(
  platform: PlatformType,
  email: string,
  password: string,
): Promise<PlatformAuthResult> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/api/${platform}/auth/login`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      },
    );

    if (!response.ok) {
      return {
        success: false,
        error:
          response.status === 401
            ? "Invalid credentials"
            : "Authentication failed",
      };
    }

    const authData = await response.json();

    return {
      success: true,
      user: {
        userId: authData.userId,
        email: email,
        name: authData.name,
      },
      accessToken: authData.accessToken,
      expiresAt: authData.expiresIn
        ? Date.now() + authData.expiresIn * 1000
        : undefined,
    };
  } catch (error) {
    console.error(`Platform auth error for ${platform}:`, error);
    return { success: false, error: "Network error" };
  }
}

export async function storePlatformLink(
  linkData: Omit<PlatformLink, "linkedAt" | "lastUsedAt" | "status">,
): Promise<PlatformLink> {
  const platformLink: PlatformLink = {
    ...linkData,
    linkedAt: new Date().toISOString(),
    lastUsedAt: new Date().toISOString(),
    status: "active",
  };

  const key = `platform_link:${linkData.luxUserId}:${linkData.platform}`;
  const ttl = linkData.tokenExpiry
    ? Math.floor((linkData.tokenExpiry - Date.now()) / 1000)
    : PLATFORM_LINK_TTL;

  if (ttl > 0) {
    await redis.setEx(
      key,
      Math.min(ttl, PLATFORM_LINK_TTL),
      JSON.stringify(platformLink),
    );
  } else {
    await redis.set(key, JSON.stringify(platformLink));
  }

  return platformLink;
}

export async function getPlatformLink(
  luxUserId: string,
  platform: PlatformType,
): Promise<PlatformLink | null> {
  try {
    const key = `platform_link:${luxUserId}:${platform}`;
    const linkData = await redis.get(key);

    if (!linkData) {
      return null;
    }

    const platformLink = JSON.parse(linkData) as PlatformLink;

    if (platformLink.tokenExpiry && platformLink.tokenExpiry < Date.now()) {
      await deletePlatformLink(luxUserId, platform);
      return null;
    }

    return platformLink;
  } catch (error) {
    console.error("Failed to get platform link:", error);
    return null;
  }
}

export async function deletePlatformLink(
  luxUserId: string,
  platform: PlatformType,
): Promise<void> {
  try {
    const key = `platform_link:${luxUserId}:${platform}`;
    await redis.del(key);
  } catch (error) {
    console.error("Failed to delete platform link:", error);
  }
}

export async function updatePlatformLinkActivity(
  luxUserId: string,
  platform: PlatformType,
): Promise<void> {
  try {
    const platformLink = await getPlatformLink(luxUserId, platform);
    if (platformLink) {
      platformLink.lastUsedAt = new Date().toISOString();
      await storePlatformLink(platformLink);
    }
  } catch (error) {
    console.error("Failed to update platform link activity:", error);
  }
}

export async function makeAuthenticatedPlatformCall(
  sessionId: string,
  platform: PlatformType,
  endpoint: string,
  options: RequestInit = {},
): Promise<any> {
  const session = await getAuthSession(sessionId);
  if (!session) {
    throw new Error("Invalid session");
  }

  const platformLink = session.platforms[platform];
  if (!platformLink || platformLink.status !== "active") {
    throw new Error(`Platform ${platform} not linked or inactive`);
  }

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/api/${platform}${endpoint}`,
    {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${platformLink.accessToken}`,
        "Content-Type": "application/json",
      },
    },
  );

  if (!response.ok) {
    if (response.status === 401) {
      platformLink.status = "invalid";
      await updateSessionPlatformLink(sessionId, platform, platformLink);
      throw new Error(`Platform ${platform} authentication expired`);
    }
    throw new Error(`Platform API call failed: ${response.statusText}`);
  }

  await updatePlatformLinkActivity(session.luxUserId, platform);

  platformLink.lastUsedAt = new Date().toISOString();
  await updateSessionPlatformLink(sessionId, platform, platformLink);

  return response.json();
}

export async function getAllUserPlatformLinks(
  luxUserId: string,
): Promise<PlatformLink[]> {
  const platforms: PlatformType[] = ["splint_invest", "masterworks", "realt"];
  const links: PlatformLink[] = [];

  for (const platform of platforms) {
    const link = await getPlatformLink(luxUserId, platform);
    if (link) {
      links.push(link);
    }
  }

  return links;
}

export async function validateAllPlatformLinks(
  luxUserId: string,
): Promise<void> {
  const platforms: PlatformType[] = ["splint_invest", "masterworks", "realt"];

  for (const platform of platforms) {
    const link = await getPlatformLink(luxUserId, platform);
    if (link) {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/api/${platform}/auth/me`,
          {
            headers: {
              Authorization: `Bearer ${link.accessToken}`,
              "Content-Type": "application/json",
            },
          },
        );

        if (!response.ok) {
          link.status = response.status === 401 ? "expired" : "invalid";
          await storePlatformLink(link);
        } else {
          if (link.status !== "active") {
            link.status = "active";
            await storePlatformLink(link);
          }
        }
      } catch (error) {
        link.status = "invalid";
        await storePlatformLink(link);
      }
    }
  }
}

export { SUPPORTED_PLATFORMS } from "@/lib/constants/platforms";
