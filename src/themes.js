export const DEFAULT_THEME_KEY = "default";

export const THEMES = [
  { key: DEFAULT_THEME_KEY, label: "Default" },
  { key: "quiet-herbarium", label: "Quiet Herbarium" },
  { key: "plum-banana", label: "Plum & Banana" },
  { key: "still-morning", label: "Still Morning" },
  { key: "wild-meadow", label: "Wild Meadow" },
  { key: "midnight-reliquary", label: "Midnight Reliquary" }
];

export const THEME_KEYS = THEMES.map((t) => t.key);
