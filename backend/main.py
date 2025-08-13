# backend/main.py
from __future__ import annotations

import math
import os
import json
import warnings
from functools import lru_cache
from typing import Any, Dict, List, Optional

import numpy as np
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from astropy.coordinates import SkyCoord
from astropy import units as u
from astropy.utils.exceptions import AstropyWarning
from astroquery.exceptions import NoResultsWarning
from astroquery.simbad import Simbad
from astroquery.utils.tap.core import TapPlus
from astroquery.gaia import Gaia

# --- App & CORS ----------------------------------------------------------------

app = FastAPI(title="Astro Cluster Viewer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # vite dev or nginx mapped to 5173
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/hello")
def hello():
    return {"message": "Hello from FastAPI"}

# --- Targets list (curated) ----------------------------------------------------

# expects backend/targets.py with CURATED_TARGETS = [ {name, aka[], type}, ... ]
try:
    from targets import CURATED_TARGETS  # type: ignore
except Exception:
    CURATED_TARGETS: List[Dict[str, Any]] = []

@app.get("/api/cluster-lists")
def cluster_lists():
    # simple payload; feel free to group later
    return JSONResponse({"curated": CURATED_TARGETS})

# --- SIMBAD search (TAP + fallback) -------------------------------------------

# One classic Simbad resolver as fallback (tolerant of version differences)
S = Simbad()
# Best-effort: ask for decimal RA/DEC + object type; ignore if not supported
try:
    S.add_votable_fields("ra(d)", "dec(d)", "otype", "ids")
except Exception:
    pass

# SIMBAD TAP endpoint
SIMBAD_TAP = TapPlus(url="https://simbad.cds.unistra.fr/simbad/sim-tap")

# Cluster-ish object types (tune as you like)
CLUSTER_OTYPES = ("GlC", "OpC", "Cl*", "As*")
MAX_SUGGEST = 50

def _adql_like(term: str) -> str:
    # escape single quotes for ADQL
    term_escaped = term.replace("'", "''")
    return f"%{term_escaped}%"

@lru_cache(maxsize=256)
def _simbad_suggest_tap(term: str, limit: int = MAX_SUGGEST) -> List[Dict[str, Any]]:
    term = term.strip()
    if not term:
        return []

    like = _adql_like(term)
    otypes = ",".join(f"'{o}'" for o in CLUSTER_OTYPES)

    adql = f"""
      SELECT TOP {limit}
        b.main_id, b.ra, b.dec, b.otype
      FROM basic AS b
      LEFT JOIN ident AS i ON i.oidref = b.oid
      WHERE (UPPER(b.main_id) LIKE UPPER('{like}')
             OR UPPER(i.id)   LIKE UPPER('{like}'))
        AND b.otype IN ({otypes})
    """

    tab = None
    try:
        # synchronous job; suppress astropy TAP warnings about empty result sets
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", AstropyWarning)
            job = SIMBAD_TAP.launch_job(adql)
            tab = job.get_results()
    except Exception:
        tab = None

    out: List[Dict[str, Any]] = []
    if tab is not None and len(tab) > 0:
        for r in tab:
            try:
                name = str(r["main_id"]).replace(" ", "")
                ra = float(r["ra"]) if r["ra"] is not None else None
                dec = float(r["dec"]) if r["dec"] is not None else None
                otype = str(r["otype"]) if r["otype"] is not None else ""
                out.append({"name": name, "ra": ra, "dec": dec, "otype": otype})
            except Exception:
                continue

    # Fallback: exact resolver if TAP gave nothing
    if not out:
        try:
            with warnings.catch_warnings():
                warnings.simplefilter("ignore", NoResultsWarning)
                t = S.query_object(term)
            if t is not None and len(t) > 0:
                r = t[0]
                out.append({
                    "name": str(r["MAIN_ID"]).replace(" ", ""),
                    "ra": float(r.get("RA_d")) if r.get("RA_d") is not None else None,
                    "dec": float(r.get("DEC_d")) if r.get("DEC_d") is not None else None,
                    "otype": str(r.get("OTYPE") or ""),
                })
        except Exception:
            pass


    # De-dupe by name, preserve order
    seen = set()
    uniq: List[Dict[str, Any]] = []
    for s in out:
        nm = s["name"]
        if nm in seen:
            continue
        seen.add(nm)
        uniq.append(s)

    return uniq[:limit]

@app.get("/api/search-targets")
def search_targets(q: str = Query(..., min_length=2), limit: int = 20):
    if not q or len(q.strip()) < 2:
        return {"items": []}
    try:
        items = _simbad_suggest_tap(q, limit=min(limit, MAX_SUGGEST))
        return {"items": items}
    except Exception:
        return {"items": []}

# --- JSON sanitizers -----------------------------------------------------------

def _is_finite_number(x: Any) -> bool:
    try:
        return math.isfinite(float(x))
    except Exception:
        return False

# ---- helpers ----

def deep_sanitize(obj):
    """
    Recursively convert objects to JSON-safe types.
    - Convert numpy types to python scalars
    - Replace NaN/Inf with None
    - Leave normal ints alone
    """
    import numpy as np

    if obj is None:
        return None

    # numpy scalar -> python scalar
    if isinstance(obj, (np.generic,)):
        obj = obj.item()

    if isinstance(obj, float):
        if obj != obj or obj in (float("inf"), float("-inf")):
            return None
        return obj

    if isinstance(obj, (int, str, bool)):
        return obj

    if isinstance(obj, (list, tuple)):
        return [deep_sanitize(x) for x in obj]

    if isinstance(obj, dict):
        return {str(k): deep_sanitize(v) for k, v in obj.items()}

    # astropy quantities / angles, try to extract value
    try:
        from astropy.units.quantity import Quantity  # type: ignore
        if isinstance(obj, Quantity):
            v = obj.value
            return deep_sanitize(v)
    except Exception:
        pass

    try:
        # astropy Angle/Longitude/Latitude often behave like Quantity
        v = getattr(obj, "value", None)
        if v is not None:
            return deep_sanitize(v)
    except Exception:
        pass

    # fallback to string
    return str(obj)


def table_to_records_astropy(tbl, keep=None, limit=None):
    """
    Convert an astropy Table to list[dict]. If limit is a positive int, trim;
    otherwise do not trim at all.
    """
    if tbl is None:
        return []

    # Only trim when limit > 0
    if isinstance(limit, int) and limit > 0:
        tbl = tbl[:limit]

    cols = keep if keep else tbl.colnames
    out = []
    n = len(tbl)
    for i in range(n):
        r = {}
        for c in cols:
            try:
                v = tbl[c][i]
            except Exception:
                v = None
            # numpy/astropy conversion & NaN/Inf handling
            try:
                if hasattr(v, "item"):
                    v = v.item()
            except Exception:
                pass
            if isinstance(v, float):
                if v != v or v in (float("inf"), float("-inf")):
                    v = None
            r[c] = v
        out.append(r)
    return out



# --- Gaia cone endpoint --------------------------------------------------------


@app.get("/api/gaia-cone")
def gaia_cone(
    name: str,
    radius_arcmin: float = Query(10.0, gt=0.0, le=120.0),
    limit: int = Query(0, ge=0, le=200000),  # 0 => unlimited
):
    # 1) Resolve target name
    try:
        coord = SkyCoord.from_name(name)
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Could not resolve '{name}': {e}")

    Gaia.TIMEOUT = 60
    Gaia.ROW_LIMIT = -1  # allow server to return full set; we may trim client-side

    # 2) Try cone-search
    tbl = None
    cone_err = None
    try:
        job = Gaia.cone_search_async(coord, radius=radius_arcmin * u.arcmin)
        tbl = job.get_results()
    except Exception as e:
        cone_err = e  # stash error in case fallback also fails

    # 3) Fallback via ADQL with optional TOP
    if tbl is None:
        try:
            radius_deg = (radius_arcmin * u.arcmin).to(u.deg).value
            top_clause = "" if limit <= 0 else f"TOP {limit}"
            # (space after SELECT is fine with/without TOP)
            adql = f"""
                SELECT {top_clause}
                    source_id, ra, dec, phot_g_mean_mag, bp_rp,
                    parallax, pmra, pmdec, ruwe, phot_variable_flag
                FROM gaiadr3.gaia_source
                WHERE 1=CONTAINS(
                    POINT('ICRS', ra, dec),
                    CIRCLE('ICRS', {coord.ra.deg}, {coord.dec.deg}, {radius_deg})
                )
            """
            job = Gaia.launch_job_async(adql)
            tbl = job.get_results()
        except Exception as e2:
            msg = f"Gaia query failed. cone_error={cone_err!s}" if cone_err else "Gaia query failed."
            raise HTTPException(status_code=502, detail=f"{msg}; adql_error={e2!s}")

    # 4) If cone path returned more rows than requested limit>0, trim client side
    if tbl is not None and limit > 0 and len(tbl) > limit:
        tbl = tbl[:limit]

    keep = [
        "source_id", "ra", "dec", "parallax", "pmra", "pmdec",
        "phot_g_mean_mag", "bp_rp", "ruwe", "phot_variable_flag",
    ]
    # IMPORTANT: do not pass 0 here; None means "no trim"
    rows = table_to_records_astropy(tbl, keep=keep, limit=None)

    payload = {
        "target": {"name": name, "ra": float(coord.ra.deg), "dec": float(coord.dec.deg)},
        "radius_arcmin": float(radius_arcmin),
        "count": int(len(rows)),
        "stars": rows,
    }
    # deep-sanitize only the nested parts (count is a plain int already)
    safe = {
        "target": deep_sanitize(payload["target"]),
        "radius_arcmin": payload["radius_arcmin"],
        "count": payload["count"],
        "stars": deep_sanitize(payload["stars"]),
    }
    return JSONResponse(safe)
