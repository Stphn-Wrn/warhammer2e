export function escapeHtml(value) {
  return (value ?? '').toString()
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export function formatDescription(value, emptyFallback = '') {
  const str = (value ?? '').toString().trim();
  if (!str) return emptyFallback;
  return escapeHtml(str).replace(/\n+/g, '<br>');
}

export function buildSkillCaracLookup(actuel) {
  const a = actuel ?? {};
  return {
    CC:  Number(a.cc)           || 0,
    CT:  Number(a.ct)           || 0,
    F:   Number(a.force)        || 0,
    E:   Number(a.endurance)    || 0,
    Ag:  Number(a.agilite)      || 0,
    Int: Number(a.intelligence) || 0,
    FM:  Number(a.forceMentale) || 0,
    Soc: Number(a.sociabilite)  || 0,
  };
}

export function computeSkillTotal(skill, caracValue) {
  const niveau  = Number(skill.niveau)  || 0;
  const talents = Number(skill.talents) || 0;
  const divers  = Number(skill.divers)  || 0;
  const caraBase = skill.avance ? Number(caracValue) : Math.floor(Number(caracValue) / 2);
  return niveau + talents + divers + caraBase;
}

export function parseDamageSpec(s) {
  if (s === undefined || s === null) return { flat: 0, raw: '' };
  if (typeof s === 'number') return { flat: s, raw: String(s) };
  const str = String(s).trim();
  if (/^[+-]?\d+$/.test(str)) return { flat: Number(str), raw: str };
  const m = str.replace(/\s+/g, '').match(/(\d+)d(\d+)([+-]\d+)?/);
  if (!m) return { flat: 0, raw: str };
  return { flat: m[3] ? Number(m[3]) : 0, raw: str };
}

export function getZoneFromD100(v) {
  if (v >= 1  && v <= 15) return 'Tête';
  if (v >= 16 && v <= 35) return 'Bras Droit';
  if (v >= 36 && v <= 55) return 'Bras Gauche';
  if (v >= 56 && v <= 80) return 'Corps';
  if (v >= 81 && v <= 90) return 'Jambe Droite';
  return 'Jambe Gauche';
}

export async function rollDiceFaces(expr) {
  const r = await new Roll(expr).evaluate();
  if (!r.dice?.[0] || !Array.isArray(r.dice[0].results)) return { results: [], total: r.total };
  return { results: r.dice[0].results.map(x => x.result), total: r.total };
}

export async function handleUlricFury(actor, initialDice, testAttrOrValue = 'forceMentale', sourceLabel = null) {
  const final    = Array.isArray(initialDice) ? initialDice.slice() : [];
  const original = Array.isArray(initialDice) ? initialDice.slice() : [];
  const logs     = [];

  let actorTestVal = 0;
  let shortLabel   = null;
  if (typeof testAttrOrValue === 'number') {
    actorTestVal = Number(testAttrOrValue) || 0;
    shortLabel   = sourceLabel || String(actorTestVal);
  } else {
    actorTestVal = Number(actor?.system?.principal?.actuel?.[testAttrOrValue]) || 0;
    const s = (testAttrOrValue || '').toString().toLowerCase();
    if (s.includes('forcementale') || s === 'fm') shortLabel = 'FM';
    else if (s.includes('ct')) shortLabel = 'CT';
    else if (s.includes('cc')) shortLabel = 'CC';
    else shortLabel = sourceLabel || (testAttrOrValue || '??').toString();
  }

  for (let i = 0; i < original.length; i++) {
    if (original[i] !== 10) continue;
    let cont = true;
    while (cont) {
      const t = await new Roll('1d100').evaluate();
      const ok = t.total <= actorTestVal;
      logs.push(`Test de ${shortLabel}: ${t.total} <= ${actorTestVal} → ${ok ? 'RÉUSSITE' : 'ÉCHEC'}`);
      if (ok) {
        const extra = await rollDiceFaces('1d10');
        const added = (extra.results?.[0]) ? Number(extra.results[0]) : (extra.total || 0);
        final.push(added);
        logs.push(`Relance d10 (fureur): ${added}`);
        cont = (Number(added) === 10);
      } else {
        cont = false;
      }
    }
  }
  return { finalDiceArray: final, furyLogs: logs };
}

// Takes `sheet` as explicit first argument instead of using `this`
export function recalculateDiceMin(sheet, html, rowElement = null) {
  const ccActuel = Number(sheet.actor.system.principal?.actuel?.cc) || 0;
  const rows     = rowElement ? [rowElement] : html.find('.weapons-table.melee tbody tr').toArray();

  rows.forEach(tr => {
    const $row   = $(tr);
    const bonusCC= Number($row.find("input[name*='bonusCC']").val()) || 0;
    const q      = $row.find("select[name*='quality']").val() || 'Ordinaire';
    const qmod   = q === 'Exceptionnelle' ? 5 : (q === 'Mauvaise' ? -5 : 0);
    const raw    = ccActuel + bonusCC + qmod;
    const mastered = $row.find("input[type='checkbox'][name*='mastery']").length ? !!$row.find("input[type='checkbox'][name*='mastery']").prop('checked') : true;
    const diceMin  = mastered ? raw : Math.floor(raw / 2);
    $row.find("input[name*='diceMin']").val(diceMin);
    const path = $row.find("input[name*='diceMin']").attr('name');
    if (path) sheet.actor.update({ [path]: diceMin });
  });
}

export function recalculateDiceMinRanged(sheet, html, rowElement = null) {
  const ctActuel = Number(sheet.actor.system.principal?.actuel?.ct) || 0;
  const rows     = rowElement ? [rowElement] : html.find('.weapons-table.ranged tbody tr').toArray();

  rows.forEach(tr => {
    const $row   = $(tr);
    const bonusCT= Number($row.find("input[name*='bonusCT']").val()) || 0;
    const q      = $row.find("select[name*='quality']").val() || 'Ordinaire';
    const qmod   = q === 'Exceptionnelle' ? 5 : (q === 'Mauvaise' ? -5 : 0);
    const raw    = ctActuel + bonusCT + qmod;
    const mastered  = $row.find("input[type='checkbox'][name*='mastery']").length ? !!$row.find("input[type='checkbox'][name*='mastery']").prop('checked') : true;
    const typeVal   = ($row.find("select[name*='type']").val() || '').toString().trim().toLowerCase();
    let   diceMin   = mastered ? raw : Math.floor(raw / 2);
    if (typeVal === 'jet') diceMin += 20;
    $row.find("input[name*='diceMin']").val(diceMin);
    const path = $row.find("input[name*='diceMin']").attr('name');
    if (path) sheet.actor.update({ [path]: diceMin });
  });
}

// Keep old names as aliases for any external callers
export const _recalculateDiceMin       = recalculateDiceMin;
export const _recalculateDiceMinRanged = recalculateDiceMinRanged;
