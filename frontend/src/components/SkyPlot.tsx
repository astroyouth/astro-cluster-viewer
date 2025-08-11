import React from 'react';
import type { GaiaConeResponse, StarRow } from '../types';

type Props = {
  data: GaiaConeResponse;
  fovArcmin: number; // radius (matches backend request)
  width?: number;
  height?: number;
};

export default function SkyPlot({ data, fovArcmin, width = 520, height = 520 }: Props) {
  const cx = width / 2;
  const cy = height / 2;
  const radiusPx = Math.min(cx, cy) - 8; // padding

  const ra0 = data.target.ra * (Math.PI / 180);
  const dec0 = data.target.dec * (Math.PI / 180);
  const cosDec0 = Math.cos(dec0);

  // scale: arcmin -> pixels
  const scale = (arcmin: number) => (arcmin / fovArcmin) * radiusPx;

  // Map a star to x,y (pixels) from center
  function project(s: StarRow) {
    const ra = typeof s.ra === 'number' ? (s.ra * Math.PI) / 180 : NaN;
    const dec = typeof s.dec === 'number' ? (s.dec * Math.PI) / 180 : NaN;
    if (!Number.isFinite(ra) || !Number.isFinite(dec)) return null;

    const dx_arcmin = ((ra - ra0) * cosDec0) * (180 / Math.PI) * 60;
    const dy_arcmin = (dec - dec0) * (180 / Math.PI) * 60;

    const x = cx + scale(dx_arcmin);
    const y = cy - scale(dy_arcmin); // invert y so +Dec is up
    // Cull points outside the circle
    const dx = x - cx, dy = y - cy;
    if (dx * dx + dy * dy > radiusPx * radiusPx) return null;
    return { x, y };
  }

  // approximate visual magnitude to radius (smaller for fainter)
    function magToRadius(g?: number): number {
    if (typeof g !== 'number' || !Number.isFinite(g)) return 1.5;
    const r = 3.5 - (g - 8) * 0.25;   // safe now
    return Math.min(4, Math.max(0.6, r));
    }


  // crude color from BP-RP
  function colorFromBpRp(c?: number | null) {
    if (c == null || !Number.isFinite(c)) return '#ddddff';
    if (c < 0.0) return '#aaccff';
    if (c < 0.5) return '#bbd5ff';
    if (c < 1.0) return '#f0f0ff';
    if (c < 1.5) return '#ffe0b0';
    if (c < 2.0) return '#ffc89a';
    return '#ffb080';
  }

  return (
    <svg width={width} height={height} style={{ borderRadius: 12, background: '#0b0b0b', border: '1px solid #222' }}>
      {/* FoV circle */}
      <circle cx={cx} cy={cy} r={radiusPx} fill="#050505" stroke="#444" />
      {/* Minor reticle */}
      <line x1={cx - 6} y1={cy} x2={cx + 6} y2={cy} stroke="#333" />
      <line x1={cx} y1={cy - 6} x2={cx} y2={cy + 6} stroke="#333" />

      {data.stars.map((s, i) => {
        const p = project(s);
        if (!p) return null;
        const r = magToRadius(s.phot_g_mean_mag as number | undefined);
        const fill = colorFromBpRp(s.bp_rp as number | null);
        return <circle key={(s.source_id ?? i).toString()} cx={p.x} cy={p.y} r={r} fill={fill} />;
      })}

      {/* FoV label */}
      <text x={cx} y={height - 8} textAnchor="middle" fontSize={12} fill="#aaa">
        FoV radius {fovArcmin.toFixed(1)}′
      </text>
    </svg>
  );
}
