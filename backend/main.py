from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from config import init_timeouts
from services import gaia, resolve
from utils.astrojson import table_to_records
import math
import numpy as np
import numpy.ma as ma
from astropy.coordinates import SkyCoord
from astropy import units as u
from astroquery.gaia import Gaia

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
init_timeouts()

def _to_py(v):
    # astropy Quantity -> value
    if hasattr(v, "value"):
        v = v.value

    # masked arrays -> fill with NaN
    if isinstance(v, ma.MaskedArray):
        v = v.filled(np.nan)

    # numpy arrays
    if isinstance(v, np.ndarray):
        if v.ndim == 0:           # 0-D array (scalar)
            v = v.item()
        else:                      # real array
            return [_to_py(x) for x in v.tolist()]

    # numpy scalar -> python scalar
    if isinstance(v, np.generic):
        v = v.item()

    # bytes -> str
    if isinstance(v, (bytes, bytearray)):
        try:
            v = v.decode("utf-8", "ignore")
        except Exception:
            v = str(v)

    # non-finite floats -> None
    if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
        return None

    return v

def table_to_records_astropy(tbl, keep=None, limit=None):
    if keep:
        keep = [c for c in keep if c in tbl.colnames]
        if keep:
            tbl = tbl[keep]

    # try to fill masked columns table-wide
    try:
        tbl = tbl.filled(np.nan)
    except Exception:
        pass

    cols = list(tbl.colnames)
    n = len(tbl) if limit is None else min(limit, len(tbl))
    out = []
    for i in range(n):
        row = tbl[i]
        rec = {}
        for c in cols:
            rec[c] = _to_py(row[c])
        out.append(rec)
    return out

def deep_sanitize(obj):
    if isinstance(obj, dict):
        return {k: deep_sanitize(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [deep_sanitize(v) for v in obj]
    return _to_py(obj)

@app.get("/api/resolve")
def resolve_target(name: str):
    try:
        c = resolve.resolve_icrs(name)
        return {"name": name, "ra": c.ra.deg, "dec": c.dec.deg}
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Could not resolve '{name}': {e}")



@app.get("/api/gaia-cone")
def gaia_cone(
    name: str,
    radius_arcmin: float = Query(10.0, gt=0.0, le=120.0),
    limit: int | None = Query(None, ge=1, le=2_000_000),  # None => unlimited
):
    # 1) Resolve
    try:
        coord = SkyCoord.from_name(name)
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Could not resolve '{name}': {e}")

    Gaia.TIMEOUT = 60
    Gaia.ROW_LIMIT = -1  # let the server return everything

    keep = [
        "source_id", "ra", "dec",
        "phot_g_mean_mag", "bp_rp",
        "parallax", "pmra", "pmdec",
        "ruwe", "phot_variable_flag",
    ]

    # 2) Build ADQL (conditionally add TOP if limit given)
    radius_deg = (radius_arcmin * u.arcmin).to(u.deg).value
    top_clause = f"TOP {limit} " if (isinstance(limit, int) and limit > 0) else ""
    adql = f"""
    SELECT {top_clause}
        source_id, ra, dec,
        phot_g_mean_mag, bp_rp,
        parallax, pmra, pmdec,
        ruwe, phot_variable_flag
    FROM gaiadr3.gaia_source
    WHERE 1=CONTAINS(
      POINT('ICRS', ra, dec),
      CIRCLE('ICRS', {coord.ra.deg}, {coord.dec.deg}, {radius_deg})
    )
    """

    tbl = None
    adql_err = None
    truncated = False

    # 3) Try ADQL first
    try:
        job = Gaia.launch_job_async(adql)
        tbl = job.get_results()
    except Exception as e:
        adql_err = e

    # 4) Fallback: cone helper (may ignore limit)
    if tbl is None:
        try:
            job = Gaia.cone_search_async(coord, radius=radius_arcmin * u.arcmin)
            tbl = job.get_results()
            # If cone returns more than limit (when provided), we’ll trim in Python
            if isinstance(limit, int) and limit > 0 and len(tbl) > limit:
                tbl = tbl[:limit]
                truncated = True
            # Ensure schema has the flag
            if "phot_variable_flag" not in tbl.colnames:
                import numpy as np
                tbl["phot_variable_flag"] = np.array([None] * len(tbl), dtype=object)
        except Exception as e2:
            msg = f"Gaia ADQL failed: {adql_err!s}" if adql_err else "Gaia query failed."
            raise HTTPException(status_code=502, detail=f"{msg}; cone_error={e2!s}")

    # 5) Convert (no limit here — we already applied it if needed)
    rows = table_to_records_astropy(tbl, keep=keep, limit=None)

    payload = {
        "target": {"name": name, "ra": coord.ra.deg, "dec": coord.dec.deg},
        "radius_arcmin": radius_arcmin,
        "count": len(rows),
        "truncated": truncated or (isinstance(limit, int) and len(rows) == limit),
        "requested_limit": limit,
        "stars": rows,
    }
    return deep_sanitize(payload)

@app.get("/api/hello")
def read_hello():
    return {"message": "Hello from FastAPI"}
