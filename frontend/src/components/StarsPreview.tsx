// frontend/src/components/StarsPreview.tsx
import React from 'react';
import type { StarRow } from '../types';

type Props = {
  stars: StarRow[];
  maxRows?: number;
};

export default function StarsPreview({ stars, maxRows = 25 }: Props) {
  const rows = stars.slice(0, maxRows);

  if (!rows.length) {
    return <div style={{ fontSize: 14, opacity: 0.8 }}>No stars yet. Fetch to see results.</div>;
  }

  return (
    <div style={{ overflow: 'auto', border: '1px solid #eee', borderRadius: 8 }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
        <thead style={{ position: 'sticky', top: 0, background: '#413e3eff' }}>
          <tr>
            {['source_id','G','BP−RP','parallax','pmRA','pmDec','RUWE','var?'].map((h) => (
              <th key={h} style={{ textAlign: 'left', padding: '0.5rem 0.6rem', borderBottom: '1px solid #eee'}}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((s, i) => (
            <tr key={(s.source_id ?? i).toString()} style={{ borderBottom: '1px solid #f1f1f1' }}>
              <td style={{ padding: '0.4rem 0.6rem', whiteSpace: 'nowrap' }}>{s.source_id as React.ReactNode}</td>
              <td style={{ padding: '0.4rem 0.6rem' }}>{fmt(s.phot_g_mean_mag)}</td>
              <td style={{ padding: '0.4rem 0.6rem' }}>{fmt(s.bp_rp)}</td>
              <td style={{ padding: '0.4rem 0.6rem' }}>{fmt(s.parallax)}</td>
              <td style={{ padding: '0.4rem 0.6rem' }}>{fmt(s.pmra)}</td>
              <td style={{ padding: '0.4rem 0.6rem' }}>{fmt(s.pmdec)}</td>
              <td style={{ padding: '0.4rem 0.6rem' }}>{fmt(s.ruwe)}</td>
              <td style={{ padding: '0.4rem 0.6rem' }}>{s.phot_variable_flag ?? ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function fmt(v: unknown): React.ReactNode {
  if (typeof v === 'number') return Number.isFinite(v) ? v.toFixed(3) : '';
  if (v === null || v === undefined) return '';
  return String(v);
}
