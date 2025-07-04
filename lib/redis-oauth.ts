import { redis } from "./redis";

async function ensureConnected() {
  if (!redis.isReady) {
    await redis.connect();
  }
}

export interface OAuthClient {
  id: string;
  clientId: string;
  clientSecret: string;
  name: string;
  redirectUris: string[];
  createdAt: string;
}

export interface AuthCode {
  code: string;
  expiresAt: string;
  clientId: string;
  userId: string;
  redirectUri: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
}

export interface AccessToken {
  token: string;
  expiresAt: string;
  clientId: string;
  userId: string;
}

export async function storeClient(client: OAuthClient): Promise<void> {
  await ensureConnected();
  const key = `oauth:client:${client.clientId}`;

  await redis.hSet(key, {
    id: client.id,
    clientId: client.clientId,
    clientSecret: client.clientSecret,
    name: client.name,
    redirectUris: JSON.stringify(client.redirectUris),
    createdAt: client.createdAt,
  });
}

export async function getClient(clientId: string): Promise<OAuthClient | null> {
  await ensureConnected();
  const key = `oauth:client:${clientId}`;

  const client = await redis.hGetAll(key);

  if (!client.clientId) {
    return null;
  }

  const result = {
    id: client.id,
    clientId: client.clientId,
    clientSecret: client.clientSecret,
    name: client.name,
    redirectUris: JSON.parse(client.redirectUris),
    createdAt: client.createdAt,
  };

  return result;
}

export async function storeAuthCode(authCode: AuthCode): Promise<void> {
  await ensureConnected();
  const key = `oauth:authcode:${authCode.code}`;

  await redis.hSet(key, {
    code: authCode.code,
    expiresAt: authCode.expiresAt,
    clientId: authCode.clientId,
    userId: authCode.userId,
    redirectUri: authCode.redirectUri,
    codeChallenge: authCode.codeChallenge || "",
    codeChallengeMethod: authCode.codeChallengeMethod || "",
  });

  await redis.expire(key, 600);
}

export async function getAuthCode(code: string): Promise<AuthCode | null> {
  await ensureConnected();
  const key = `oauth:authcode:${code}`;

  const authCode = await redis.hGetAll(key);

  if (!authCode.code) {
    return null;
  }

  const result = {
    code: authCode.code,
    expiresAt: authCode.expiresAt,
    clientId: authCode.clientId,
    userId: authCode.userId,
    redirectUri: authCode.redirectUri,
    codeChallenge: authCode.codeChallenge || undefined,
    codeChallengeMethod: authCode.codeChallengeMethod || undefined,
  };

  return result;
}

export async function deleteAuthCode(code: string): Promise<void> {
  await ensureConnected();
  const key = `oauth:authcode:${code}`;

  await redis.del(key);
}

export async function storeAccessToken(
  accessToken: AccessToken,
): Promise<void> {
  await ensureConnected();
  const key = `oauth:token:${accessToken.token}`;

  await redis.hSet(key, {
    token: accessToken.token,
    expiresAt: accessToken.expiresAt,
    clientId: accessToken.clientId,
    userId: accessToken.userId,
  });

  await redis.expire(key, 3600);
}

export async function getAccessToken(
  token: string,
): Promise<AccessToken | null> {
  await ensureConnected();
  const key = `oauth:token:${token}`;

  const accessToken = await redis.hGetAll(key);

  if (!accessToken.token) {
    return null;
  }

  const result = {
    token: accessToken.token,
    expiresAt: accessToken.expiresAt,
    clientId: accessToken.clientId,
    userId: accessToken.userId,
  };

  return result;
}

export async function deleteAccessToken(token: string): Promise<void> {
  await ensureConnected();
  const key = `oauth:token:${token}`;

  await redis.del(key);
}

export function generateRandomString(length: number = 32): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function generateClientId(): string {
  return generateRandomString(16);
}

export function generateClientSecret(): string {
  return generateRandomString(64);
}

export function generateAuthCode(): string {
  return generateRandomString(32);
}

export function generateAccessToken(): string {
  return generateRandomString(64);
}
