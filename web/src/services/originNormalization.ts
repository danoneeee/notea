export const CHINA_COUNTRY = 'Китай';
export const TAIWAN_REGION = 'Тайвань';

function clean(value: string | null | undefined) {
  return String(value ?? '').trim();
}

export function normalizeTeaOrigin(countryRaw: string | null | undefined, originRegionRaw: string | null | undefined, regionRaw?: string | null | undefined) {
  let country = clean(countryRaw);
  let originRegion = clean(originRegionRaw);
  let region = clean(regionRaw);

  if (country === TAIWAN_REGION) {
    country = CHINA_COUNTRY;
    originRegion = originRegion || TAIWAN_REGION;
  }

  if (!country && (originRegion === TAIWAN_REGION || region === TAIWAN_REGION)) {
    country = CHINA_COUNTRY;
    originRegion = originRegion || TAIWAN_REGION;
  }

  if (country === CHINA_COUNTRY && !originRegion && region === TAIWAN_REGION) {
    originRegion = TAIWAN_REGION;
  }

  if (!country && region && region !== TAIWAN_REGION) {
    country = region;
  }

  region = originRegion || country;

  return {
    country,
    originRegion,
    region,
  };
}
