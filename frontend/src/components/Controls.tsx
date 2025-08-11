// src/components/Controls.tsx
import React from 'react';

type ControlsProps = {
  target: string;
  setTarget: (v: string) => void;
  fov: number;                 // arcminutes
  setFov: (v: number) => void;
  loading: boolean;
  onFetch: () => void;
};

export default function Controls({
  target,
  setTarget,
  fov,
  setFov,
  loading,
  onFetch,
}: ControlsProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Row 1: input + button */}
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'stretch' }}>
        <input
          type="text"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onFetch();
          }}
          placeholder="Cluster / target name"
          aria-label="Cluster or target name"
          style={{
            flex: 1,
            padding: '0.5rem 0.75rem',
            borderRadius: 6,
            border: '1px solid #444',
            fontSize: '1rem',
            background: '#222',
            color: '#eee',
            height: 40,
            outline: 'none',
          }}
        />
        <button
          onClick={onFetch}
          disabled={loading}
          style={{
            padding: '0 1rem',
            borderRadius: 6,
            border: '1px solid #444',
            background: loading ? '#333' : '#111',
            color: '#fff',
            fontWeight: 700,
            cursor: loading ? 'default' : 'pointer',
            height: 40,
          }}
        >
          {loading ? 'Loading…' : 'Fetch stars'}
        </button>
      </div>

      {/* Row 2: slider */}
      <div>
        <label style={{ display: 'block', marginBottom: 6 }}>
          Field of view radius: <strong>{fov.toFixed(1)}′</strong>
        </label>
        <input
          type="range"
          min={1}
          max={60}
          step={0.5}
          value={fov}
          onChange={(e) => setFov(parseFloat(e.target.value))}
          aria-label="Field of view radius (arcminutes)"
          style={{ width: '100%' }}
        />
      </div>
    </div>
  );
}
