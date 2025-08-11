from astropy.coordinates import SkyCoord

def resolve_icrs(name: str) -> SkyCoord:
    return SkyCoord.from_name(name)  # Sesame/Simbad
