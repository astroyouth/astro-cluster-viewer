// frontend/src/App.tsx
import { useMemo, useState } from 'react';
import Controls from './components/Controls';
import SkyPlot from './components/SkyPlot';
import StarsPreview from './components/StarsPreview';
import Modal from './components/Modal';
import FiltersPanel from './components/FiltersPanel';
import HRDiagram from './components/HRDiagram';
import { useFilters } from './hooks/useFilters';
import type { GaiaConeResponse } from './types';
import './index.css';

// If you run backend locally outside Docker, keep localhost.
// If you later reverse-proxy, set VITE_BACKEND_URL in .env.
const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

export default function App() {
  const [target, setTarget] = useState('M13');
  const [fov, setFov] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<GaiaConeResponse | null>(null);
  const [showTable, setShowTable] = useState(false);

  // Filters hook
  const { filters, setFilters, applyFilters, recommended } = useFilters();

  // Recompute filtered stars whenever raw data or filters change
  const result = useMemo(() => {
    if (!data) return null;
    return applyFilters(data.stars, { ra: data.target.ra, dec: data.target.dec });
  }, [data, filters, applyFilters]);

  const filteredStars = result?.filtered ?? [];
  const stats = result?.stats;

  async function fetchStars(nameOverride?: string) {
    const t = (nameOverride ?? target).trim();
    if (!t) {
      setError('Please enter or select a target name.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const url = `${BACKEND}/api/gaia-cone?name=${encodeURIComponent(t)}&radius_arcmin=${encodeURIComponent(fov)}&limit=0`;

      const res = await fetch(url);
      if (!res.ok) {
        const detail = await safeDetail(res);
        throw new Error(detail || `HTTP ${res.status}`);
      }
      const json = (await res.json()) as GaiaConeResponse;
      setData(json);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to fetch');
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  // When a target is selected from the picker (Controls will call onFetch)
  const handleFetch = () => fetchStars();

  return (
    <div style={{ width: 1400, maxWidth: '100%', margin: '0 auto', padding: '1.5rem' }}>
      <h1 style={{ marginBottom: '1rem' }}>Astro Cluster Viewer</h1>

      {/* Target & FoV controls */}
      <Controls
        target={target}
        setTarget={setTarget}
        fov={fov}
        setFov={setFov}
        loading={loading}
        onFetch={handleFetch}
      />

      {/* Filters panel (has its own enable/live toggles + info modals) */}
      <FiltersPanel filters={filters} setFilters={setFilters} />

      {/* Small toolbar: Reset to recommended + view table */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.75rem',
          alignItems: 'center',
          marginTop: '0.75rem',
        }}
      >
        <button
          onClick={() => setFilters((prev) => ({ ...recommended, live: prev.live }))}
          style={{
            padding: '6px 10px',
            borderRadius: 8,
            border: '1px solid #444',
            background: '#111',
            color: '#eee',
            cursor: 'pointer',
          }}
        >
          Reset filters to recommended
        </button>

        {data && (
          <button
            onClick={() => setShowTable(true)}
            style={{
              padding: '6px 10px',
              borderRadius: 8,
              border: '1px solid #444',
              background: '#222',
              color: '#eee',
              cursor: 'pointer',
            }}
          >
            View star table
          </button>
        )}
      </div>

      <div style={{ marginTop: '1rem' }}>
        {error && (
          <div
            style={{
              padding: '0.6rem 0.8rem',
              borderRadius: 8,
              background: '#fee',
              color: '#900',
              border: '1px solid #f6c',
            }}
          >
            {error}
          </div>
        )}

        {data && (
          <div style={{ marginTop: '0.75rem', display: 'grid', gap: '1rem' }}>
            {/* Summary row */}
            <div
              style={{
                fontSize: 14,
                opacity: 0.85,
                display: 'flex',
                gap: 12,
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              <span>
                Target <strong>{data.target.name}</strong> ({data.target.ra.toFixed(5)}, {data.target.dec.toFixed(5)})
                &nbsp;| FoV {data.radius_arcmin.toFixed(1)}′
                &nbsp;| Stars: total <strong>{data.count.toLocaleString()}</strong>, filtered{' '}
                <strong>{filteredStars.length.toLocaleString()}</strong>
              </span>
            </div>

            {/* Plots: SkyPlot + HRDiagram */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'start' }}>
              <SkyPlot data={{ ...data, stars: filteredStars }} fovArcmin={data.radius_arcmin} />
              <HRDiagram
                stars={filteredStars}
                title={`H–R Diagram — ${data.target.name}`}
                width={520}
                height={520}
                xRange={[-0.5, 4.0]}
                yRange={[10.0, 21.0]} // reversed order (bright at top) inside component
              />
            </div>

            {/* Optional kinematic stats */}
            {stats && (
              <div style={{ fontSize: 12, color: '#aaa' }}>
                Kinematic center μ = (
                {typeof stats.center?.pmra === 'number' && Number.isFinite(stats.center.pmra)
                  ? stats.center.pmra.toFixed(2)
                  : '—'}
                ,{' '}
                {typeof stats.center?.pmdec === 'number' && Number.isFinite(stats.center.pmdec)
                  ? stats.center.pmdec.toFixed(2)
                  : '—'}
                ) mas/yr
                {typeof stats.center?.parallax === 'number' && Number.isFinite(stats.center.parallax) ? (
                  <> , π ≈ {stats.center.parallax.toFixed(3)} mas</>
                ) : null}
                {typeof stats.nCore === 'number' ? <> | core N = {stats.nCore}</> : null}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal with the (filtered) star table */}
      <Modal
        open={showTable && !!data}
        onClose={() => setShowTable(false)}
        title={
          data
            ? `Star list — ${data.target.name} (showing ${filteredStars.length.toLocaleString()} of ${data.count.toLocaleString()})`
            : 'Star list'
        }
        width={1000}
        maxHeight={680}
      >
        {data ? <StarsPreview stars={filteredStars} maxRows={1_000_000} /> : null}
      </Modal>
    </div>
  );
}

async function safeDetail(res: Response) {
  try {
    const j = await res.json();
    return (j && (j.detail || j.message)) ?? null;
  } catch {
    return null;
  }
}
