# REBRAND — „LightCraft" → „Endless Moments" (Regelwerk + Grenzen)

## Zweck

Dieser Fork (`blackt666/lightcraft`) ist die **Quelle** des Editors, der unter
`web-app/public/editor/` der Plattform ausgeliefert wird. Der Job
`Editor — Upstream-Auflage (48h)` baut ihn in festem Takt neu; dieses Dokument
hält fest, WIE aus dem Upstream unser Produkt wird — und was bewusst NICHT
angefasst wird.

## Ehrliche Ausgangslage

Die Umbenennung vom 14.10.2026 entstand als **einmaliger Byte-Patch**
(169 Ersetzungen in 42 Dateien; 632 in den Locales; dazu `index.html` und
`worker.js`). Dieses Skript ist **nicht** die historische Vorlage — die ist
nicht mehr vorhanden (im Scratch-Bereich lagen nur Browser-Sonden: `lc-brand.js`
als Probe u. Ä.). Es definiert die Regel **gehend weiter**, deterministisch und
in der CI prüfbar (`--check`). Wo die historische Fassung anders war, gilt ab
jetzt diese — sie ist vollständig und nachvollziehbar.

## Gemessener Stand (16.10.2026)

`--apply`: **1816 Ersetzungen in 317 Dateien** · `--check` danach grün ·
Idempotenz: zweiter `--apply` = 0 Ersetzungen. Die historische Fassung war
enger gefasst (nur sichtbare Stellen); die Fassung hier zieht Kommentare und
Tests konsistent mit heran — bewusst, damit kein gemischtes Bild entsteht.

## Regeln (S1–S5)

| Scope | Ersetzt |
|---|---|
| S1 `crates/**/*.rs` | `LightCraft` → `Endless Moments` |
| S2 `crates/ui-egui/**` | zusätzlich `Lightcraft` → `Endless Moments` |
| S3 `apps/lightcraft-web/**` (index.html, worker.js, src/**) | beide Schreibweisen |
| S4 `crates/ui-egui/locales/*.json` | beide Schreibweisen |
| S5 alles Übrige (packaging/, .github/, docs/, README*, AGENTS.md, CLAUDE.md, ROADMAP.md, NOTICE, LICENSE*, contributors/) | **unberührt** |

**Nie ersetzt:** Zeilen mit Herkunfts-/Rechtshinweis
(`contributors`, `(c) 20xx`, `Copyright`, `ArtCraft`, `SPDX`, `License`) — die
Namensnennung der Urheber bleibt erhalten. Und niemals klein geschriebene
Bezeichner (`lightcraft*`): Crate-Namen, Dateinamen (`lightcraft_web.js`),
`lightcraft.command`, Canvas-IDs — das ist Produktidentität, nicht Marke.

## Aufruf

```bash
node tools/rebrand/rebrand.mjs --apply   # schreibt, protokolliert je Datei
node tools/rebrand/rebrand.mjs --check   # rot, wenn im Scope etwas offen ist
```

## Pipeline (48 h)

`.github/workflows/upstream-auflage.yml`:

1. **Prüfen** (Minuten): Upstream-`main`-SHA gegen `upstream-pin.txt`.
   Keine Bewegung → Ende (kein Rust-Build).
2. **Bauen** nur bei Bewegung: Rust + `wasm32-unknown-unknown` +
   `wasm-bindgen-cli` (Version aus `Cargo.toml`, aktuell 0.2.129) →
   `rebrand --apply` → `--check` → `cargo xtask web` (`target/web-site/`).
3. **Prüfen am Artefakt**: Titel/„Loading …" tragen „Endless Moments".
4. **Versand**: Artefakt als Build-Artefakt; PR gegen
   `ENDLESS-MOMENTS-Beta` (`web-app/public/editor/**`) — **nur wenn** das
   Secret `VERSAND_TOKEN` (PAT mit `repo`-Rechten) gesetzt ist; fehlt es,
   bleibt der Lauf grün und nennt das Artefakt (ehrlicher Blocker statt
   Fehlschlag).
5. **Pin nachziehen**: `upstream-pin.txt` auf den gebauten Upstream-SHA
   (Commit auf diesen Branch) — der nächste Lauf ist wieder billig.
6. **Merge**: kein Auto-Merge im Workflow selbst. Der PR läuft durch die
   normale CI der Plattform; gemergt wird **nur bei komplett grün**
   (Wächter/Review durch die Koordination).

## Bekannte Grenzen / offene Punkte (nicht geraten, dokumentiert)

- Vollständige `cargo test --workspace`-Läufe sind in v1 **nicht** Teil des
  Jobs (Buildzeit); v1 prüft Build + Rebrand-Check + Artefakt-Marker. Der
  Ausbau (Teststufe mit Cache) ist als TODO im Workflow vermerkt.
- `VERSAND_TOKEN` muss einmalig vom Eigentümer gesetzt werden.
- Der Editor-Fehler-Bericht aus dem Lauf landet im Workflow-Log; rote Läufe
  werden nicht blind wiederholt.
