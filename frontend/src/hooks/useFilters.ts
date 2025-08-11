// src/hooks/useFilters.ts
import { useMemo, useState } from 'react';
import type { StarRow } from '../types';

/* ---------- Public API ---------- */

export type FiltersState = {
  enabled: boolean;
  live: boolean;

  // quality / de-dup
  ruweMax: number;                 // RUWE ≤ ruweMax
  minVisibilityPeriods: number;    // visibility_periods_used ≥
  excludeDuplicates: boolean;      // duplicated_source === false

  // photometric gates
  gMax: number;       // phot_g_mean_mag ≤ gMax
  colorMin: number;   // bp_rp ≥
  colorMax: number;   // bp_rp ≤

  // kinematic membership
  innerCoreArcmin: number; // radius around center for estimating centroid
  kSigma: number;          // Mahalanobis kσ threshold
  useParallax: boolean;    // include parallax in distance

  // optional radial velocity window
  useRV: boolean;
  rvCenter?: number;       // km/s
  rvHalfWidth: number;     // km/s
};

export const defaultFilters: FiltersState = {
  enabled: true,
  live: true,

  ruweMax: 1.40,
  minVisibilityPeriods: 8,
  excludeDuplicates: true,

  gMax: 21.0,
  colorMin: -0.5,
  colorMax: 3.5,

  innerCoreArcmin: 2.0,
  kSigma: 3.0,
  useParallax: true,

  useRV: false,
  rvCenter: undefined,
  rvHalfWidth: 15,
};

export type FilterStats = {
  kept: number;
  removed: number;
  center: { pmra?: number; pmdec?: number; parallax?: number; nCore: number };
};

export function useFilters() {
  const [filters, setFilters] = useState<FiltersState>(defaultFilters);
  const recommended = defaultFilters;

  /**
   * Apply current filters to a star list.
   * @param stars Raw Gaia rows
   * @param centerSky ICRS center used to define the inner core (deg)
   */
  const applyFilters = useMemo(() => {
    return (stars: StarRow[], centerSky: { ra: number; dec: number }) => {
      if (!filters.enabled) {
        return {
          filtered: stars,
          stats: { kept: stars.length, removed: 0, center: { nCore: 0 } } as FilterStats,
        };
      }

      // 1) Basic quality & photometric gates (defensive about undefineds)
      const pre = stars.filter((s) => {
        // duplicates
        if (filters.excludeDuplicates && s.duplicated_source === true) return false;

        // RUWE
        if (!lteFinite(s.ruwe, filters.ruweMax)) return false;

        // visibility periods
        if (!gteFinite(s.visibility_periods_used, filters.minVisibilityPeriods)) return false;

        // G mag
        if (!lteFinite(s.phot_g_mean_mag, filters.gMax)) return false;

        // color window
        if (!withinFinite(s.bp_rp, filters.colorMin, filters.colorMax)) return false;

        return true;
      });

      // 2) Inner-core subset for centroid (require finite RA/Dec here only)
      const coreIdx = pre.filter((s) => {
        const ra = toFinite((s as any).ra);
        const dec = toFinite((s as any).dec);
        if (ra === undefined || dec === undefined) return false;
        const sep = sepArcmin(centerSky.ra, centerSky.dec, ra, dec);
        return isFiniteSafe(sep) && sep <= filters.innerCoreArcmin;
      });

      const centerPM = robustCenter(coreIdx, filters.useParallax);

      // 3) Robust diagonal sigmas from the prefiltered set
      const sig = robustSigmas(pre, centerPM, filters.useParallax);

      // 4) Kinematic keep (Mahalanobis distance with diagonal covariance)
      const k2 = filters.kSigma * filters.kSigma;
      const kinKept = pre.filter((s) => {
        const d2 = mahalanobisDiag(
          {
            pmra: toFinite(s.pmra),
            pmdec: toFinite(s.pmdec),
            parallax: filters.useParallax ? toFinite(s.parallax) : undefined,
          },
          centerPM,
          sig,
          filters.useParallax
        );
        return d2 !== undefined && d2 <= k2;
      });

      // 5) Optional radial velocity window
      const final =
        !filters.useRV || !isFiniteSafe(filters.rvCenter) || filters.rvHalfWidth <= 0
          ? kinKept
          : kinKept.filter((s) => {
              const rv = toFinite(s.radial_velocity);
              if (rv === undefined) return false;
              return Math.abs(rv - (filters.rvCenter as number)) <= filters.rvHalfWidth;
            });

      const stats: FilterStats = {
        kept: final.length,
        removed: stars.length - final.length,
        center: {
          pmra: centerPM.pmra,
          pmdec: centerPM.pmdec,
          parallax: centerPM.parallax,
          nCore: coreIdx.length,
        },
      };

      return { filtered: final, stats };
    };
  }, [filters]);

  const resetFilters = () => setFilters(defaultFilters);

  return { filters, setFilters, applyFilters, recommended, resetFilters };
}

/* ---------- Helpers ---------- */

// Finite coercions
function toFinite(x: unknown): number | undefined {
  const v = typeof x === 'string' ? Number(x) : (x as number);
  return Number.isFinite(v) ? v : undefined;
}
function isFiniteSafe(x: unknown): x is number {
  return Number.isFinite(typeof x === 'string' ? Number(x) : (x as number));
}
function lteFinite(x: unknown, limit: number): boolean {
  const v = toFinite(x);
  return v === undefined ? false : v <= limit;
}
function gteFinite(x: unknown, limit: number): boolean {
  const v = toFinite(x);
  return v === undefined ? false : v >= limit;
}
function withinFinite(x: unknown, a: number, b: number): boolean {
  const v = toFinite(x);
  if (v === undefined) return false;
  return v >= Math.min(a, b) && v <= Math.max(a, b);
}

// Great-circle separation (arcmin)
function sepArcmin(ra1: number, dec1: number, ra2: number, dec2: number): number {
  const d2r = Math.PI / 180;
  const r1 = ra1 * d2r, d1 = dec1 * d2r;
  const r2 = ra2 * d2r, d2 = dec2 * d2r;
  const s = Math.acos(
    clamp(-1, 1, Math.sin(d1) * Math.sin(d2) + Math.cos(d1) * Math.cos(d2) * Math.cos(r1 - r2))
  );
  return (s * 180 / Math.PI) * 60;
}
function clamp(min: number, max: number, v: number) {
  return Math.max(min, Math.min(max, v));
}

// Robust center from inner-core stars
function robustCenter(
  core: StarRow[],
  useParallax: boolean
): { pmra?: number; pmdec?: number; parallax?: number } {
  const pmra = median(core.map((s) => toFinite(s.pmra)).filter(isDef));
  const pmdec = median(core.map((s) => toFinite(s.pmdec)).filter(isDef));
  const parallax = useParallax
    ? median(core.map((s) => toFinite(s.parallax)).filter(isDef))
    : undefined;
  return { pmra, pmdec, parallax };
}

// Robust σ via IQR → σ ≈ IQR / 1.349 ; fallback to std
function robustSigma(values: number[]): number | undefined {
  if (values.length < 5) return std(values);
  const q = quartiles(values);
  const iqr = q.q3 - q.q1;
  const s = iqr / 1.349;
  return Number.isFinite(s) && s > 0 ? s : std(values);
}
function robustSigmas(
  stars: StarRow[],
  center: { pmra?: number; pmdec?: number; parallax?: number },
  useParallax: boolean
): { pmra?: number; pmdec?: number; parallax?: number } {
  const pmraVals = stars.map((s) => toFinite(s.pmra)).filter(isDef);
  const pmdecVals = stars.map((s) => toFinite(s.pmdec)).filter(isDef);
  const paraVals = useParallax ? stars.map((s) => toFinite(s.parallax)).filter(isDef) : [];

  const pmra = center.pmra !== undefined ? robustSigma(pmraVals) : undefined;
  const pmdec = center.pmdec !== undefined ? robustSigma(pmdecVals) : undefined;
  const parallax = useParallax && center.parallax !== undefined ? robustSigma(paraVals) : undefined;

  return {
    pmra: validSigma(pmra),
    pmdec: validSigma(pmdec),
    parallax: useParallax ? validSigma(parallax) : undefined,
  };
}
function validSigma(s?: number): number | undefined {
  if (s === undefined || !Number.isFinite(s) || s <= 0) return undefined;
  return s;
}

// Diagonal-covariance Mahalanobis distance
function mahalanobisDiag(
  v: { pmra?: number; pmdec?: number; parallax?: number },
  c: { pmra?: number; pmdec?: number; parallax?: number },
  sig: { pmra?: number; pmdec?: number; parallax?: number },
  useParallax: boolean
): number | undefined {
  if (v.pmra === undefined || v.pmdec === undefined || c.pmra === undefined || c.pmdec === undefined) {
    return undefined;
  }
  let d2 = 0;
  d2 += sig.pmra && sig.pmra > 0 ? ((v.pmra - c.pmra) ** 2) / (sig.pmra ** 2) : (v.pmra - c.pmra) ** 2;
  d2 += sig.pmdec && sig.pmdec > 0 ? ((v.pmdec - c.pmdec) ** 2) / (sig.pmdec ** 2) : (v.pmdec - c.pmdec) ** 2;

  if (useParallax && v.parallax !== undefined && c.parallax !== undefined) {
    d2 += sig.parallax && sig.parallax > 0
      ? ((v.parallax - c.parallax) ** 2) / (sig.parallax ** 2)
      : (v.parallax - c.parallax) ** 2;
  }
  return d2;
}

// Stats helpers
function median(arr: number[]): number | undefined {
  if (!arr.length) return undefined;
  const a = [...arr].sort((x, y) => x - y);
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}
function quartiles(arr: number[]) {
  const a = [...arr].sort((x, y) => x - y);
  const m = Math.floor(a.length / 2);
  const lower = a.slice(0, m);
  const upper = a.length % 2 ? a.slice(m + 1) : a.slice(m);
  return { q1: median(lower) ?? 0, q3: median(upper) ?? 0 };
}
function std(arr: number[] | undefined): number | undefined {
  if (!arr || arr.length < 2) return undefined;
  const mean = arr.reduce((s, v) => s + v, 0) / arr.length;
  const v = arr.reduce((s, x) => s + (x - mean) ** 2, 0) / (arr.length - 1);
  const s = Math.sqrt(v);
  return Number.isFinite(s) && s > 0 ? s : undefined;
}
function isDef<T>(x: T | undefined): x is T {
  return x !== undefined;
}
