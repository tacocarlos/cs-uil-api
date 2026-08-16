/**
 * Sanity-checks the editor syntax palette for readability.
 *
 * A near-monochrome palette risks tokens that look tasteful but are hard to
 * read. This converts the oklch values from globals.css to sRGB and reports
 * WCAG contrast against the actual field background in each theme.
 *
 * Run: bun run scripts/check-code-contrast.ts
 */

type Rgb = [number, number, number];

function oklchToLinearSrgb(L: number, C: number, Hdeg: number): Rgb {
  const h = (Hdeg * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;

  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

const clamp = (v: number) => Math.min(1, Math.max(0, v));

function encode(c: number): number {
  const v = clamp(c);
  return v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;
}

function oklchToSrgb(L: number, C: number, H: number): Rgb {
  return oklchToLinearSrgb(L, C, H).map(encode) as Rgb;
}

/** Composite `fg` over `bg` at `alpha` (both gamma-encoded sRGB 0..1). */
function over(fg: Rgb, bg: Rgb, alpha: number): Rgb {
  return fg.map((c, i) => c * alpha + bg[i]! * (1 - alpha)) as Rgb;
}

function luminance([r, g, b]: Rgb): number {
  const lin = (c: number) =>
    c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrast(a: Rgb, b: Rgb): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

// ── Background: the editor is an off-black well (--code-bg) in both themes ───
// So there is a single palette to check, not one per site theme.
const codeBg = oklchToSrgb(0.235, 0, 0);

type Token = [name: string, L: number, C: number, H: number];

const tokens: Token[] = [
  ["keyword", 0.7, 0.19, 25],
  ["string", 0.79, 0.11, 252],
  ["number", 0.86, 0.09, 252],
  ["type", 0.91, 0.025, 258],
  ["function", 0.87, 0.03, 258],
  ["variable  (var --code-fg)", 0.985, 0, 0],
  ["comment", 0.708, 0, 0],
  // color-mix(in oklch, --code-fg 65%, --code-comment)
  // => 0.65*0.985 + 0.35*0.708
  ["operator  (mix fg/comment)", 0.888, 0, 0],
  ["invalid", 0.704, 0.191, 22.216],
];

// 4.5 = WCAG AA for normal text; 3.0 = AA for large/bold. Code is small, so
// 4.5 is the bar we want, and anything under 3.0 is a real problem.
function report(label: string, bg: Rgb, tokens: Token[]) {
  console.log(`\n── ${label} ──`);
  console.log(`background: rgb(${bg.map((c) => Math.round(c * 255)).join(", ")})`);

  let warnings = 0;
  for (const [name, L, C, H] of tokens) {
    const ratio = contrast(oklchToSrgb(L, C, H), bg);
    const verdict =
      ratio >= 4.5 ? "AA  " : ratio >= 3 ? "AA-lg" : "FAIL";
    if (ratio < 4.5) warnings++;
    console.log(`  ${verdict}  ${ratio.toFixed(2).padStart(5)}:1  ${name}`);
  }
  return warnings;
}

const issues = report("Editor well (--code-bg, both site themes)", codeBg, tokens);

console.log(
  issues === 0
    ? "\nAll tokens meet WCAG AA (4.5:1) for small text."
    : `\n${issues} token(s) below 4.5:1 — review above.`,
);
