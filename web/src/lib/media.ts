/**
 * Official F1 2026 Cloudinary assets (media.formula1.com).
 * Prefer these over OpenF1 DAM `.transform/1col/` headshots.
 */

const CLOUDINARY_BASE =
  "https://media.formula1.com/image/upload";

const DRIVER_FALLBACK =
  "d_common:f1:2026:fallback:driver:2026fallbackdriverright.webp";

/** OpenF1 / Jolpica team names → Cloudinary folder slug. */
const TEAM_SLUG_BY_NAME: Record<string, string> = {
  mercedes: "mercedes",
  "red bull racing": "redbullracing",
  "red bull": "redbullracing",
  ferrari: "ferrari",
  mclaren: "mclaren",
  alpine: "alpine",
  "alpine f1 team": "alpine",
  "racing bulls": "racingbulls",
  rb: "racingbulls",
  "rb f1 team": "racingbulls",
  "visa cash app rb": "racingbulls",
  "aston martin": "astonmartin",
  williams: "williams",
  "haas f1 team": "haas",
  haas: "haas",
  "kick sauber": "audi",
  sauber: "audi",
  audi: "audi",
  cadillac: "cadillac",
  "cadillac f1 team": "cadillac",
};

/** Jolpica constructorId → Cloudinary folder slug. */
const TEAM_SLUG_BY_CONSTRUCTOR: Record<string, string> = {
  mercedes: "mercedes",
  red_bull: "redbullracing",
  ferrari: "ferrari",
  mclaren: "mclaren",
  alpine: "alpine",
  rb: "racingbulls",
  visa_rb: "racingbulls",
  aston_martin: "astonmartin",
  williams: "williams",
  haas: "haas",
  sauber: "audi",
  kick_sauber: "audi",
  audi: "audi",
  cadillac: "cadillac",
};

/**
 * Manual Cloudinary refs for drivers missing / incomplete in OpenF1 latest.
 * team = Cloudinary folder slug.
 */
const DRIVER_CATALOG: Record<
  string,
  { ref: string; team: string }
> = {
  CAM: { ref: "rafcam01", team: "haas" },
  OCO: { ref: "estoco01", team: "haas" },
  TSU: { ref: "yuktsu01", team: "racingbulls" },
  HIR: { ref: "ryohir01", team: "haas" },
};

/** Jolpica driverId → acronym for catalog lookup. */
const DRIVER_ID_TO_CODE: Record<string, string> = {
  ocon: "OCO",
  tsunoda: "TSU",
  ryo_hirakawa: "HIR",
  camara: "CAM",
};

export type DriverMediaInput = {
  headshot_url?: string | null;
  team_name?: string | null;
  name_acronym?: string | null;
  constructorId?: string | null;
  driverId?: string | null;
};

export function teamSlugFromName(teamName: string | null | undefined): string | null {
  if (!teamName) return null;
  return TEAM_SLUG_BY_NAME[teamName.trim().toLowerCase()] ?? null;
}

export function teamSlugFromConstructorId(
  constructorId: string | null | undefined,
): string | null {
  if (!constructorId) return null;
  return TEAM_SLUG_BY_CONSTRUCTOR[constructorId] ?? null;
}

/** Extract `lannor01` from OpenF1 DAM URLs like `.../LANNOR01_Lando_Norris...`. */
export function driverRefFromHeadshot(
  url: string | null | undefined,
): string | null {
  if (!url) return null;
  const match = url.match(/\/([A-Za-z0-9]{6,})_[^/]+/i);
  return match?.[1]?.toLowerCase() ?? null;
}

function catalogEntry(driver: DriverMediaInput) {
  const code =
    driver.name_acronym?.toUpperCase() ??
    (driver.driverId ? DRIVER_ID_TO_CODE[driver.driverId] : undefined);
  if (!code) return null;
  return DRIVER_CATALOG[code] ?? null;
}

export function resolveDriverRef(driver: DriverMediaInput): string | null {
  const fromUrl = driverRefFromHeadshot(driver.headshot_url);
  if (fromUrl) return fromUrl;
  return catalogEntry(driver)?.ref ?? null;
}

function resolveTeamSlug(driver: DriverMediaInput): string | null {
  return (
    teamSlugFromName(driver.team_name) ??
    teamSlugFromConstructorId(driver.constructorId) ??
    catalogEntry(driver)?.team ??
    null
  );
}

/** Official 2026 right-facing driver portrait. */
export function cloudinaryDriverPortrait(
  driver: DriverMediaInput,
  width = 800,
): string | null {
  const team = resolveTeamSlug(driver);
  const ref = resolveDriverRef(driver);
  if (!team || !ref) return null;
  const w = Math.min(Math.max(Math.round(width), 64), 1600);
  // c_fit keeps the full right-facing portrait; CSS object-position does the crop.
  return (
    `${CLOUDINARY_BASE}/c_fit,w_${w}/q_auto/${DRIVER_FALLBACK}` +
    `/v1740000001/common/f1/2026/${team}/${ref}/2026${team}${ref}right.webp`
  );
}

/** Merge OpenF1 row + Jolpica standing fields so catalog drivers still resolve. */
export function mediaFromStanding(opts: {
  of1?: DriverMediaInput | null;
  code?: string | null;
  driverId?: string | null;
  constructorId?: string | null;
  constructorName?: string | null;
}): DriverMediaInput {
  return {
    headshot_url: opts.of1?.headshot_url ?? null,
    team_name: opts.of1?.team_name ?? opts.constructorName ?? null,
    name_acronym:
      opts.of1?.name_acronym ?? opts.code ?? null,
    constructorId: opts.constructorId ?? opts.of1?.constructorId ?? null,
    driverId: opts.driverId ?? opts.of1?.driverId ?? null,
  };
}

/**
 * Local team logos under /public/logos.
 * *-w = white mark, *-c = color mark (filenames unique so next/image can't serve stale).
 */
const LOCAL_LOGO_BY_CONSTRUCTOR: Record<string, string> = {
  mercedes: "/logos/mercedes-w.webp",
  ferrari: "/logos/ferrari-c.webp",
  red_bull: "/logos/red_bull-w.webp",
  mclaren: "/logos/mclaren-w.webp",
  alpine: "/logos/alpine-w.webp",
  rb: "/logos/rb-w.webp",
  visa_rb: "/logos/rb-w.webp",
  aston_martin: "/logos/aston_martin-w.webp",
  williams: "/logos/williams-w.webp",
  haas: "/logos/haas-c.webp",
  audi: "/logos/audi-c.webp",
  cadillac: "/logos/cadillac-w.webp",
  sauber: "/logos/audi-c.webp",
  kick_sauber: "/logos/audi-c.webp",
};

/** Team logo — local color mark first, else Cloudinary white. */
export function cloudinaryTeamLogo(
  opts: {
    teamName?: string | null;
    constructorId?: string | null;
    width?: number;
    /** Force remote white logo (for dark chrome chips). */
    variant?: "auto" | "white" | "color";
  },
): string | null {
  const id = opts.constructorId ?? null;
  const variant = opts.variant ?? "auto";

  if (variant !== "white" && id && LOCAL_LOGO_BY_CONSTRUCTOR[id]) {
    return LOCAL_LOGO_BY_CONSTRUCTOR[id]!;
  }

  const team =
    teamSlugFromName(opts.teamName) ??
    teamSlugFromConstructorId(opts.constructorId);
  if (!team) return null;
  const w = Math.min(Math.max(Math.round(opts.width ?? 128), 32), 512);
  const suffix = variant === "color" ? "logo" : "logowhite";
  return (
    `${CLOUDINARY_BASE}/c_fit,w_${w}/q_auto:best` +
    `/v1740000001/common/f1/2026/${team}/2026${team}${suffix}.webp`
  );
}

const CAR_FALLBACK = "d_common:f1:2026:fallback:car:2026fallbackcarright.webp";

/** Official 2026 side-profile car render. */
export function cloudinaryTeamCar(
  opts: {
    teamName?: string | null;
    constructorId?: string | null;
    width?: number;
  },
): string | null {
  const team =
    teamSlugFromName(opts.teamName) ??
    teamSlugFromConstructorId(opts.constructorId);
  if (!team) return null;
  const w = Math.min(Math.max(Math.round(opts.width ?? 1200), 200), 2000);
  // Light trim of soft under-car shadow only — keep full wheels/floor.
  return (
    `${CLOUDINARY_BASE}/c_fit,w_${w}/c_crop,g_north,w_1.0,h_0.95/q_auto/${CAR_FALLBACK}` +
    `/v1740000001/common/f1/2026/${team}/2026${team}carright.webp`
  );
}

/**
 * Best available driver image: Cloudinary 2026 portrait, else upgraded OpenF1 DAM.
 * Pass a driver object when possible; plain URL still upgrades legacy DAM transforms.
 */
export function fullDriverImage(
  input: string | DriverMediaInput | null | undefined,
): string | null {
  if (!input) return null;

  if (typeof input === "object") {
    return (
      cloudinaryDriverPortrait(input) ??
      upgradeDamHeadshot(input.headshot_url) ??
      null
    );
  }

  if (input.includes("/image/upload/") && input.includes("media.formula1.com")) {
    return input;
  }

  // Legacy DAM URL alone — strip tiny 1col transform as last resort.
  return upgradeDamHeadshot(input);
}

function upgradeDamHeadshot(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    let path = u.pathname;
    path = path.replace(/\.transform\/[^/]+\/image\.png$/i, "");
    path = path.replace(/\.transform\/[^/]+\/$/i, "");
    path = path.replace(/^\/d_driver_fallback_image\.png\//i, "/");
    u.pathname = path;
    u.search = "";
    u.hash = "";
    return u.toString();
  } catch {
    return url
      .replace(/\.transform\/[^/]+\/image\.png$/i, "")
      .replace(/\/d_driver_fallback_image\.png\//i, "/");
  }
}

/** @deprecated use fullDriverImage */
export function largerHeadshot(
  url: string | null | undefined,
): string | null {
  return fullDriverImage(url);
}

/** @deprecated use fullDriverImage */
export function heroHeadshot(url: string | null | undefined): string | null {
  return fullDriverImage(url);
}
