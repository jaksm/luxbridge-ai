import { PlatformType } from "../lib/types/platformAsset";

interface AssetIdConfig {
  platform: PlatformType;
  patterns: {
    pattern: string;
    count: number;
    examples: string[];
  }[];
}

const assetIdConfigs: AssetIdConfig[] = [
  {
    platform: "splint_invest",
    patterns: [
      {
        pattern: "WINE-{region}-{vintage}-{producer}-{id}",
        count: 25,
        examples: [
          "WINE-BORDEAUX-1982-CH-LATOUR-001",
          "WINE-BURGUNDY-1985-DOM-ROMANE-002",
          "WINE-CHAMPAGNE-1996-DOM-PERIGNON-003",
          "WINE-RHONE-1990-CHATEAUNEUF-004",
          "WINE-TUSCANY-1997-ORNELLAIA-005"
        ]
      },
      {
        pattern: "WHISKY-{distillery}-{age}YR-CASK-{id}",
        count: 20,
        examples: [
          "WHISKY-MACALLAN-25YR-CASK-7342",
          "WHISKY-LAGAVULIN-16YR-CASK-8851",
          "WHISKY-ARDBEG-10YR-CASK-9234",
          "WHISKY-GLENFIDDICH-21YR-CASK-5567",
          "WHISKY-BALVENIE-30YR-CASK-1123"
        ]
      },
      {
        pattern: "{make}-{model}-{year}-VIN-{id}",
        count: 20,
        examples: [
          "FERRARI-F40-1987-VIN-78439",
          "PORSCHE-911-1973-VIN-23456",
          "LAMBORGHINI-MIURA-1969-VIN-34567",
          "MCLAREN-F1-1994-VIN-45678",
          "ASTON-MARTIN-DB5-1964-VIN-56789"
        ]
      },
      {
        pattern: "ART-{artist}-{work}-{id}",
        count: 20,
        examples: [
          "ART-BANKSY-DEVOLVED-PARLIAMENT-042",
          "ART-KAWS-COMPANION-FLAYED-078",
          "ART-HOCKNEY-POOL-SPLASH-091",
          "ART-RICHTER-ABSTRACT-PAINTING-156",
          "ART-KUSAMA-INFINITY-DOTS-203"
        ]
      },
      {
        pattern: "WATCH-{brand}-{model}-{year}-{id}",
        count: 15,
        examples: [
          "WATCH-ROLEX-DAYTONA-1963-PAUL-NEWMAN",
          "WATCH-PATEK-PHILIPPE-NAUTILUS-1976-STEEL",
          "WATCH-AUDEMARS-PIGUET-ROYAL-OAK-1972-JUMBO",
          "WATCH-OMEGA-SPEEDMASTER-1969-MOONWATCH",
          "WATCH-CARTIER-SANTOS-1904-VINTAGE"
        ]
      }
    ]
  },
  {
    platform: "masterworks",
    patterns: [
      {
        pattern: "{artist}-{work}-{year}-{medium}",
        count: 100,
        examples: [
          "PICASSO-LES-DEMOISELLES-AVIGNON-1907-OIL",
          "MONET-WATER-LILIES-SERIES-1919-023-OIL",
          "BASQUIAT-UNTITLED-SKULL-1981-MIXED-MEDIA",
          "WARHOL-MARILYN-DIPTYCH-1962-SILKSCREEN",
          "KAWS-COMPANION-FLAYED-2016-BRONZE-ED",
          "ROTHKO-RED-STUDY-1958-OIL-CANVAS",
          "HOCKNEY-POOL-WITH-TWO-FIGURES-1972-ACRYLIC",
          "RICHTER-ABSTRACT-PAINTING-1994-OIL",
          "KUSAMA-INFINITY-NETS-1959-OIL",
          "POLLOCK-NUMBER-1-1950-ENAMEL-CANVAS"
        ]
      }
    ]
  },
  {
    platform: "realt",
    patterns: [
      {
        pattern: "REALT-{address}-{city}-{state}-{zip}",
        count: 100,
        examples: [
          "REALT-5942-WAYBURN-DETROIT-MI-48224",
          "REALT-15039-WARD-AVE-DETROIT-MI-48228",
          "REALT-18866-MAIN-ST-CLEVELAND-OH-44119",
          "REALT-432-S-KOSTNER-CHICAGO-IL-60624",
          "REALT-9336-PATTON-ST-DETROIT-MI-48228",
          "REALT-12334-LANSDOWNE-DETROIT-MI-48205",
          "REALT-8342-SCHAEFER-HWY-DETROIT-MI-48228",
          "REALT-5942-BUCKINGHAM-DETROIT-MI-48224",
          "REALT-9943-MARLOWE-ST-DETROIT-MI-48227",
          "REALT-14319-ROSEMARY-DETROIT-MI-48213"
        ]
      }
    ]
  }
];

function generateAssetIds(): Record<PlatformType, string[]> {
  const results: Record<PlatformType, string[]> = {
    splint_invest: [],
    masterworks: [],
    realt: []
  };

  for (const config of assetIdConfigs) {
    const { platform, patterns } = config;
    
    for (const pattern of patterns) {
      const { examples, count } = pattern;
      
      if (platform === "splint_invest") {
        results[platform].push(...examples.slice(0, Math.min(examples.length, count)));
        
        const remaining = count - examples.length;
        if (remaining > 0) {
          for (let i = 0; i < remaining; i++) {
            const baseExample = examples[i % examples.length];
            const parts = baseExample.split("-");
            const lastPart = parts[parts.length - 1];
            const newId = String(parseInt(lastPart) + examples.length + i + 1).padStart(3, "0");
            parts[parts.length - 1] = newId;
            results[platform].push(parts.join("-"));
          }
        }
      } else if (platform === "masterworks") {
        const artists = ["PICASSO", "MONET", "BASQUIAT", "WARHOL", "KAWS", "ROTHKO", "HOCKNEY", "RICHTER", "KUSAMA", "POLLOCK", "LICHTENSTEIN", "JOHNS", "RAUSCHENBERG", "TWOMBLY", "DIEBENKORN", "KIEFER", "GERHARD", "DOIG", "KIPPENBERGER", "WOOL"];
        const works = ["UNTITLED", "STUDY", "COMPOSITION", "PORTRAIT", "LANDSCAPE", "ABSTRACT", "FIGURE", "STILL-LIFE", "INTERIOR", "EXTERIOR"];
        const mediums = ["OIL", "ACRYLIC", "MIXED-MEDIA", "CANVAS", "PAPER", "BRONZE", "SCULPTURE", "SILKSCREEN", "LITHOGRAPH", "ETCHING"];
        
        for (let i = 0; i < count; i++) {
          const artist = artists[i % artists.length];
          const work = works[Math.floor(i / artists.length) % works.length];
          const year = 1950 + (i % 70);
          const medium = mediums[i % mediums.length];
          const id = String(i + 1).padStart(3, "0");
          
          results[platform].push(`${artist}-${work}-${id}-${year}-${medium}`);
        }
      } else if (platform === "realt") {
        const streets = ["WAYBURN", "WARD-AVE", "MAIN-ST", "KOSTNER", "PATTON-ST", "LANSDOWNE", "SCHAEFER-HWY", "BUCKINGHAM", "MARLOWE-ST", "ROSEMARY", "WOODWARD", "CORKTOWN", "BRUSH-ST", "CADILLAC", "MICHIGAN-AVE"];
        const cities = ["DETROIT", "CLEVELAND", "CHICAGO", "MILWAUKEE", "INDIANAPOLIS"];
        const states = ["MI", "OH", "IL", "WI", "IN"];
        const zips = ["48224", "48228", "44119", "60624", "48205", "48213", "48227", "53202", "46201"];
        
        for (let i = 0; i < count; i++) {
          const address = 1000 + (i * 123) % 8999;
          const street = streets[i % streets.length];
          const city = cities[i % cities.length];
          const state = states[i % states.length];
          const zip = zips[i % zips.length];
          
          results[platform].push(`REALT-${address}-${street}-${city}-${state}-${zip}`);
        }
      }
    }
  }

  return results;
}

export function getAllAssetIds(): Record<PlatformType, string[]> {
  return generateAssetIds();
}

if (require.main === module) {
  const assetIds = generateAssetIds();
  
  console.log("Generated Asset IDs:");
  for (const [platform, ids] of Object.entries(assetIds)) {
    console.log(`\n${platform.toUpperCase()} (${ids.length} assets):`);
    ids.slice(0, 10).forEach((id, index) => {
      console.log(`  ${index + 1}. ${id}`);
    });
    if (ids.length > 10) {
      console.log(`  ... and ${ids.length - 10} more`);
    }
  }
  
  console.log(`\nTotal assets: ${Object.values(assetIds).reduce((sum, ids) => sum + ids.length, 0)}`);
}