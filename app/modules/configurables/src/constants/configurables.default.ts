/*
 * Default Configurable Data — seeded into Mongo on first boot.
 *
 * BEFORE EDITING: read ./RULES.md (especially R5: schema and defaults must
 * stay in sync) and ./configurables.schema.ts. For per-type schema and
 * default-value samples, see RULES.md §5 "Field Type Reference".
 */

export type TBrandColor = {
  primary: string;
  secondary: string;
  accent: string;
};

export type TDefaultConfigurableData = {
  appName: string;
  logoUrl: string;
  brandColor: TBrandColor;
  tagline?: string;
  uploadCTALabel?: string;
  uploadPromptText?: string;
  analyzeButtonLabel?: string;
  heroImage?: string;
  footerText?: string;
};

export const defaultConfigurablesData: TDefaultConfigurableData = {
  appName: "FruitLens",
  logoUrl: "FILL_LOGO_URL_HERE",
  brandColor: {
    primary: "#4CAF50",
    secondary: "#FF9800",
    accent: "#FFF9C4",
  },
  tagline: "Identify any fruit and check its freshness instantly.",
  uploadCTALabel: "Upload a Photo",
  uploadPromptText: "Drag & drop a fruit photo here, or click to browse",
  analyzeButtonLabel: "Analyze Fruit",
  heroImage: "",
  footerText: "FruitLens — Know your fruit, trust your taste.",
};
