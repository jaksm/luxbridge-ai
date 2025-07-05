import { PlatformType } from "@/lib/types/platformAsset";

export const SUPPORTED_PLATFORMS = [
  {
    platform: "splint_invest" as PlatformType,
    name: "Splint Invest",
    description: "Wine and luxury asset investments",
    color: "from-purple-600 to-purple-800",
    category: "Alternative Assets",
  },
  {
    platform: "masterworks" as PlatformType,
    name: "Masterworks",
    description: "Contemporary art investments",
    color: "from-blue-600 to-blue-800",
    category: "Art & Collectibles",
  },
  {
    platform: "realt" as PlatformType,
    name: "RealT",
    description: "Tokenized real estate investments",
    color: "from-green-600 to-green-800",
    category: "Real Estate",
  },
] as const;
