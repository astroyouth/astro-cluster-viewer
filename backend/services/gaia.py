from astroquery.gaia import Gaia
from astropy import units as u
from .resolve import resolve_icrs

KEEP_COLS = ["source_id","ra","dec","phot_g_mean_mag","bp_rp","parallax","pmra","pmdec","ruwe"]

def cone_search(name: str, radius_arcmin: float):
    coord = resolve_icrs(name)
    job = Gaia.cone_search_async(coord, radius=radius_arcmin * u.arcmin)  # keyword arg
    return coord, job.get_results()

def adql_fallback(name: str, radius_arcmin: float, top: int):
    coord = resolve_icrs(name)
    radius_deg = (radius_arcmin * u.arcmin).to(u.deg).value
    adql = f"""
    SELECT TOP {top}
      source_id, ra, dec, phot_g_mean_mag, bp_rp, parallax, pmra, pmdec, ruwe
    FROM gaiadr3.gaia_source
    WHERE 1=CONTAINS(
      POINT('ICRS', ra, dec),
      CIRCLE('ICRS', {coord.ra.deg}, {coord.dec.deg}, {radius_deg})
    )
    AND phot_g_mean_mag IS NOT NULL
    """
    job = Gaia.launch_job_async(adql)
    return coord, job.get_results()
