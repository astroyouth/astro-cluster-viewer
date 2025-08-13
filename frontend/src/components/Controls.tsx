// src/components/Controls.tsx
import React from 'react';
import TargetPicker from './TargetPicker'; // adjust path if needed

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
      {/* Row 1: Target Picker */}
      <TargetPicker
        value={target}
        onChange={setTarget}
        onSubmit={onFetch}
      />

      {/* Row 2: FoV slider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <label style={{ color: '#eee', fontSize: '0.9rem' }}>FoV (arcmin):</label>
        <input
          type="range"
          min="1"
          max="60"
          value={fov}
          onChange={(e) => setFov(Number(e.target.value))}
        />
        <span style={{ color: '#ccc' }}>{fov}</span>
      </div>
    </div>
  );
}
