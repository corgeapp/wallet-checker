/**
 * fix_scores.mjs
 *
 * Reads collection_scores.csv, recalculates labels and adds is_new_wallet
 * based on the raw (pre-confidence) score, then writes collection_scores_fixed.csv.
 *
 * Scoring rules:
 *   raw_score = wallet_score / confidence_multiplier(flip_count)
 *   label     = getLabel(raw_score)          ← based on RAW score
 *   is_new_wallet = flip_count <= 2
 *
 * Confidence multipliers:
 *   1 → 0.16 | 2 → 0.36 | 3 → 0.52 | 4 → 0.62 | 5 → 0.72
 *   6 → 0.82 | 7 → 0.91 | 8 → 0.96 | 9 → 0.99 | 10+ → 1.00
 *
 * Label ranges (raw score):
 *   0 – 1.0   → Jeet
 *   1.1 – 2.5 → Paper Hands
 *   2.6 – 3.0 → Flipper
 *   3.1 – 5.0 → Normal
 *   5.1 – 7.0 → Solid
 *   7.1 – 9.0 → Chad
 *   9.1 – 10  → Diamond Hands
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const INPUT = resolve(__dirname, 'collection_scores.csv');
const OUTPUT = resolve(__dirname, 'collection_scores_fixed.csv');

// ─── Confidence multiplier ────────────────────────────────────────────────────

function confidenceMultiplier(flips) {
    const table = { 1: 0.16, 2: 0.36, 3: 0.52, 4: 0.62, 5: 0.72, 6: 0.82, 7: 0.91, 8: 0.96, 9: 0.99 };
    if (flips <= 0) return 0.16;
    if (flips >= 10) return 1.00;
    return table[flips] ?? 1.00;
}

// ─── Label from RAW score ─────────────────────────────────────────────────────

function getLabel(rawScore) {
    if (rawScore <= 1.0) return 'Jeet';
    if (rawScore <= 2.5) return 'Paper Hands';
    if (rawScore <= 3.0) return 'Flipper';
    if (rawScore <= 5.0) return 'Normal';
    if (rawScore <= 7.0) return 'Solid';
    if (rawScore <= 9.0) return 'Chad';
    return 'Diamond Hands';
}

// ─── Parse CSV ────────────────────────────────────────────────────────────────

const raw = readFileSync(INPUT, 'utf8');
const lines = raw.split(/\r?\n/).filter(l => l.trim().length > 0);
const header = lines[0].split(',').map(h => h.trim().toLowerCase());

function col(name) { return header.indexOf(name); }

const iWallet = col('wallet');
const iScore = col('wallet_score');
const iLabel = col('label');
const iSweeper = col('is_sweeper');
const iFlips = col('flip_count');
const iConf = col('confidence');

if (iWallet === -1 || iScore === -1 || iFlips === -1) {
    console.error('❌  Missing required columns (wallet, wallet_score, flip_count)');
    process.exit(1);
}

// ─── Process rows ─────────────────────────────────────────────────────────────

let fixed = 0, total = 0;
const outputRows = [];

for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
    const wallet = cols[iWallet] ?? '';
    const score = parseFloat(cols[iScore] ?? '0');
    const flips = parseInt(cols[iFlips] ?? '0', 10);
    const isSweeper = (cols[iSweeper] ?? 'false').toLowerCase();
    const conf = iConf !== -1 ? parseFloat(cols[iConf] ?? '1') : confidenceMultiplier(flips);

    if (!wallet.startsWith('0x')) continue;
    total++;

    // Reverse-engineer raw score from the stored post-confidence score
    const multiplier = confidenceMultiplier(flips);
    const rawScore = multiplier > 0 ? score / multiplier : score;

    // Derive correct label from raw score
    const correctLabel = getLabel(rawScore);
    const isNewWallet = flips <= 2;
    const oldLabel = cols[iLabel] ?? '';

    if (oldLabel !== correctLabel || isNewWallet) fixed++;

    outputRows.push([
        wallet,
        score.toFixed(2),
        correctLabel,
        isSweeper,
        flips,
        conf,
        isNewWallet ? 'true' : 'false',
    ].join(','));
}

// ─── Write output ─────────────────────────────────────────────────────────────

const newHeader = 'wallet,wallet_score,label,is_sweeper,flip_count,confidence,is_new_wallet';
writeFileSync(OUTPUT, [newHeader, ...outputRows].join('\n'), 'utf8');

console.log(`✅  Done.`);
console.log(`    Input:   ${INPUT}`);
console.log(`    Output:  ${OUTPUT}`);
console.log(`    Total rows processed : ${total}`);
console.log(`    Rows updated         : ${fixed}`);
console.log(`    New wallets flagged  : ${outputRows.filter(r => r.endsWith(',true')).length}`);
