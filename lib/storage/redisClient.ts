import { redis, ensureConnected } from "../redis";
import {
  PlatformAsset,
  PlatformType,
  UserPortfolioHolding,
  PlatformInfo,
} from "../types/platformAsset";
import {
  GetAssetParams,
  GetAssetsByPlatformParams,
  GetUserPortfolioParams,
} from "../types/schemas";

export class AssetStorage {
  async getAsset(params: GetAssetParams): Promise<PlatformAsset | null> {
    await ensureConnected();
    const key = `platform:${params.platform}:assets:${params.assetId}`;
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  async getAssetsByPlatform(
    params: GetAssetsByPlatformParams,
  ): Promise<PlatformAsset[]> {
    await ensureConnected();
    const pattern = `platform:${params.platform}:assets:*`;
    const keys = await redis.keys(pattern);

    if (keys.length === 0) return [];

    const assets = await redis.mGet(keys);
    const results = assets
      .filter((data): data is string => data !== null)
      .map((data: string) => JSON.parse(data))
      .slice(0, params.limit);

    return results;
  }

  async storeAsset(
    asset: PlatformAsset,
    platform: PlatformType,
  ): Promise<void> {
    await ensureConnected();
    const key = `platform:${platform}:assets:${asset.assetId}`;
    await redis.set(key, JSON.stringify(asset));
  }

  async getUserPortfolio(
    params: GetUserPortfolioParams,
  ): Promise<UserPortfolioHolding[]> {
    await ensureConnected();
    const key = `platform:${params.platform}:users:${params.userId}:portfolio`;
    const data = await redis.get(key);
    return data ? JSON.parse(data) : [];
  }

  async storeUserPortfolio(
    userId: string,
    platform: PlatformType,
    holdings: UserPortfolioHolding[],
  ): Promise<void> {
    await ensureConnected();
    const key = `platform:${platform}:users:${userId}:portfolio`;
    await redis.set(key, JSON.stringify(holdings));
  }

  async getPlatformInfo(platform: PlatformType): Promise<PlatformInfo | null> {
    await ensureConnected();
    const key = `platform:${platform}:info`;
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  async storePlatformInfo(info: PlatformInfo): Promise<void> {
    await ensureConnected();
    const key = `platform:${info.platform}:info`;
    await redis.set(key, JSON.stringify(info));
  }

  async getAssetsByIds(
    assetIds: string[],
    platform: PlatformType,
  ): Promise<PlatformAsset[]> {
    await ensureConnected();
    const keys = assetIds.map((id) => `platform:${platform}:assets:${id}`);
    const assets = await redis.mGet(keys);

    return assets
      .filter((data): data is string => data !== null)
      .map((data: string) => JSON.parse(data));
  }

  async deleteAsset(assetId: string, platform: PlatformType): Promise<void> {
    await ensureConnected();
    const key = `platform:${platform}:assets:${assetId}`;
    await redis.del(key);
  }

  async getAllPlatformAssetIds(platform: PlatformType): Promise<string[]> {
    await ensureConnected();
    const pattern = `platform:${platform}:assets:*`;
    const keys = await redis.keys(pattern);
    return keys.map((key) => key.split(":").pop()!);
  }
}

export const assetStorage = new AssetStorage();
