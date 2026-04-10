// Per-person yarn color maps, transcribed from the physical color cards.
// Each person has a unique set of yarn colors assigned to temperature ranges,
// plus special colors for rain, snow, special occasions, and borders.

export interface YarnColorEntry {
  label: string;       // yarn color name
  hex: string;         // approximate hex color sampled from the yarn
  textHex?: string;    // contrasting text color (defaults to white or black based on luminance)
}

export interface PersonColorMap {
  temperature: {
    range: string;     // e.g. "< 20", "20-29", "30-39", ... "> 90"
    minF?: number;     // inclusive lower bound (undefined = -Infinity)
    maxF?: number;     // exclusive upper bound (undefined = +Infinity)
    yarn: YarnColorEntry;
  }[];
  rain: YarnColorEntry;
  snow: YarnColorEntry;
  special: YarnColorEntry;
  border: YarnColorEntry;
}

// ── Valerie (Somerville, MA) ────────────────────────────────────────────────
const valerie: PersonColorMap = {
  temperature: [
    { range: '< 20',  maxF: 20,  yarn: { label: 'Deep Purple',      hex: '#4B0082' } },
    { range: '20-29', minF: 20,  maxF: 30, yarn: { label: 'English Lavender', hex: '#B8A9C9' } },
    { range: '30-39', minF: 30,  maxF: 40, yarn: { label: 'Blue Sky',         hex: '#6699CC' } },
    { range: '40-49', minF: 40,  maxF: 50, yarn: { label: 'Patina',           hex: '#669999' } },
    { range: '50-59', minF: 50,  maxF: 60, yarn: { label: 'Peapod',           hex: '#76A54A' } },
    { range: '60-69', minF: 60,  maxF: 70, yarn: { label: 'Lemon Drop',       hex: '#F0D040' } },
    { range: '70-79', minF: 70,  maxF: 80, yarn: { label: 'Redtail',          hex: '#CC5500' } },
    { range: '80-89', minF: 80,  maxF: 90, yarn: { label: 'Strawberry',       hex: '#C41E3A' } },
    { range: '> 90',  minF: 90,            yarn: { label: 'Hollyberry',       hex: '#8B1A2B' } },
  ],
  rain:    { label: 'Cobalt Blue', hex: '#0047AB' },
  snow:    { label: 'Silver',      hex: '#C0C0C0' },
  special: { label: 'Gold',        hex: '#CFB53B' },
  border:  { label: 'White',       hex: '#FFFFFF' },
};

// ── Haley (Windham, NH) ─────────────────────────────────────────────────────
const haley: PersonColorMap = {
  temperature: [
    { range: '< 20',  maxF: 20,  yarn: { label: 'Deep Purple',        hex: '#4B0082' } },
    { range: '20-29', minF: 20,  maxF: 30, yarn: { label: 'English Lavender',   hex: '#B8A9C9' } },
    { range: '30-39', minF: 30,  maxF: 40, yarn: { label: 'Electric Blue',      hex: '#00B4D8' } },
    { range: '40-49', minF: 40,  maxF: 50, yarn: { label: 'Patina',             hex: '#669999' } },
    { range: '50-59', minF: 50,  maxF: 60, yarn: { label: 'Everglade Heather',  hex: '#0E6655' } },
    { range: '60-69', minF: 60,  maxF: 70, yarn: { label: 'Lemon Drop',         hex: '#F0D040' } },
    { range: '70-79', minF: 70,  maxF: 80, yarn: { label: 'Redtail',            hex: '#CC5500' } },
    { range: '80-89', minF: 80,  maxF: 90, yarn: { label: 'Strawberry',         hex: '#C41E3A' } },
    { range: '> 90',  minF: 90,            yarn: { label: 'Horchata',           hex: '#F5E6D3' } },
  ],
  rain:    { label: 'Cobalt Blue',    hex: '#0047AB' },
  snow:    { label: 'Silver',         hex: '#C0C0C0' },
  special: { label: 'Gold',           hex: '#CFB53B' },
  border:  { label: 'Dove Heather',   hex: '#B0A8A0' },
};

// ── Ellie (Windham, NH) ─────────────────────────────────────────────────────
const ellie: PersonColorMap = {
  temperature: [
    { range: '< 20',  maxF: 20,  yarn: { label: 'Hazy Violet',       hex: '#7B6B8A' } },
    { range: '20-29', minF: 20,  maxF: 30, yarn: { label: 'Dogwood Heather',  hex: '#D1909E' } },
    { range: '30-39', minF: 30,  maxF: 40, yarn: { label: 'Sapphire Heather', hex: '#2B4570' } },
    { range: '40-49', minF: 40,  maxF: 50, yarn: { label: 'Outlaw',           hex: '#1B4D5C' } },
    { range: '50-59', minF: 50,  maxF: 60, yarn: { label: 'Patina',           hex: '#669999' } },
    { range: '60-69', minF: 60,  maxF: 70, yarn: { label: 'Peapod',           hex: '#5A8B3A' } },
    { range: '70-79', minF: 70,  maxF: 80, yarn: { label: 'Blue Sky',         hex: '#6699CC' } },
    { range: '80-89', minF: 80,  maxF: 90, yarn: { label: 'Strawberry',       hex: '#C41E3A' } },
    { range: '> 90',  minF: 90,            yarn: { label: 'Hollyberry',       hex: '#8B1A2B' } },
  ],
  rain:    { label: 'Cobalt Blue', hex: '#0047AB' },
  snow:    { label: 'Silver',      hex: '#C0C0C0' },
  special: { label: 'Pink',        hex: '#E05080' },
  border:  { label: 'White',       hex: '#FFFFFF' },
};

// ── Audrey (Windham, NH) ────────────────────────────────────────────────────
const audrey: PersonColorMap = {
  temperature: [
    { range: '< 20',  maxF: 20,  yarn: { label: 'Duchess Heather',  hex: '#5B3A6B' } },
    { range: '20-29', minF: 20,  maxF: 30, yarn: { label: 'English Lavender', hex: '#B8A9C9' } },
    { range: '30-39', minF: 30,  maxF: 40, yarn: { label: 'Blue Sky',         hex: '#6699CC' } },
    { range: '40-49', minF: 40,  maxF: 50, yarn: { label: 'Electric Blue',    hex: '#00B4D8' } },
    { range: '50-59', minF: 50,  maxF: 60, yarn: { label: 'Patina',           hex: '#669999' } },
    { range: '60-69', minF: 60,  maxF: 70, yarn: { label: 'Peapod',           hex: '#76A54A' } },
    { range: '70-79', minF: 70,  maxF: 80, yarn: { label: 'Lemon Drop',       hex: '#F0D040' } },
    { range: '80-89', minF: 80,  maxF: 90, yarn: { label: 'Redtail',          hex: '#CC5500' } },
    { range: '> 90',  minF: 90,            yarn: { label: 'Strawberry',       hex: '#C41E3A' } },
  ],
  rain:    { label: 'Cobalt Blue', hex: '#0047AB' },
  snow:    { label: 'Silver',      hex: '#C0C0C0' },
  special: { label: 'Gold',        hex: '#CFB53B' },
  border:  { label: 'Navy',        hex: '#1B2640' },
};

// ── Liz (Concord, MA) ──────────────────────────────────────────────────────
const liz: PersonColorMap = {
  temperature: [
    { range: '< 20',  maxF: 20,  yarn: { label: 'Deep Purple',      hex: '#4B0082' } },
    { range: '20-29', minF: 20,  maxF: 30, yarn: { label: 'English Lavender', hex: '#B8A9C9' } },
    { range: '30-39', minF: 30,  maxF: 40, yarn: { label: 'Blue Sky',         hex: '#6699CC' } },
    { range: '40-49', minF: 40,  maxF: 50, yarn: { label: 'Electric Blue',    hex: '#00B4D8' } },
    { range: '50-59', minF: 50,  maxF: 60, yarn: { label: 'Patina',           hex: '#669999' } },
    { range: '60-69', minF: 60,  maxF: 70, yarn: { label: 'Peapod',           hex: '#76A54A' } },
    { range: '70-79', minF: 70,  maxF: 80, yarn: { label: 'Melon',            hex: '#FEBAAD' } },
    { range: '80-89', minF: 80,  maxF: 90, yarn: { label: 'Dogwood Heather',  hex: '#D1909E' } },
    { range: '> 90',  minF: 90,            yarn: { label: 'Pucker',           hex: '#E0308A' } },
  ],
  rain:    { label: 'Cobalt Blue', hex: '#0047AB' },
  snow:    { label: 'Silver',      hex: '#C0C0C0' },
  special: { label: 'Pink',        hex: '#E05080' },
  border:  { label: 'Navy',        hex: '#1B2640' },
};

// ── Lookup by person name (case-insensitive) ────────────────────────────────
const COLOR_MAPS: Record<string, PersonColorMap> = {
  valerie,
  haley,
  ellie,
  audrey,
  liz,
};

export function getPersonColorMap(name: string): PersonColorMap | undefined {
  return COLOR_MAPS[name.toLowerCase()];
}

/** Return the yarn color entry for a given high temperature. */
export function getYarnForTemp(map: PersonColorMap, highTempF: number): YarnColorEntry {
  for (const entry of map.temperature) {
    const aboveMin = entry.minF == null || highTempF >= entry.minF;
    const belowMax = entry.maxF == null || highTempF < entry.maxF;
    if (aboveMin && belowMax) return entry.yarn;
  }
  // Fallback: last entry (> 90)
  return map.temperature[map.temperature.length - 1].yarn;
}

/** Return a contrasting text color (black or white) for a given hex background. */
export function contrastText(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  // Relative luminance (sRGB)
  const L = 0.299 * r + 0.587 * g + 0.114 * b;
  return L > 150 ? '#000000' : '#FFFFFF';
}

/** Return the full yarn color entry including precipitation overrides. */
export function getYarnForDay(
  map: PersonColorMap,
  highTempF: number,
  rained: boolean,
  snowed: boolean,
): { temp: YarnColorEntry; precipitation?: YarnColorEntry } {
  const temp = getYarnForTemp(map, highTempF);
  const precipitation = snowed ? map.snow : rained ? map.rain : undefined;
  return { temp, precipitation };
}
