// Utility helpers for Warhammer2e system
// Exported functions used by the main actor sheet module

export function parseDamageSpec(s) {
  if (s === undefined || s === null) return { flat: 0, raw: '' };
  if (typeof s === 'number') return { flat: s, raw: String(s) };
  const str = String(s).trim();
  if (/^[+-]?\d+$/.test(str)) return { flat: Number(str), raw: str };
  const m = str.replace(/\s+/g, '').match(/(\d+)d(\d+)([+-]\d+)?/);
  if (!m) return { flat: 0, raw: str };
  const flat = m[3] ? Number(m[3]) : 0;
  return { flat, raw: str };
}

export function getZoneFromD100(v) {
  if (v >= 1 && v <= 15) return 'Tête';
  if (v >= 16 && v <= 35) return 'Bras Droit';
  if (v >= 36 && v <= 55) return 'Bras Gauche';
  if (v >= 56 && v <= 80) return 'Corps';
  if (v >= 81 && v <= 90) return 'Jambe Droite';
  return 'Jambe Gauche';
}

export async function rollDiceFaces(expr) {
  const r = await new Roll(expr).evaluate();
  if (!r.dice || !r.dice[0] || !Array.isArray(r.dice[0].results)) return { results: [], total: r.total };
  const faces = r.dice[0].results.map(x => x.result);
  return { results: faces, total: r.total };
}

export async function handleUlricFury(actor, initialDice) {
  const final = Array.isArray(initialDice) ? initialDice.slice() : [];
  const logs = [];
  const actorFM = Number(actor?.system?.principal?.actuel?.forceMentale) || 0;
  for (let i = 0; i < final.length; i++) {
    const face = final[i];
    if (face === 10) {
      let continueFury = true;
      while (continueFury) {
  const fm = await new Roll('1d100').evaluate();
        const fmVal = fm.total;
        const fmSuccess = fmVal <= actorFM;
        logs.push(`Fureur d'Ulric: Test FM ${fmVal} <= ${actorFM} → ${fmSuccess ? 'RÉUSSITE' : 'ÉCHEC'}`);
        if (fmSuccess) {
          const extra = await rollDiceFaces('1d10');
          const added = (extra.results && extra.results[0]) ? Number(extra.results[0]) : (extra.total || 0);
          final.push(added);
          logs.push(`Relance d10 (fureur): ${added}`);
          continueFury = (Number(added) === 10);
        } else {
          continueFury = false;
        }
      }
    }
  }
  return { finalDiceArray: final, furyLogs: logs };
}
