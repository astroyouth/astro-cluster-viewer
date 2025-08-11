// src/components/FiltersPanel.tsx
import React from 'react';
import type { FiltersState } from '../hooks/useFilters';
import { InfoIcon, Modal } from './Info';

type Props = {
  filters: FiltersState;
  setFilters: React.Dispatch<React.SetStateAction<FiltersState>>;
};

const num = (v: string) => (v === '' ? 0 : Number(v));

const numStyle: React.CSSProperties = {
  padding: '6px 8px',
  borderRadius: 6,
  border: '1px solid #444',
  background: '#1e1e1e',
  color: '#eee',
  boxSizing: 'border-box',
  minWidth: 0,
};

const INFO: Record<
  string,
  { title: string; body: React.ReactNode }
> = {
  enabled: {
    title: 'Enable filters',
    body: (
      <>
        Toggle to compare the unfiltered field (all Gaia sources in FoV) versus a
        cleaned set intended to isolate probable cluster members.
      </>
    ),
  },
  live: {
    title: 'Live updates',
    body: (
      <>
        When ON, moving sliders updates the plot immediately. Turn OFF if your
        machine/network struggles with big fields; click your “Apply/Fetch” action
        when ready.
      </>
    ),
  },
  ruwe: {
    title: 'RUWE ≤ …',
    body: (
      <>
        RUWE is a Gaia astrometric fit quality metric. Values ≲ 1.4 are typically
        well-behaved single-star solutions. Lowering removes dubious astrometry
        (blends, crowding).
      </>
    ),
  },
  vis: {
    title: 'visibility_periods_used',
    body: (
      <>
        Minimum number of distinct visibility periods used in the solution.
        Requiring ≥ 8–10 reduces spurious solutions and outliers.
      </>
    ),
  },
  dup: {
    title: 'Exclude duplicated sources',
    body: (
      <>
        Drops entries flagged as duplicated (<code>duplicated_source = true</code>).
        Recommended ON in crowded fields like globulars.
      </>
    ),
  },
  gmax: {
    title: 'G magnitude cutoff',
    body: (
      <>
        Keep stars brighter than the limit. Use to control plot clutter and focus on
        the cluster sequence. Typical 20–21 for DR3.
      </>
    ),
  },
  bprp: {
    title: 'BP–RP color range',
    body: (
      <>
        Keep sources within a color window. Useful for peeling off the bluest/redest
        field contaminants. Start broad (e.g. −0.5…3.5) then tighten.
      </>
    ),
  },
  core: {
    title: 'Inner core radius',
    body: (
      <>
        Radius (arcmin) around the cluster center used only for estimating the
        kinematic centroid (pmRA/pmDec, optionally parallax). It is <b>not</b> a
        hard spatial cut.
      </>
    ),
  },
  kin: {
    title: 'Kinematic threshold kσ',
    body: (
      <>
        Stars within <i>k</i> standard deviations of the estimated cluster proper
        motion (and parallax if enabled) are kept. Smaller <i>k</i> is stricter.
        Try 2–3.
      </>
    ),
  },
  par: {
    title: 'Use parallax in kinematic cut',
    body: (
      <>
        Include parallax in the Mahalanobis distance used for membership. Good when
        Gaia parallaxes are robust; disable if parallaxes are noisy.
      </>
    ),
  },
  rv: {
    title: 'Radial velocity window',
    body: (
      <>
        Optional: keep stars with <code>rv_center ± half_width</code> in km/s.
        Helpful when the cluster RV is known and Gaia has RVs for enough stars.
      </>
    ),
  },
};

function Field({
  label,
  infoKey,
  children,
  openInfo,
}: {
  label: string;
  infoKey?: keyof typeof INFO;
  children: React.ReactNode;
  openInfo: (k: keyof typeof INFO) => void;
}) {
  return (
    <div>
      <div
        style={{
          fontSize: 12,
          color: '#bbb',
          marginBottom: 6,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          minWidth: 0,
        }}
      >
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {label}
        </span>
        {infoKey && <InfoIcon onClick={() => openInfo(infoKey)} />}
      </div>
      {children}
    </div>
  );
}

export default function FiltersPanel({ filters, setFilters }: Props) {
  const [openKey, setOpenKey] = React.useState<keyof typeof INFO | null>(null);
  const openInfo = (k: keyof typeof INFO) => setOpenKey(k);
  const closeInfo = () => setOpenKey(null);

  const set = <K extends keyof FiltersState>(key: K, value: FiltersState[K]) =>
    setFilters((prev) => ({ ...prev, [key]: value }));

  return (
    <div
      style={{
        marginTop: '1rem',
        padding: '0.75rem',
        border: '1px solid #333',
        borderRadius: 10,
        background: '#161616',
        maxWidth: '100%',
        overflow: 'hidden',
      }}
    >
      {/* Header toggles */}
      <div
        style={{
          display: 'flex',
          gap: '1.5rem',
          alignItems: 'center',
          marginBottom: '0.75rem',
          flexWrap: 'wrap',
        }}
      >
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <input
            type="checkbox"
            checked={filters.enabled}
            onChange={(e) => set('enabled', e.target.checked)}
          />
          <span>Enable filters</span>
          <InfoIcon onClick={() => openInfo('enabled')} />
        </label>

        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <input
            type="checkbox"
            checked={filters.live}
            onChange={(e) => set('live', e.target.checked)}
          />
          <span>Live updates</span>
          <InfoIcon onClick={() => openInfo('live')} />
        </label>
      </div>

      {/* Grid of controls */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '0.75rem 1rem',
          opacity: filters.enabled ? 1 : 0.55,
          maxWidth: '100%',
        }}
      >
        {/* RUWE */}
        <Field
          label={`RUWE ≤ ${filters.ruweMax.toFixed(2)}`}
          infoKey="ruwe"
          openInfo={openInfo}
        >
          <input
            type="range"
            min={1.0}
            max={2.0}
            step={0.01}
            value={filters.ruweMax}
            onChange={(e) => set('ruweMax', Number(e.target.value))}
            style={{ width: '100%' }}
          />
        </Field>

        {/* visibility_periods_used */}
        <Field
          label={`visibility_periods_used ≥ ${filters.minVisibilityPeriods}`}
          infoKey="vis"
          openInfo={openInfo}
        >
          <input
            type="range"
            min={5}
            max={20}
            step={1}
            value={filters.minVisibilityPeriods}
            onChange={(e) => set('minVisibilityPeriods', Number(e.target.value))}
            style={{ width: '100%' }}
          />
        </Field>

        {/* Exclude duplicates */}
        <Field label="Exclude duplicated sources" infoKey="dup" openInfo={openInfo}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={filters.excludeDuplicates}
              onChange={(e) => set('excludeDuplicates', e.target.checked)}
            />
            yes
          </label>
        </Field>

        {/* G mag cutoff */}
        <Field label={`G ≤ ${filters.gMax.toFixed(1)}`} infoKey="gmax" openInfo={openInfo}>
          <input
            type="range"
            min={16}
            max={22}
            step={0.1}
            value={filters.gMax}
            onChange={(e) => set('gMax', Number(e.target.value))}
            style={{ width: '100%' }}
          />
        </Field>

        {/* BP-RP (span full width) */}
        <div style={{ gridColumn: '1 / -1' }}>
          <Field
            label={`BP–RP range: ${filters.colorMin.toFixed(2)} … ${filters.colorMax.toFixed(2)}`}
            infoKey="bprp"
            openInfo={openInfo}
          >
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', minWidth: 0 }}>
              <input
                type="number"
                step={0.1}
                value={filters.colorMin}
                onChange={(e) => set('colorMin', num(e.target.value))}
                style={{ ...numStyle, flex: '1 1 140px' }}
              />
              <input
                type="number"
                step={0.1}
                value={filters.colorMax}
                onChange={(e) => set('colorMax', num(e.target.value))}
                style={{ ...numStyle, flex: '1 1 140px' }}
              />
            </div>
          </Field>
        </div>

        {/* Inner core radius */}
        <Field
          label={`Inner core radius: ${filters.innerCoreArcmin.toFixed(1)}′`}
          infoKey="core"
          openInfo={openInfo}
        >
          <input
            type="range"
            min={0}
            max={5}
            step={0.1}
            value={filters.innerCoreArcmin}
            onChange={(e) => set('innerCoreArcmin', Number(e.target.value))}
            style={{ width: '100%' }}
          />
        </Field>

        {/* Kinematic threshold */}
        <Field
          label={`Kinematic threshold kσ: ${filters.kSigma.toFixed(1)}`}
          infoKey="kin"
          openInfo={openInfo}
        >
          <input
            type="range"
            min={1}
            max={5}
            step={0.1}
            value={filters.kSigma}
            onChange={(e) => set('kSigma', Number(e.target.value))}
            style={{ width: '100%' }}
          />
        </Field>

        {/* Use parallax in cut */}
        <Field
          label="Use parallax in kinematic cut"
          infoKey="par"
          openInfo={openInfo}
        >
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={filters.useParallax}
              onChange={(e) => set('useParallax', e.target.checked)}
            />
            yes
          </label>
        </Field>

        {/* Radial velocity (span full width) */}
        <div style={{ gridColumn: '1 / -1' }}>
          <Field label="Radial velocity window" infoKey="rv" openInfo={openInfo}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'auto 1fr 130px',
                gap: 8,
                alignItems: 'center',
              }}
            >
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <input
                  type="checkbox"
                  checked={filters.useRV}
                  onChange={(e) => set('useRV', e.target.checked)}
                />
                enable
              </label>

              <input
                type="number"
                placeholder="center (km/s)"
                value={filters.rvCenter ?? ''}
                onChange={(e) =>
                  set('rvCenter', e.target.value === '' ? undefined : num(e.target.value))
                }
                style={{ ...numStyle, width: '100%', minWidth: 0 }}
                disabled={!filters.useRV}
              />

              <input
                type="number"
                placeholder="half-width"
                value={filters.rvHalfWidth}
                onChange={(e) => set('rvHalfWidth', num(e.target.value))}
                style={{ ...numStyle, width: '100%' }}
                disabled={!filters.useRV}
              />
            </div>
          </Field>
        </div>
      </div>

      {/* Info modal */}
      {openKey && (
        <Modal open={true} onClose={closeInfo} title={INFO[openKey].title}>
          {INFO[openKey].body}
          <div style={{ marginTop: 12, opacity: 0.8, fontSize: 12 }}>
            Tip: adjust recommended defaults in the README for your audience.
          </div>
        </Modal>
      )}
    </div>
  );
}
