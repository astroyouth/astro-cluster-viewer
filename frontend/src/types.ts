export interface StarRow {
  source_id?: string | number;
  ra?: number;
  dec?: number;
  phot_g_mean_mag?: number;
  bp_rp?: number | null;
  parallax?: number | null;
  pmra?: number | null;
  pmdec?: number | null;
  ruwe?: number | null;
  phot_variable_flag?: string | null;
  [k: string]: unknown;
  radial_velocity?: number;
  visibility_periods_used?: number;
  duplicated_source?: boolean;
}

export interface GaiaConeResponse {
  target: { name: string; ra: number; dec: number };
  radius_arcmin: number;
  count: number;
  stars: StarRow[];
}
