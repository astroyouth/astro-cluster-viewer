# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      ...tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      ...tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      ...tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

Filtering & Membership (Gaia DR3)
This app offers a practical set of filters to reduce foreground/background contamination and isolate likely cluster members using only Gaia DR3 columns returned by the query.

1) Quality cuts
RUWE ≤ x (default 1.4): keeps well-behaved Gaia astrometric solutions.

visibility_periods_used ≥ n (default 8): ensures enough observing epochs.

Exclude duplicated_source (default on): removes potential duplicates.

Optional: G ≤ 21 (default 21) and BP–RP range (default −0.5…3.5) to trim extreme/noisy photometry.

2) Kinematic selection (robust, cluster-agnostic)
We estimate the cluster’s kinematic centroid from stars inside an inner core (default 2′ radius), then apply an elliptical cut in (pmRA*, pmDec[, parallax]) space.

Let the medians in the core be 
𝜋
~
,
𝜇
~
𝛼
∗
,
𝜇
~
𝛿
π
~
 , 
μ
~
​
  
α∗
​
 , 
μ
~
​
  
δ
​
  and the robust scales (MAD or std) be 
𝜎
𝜋
,
𝜎
𝜇
𝛼
∗
,
𝜎
𝜇
𝛿
σ 
π
​
 ,σ 
μα∗
​
 ,σ 
μδ
​
 . We keep stars with:

(
𝜋
−
𝜋
~
𝜎
𝜋
)
2
 
(
optional
)
+
(
𝜇
𝛼
∗
−
𝜇
~
𝛼
∗
𝜎
𝜇
𝛼
∗
)
2
+
(
𝜇
𝛿
−
𝑡
𝑖
𝑙
𝑑
𝑒
𝜇
𝛿
𝜎
𝜇
𝛿
)
2
≤
𝑘
2
,
( 
σ 
π
​
 
π− 
π
~
 
​
 ) 
2
  (optional)+( 
σ 
μα∗
​
 
μ 
α∗
​
 − 
μ
~
​
  
α∗
​
 
​
 ) 
2
 +( 
σ 
μδ
​
 
μ 
δ
​
 −tildeμ 
δ
​
 
​
 ) 
2
 ≤k 
2
 ,
where 
𝑘
k is the kinematic threshold (default 3.0σ, adjustable 1–6).
Enable/disable the parallax term via the “Use parallax” toggle.

3) Radial velocity (optional)
If available, we keep stars with 
∣
𝑣
𝑟
−
𝑣
𝑟
,
center
∣
≤
Δ
𝑣
∣v 
r
​
 −v 
r,center
​
 ∣≤Δv (defaults center=median, half-width=15 km s⁻¹).

4) Geometry
Filters are applied within the requested FoV radius around the target. An “inner core” radius sets the region used to estimate the kinematic centroid.

5) Modes: Live vs Apply
Live (default): the sky plot and HR diagram re-render dynamically as you move sliders (debounced ~150 ms).

Apply: edit values freely; nothing updates until you click Apply filters—useful for very large datasets.

Recommended defaults (non-astronomer friendly)
RUWE ≤ 1.4

visibility_periods_used ≥ 8

exclude duplicated_source: on

G ≤ 21.0

BP–RP in [−0.5, 3.5]

Inner core radius = 2.0′

Kinematic threshold k = 3.0

Use parallax in kinematic cut: on

Radial velocity window: off (enable only if many RVs present)

Tip: If the plot still looks “fieldy,” try k = 2.5 and reduce the FoV. If you’re losing genuine members (too sparse), loosen to k = 4 and/or expand the inner core to 3′.