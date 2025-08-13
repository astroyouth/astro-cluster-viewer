// frontend/src/components/TargetPicker.tsx
import { useEffect, useMemo, useRef, useState } from 'react';

type SuggestItem = {
  name: string;
  ra?: number | null;
  dec?: number | null;
  otype?: string | null;
};

type Props = {
  value: string;
  onChange?: (v: string) => void;
  onSelect?: (v: string) => void; // called only with non-empty trimmed values
  placeholder?: string;
  disabled?: boolean;
  backendBase?: string; // optional override; otherwise uses VITE_BACKEND_URL or localhost
};

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

export default function TargetPicker({
  value,
  onChange,
  onSelect,
  placeholder = 'Search target (e.g., M13, NGC 6205, 47 Tuc)',
  disabled = false,
  backendBase,
}: Props) {
  const [query, setQuery] = useState(value ?? '');
  const [open, setOpen] = useState(false);
  const [remote, setRemote] = useState<SuggestItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState<number>(-1);
  const boxRef = useRef<HTMLDivElement | null>(null);

  // keep local input in sync if parent changes `value`
  useEffect(() => {
    setQuery(value ?? '');
  }, [value]);

  // basic debounce
  const debounced = useDebounce(query.trim(), 200);

  // fetch suggestions
  useEffect(() => {
    const q = debounced;
    if (!q || q.length < 2) {
      setRemote([]);
      return;
    }
    setLoading(true);
    fetch(`${backendBase ?? BACKEND}/api/search-targets?q=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then((j) => setRemote(Array.isArray(j?.items) ? j.items : []))
      .catch(() => setRemote([]))
      .finally(() => setLoading(false));
  }, [debounced, backendBase]);

  // close popup on outside click
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  // pick item
  function choose(name: string) {
    const clean = name.trim();
    if (!clean) return; // never pass empty
    onChange?.(clean);
    onSelect?.(clean);
    setQuery(clean);
    setOpen(false);
  }

  // keyboard nav
  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setOpen(true);
      return;
    }
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, remote.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      if (highlight >= 0 && highlight < remote.length) {
        e.preventDefault();
        choose(remote[highlight].name);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  // render list
  const items = useMemo(() => remote.slice(0, 20), [remote]);

  return (
    <div ref={boxRef} style={{ position: 'relative', minWidth: 320 }}>
      <input
        value={query}
        onChange={(e) => {
          const v = e.target.value;
          setQuery(v);
          onChange?.(v); // allow parent to mirror input but don’t auto-select
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        style={{
          width: '100%',
          padding: '8px 10px',
          borderRadius: 8,
          border: '1px solid #444',
          background: '#111',
          color: '#eee',
          outline: 'none',
        }}
      />

      {open && (items.length > 0 || loading) && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            maxHeight: 320,
            overflowY: 'auto',
            background: '#1a1a1a',
            border: '1px solid #333',
            borderRadius: 8,
            zIndex: 20,
          }}
        >
          {loading && (
            <div style={{ padding: '8px 10px', color: '#aaa', fontSize: 13 }}>Searching…</div>
          )}

          {!loading &&
            items.map((s, i) => (
              <div
                key={`${s.name}-${i}`}
                onMouseEnter={() => setHighlight(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(s.name)}
                style={{
                  padding: '8px 10px',
                  cursor: 'pointer',
                  background: i === highlight ? '#2a2a2a' : 'transparent',
                  display: 'flex',
                  gap: 8,
                  alignItems: 'baseline',
                }}
              >
                <span style={{ color: '#eee' }}>{s.name}</span>
                {s.otype ? (
                  <span style={{ color: '#7aa', fontSize: 12, opacity: 0.9 }}>{s.otype}</span>
                ) : null}
                {typeof s.ra === 'number' && typeof s.dec === 'number' ? (
                  <span style={{ color: '#888', fontSize: 12, marginLeft: 'auto' }}>
                    ({s.ra.toFixed(3)}, {s.dec.toFixed(3)})
                  </span>
                ) : null}
              </div>
            ))}

          {!loading && items.length === 0 && (
            <div style={{ padding: '8px 10px', color: '#aaa', fontSize: 13 }}>No matches</div>
          )}
        </div>
      )}
    </div>
  );
}

// small debounce helper
function useDebounce<T>(value: T, delay = 250): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}
