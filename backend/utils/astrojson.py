import math, numpy as np

def _to_py(v):
    if hasattr(v, "value"):
        v = v.value
    try:
        import numpy.ma as ma
        if ma.isMaskedArray(v):
            v = v.filled(np.nan)
    except Exception:
        pass
    if isinstance(v, np.generic):
        try:
            v = v.item()
        except Exception:
            pass
    if isinstance(v, (bytes, bytearray)):
        try:
            v = v.decode("utf-8", "ignore")
        except Exception:
            v = str(v)
    if isinstance(v, float) and not math.isfinite(v):
        return None
    return v

def table_to_records(tbl, keep=None, limit=None):
    if keep:
        tbl = tbl[ [c for c in keep if c in tbl.colnames] ] or tbl
    try:
        tbl = tbl.filled(np.nan)
    except Exception:
        pass
    out, cols = [], list(tbl.colnames)
    n = len(tbl) if limit is None else min(limit, len(tbl))
    for i in range(n):
        row = tbl[i]
        rec = {c: _to_py(row[c]) for c in cols}
        out.append(rec)
    return out
