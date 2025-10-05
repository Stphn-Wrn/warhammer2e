
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

  const final = Array.isArray(initialDice) ? initialDice.slice() : [];
  const original = Array.isArray(initialDice) ? initialDice.slice() : [];
  const logs = [];

  let actorTestVal = 0;
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

  for (let i = 0; i < original.length; i++) {
    const face = original[i];
    if (face === 10) {
      let continueChain = true;
      while (continueChain) {
  const t = await new Roll('1d100').evaluate();
  const tVal = t.total;
  const tSuccess = tVal <= actorTestVal;
  logs.push(`Test de ${shortLabel}: ${tVal} <= ${actorTestVal} → ${tSuccess ? 'RÉUSSITE' : 'ÉCHEC'}`);
        if (tSuccess) {
          const extra = await rollDiceFaces('1d10');
          const added = (extra.results && extra.results[0]) ? Number(extra.results[0]) : (extra.total || 0);
          final.push(added);
          logs.push(`Relance d10 (fureur): ${added}`);
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

  const rows = rowElement ? [rowElement] : html.find(".weapons-table.melee tbody tr").toArray();

  rows.forEach(tr => {
    const $row = $(tr);

    const bonusCC = Number($row.find("input[name*='bonusCC']").val()) || 0;

    const q = $row.find("select[name*='quality']").val() || "Ordinaire";
    const qmod = q === "Exceptionnelle" ? 5 : (q === "Mauvaise" ? -5 : 0);

    const rawDiceMin = ccActuel + bonusCC + qmod;

    const masteryInput = $row.find("input[type='checkbox'][name*='mastery']");
    const mastered = masteryInput.length ? !!masteryInput.prop('checked') : true;
    const diceMin = mastered ? rawDiceMin : Math.floor(rawDiceMin / 2);

    $row.find("input[name*='diceMin']").val(diceMin);

    const path = $row.find("input[name*='diceMin']").attr("name");
    if (path) this.actor.update({ [path]: diceMin });
  });
}

export function _recalculateDiceMinRanged(html, rowElement = null) {
  const ctActuel = Number(this.actor.system.principal?.actuel?.ct) || 0;

  const rows = rowElement ? [rowElement] : html.find(".weapons-table.ranged tbody tr").toArray();

  rows.forEach(tr => {
    const $row = $(tr);

    const bonusCT = Number($row.find("input[name*='bonusCT']").val()) || 0;

    const q = $row.find("select[name*='quality']").val() || "Ordinaire";
    const qmod = q === "Exceptionnelle" ? 5 : (q === "Mauvaise" ? -5 : 0);

  const rawDiceMin = ctActuel + bonusCT + qmod;

  const masteryInput = $row.find("input[type='checkbox'][name*='mastery']");
  const mastered = masteryInput.length ? !!masteryInput.prop('checked') : true;
  let diceMin = mastered ? rawDiceMin : Math.floor(rawDiceMin / 2);

  const typeSelect = $row.find("select[name*='type']");
  const typeVal = (typeSelect.val() || '').toString().trim().toLowerCase();
  if (typeVal === 'jet') diceMin += 20;

    $row.find("input[name*='diceMin']").val(diceMin);

    const path = $row.find("input[name*='diceMin']").attr("name");
    if (path) this.actor.update({ [path]: diceMin });
  });
}
