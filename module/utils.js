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

export async function handleUlricFury(actor, initialDice, testAttrOrValue = 'forceMentale', sourceLabel = null) {
  // Work on a copy of the original dice so that any appended extra dice are not
  // processed again later. This prevents generated 10s from triggering a second
  // independent Fury confirmation beyond the chain already handled for the
  // originating die.
  const final = Array.isArray(initialDice) ? initialDice.slice() : [];
  const original = Array.isArray(initialDice) ? initialDice.slice() : [];
  const logs = [];

  // Determine the numeric threshold to test against. If a number is provided, use it.
  // Otherwise treat the parameter as the name of an actor attribute under principal.actuel
  let actorTestVal = 0;
  // shortLabel will be CC, CT or FM (or a sourceLabel provided by the caller)
  let shortLabel = null;
  if (typeof testAttrOrValue === 'number') {
    actorTestVal = Number(testAttrOrValue) || 0;
    shortLabel = sourceLabel || String(actorTestVal);
  } else {
    actorTestVal = Number(actor?.system?.principal?.actuel?.[testAttrOrValue]) || 0;
    const s = (testAttrOrValue || '').toString().toLowerCase();
    if (s.includes('forcemmentale') || s === 'forcementale' || s === 'fm') shortLabel = 'FM';
    else if (s.includes('ct')) shortLabel = 'CT';
    else if (s.includes('cc')) shortLabel = 'CC';
    else shortLabel = sourceLabel || (testAttrOrValue || '??').toString();
  }

  // Iterate only over the original dice - appended extras are recorded in `final`.
  // For each original 10 we perform a chaining confirmation: roll a 1d100 test
  // to confirm Fureur; if successful, roll a d10 and append it. If that d10
  // is itself a 10, repeat the confirmation+roll sequence (this implements
  // the explosive chaining the rules expect). Crucially, any dice appended
  // to `final` are not treated as "original" and won't trigger separate
  // confirmation loops outside this controlled chaining.
  for (let i = 0; i < original.length; i++) {
    const face = original[i];
    if (face === 10) {
      let continueChain = true;
      while (continueChain) {
  const t = await new Roll('1d100').evaluate();
  const tVal = t.total;
  const tSuccess = tVal <= actorTestVal;
  // Short, consistent log lines (header is added by the caller)
  logs.push(`Test de ${shortLabel}: ${tVal} <= ${actorTestVal} → ${tSuccess ? 'RÉUSSITE' : 'ÉCHEC'}`);
        if (tSuccess) {
          const extra = await rollDiceFaces('1d10');
          const added = (extra.results && extra.results[0]) ? Number(extra.results[0]) : (extra.total || 0);
          final.push(added);
          logs.push(`Relance d10 (fureur): ${added}`);
          // If the added is 10, continue the chain (another confirmation + roll).
          continueChain = (Number(added) === 10);
        } else {
          continueChain = false;
        }
      }
    }
  }
  return { finalDiceArray: final, furyLogs: logs };
}

export function _recalculateDiceMin(html, rowElement = null) {
  const ccActuel = Number(this.actor.system.principal?.actuel?.cc) || 0;

  // If a single row is provided, only process that row; otherwise process all rows
  const rows = rowElement ? [rowElement] : html.find(".weapons-table.melee tbody tr").toArray();

  rows.forEach(tr => {
    const $row = $(tr);

    // Bonus CC
    const bonusCC = Number($row.find("input[name*='bonusCC']").val()) || 0;

    // Qualité
    const q = $row.find("select[name*='quality']").val() || "Ordinaire";
    const qmod = q === "Exceptionnelle" ? 5 : (q === "Mauvaise" ? -5 : 0);

    // Calcul Dés Min (actuel.cc + bonus + qualité)
    const rawDiceMin = ccActuel + bonusCC + qmod;

    // Vérifier la case Maîtrise sur la ligne (si décochée, on divise par 2 et on arrondit à l'inférieur)
    const masteryInput = $row.find("input[type='checkbox'][name*='mastery']");
    const mastered = masteryInput.length ? !!masteryInput.prop('checked') : true;
    const diceMin = mastered ? rawDiceMin : Math.floor(rawDiceMin / 2);

    // MAJ dans le champ readonly
    $row.find("input[name*='diceMin']").val(diceMin);

    // Mettre à jour dans les données de l’acteur (pour persister)
    const path = $row.find("input[name*='diceMin']").attr("name");
    if (path) this.actor.update({ [path]: diceMin });
  });
}

export function _recalculateDiceMinRanged(html, rowElement = null) {
  const ctActuel = Number(this.actor.system.principal?.actuel?.ct) || 0;

  // If a single row is provided, only process that row; otherwise process all ranged rows
  const rows = rowElement ? [rowElement] : html.find(".weapons-table.ranged tbody tr").toArray();

  rows.forEach(tr => {
    const $row = $(tr);

    // Bonus CT
    const bonusCT = Number($row.find("input[name*='bonusCT']").val()) || 0;

    // Qualité
    const q = $row.find("select[name*='quality']").val() || "Ordinaire";
    const qmod = q === "Exceptionnelle" ? 5 : (q === "Mauvaise" ? -5 : 0);

    // Calcul Dés Min (actuel.ct + bonusCT + qualité)
    const rawDiceMin = ctActuel + bonusCT + qmod;

    // Vérifier la case Maîtrise sur la ligne (si décochée, on divise par 2 et on arrondit à l'inférieur)
    const masteryInput = $row.find("input[type='checkbox'][name*='mastery']");
    const mastered = masteryInput.length ? !!masteryInput.prop('checked') : true;
    const diceMin = mastered ? rawDiceMin : Math.floor(rawDiceMin / 2);

    // MAJ dans le champ readonly
    $row.find("input[name*='diceMin']").val(diceMin);

    // Mettre à jour dans les données de l’acteur (pour persister)
    const path = $row.find("input[name*='diceMin']").attr("name");
    if (path) this.actor.update({ [path]: diceMin });
  });
}
