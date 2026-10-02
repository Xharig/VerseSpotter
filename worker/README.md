# Zähler und Statistik (Cloudflare Worker)

Nimmt die anonymen Ereignisse der Seite an (`nutzung-versespotter.xharig.com/e`) und zeigt die private Übersicht (`statistik-versespotter.xharig.com`, nur hinter Cloudflare Access).

## Prüfen

```bash
node --test worker.test.mjs
```

Probeansicht der Übersicht mit ausgedachten Daten: `node dashboard_probe.mjs probe.html`

## Einrichten

1. Datenbank anlegen und die ausgegebene Kennung in `wrangler.toml` bei `database_id` eintragen:
   ```bash
   npx wrangler d1 create versespotter-nutzung
   ```
2. Tabellen einspielen:
   ```bash
   npx wrangler d1 execute versespotter-nutzung --remote --file=schema.sql
   ```
3. Cloudflare Zero Trust → Access → Applications → **Add an application** → Self-hosted, Name `VerseSpotter-Statistik`, Domain `statistik-versespotter.xharig.com`, Anmeldung über GitHub, Regel „Emails" mit der eigenen Adresse. Die **Application Audience (AUD) Tag** kopieren.
4. Geheimnisse setzen:
   ```bash
   npx wrangler secret put TEAM_DOMAIN
   ```
   ```bash
   npx wrangler secret put POLICY_AUD
   ```
   ```bash
   npx wrangler secret put ERLAUBTE_MAIL
   ```
5. Veröffentlichen:
   ```bash
   npx wrangler deploy
   ```

Fehlt eine der drei Angaben, bleibt die Übersicht zu (403).
