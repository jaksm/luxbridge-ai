import { PlatformType } from "@/lib/types/platformAsset";

/**
 * Maps URL platform parameters (with hyphens) to internal platform types (with underscores).
 * This handles the mismatch between frontend URL conventions and backend type definitions.
 */
export const PLATFORM_URL_TO_TYPE_MAP: Record<string, PlatformType> = {
  "splint-invest": "splint_invest",
  splint_invest: "splint_invest", // Backward compatibility
  masterworks: "masterworks",
  realt: "realt",
} as const;

/**
 * Converts a URL platform parameter to the internal platform type.
 * @param urlPlatform - Platform name from URL (e.g., "splint-invest")
 * @returns Internal platform type (e.g., "splint_invest") or null if invalid
 */
export function mapUrlPlatformToType(urlPlatform: string): PlatformType | null {
  return PLATFORM_URL_TO_TYPE_MAP[urlPlatform] || null;
}

/**
 * Validates if a URL platform parameter is supported.
 * @param urlPlatform - Platform name from URL
 * @returns true if platform is supported
 */
export function isValidUrlPlatform(urlPlatform: string): boolean {
  return urlPlatform in PLATFORM_URL_TO_TYPE_MAP;
}

/**
 * Gets all supported URL platform names.
 * @returns Array of supported platform URL names
 */
export function getSupportedUrlPlatforms(): string[] {
  return Object.keys(PLATFORM_URL_TO_TYPE_MAP);
}
