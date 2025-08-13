# backend/targets.py
CURATED_TARGETS = [
    # Globulars (Messier subset first)
    {"name": "M13", "aka": ["NGC 6205"], "type": "globular"},
    {"name": "M15", "aka": ["NGC 7078"], "type": "globular"},
    {"name": "M2",  "aka": ["NGC 7089"], "type": "globular"},
    {"name": "M3",  "aka": ["NGC 5272"], "type": "globular"},
    {"name": "M5",  "aka": ["NGC 5904"], "type": "globular"},
    {"name": "M22", "aka": ["NGC 6656"], "type": "globular"},
    {"name": "M92", "aka": ["NGC 6341"], "type": "globular"},
    {"name": "47 Tuc", "aka": ["NGC 104", "47 Tucanae"], "type": "globular"},
    {"name": "Omega Centauri", "aka": ["NGC 5139"], "type": "globular"},
    {"name": "M80", "aka": ["NGC 6093"], "type": "globular"},
    {"name": "M71", "aka": ["NGC 6838"], "type": "globular"},
    # Open clusters (examples)
    {"name": "Pleiades", "aka": ["M45", "Melotte 22"], "type": "open"},
    {"name": "Hyades", "aka": ["Melotte 25"], "type": "open"},
    {"name": "M11", "aka": ["NGC 6705", "Wild Duck Cluster"], "type": "open"},
    {"name": "M67", "aka": ["NGC 2682"], "type": "open"},
    {"name": "Double Cluster", "aka": ["NGC 869", "NGC 884", "h and χ Persei"], "type": "open"},
    {"name": "M7", "aka": ["Ptolemy Cluster", "NGC 6475"], "type": "open"},
    # You can keep extending this list later
]
