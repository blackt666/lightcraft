#!/usr/bin/env node
/**
 * REBRAND "LightCraft" -> "Endless Moments" (deterministisch).
 *
 * ## Warum dieses Skript so eng gefasst ist
 *
 * Die historische Umbenennung (14.10.2026) entstand als einmaliger Byte-Patch
 * (169 Ersetzungen in 42 Dateien, 632 in den Locales). Dieses Werkzeug ist
 * NICHT rekonstruiert — es definiert die Regel GEHEND WEITER, nachvollziehbar
 * und in der CI prüfbar. Wo etwas bewusst NICHT ersetzt wird, steht es unten.
 *
 * ## Regeln
 *
 *  S1  crates/**.rs                    : "LightCraft" -> "Endless Moments"
 *  S2  crates/ui-egui/** (inkl. .rs)   : zusätzlich "Lightcraft" -> "Endless Moments"
 *  S3  apps/lightcraft-web/**          : beide Schreibweisen
 *  S4  crates/ui-egui/locales/*.json   : beide Schreibweisen (nur Werte)
 *
 *  NIE ersetzt:
 *  - Zeilen mit Herkunfts-/Rechtshinweis (contributors, (c) 20xx, Copyright,
 *    ArtCraft, SPDX, LICENSE) — die Namensnennung bleibt erhalten (Lizenz!).
 *  - Klein geschriebene Bezeichner `lightcraft*` (Crates, Dateinamen,
 *    `lightcraft.command`, `lightcraft_web.js`, canvas-IDs) — Produktidentität.
 *  - packaging/, .github/, docs/, README*, AGENTS.md, CLAUDE.md, ROADMAP.md,
 *    NOTICE, LICENSE*, contributors/ — nicht Teil des Web-Artefakts; bewusst
 *    außen vor, damit der Diff klein und prüfbar bleibt.
 *
 * Aufruf:  node tools/rebrand/rebrand.mjs --apply | --check
 * Exit:    --check ist rot (1), wenn im Scope eine unersetzte Marke steht.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, extname } from 'node:path';

const WURZEL = process.cwd();
const TEXT_ENDUNGEN = new Set(['.rs', '.json', '.html', '.js', '.mjs', '.ts', '.tsx', '.css', '.svg', '.toml', '.txt']);
const AUSGESCHLOSSEN = [/^packaging\//, /^\.github\//, /^docs\//, /^contributors\//];
const AUSGESCHLOSSENE_DATEIEN = [/^README/, /^AGENTS\.md$/, /^CLAUDE\.md$/, /^ROADMAP\.md$/, /^NOTICE$/, /^LICENSE/];
const HERKUNFT = /contributors|\(c\)\s*20\d\d|copyright|artcraft|spdx|license/i;

function dateienSammeln(verzeichnis, liste = []) {
  for (const eintrag of readdirSync(verzeichnis)) {
    if (eintrag === '.git' || eintrag === 'target' || eintrag === 'node_modules') continue;
    const p = join(verzeichnis, eintrag);
    const rel = relative(WURZEL, p).replaceAll('\\', '/');
    if (statSync(p).isDirectory()) {
      if (AUSGESCHLOSSEN.some((r) => r.test(rel + '/'))) continue;
      dateienSammeln(p, liste);
    } else if (TEXT_ENDUNGEN.has(extname(eintrag))) {
      if (AUSGESCHLOSSENE_DATEIEN.some((r) => r.test(rel))) continue;
      liste.push(rel);
    }
  }
  return liste.sort();
}

/** Welche Schreibweisen ersetzt diese Datei? */
function erlaubteMarken(rel) {
  if (rel.startsWith('crates/ui-egui/') || rel.startsWith('apps/lightcraft-web/')) {
    return ['LightCraft', 'Lightcraft'];
  }
  if (rel.startsWith('crates/')) return ['LightCraft'];
  return [];
}

function umschreiben(rel) {
  const marken = erlaubteMarken(rel);
  if (marken.length === 0) return { rel, treffer: 0, zeilen: [] };
  const inhalt = readFileSync(join(WURZEL, rel), 'utf8');
  const zeilen = inhalt.split('\n');
  let treffer = 0;
  const neu = zeilen.map((zeile) => {
    if (HERKUNFT.test(zeile)) return zeile; // Namensnennung bleibt
    let z = zeile;
    for (const marke of marken) {
      // NUR die freistehende Marke — zusammengeschriebene Bezeichner wie
      // `LightCraftApp`/`LightcraftIcon` sind CODE und bleiben stehen.
      const re = new RegExp(`(?<![\\w])${marke}(?![\\w])`, 'g');
      const trefferHier = (z.match(re) || []).length;
      if (trefferHier > 0) {
        treffer += trefferHier;
        z = z.replace(re, 'Endless Moments');
      }
    }
    return z;
  });
  return { rel, treffer, inhalt: neu.join('\n'), original: inhalt, zeilen: neu };
}

const modus = process.argv[2];
if (modus !== '--apply' && modus !== '--check') {
  console.error('Aufruf: node tools/rebrand/rebrand.mjs --apply | --check');
  process.exit(2);
}

let gesamt = 0;
let restImScope = 0;
for (const rel of dateienSammeln(WURZEL)) {
  const ergebnis = umschreiben(rel);
  if (ergebnis.treffer === 0 && !ergebnis.inhalt) continue;
  if (ergebnis.treffer > 0) {
    gesamt += ergebnis.treffer;
    console.log(`${modus === '--apply' ? 'ersetzt' : 'würde ersetzen'}: ${rel}: ${ergebnis.treffer}`);
    if (modus === '--apply') writeFileSync(join(WURZEL, rel), ergebnis.inhalt);
  }
  // Restbestand im Scope (ohne Herkunftszeilen) zaehlen
  const marken = erlaubteMarken(rel);
  const quelle = modus === '--apply' ? ergebnis.inhalt : ergebnis.original;
  if (quelle) {
    for (const zeile of quelle.split('\n')) {
      if (HERKUNFT.test(zeile)) continue;
      for (const marke of marken) {
        const re = new RegExp(`(?<![\\w])${marke}(?![\\w])`, 'g');
        restImScope += (zeile.match(re) || []).length;
      }
    }
  }
}

console.log(`Summe: ${gesamt} Ersetzung(en)`);
if (modus === '--check') {
  const index = readFileSync(join(WURZEL, 'apps/lightcraft-web/index.html'), 'utf8');
  const titelOk = index.includes('<title>Endless Moments</title>');
  console.log(`Titel in index.html: ${titelOk ? 'Endless Moments ✓' : 'FEHLT'}`);
  if (restImScope > 0 || !titelOk) {
    console.error(`CHECK ROT: ${restImScope} unersetzte Marke(n) im Scope, Titel ok: ${titelOk}`);
    process.exit(1);
  }
  console.log('CHECK GRÜN: keine unersetzten Marken im Scope, Titel gesetzt.');
}
