-- Zähler je Tag (UTC). Keine Kennung, keine IP — nur „wie viele".
-- Einspielen: npx wrangler d1 execute versespotter-nutzung --remote --file=schema.sql

-- Einzelne Merkmale, je eines für sich gezählt: Aufrufe je Seite, Gerät,
-- Herkunft, Land, Sprache, wiederkehrend, Starts/Enden je Modus, Länge,
-- Gefechtsmodus, Ränge, Kopieren. Bewusst nicht miteinander verknüpft:
-- Kombinationen würden kleine Gruppen erkennbar machen.
CREATE TABLE IF NOT EXISTS zaehler (
  tag     TEXT    NOT NULL,
  merkmal TEXT    NOT NULL,
  wert    TEXT    NOT NULL,
  n       INTEGER NOT NULL,
  PRIMARY KEY (tag, merkmal, wert)
);

-- Beendete Läufe je Modus mit Summe der richtigen Antworten und Fragen
-- (für den Durchschnitt).
CREATE TABLE IF NOT EXISTS ergebnisse (
  tag     TEXT    NOT NULL,
  modus   TEXT    NOT NULL,
  laeufe  INTEGER NOT NULL,
  richtig INTEGER NOT NULL,
  fragen  INTEGER NOT NULL,
  PRIMARY KEY (tag, modus)
);

-- Je Bild: wie oft gezeigt, wie oft falsch erkannt. Viele Fehler bei einem
-- Bild deuten auf ein falsch benanntes oder unbrauchbares Bild.
CREATE TABLE IF NOT EXISTS bilder (
  tag     TEXT    NOT NULL,
  bild    TEXT    NOT NULL,
  gezeigt INTEGER NOT NULL,
  falsch  INTEGER NOT NULL,
  PRIMARY KEY (tag, bild)
);

-- Verwechslungen: gezeigte Familie, gewählte Familie ('' = Zeit abgelaufen).
CREATE TABLE IF NOT EXISTS verwechslung (
  tag      TEXT    NOT NULL,
  gezeigt  TEXT    NOT NULL,
  gewaehlt TEXT    NOT NULL,
  n        INTEGER NOT NULL,
  PRIMARY KEY (tag, gezeigt, gewaehlt)
);

-- „Bild melden" je Bild und Grund.
CREATE TABLE IF NOT EXISTS meldungen (
  tag   TEXT    NOT NULL,
  bild  TEXT    NOT NULL,
  grund TEXT    NOT NULL,
  n     INTEGER NOT NULL,
  PRIMARY KEY (tag, bild, grund)
);
