import { users } from "./users";
import { AuthResult, TokenPayload } from "../types/user";
import { validateJWT, extractBearerToken } from "./jwtUtils";

export async function validateCredentials(
  email: string,
  password: string,
): Promise<AuthResult> {
  const user = users[email];
  if (!user || user.password !== password) {
    return { success: false, error: "Invalid credentials" };
  }
  return { success: true, user };
}

export function authenticateToken(authHeader?: string): TokenPayload | null {
  const token = extractBearerToken(authHeader);
  if (!token) return null;
  return validateJWT(token);
}

export function getUserById(userId: string) {
  return Object.values(users).find((user) => user.userId === userId);
}
