import { useState, useRef, useCallback } from "react";
import { invokeLLM } from "@qb/agentic";
import { useConfigurables } from "~/modules/configurables";

interface FruitAnalysisResult {
  fruitName: string;
  freshnessLevel: "fresh" | "moderate" | "poor";
  freshnessScore: number;
  description: string;
  tips: string;
}

const FRUIT_ANALYSIS_SCHEMA = {
  type: "object",
  properties: {
    fruitName: { type: "string" },
    freshnessLevel: { type: "string", enum: ["fresh", "moderate", "poor"] },
    freshnessScore: { type: "number" },
    description: { type: "string" },
    tips: { type: "string" },
  },
  required: ["fruitName", "freshnessLevel", "freshnessScore", "description", "tips"],
  additionalProperties: false,
};

const SYSTEM_PROMPT = `You are FruitLens, an expert fruit identification and freshness assessment AI.
When given an image, identify the fruit and assess its freshness/quality.
Always respond in JSON matching the exact schema provided.
- fruitName: The common name of the fruit (e.g. "Apple", "Mango", "Banana"). If no fruit is detected, say "Unknown".
- freshnessLevel: "fresh" (good quality, eat now), "moderate" (still okay, eat soon), or "poor" (overripe or spoiled).
- freshnessScore: A number from 0 to 100 (100 = perfect freshness, 0 = completely spoiled).
- description: 1-2 sentences describing what you see about the fruit and its condition.
- tips: 1 short actionable tip about this fruit's current state (storage, consumption, etc.).`;

const freshnessConfig = {
  fresh: {
    label: "Fresh",
    color: "#4CAF50",
    bg: "#E8F5E9",
    icon: "✓",
  },
  moderate: {
    label: "Moderate",
    color: "#FF9800",
    bg: "#FFF3E0",
    icon: "~",
  },
  poor: {
    label: "Poor",
    color: "#EF5350",
    bg: "#FFEBEE",
    icon: "!",
  },
};

export function FruitAnalyzer() {
  const { config, loading: configLoading } = useConfigurables();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [result, setResult] = useState<FruitAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const primaryColor = config?.brandColor?.primary ?? "#4CAF50";
  const secondaryColor = config?.brandColor?.secondary ?? "#FF9800";
  const accentColor = config?.brandColor?.accent ?? "#FFF9C4";
  const uploadPromptText = config?.uploadPromptText ?? "Drag & drop a fruit photo here, or click to browse";
  const uploadCTALabel = config?.uploadCTALabel ?? "Upload a Photo";
  const analyzeButtonLabel = config?.analyzeButtonLabel ?? "Analyze Fruit";

  const processFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file.");
      return;
    }
    setImageFile(file);
    setResult(null);
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!imageFile) return;
    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const output = await invokeLLM({
        message: "Please analyze this fruit image. Identify the fruit and assess its freshness/quality.",
        schema: FRUIT_ANALYSIS_SCHEMA,
        systemPrompt: SYSTEM_PROMPT,
        files: [imageFile],
      });

      if (output.status === "ERROR" || !output.response) {
        throw new Error(output.error ?? "Analysis failed. Please try again.");
      }

      const raw = output.response as Record<string, unknown>;
      setResult({
        fruitName: typeof raw.fruitName === "string" ? raw.fruitName : "Unknown",
        freshnessLevel:
          raw.freshnessLevel === "fresh" || raw.freshnessLevel === "moderate" || raw.freshnessLevel === "poor"
            ? raw.freshnessLevel
            : "moderate",
        freshnessScore: typeof raw.freshnessScore === "number" ? raw.freshnessScore : 50,
        description: typeof raw.description === "string" ? raw.description : "",
        tips: typeof raw.tips === "string" ? raw.tips : "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  }, [imageFile]);

  const handleReset = useCallback(() => {
    setImageFile(null);
    setImagePreview(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  if (configLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: "#FAFAFA" }}>
        <div
          className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin"
          style={{ borderColor: `${primaryColor} transparent transparent transparent` }}
        />
      </div>
    );
  }

  const freshness = result ? freshnessConfig[result.freshnessLevel] : null;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#FAFAFA", fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <header
        className="w-full px-6 py-4 flex items-center gap-3"
        style={{ background: "#FFFFFF", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-lg font-bold"
          style={{ background: primaryColor }}
        >
          F
        </div>
        <span className="text-xl font-bold" style={{ color: "#212121", letterSpacing: "-0.3px" }}>
          {config?.appName ?? "FruitLens"}
        </span>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center px-4 py-10 gap-8 max-w-lg mx-auto w-full">
        {/* Hero Section */}
        <div className="text-center">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 text-3xl"
            style={{ background: accentColor }}
          >
            🍊
          </div>
          <h1 className="text-3xl font-bold mb-2" style={{ color: "#212121" }}>
            {config?.appName ?? "FruitLens"}
          </h1>
          <p className="text-base" style={{ color: "#757575", lineHeight: 1.6 }}>
            {config?.tagline ?? "Identify any fruit and check its freshness instantly."}
          </p>
        </div>

        {/* Upload Zone */}
        {!imagePreview && (
          <div
            className="w-full rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-4 cursor-pointer transition-all duration-200 py-12 px-6"
            style={{
              borderColor: isDragOver ? primaryColor : "#D1D5DB",
              background: isDragOver ? `${primaryColor}08` : "#FFFFFF",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            }}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: accentColor }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <path
                  d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15"
                  stroke={primaryColor}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M17 8L12 3L7 8"
                  stroke={primaryColor}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M12 3V15"
                  stroke={primaryColor}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium" style={{ color: "#212121" }}>
                {uploadPromptText}
              </p>
              <p className="text-xs mt-1" style={{ color: "#9CA3AF" }}>
                JPG, PNG, WEBP up to 10MB
              </p>
            </div>
            <button
              type="button"
              className="px-6 py-2.5 rounded-full text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: primaryColor }}
            >
              {uploadCTALabel}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        )}

        {/* Image Preview + Analyze */}
        {imagePreview && !result && (
          <div className="w-full flex flex-col gap-4">
            <div
              className="w-full rounded-2xl overflow-hidden relative"
              style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
            >
              <img
                src={imagePreview}
                alt="Uploaded fruit"
                className="w-full max-h-72 object-cover"
              />
              <button
                type="button"
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white flex items-center justify-center text-gray-500 hover:text-gray-800 transition-colors"
                style={{ boxShadow: "0 2px 6px rgba(0,0,0,0.12)" }}
                onClick={handleReset}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {error && (
              <div
                className="w-full rounded-xl px-4 py-3 text-sm"
                style={{ background: "#FFEBEE", color: "#EF5350" }}
              >
                {error}
              </div>
            )}

            <button
              type="button"
              className="w-full py-3.5 rounded-full text-white font-semibold text-base transition-all hover:opacity-90 flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ background: isAnalyzing ? "#9CA3AF" : primaryColor }}
              onClick={handleAnalyze}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? (
                <>
                  <span
                    className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
                    style={{ borderColor: "rgba(255,255,255,0.8) transparent transparent transparent" }}
                  />
                  Analyzing...
                </>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <circle cx="11" cy="11" r="8" stroke="white" strokeWidth="2" />
                    <path d="M21 21L16.65 16.65" stroke="white" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  {analyzeButtonLabel}
                </>
              )}
            </button>
          </div>
        )}

        {/* Result Card */}
        {result && freshness && (
          <div className="w-full flex flex-col gap-4">
            {/* Image */}
            <div className="w-full rounded-2xl overflow-hidden" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
              <img
                src={imagePreview!}
                alt={result.fruitName}
                className="w-full max-h-60 object-cover"
              />
            </div>

            {/* Result Details */}
            <div
              className="w-full rounded-2xl p-6 flex flex-col gap-4"
              style={{ background: "#FFFFFF", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
            >
              {/* Fruit Name + Freshness Badge */}
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold" style={{ color: "#212121" }}>
                  {result.fruitName}
                </h2>
                <span
                  className="px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1"
                  style={{ background: freshness.bg, color: freshness.color }}
                >
                  <span className="font-bold">{freshness.icon}</span>
                  {freshness.label}
                </span>
              </div>

              {/* Freshness Score Bar */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium" style={{ color: "#757575" }}>
                    Freshness Score
                  </span>
                  <span className="text-sm font-bold" style={{ color: freshness.color }}>
                    {result.freshnessScore}/100
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full" style={{ background: "#F3F4F6" }}>
                  <div
                    className="h-2.5 rounded-full transition-all duration-500"
                    style={{
                      width: `${result.freshnessScore}%`,
                      background: freshness.color,
                    }}
                  />
                </div>
              </div>

              {/* Description */}
              <p className="text-sm leading-relaxed" style={{ color: "#424242" }}>
                {result.description}
              </p>

              {/* Tip */}
              <div
                className="rounded-xl px-4 py-3 flex gap-2 items-start"
                style={{ background: accentColor }}
              >
                <span className="text-base mt-0.5">💡</span>
                <p className="text-sm" style={{ color: "#5D4037" }}>
                  {result.tips}
                </p>
              </div>
            </div>

            {/* Analyze Another */}
            <button
              type="button"
              className="w-full py-3.5 rounded-full font-semibold text-base transition-all hover:opacity-90 border-2"
              style={{ borderColor: primaryColor, color: primaryColor, background: "transparent" }}
              onClick={handleReset}
            >
              Analyze Another Fruit
            </button>
          </div>
        )}

        {/* Error when no image */}
        {error && !imagePreview && (
          <div
            className="w-full rounded-xl px-4 py-3 text-sm"
            style={{ background: "#FFEBEE", color: "#EF5350" }}
          >
            {error}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center py-6 px-4">
        <p className="text-xs" style={{ color: "#BDBDBD" }}>
          {config?.footerText ?? "FruitLens — Know your fruit, trust your taste."}
        </p>
      </footer>
    </div>
  );
}
