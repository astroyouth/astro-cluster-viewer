from astroquery.gaia import Gaia
from astroquery.simbad import Simbad

SIMBAD_TIMEOUT_S = 30
GAIA_TIMEOUT_S = 60
GAIA_ROW_LIMIT = -1  # let server decide; we trim in app

def init_timeouts():
    Simbad.TIMEOUT = SIMBAD_TIMEOUT_S
    Gaia.TIMEOUT = GAIA_TIMEOUT_S
    Gaia.ROW_LIMIT = GAIA_ROW_LIMIT
