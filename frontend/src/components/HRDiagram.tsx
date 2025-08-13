// frontend/src/components/HRDiagram.tsx
import React, { useEffect, useRef } from 'react';
import type { StarRow } from '../types';

type Props = {
  stars: StarRow[];
  width?: number;
  height?: number;
  xRange?: [number, number];  // BP−RP domain
  yRange?: [number, number];  // G mag domain (order-agnostic; smaller mag plots higher)
  title?: string;
  subtitle?: string;
};

export default function HRDiagram({
  stars,
  width = 520,
  height = 520,
  xRange = [-0.5, 3.5],
  yRange = [21, 10], // default shows bright-at-top
  title = 'H–R Diagram',
  subtitle = '(Gaia G vs BP−RP)',
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // layout
    const margin = { top: 50, right: 18, bottom: 40, left: 52 };
    const plotW = width - margin.left - margin.right;
    const plotH = height - margin.top - margin.bottom;

    // clear bg
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, width, height);

    // order-agnostic ranges
    const xMin = Math.min(xRange[0], xRange[1]);
    const xMax = Math.max(xRange[0], xRange[1]);
    const yMin = Math.min(yRange[0], yRange[1]);
    const yMax = Math.max(yRange[0], yRange[1]);

    const xScale = (v: number) => margin.left + ((v - xMin) / (xMax - xMin)) * plotW;
    // invert Y so smaller mags are higher
    const yScale = (v: number) =>
  margin.top + ((v - yMin) / (yMax - yMin)) * plotH;

    // grid + ticks
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;

    // X ticks
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillStyle = '#bbb';
    const xTicks = 9;
    for (let i = 0; i <= xTicks; i++) {
      const t = xMin + ((xMax - xMin) * i) / xTicks;
      const px = xScale(t);
      ctx.globalAlpha = 0.35;
      ctx.beginPath(); ctx.moveTo(px, margin.top); ctx.lineTo(px, margin.top + plotH); ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillText(t.toFixed(1), px, margin.top + plotH + 6);
    }

    // Y ticks
    const yTicks = 11;
    for (let i = 0; i <= yTicks; i++) {
      const t = yMin + ((yMax - yMin) * i) / yTicks;
      const py = yScale(t);
      ctx.globalAlpha = 0.35;
      ctx.beginPath(); ctx.moveTo(margin.left, py); ctx.lineTo(margin.left + plotW, py); ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      ctx.fillText(t.toFixed(0), margin.left - 8, py);
    }

    // titles & labels
    ctx.fillStyle = '#ddd';
    ctx.font = '700 18px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(title, margin.left, 24);
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText(subtitle, margin.left, 40);

    ctx.font = '14px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Color index BP−RP', margin.left + plotW / 2, height - 8);

    ctx.save();
    ctx.translate(18, margin.top + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Mean magnitude G (brighter ↑)', 0, 0);
    ctx.restore();

    // color helper (blue→yellow→red)
    const colorFor = (c: number) => {
      const t = Math.max(0, Math.min(1, (c - xMin) / (xMax - xMin)));
      const r = Math.round(255 * Math.min(1, Math.max(0, (t - 0.4) / 0.6)));
      const g = Math.round(255 * Math.min(1, Math.max(0, t)));
      const b = Math.round(255 * (1 - t));
      return `rgba(${r},${g},${b},0.85)`;
    };

    // plot points
    let count = 0;
    stars.forEach((s) => {
      const c = s.bp_rp as number | null | undefined;
      const g = s.phot_g_mean_mag as number | null | undefined;
      if (c == null || g == null) return;
      if (!Number.isFinite(c) || !Number.isFinite(g)) return;

      if (c < xMin || c > xMax) return;
      if (g < yMin || g > yMax) return;

      const px = xScale(c);
      const py = yScale(g);

      ctx.fillStyle = colorFor(c);
      // make bright stars slightly larger
      const radius = Math.max(0.6, 2.2 - 0.12 * Math.max(0, 12 - g));
      ctx.beginPath();
      ctx.arc(px, py, radius, 0, Math.PI * 2);
      ctx.fill();

      count++;
    });

    // count badge
    ctx.fillStyle = 'rgba(240,240,240,0.85)';
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 1;
    const badge = `Stars plotted: ${count.toLocaleString()}`;
    ctx.font = '12px system-ui, sans-serif';
    const w = ctx.measureText(badge).width + 14;
    const bx = margin.left + 8, by = margin.top + 8;
    ctx.fillRect(bx, by, w, 22);
    ctx.strokeRect(bx, by, w, 22);
    ctx.fillStyle = '#111';
    ctx.fillText(badge, bx + 7, by + 16);
  }, [stars, width, height, xRange, yRange, title, subtitle]);

  return (
    <div style={{ display: 'inline-block', background: '#111', borderRadius: 8 }}>
      <canvas ref={canvasRef} />
    </div>
  );
}
