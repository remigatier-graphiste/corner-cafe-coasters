-- Corner Cafe Coasters — Schéma de la base de données D1 (SQLite)

CREATE TABLE IF NOT EXISTS sets (
  id          TEXT PRIMARY KEY,              -- ex. 'ete-2026'
  name        TEXT NOT NULL,
  released_at TEXT,                          -- AAAA-MM-JJ
  is_open     INTEGER NOT NULL DEFAULT 0     -- 1 = disponible dans /quotidien
);

CREATE TABLE IF NOT EXISTS coasters (
  id          TEXT PRIMARY KEY,              -- ex. 'ete-2026-001'
  set_id      TEXT NOT NULL REFERENCES sets(id),
  name        TEXT NOT NULL,
  rarity      TEXT NOT NULL,                 -- carton | bois | liege | ceramique | metal
  type        TEXT,                          -- ex. 'Jeux de plateau', 'Café'
  tags        TEXT NOT NULL DEFAULT '',      -- séparés par des virgules
  image       TEXT NOT NULL,                 -- chemin sous /coasters/
  weight      INTEGER NOT NULL DEFAULT 1,    -- poids de tirage
  description TEXT
);

CREATE INDEX IF NOT EXISTS idx_coasters_set ON coasters(set_id, rarity);

CREATE TABLE IF NOT EXISTS users (
  discord_id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_daily TEXT                            -- AAAA-MM-JJ (fuseau Europe/Paris)
);

CREATE TABLE IF NOT EXISTS inventory (
  user_id           TEXT NOT NULL,
  coaster_id        TEXT NOT NULL REFERENCES coasters(id),
  finish            TEXT NOT NULL DEFAULT 'normal',   -- normal | brillant
  quantity          INTEGER NOT NULL DEFAULT 0,
  first_obtained_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, coaster_id, finish)
);

CREATE TABLE IF NOT EXISTS user_packs (
  user_id   TEXT NOT NULL,
  pack_type TEXT NOT NULL,                   -- petit_sachet | grand_sachet | boite | coffret
  set_id    TEXT NOT NULL REFERENCES sets(id),
  quantity  INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, pack_type, set_id)
);

CREATE TABLE IF NOT EXISTS openings (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    TEXT NOT NULL,
  pack_type  TEXT NOT NULL,
  set_id     TEXT NOT NULL,
  results    TEXT NOT NULL,                  -- JSON des cartes tirées
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_openings_user ON openings(user_id, id);

CREATE TABLE IF NOT EXISTS drops (
  id            TEXT PRIMARY KEY,
  pack_type     TEXT NOT NULL,
  set_id        TEXT NOT NULL REFERENCES sets(id),
  quantity_each INTEGER NOT NULL DEFAULT 1,
  max_claims    INTEGER,
  expires_at    TEXT NOT NULL,
  created_by    TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS drop_claims (
  drop_id TEXT NOT NULL REFERENCES drops(id),
  user_id TEXT NOT NULL,
  PRIMARY KEY (drop_id, user_id)
);

CREATE TABLE IF NOT EXISTS audit_log (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  at        TEXT NOT NULL DEFAULT (datetime('now')),
  actor_id  TEXT NOT NULL,
  action    TEXT NOT NULL,
  target_id TEXT,
  details   TEXT
);
