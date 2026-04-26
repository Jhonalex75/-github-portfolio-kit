'use client';

// ─── High-fidelity SVG logo imitations ───────────────────────────────────────
// Used in PDF blob HTML (<img src={dataUrl}>) and as styled references in Excel.
// Colors match the official brand palettes from the provided images.

export const SGS_ETSA_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="72" viewBox="0 0 240 72">
  <rect width="240" height="72" fill="white"/>
  <!-- SGS wordmark -->
  <text x="6" y="52"
    font-family="'Arial Black','Impact',Arial,sans-serif"
    font-weight="900" font-size="44" fill="#5A5A5A" letter-spacing="-1">SGS</text>
  <!-- Orange vertical separator bar -->
  <rect x="106" y="6" width="4" height="56" fill="#E8651A" rx="1"/>
  <!-- Orange horizontal accent under SGS -->
  <rect x="6" y="61" width="94" height="3.5" fill="#E8651A" rx="1"/>
  <!-- ETSA wordmark -->
  <text x="120" y="42"
    font-family="'Arial Black','Impact',Arial,sans-serif"
    font-weight="900" font-size="30" fill="#5A5A5A">ETSA</text>
  <!-- ESTUDIOS TÉCNICOS subtitle -->
  <text x="120" y="59"
    font-family="Arial,sans-serif" font-size="10.5" fill="#E8651A"
    letter-spacing="0.07em">ESTUDIOS TÉCNICOS S.A.</text>
</svg>`;

export const ARIS_MINING_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="210" height="82" viewBox="0 0 210 82">
  <!-- Dark teal background -->
  <rect width="210" height="82" fill="#1A3F5B" rx="5"/>
  <!-- ── Mountain icon ── -->
  <!-- Arc / sunrise over peaks -->
  <path d="M81 36 A25 25 0 0 1 131 36"
    stroke="white" stroke-width="2.8" fill="none" stroke-linecap="round"/>
  <!-- Left peak (taller) -->
  <polyline points="70,56 97,18 122,50"
    stroke="white" stroke-width="2.8" fill="none"
    stroke-linejoin="round" stroke-linecap="round"/>
  <!-- Right peak (shorter, overlapping) -->
  <polyline points="90,56 112,32 134,56"
    stroke="white" stroke-width="2.4" fill="none"
    stroke-linejoin="round" stroke-linecap="round"/>
  <!-- ARIS MINING wordmark -->
  <text x="105" y="68"
    font-family="Arial,sans-serif" font-weight="bold" font-size="14"
    fill="white" text-anchor="middle" letter-spacing="0.16em">ARIS MINING</text>
  <!-- MARMATO subtitle -->
  <text x="105" y="79"
    font-family="Arial,sans-serif" font-size="9"
    fill="#90BBCF" text-anchor="middle" letter-spacing="0.28em">MARMATO</text>
</svg>`;

// ─── Converts an SVG string to a data URL safe for <img> src ─────────────────
export function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export const SGS_ETSA_DATA_URL   = svgToDataUrl(SGS_ETSA_SVG);
export const ARIS_MINING_DATA_URL = svgToDataUrl(ARIS_MINING_SVG);
