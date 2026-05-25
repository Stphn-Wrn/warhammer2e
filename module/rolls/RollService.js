import { getZoneFromD100, rollDiceFaces, handleUlricFury } from '../utils.js';

export { getZoneFromD100 };

export async function rollD100() {
  const roll = new Roll('1d100');
  await roll.evaluate();
  return roll;
}

export function formatD100Result(result, target) {
  const success = result <= target;
  const degrees = Math.floor(Math.abs(target - result) / 10);
  const label   = success ? 'RÉUSSITE' : 'ÉCHEC';
  const color   = success ? 'green' : 'red';
  const degText = degrees ? ` avec ${degrees} degré${degrees > 1 ? 's' : ''}` : '';
  return {
    success,
    degrees,
    html: `<span style="color:${color};"><strong>${label}</strong>${degText}</span>`
  };
}

export function buildRerollButton(actorId, target, modifier) {
  return `<div class="reroll-controls">
    <button class="reroll-roll"
            data-actor-id="${actorId}"
            data-target="${target}"
            data-modifier="${modifier}">Relancer (Coût: 1 Chance)</button>
  </div>`;
}

export async function rollWeaponDamage({ actor, weapon, circFuryConfirm, circDegatsBonus, skillValue, skillLabel }) {
  const weaponDamage = Number(weapon.damage) || 0;
  const isPerc       = !!weapon.perc;
  const diceMinVal   = Number(weapon.diceMin) || 0;
  const bf           = Number(weapon.bf) || 0;

  const rollSingle = async () => {
    const r = await new Roll('1d10').evaluate();
    let face = 0;
    try { face = r.dice?.[0]?.results?.[0] ? Number(r.dice[0].results[0].result) : 0; } catch (_) {}
    return { rollObj: r, face: Number(face) };
  };

  const modifiers = weaponDamage + bf;
  const d1 = await rollSingle();
  const d2 = isPerc ? await rollSingle() : null;

  const initialTens = [];
  if (d1.face === 10) initialTens.push(10);
  if (d2?.face === 10) initialTens.push(10);

  const extraFaces = [];
  const furyLogs   = [];

  if (initialTens.length > 0) {
    if (circFuryConfirm) {
      let cont = true;
      while (cont) {
        const extra = await rollDiceFaces('1d10');
        const added = extra.results?.[0] ? Number(extra.results[0]) : (extra.total || 0);
        extraFaces.push(Number(added));
        furyLogs.push(`Relance d10 (fureur auto): ${added}`);
        cont = (Number(added) === 10);
      }
    } else {
      const res = await handleUlricFury(actor, initialTens, Number(diceMinVal), skillLabel || 'CC');
      extraFaces.push(...(res.finalDiceArray || []).slice(initialTens.length).map(x => Number(x) || 0));
      furyLogs.push(...(res.furyLogs || []));
    }
  }

  const extrasSum  = extraFaces.reduce((s, v) => s + v, 0);
  let   baseKept   = d1.face;
  let   best       = d1;
  if (d2 && d2.face > d1.face) { baseKept = d2.face; best = d2; }

  const total = modifiers + baseKept + extrasSum + (Number(circDegatsBonus) || 0);
  best.total      = total;
  best.extras     = extraFaces;
  best.furyLogs   = furyLogs;
  best.highestDie = baseKept;

  const parts = [];
  parts.push(`<div><strong>Dégats de l'arme :</strong> ${baseKept}</div>`);
  parts.push(`<div><strong>BF + Dégâts de l'arme :</strong> ${modifiers}</div>`);
  if (Number(circDegatsBonus)) parts.push(`<div><strong>Dégâts bonus :</strong> ${circDegatsBonus}</div>`);
  parts.push(`<div><strong>Fureur :</strong> ${extrasSum}</div>`);
  parts.push(`<hr><div><strong>Total :</strong> ${total}</div>`);
  parts.push(`<div class="roll-details">${await best.rollObj.render()}</div>`);
  if (extraFaces.length) parts.push(`<div><strong>Dés observés (Fureur) :</strong> ${extraFaces.join(', ')} — <em>le plus élevé (${baseKept}) est pris en compte</em></div>`);
  if (d2) {
    const other = best === d1 ? d2 : d1;
    parts.push(`<div><em>Percutant :</em><div class="roll-details">${await other.rollObj.render()}</div></div>`);
  }
  if (furyLogs.length) parts.push(`<div style="color:darkred"><strong>Fureur d'Ulric:</strong><br>${furyLogs.map(l => `<div>${l}</div>`).join('')}</div>`);

  return { total, html: parts.join(''), best, d2 };
}

export function zoneFromAttackRoll(raw) {
  const twoDigits = String(raw % 100).padStart(2, '0');
  const reversed  = twoDigits.split('').reverse().join('');
  let   zoneVal   = Number(reversed);
  if (zoneVal === 0) zoneVal = 100;
  return { zoneName: getZoneFromD100(zoneVal), zoneVal };
}
