import { recalculateDiceMin, recalculateDiceMinRanged } from '../utils.js';
import { rollD100, buildRerollButton, rollWeaponDamage, zoneFromAttackRoll } from '../rolls/RollService.js';

const CIRCONSTANCE_FORM = `
  <form>
    <div class="form-group"><label>Bonus de circonstance</label><input type="number" id="circ-bonus" value="0" /></div>
    <div class="form-group"><label>Dégâts bonus</label><input type="number" id="circ-degats-bonus" value="0" min="0" step="1" /></div>
    <div class="form-group"><label>Fureur confirmée</label><select id="circ-fury-confirm"><option value="false" selected>Non</option><option value="true">Oui</option></select></div>
  </form>`;

function readCirconstance(dlg) {
  return {
    circBonus:       Number(dlg.find('#circ-bonus').val())        || 0,
    circDegatsBonus: Number(dlg.find('#circ-degats-bonus').val()) || 0,
    circFuryConfirm: dlg.find('#circ-fury-confirm').val() === 'true'
  };
}

export function wireWeaponHandlers(sheet, html) {
  // ── CC base change → update diceMin for all melee weapons ─────────────────
  html.find("input[name='system.principal.base.cc']").on('change', async ev => {
    const newCc = Math.max(1, Number(ev.currentTarget.value) || 0);
    html.find("input[name$='.diceMin']").each((_, el) => {
      if ((/^system\.weapons\.\d+\.diceMin$/).test($(el).attr('name') || '')) $(el).val(newCc);
    });
    try {
      const weapons = Array.isArray(sheet.actor.system.weapons) ? sheet.actor.system.weapons.slice() : [];
      let changed   = false;
      const updated = weapons.map(w => {
        if (!w || w.mastery) return w;
        if (Number(w.diceMin) !== newCc) { changed = true; return Object.assign({}, w, { diceMin: newCc }); }
        return w;
      });
      if (changed) await sheet.actor.update({ 'system.weapons': updated });
    } catch (err) { console.error('Unable to persist updated diceMin from CC change', err); }
  });

  // ── CT base change → update diceMin for all ranged weapons ────────────────
  html.find("input[name='system.principal.base.ct']").on('change', async ev => {
    const newCt = Math.max(1, Number(ev.currentTarget.value) || 0);
    html.find("input[name$='.diceMin']").each((_, el) => {
      if ((/^system\.rangedWeapons\.\d+\.diceMin$/).test($(el).attr('name') || '')) $(el).val(newCt);
    });
    try {
      const ranged  = Array.isArray(sheet.actor.system.rangedWeapons) ? sheet.actor.system.rangedWeapons.slice() : [];
      let changed   = false;
      const updated = ranged.map(w => {
        if (!w || w.mastery) return w;
        if (Number(w.diceMin) !== newCt) { changed = true; return Object.assign({}, w, { diceMin: newCt }); }
        return w;
      });
      if (changed) await sheet.actor.update({ 'system.rangedWeapons': updated });
    } catch (err) { console.error('Unable to persist updated diceMin from CT change', err); }
  });

  // ── Force base change → propagate BF ──────────────────────────────────────
  const updateWeaponsBf = async newBf => {
    html.find("input[name$='.bf']").each((_, el) => {
      if ((/^system\.weapons\.\d+\.bf$/).test($(el).attr('name') || '')) $(el).val(newBf);
    });
    try {
      const oldBf   = Number(sheet.actor.system.secondaire?.actuel?.bf) || 0;
      const weapons = Array.isArray(sheet.actor.system.weapons) ? sheet.actor.system.weapons.slice() : [];
      let changed   = false;
      const updated = weapons.map(w => {
        if (!w) return w;
        if (Number(w.bf) === oldBf) { changed = true; return Object.assign({}, w, { bf: newBf }); }
        return w;
      });
      if (changed) await sheet.actor.update({ 'system.weapons': updated });
    } catch (err) { console.error('Unable to persist updated weapon BF', err); }
  };

  html.find("input[name='system.principal.base.force']").on('change', async ev => {
    const base = Math.round(Number(ev.currentTarget.value) || 0);
    const mod  = Number(sheet.actor.system.secondaire?.mod?.bf) || 0;
    await updateWeaponsBf(Math.floor(base / 10) + mod);
  });

  html.find("input[name='system.secondaire.mod.bf']").on('change', async ev => {
    const mod  = Number(ev.currentTarget.value) || 0;
    const base = Math.round(Number(sheet.actor.system.principal?.actuel?.force) || 0);
    await updateWeaponsBf(Math.floor(base / 10) + mod);
  });

  // ── diceMin recalculation on quality/bonus changes ─────────────────────────
  html.find('.weapons-table.melee').on('change', "input[name*='bonusCC'], select[name*='quality'], input[type='checkbox'][name*='mastery']", ev => {
    recalculateDiceMin(sheet, html, $(ev.currentTarget).closest('tr').get(0));
  });

  html.find('.weapons-table.ranged').on('change', "input[name*='bonusCT'], select[name*='quality'], input[type='checkbox'][name*='mastery'], select[name*='type']", ev => {
    recalculateDiceMinRanged(sheet, html, $(ev.currentTarget).closest('tr').get(0));
  });

  // ── Melee attack roll ──────────────────────────────────────────────────────
  html.find('.weapons-table.melee').on('click', '.gold-roll.melee-attack', ev => {
    ev.preventDefault();
    const $btn   = $(ev.currentTarget);
    const $row   = $btn.closest('tr');
    const actor  = sheet.actor;

    new Dialog({
      title: "Jet d'attaque — circonstance",
      content: CIRCONSTANCE_FORM,
      buttons: {
        roll: {
          label: 'Lancer',
          callback: async dlg => {
            try {
              const { circBonus, circDegatsBonus, circFuryConfirm } = readCirconstance(dlg);

              const idx    = $btn.data('index');
              const weapon = (idx !== undefined && Array.isArray(actor.system.weapons)) ? actor.system.weapons[idx] : null;
              const name   = weapon?.name || $row.find("input[type='text']").first().val() || 'Arme';

              const q       = weapon ? (weapon.quality || 'Ordinaire') : ($row.find("select[name*='quality']").val() || 'Ordinaire');
              const qmod    = q === 'Exceptionnelle' ? 5 : (q === 'Mauvaise' ? -5 : 0);
              const bonusCC = weapon ? Number(weapon.bonusCC) || 0 : Number($row.find("input[name*='bonusCC']").val()) || 0;
              const baseCC  = Number(actor.system.principal?.actuel?.cc) || 0;
              const mastered= weapon ? !!weapon.mastery : !!$row.find("input[type='checkbox'][name*='mastery']").prop('checked');
              const raw_target = baseCC + qmod + bonusCC + circBonus;
              const finalTarget = mastered ? raw_target : Math.floor(raw_target / 2);

              const attackRoll = await rollD100();
              const raw        = attackRoll.total;
              const success    = raw <= finalTarget;

              const circDisplay = circBonus ? (circBonus > 0 ? `+${circBonus}` : `${circBonus}`) : '';

              let content = `
                <div class="weapon-attack-roll">
                  <strong>${name}</strong>
                  <div><strong>Objectif :</strong> ${finalTarget}</div>
                  <div><strong>Jet d'attaque :</strong> <strong>${raw}</strong></div>
                  ${circDisplay ? `<div><strong>Circonstance :</strong> ${circDisplay}</div>` : ''}
                  <div style="color:${success ? 'green' : 'red'}"><strong>${success ? 'RÉUSSITE' : 'ÉCHEC'}</strong></div>
                  ${buildRerollButton(actor?.id || '', finalTarget, raw - finalTarget)}
                </div>`;

              if (!success) {
                ChatMessage.create({ user: game.user.id, speaker: ChatMessage.getSpeaker({ actor }), content: content + `<div class="roll-details">${await attackRoll.render()}</div>` });
                return;
              }

              const { zoneName } = zoneFromAttackRoll(raw);
              const weaponForDmg = weapon ? { ...weapon, bf: Number(weapon?.bf) || 0 } : {
                damage:   Number($row.find("input[name*='damage']").val()) || 0,
                perc:     !!$row.find("input[name*='perc']").prop('checked'),
                diceMin:  Number($row.find("input[name*='diceMin']").val()) || 0,
                bf:       Number($row.find("input[name*='.bf']").val()) || 0,
                attributes: $row.find("input[name*='.attributes']").val() || ''
              };

              const dmgResult = await rollWeaponDamage({ actor, weapon: weaponForDmg, circFuryConfirm, circDegatsBonus, skillLabel: 'CC' });

              const attrText = weapon ? (weapon.attributes || '') : ($row.find("input[name*='.attributes']").val() || '');
              const summary  = [
                `<div class="weapon-attack-roll"><strong>${name}</strong></div>`,
                `<div><strong>Objectif :</strong> ${finalTarget}</div>`,
                `<div><strong>Jet d'attaque :</strong> ${raw}</div>`,
                circDisplay ? `<div><strong>Circonstance :</strong> ${circDisplay}</div>` : '',
                `<div><strong>Zone touchée :</strong> ${zoneName}</div>`,
                attrText ? `<div><strong>Attribut :</strong> ${attrText}</div>` : '',
                dmgResult.html,
                buildRerollButton(actor?.id || '', finalTarget, raw - finalTarget)
              ].filter(Boolean);

              ChatMessage.create({ user: game.user.id, speaker: ChatMessage.getSpeaker({ actor }), content: `<div class="spell-cast-result">${summary.join('')}</div>` });
            } catch (err) { console.error('Melee attack failed', err); ui.notifications.error("Erreur lors du jet d'attaque"); }
          }
        },
        cancel: { label: 'Annuler' }
      },
      default: 'roll'
    }).render(true);
  });

  // ── Melee parade roll ──────────────────────────────────────────────────────
  html.find('.weapons-table.melee').on('click', '.gold-roll.melee-parade', async ev => {
    ev.preventDefault();
    const $btn  = $(ev.currentTarget);
    const $row  = $btn.closest('tr');
    const actor = sheet.actor;
    try {
      const idx     = $btn.data('index');
      const weapon  = (idx !== undefined && Array.isArray(actor.system.weapons)) ? actor.system.weapons[idx] : null;
      const name    = weapon?.name || $row.find("input[type='text']").first().val() || 'Arme';
      const diceMin = weapon ? Number(weapon.diceMin) || 0 : Number($row.find("input[name*='.diceMin']").val()) || 0;
      const def     = weapon ? Number(weapon.def)     || 0 : Number($row.find("input[name*='.def']").val())    || 0;
      const target  = diceMin + def;

      const roll    = await rollD100();
      const total   = roll.total;
      const success = total <= target;

      ChatMessage.create({
        user: game.user.id,
        speaker: ChatMessage.getSpeaker({ actor }),
        content: `
          <div class="parade-roll">
            <strong>Parade — ${name}</strong>
            <div><strong>Objectif :</strong> ${target}</div>
            <div><strong>Jet :</strong> <strong>${total}</strong></div>
            <div style="color:${success ? 'green' : 'red'}"><strong>${success ? 'RÉUSSITE' : 'ÉCHEC'}</strong></div>
            <div class="roll-details">${await roll.render()}</div>
            ${buildRerollButton(actor?.id || '', target, total - target)}
          </div>`
      });
    } catch (err) { console.error('Parade failed', err); ui.notifications.error('Erreur lors du jet de parade'); }
  });

  // ── Ranged attack roll ─────────────────────────────────────────────────────
  html.find('.weapons-table.ranged').on('click', '.gold-roll', ev => {
    ev.preventDefault();
    const $btn  = $(ev.currentTarget);
    const $row  = $btn.closest('tr');
    const actor = sheet.actor;

    new Dialog({
      title: "Jet d'attaque (distance) — circonstance",
      content: CIRCONSTANCE_FORM,
      buttons: {
        roll: {
          label: 'Lancer',
          callback: async dlg => {
            try {
              const { circBonus, circDegatsBonus, circFuryConfirm } = readCirconstance(dlg);

              const idx     = $btn.data('index');
              const weapon  = (idx !== undefined && Array.isArray(actor.system.rangedWeapons)) ? actor.system.rangedWeapons[idx] : null;
              const name    = weapon?.name || $row.find("input[type='text']").first().val() || 'Arme à distance';

              const quality    = weapon ? (weapon.quality || 'Ordinaire') : ($row.find("select[name*='quality']").val() || 'Ordinaire');
              const qualityMod = quality === 'Exceptionnelle' ? 5 : (quality === 'Mauvaise' ? -5 : 0);
              const bonusCT    = weapon ? Number(weapon.bonusCT) || 0 : Number($row.find("input[name*='bonusCT']").val()) || 0;
              const typeVal    = ((weapon?.type || $row.find("select[name*='type']").val() || 'Tir')).toString().trim();
              const isThrowing = typeVal.toLowerCase() === 'jet';

              const baseCT   = Number(actor.system.principal?.actuel?.ct) || 0;
              const mastered = weapon ? !!weapon.mastery : !!$row.find("input[type='checkbox'][name*='mastery']").prop('checked');
              let   target   = mastered ? (baseCT + qualityMod + bonusCT + circBonus) : Math.floor((baseCT + qualityMod + bonusCT + circBonus) / 2);
              if (isThrowing) target += 20;

              const attackRoll   = await rollD100();
              const raw          = attackRoll.total;
              const success      = raw <= target;
              const circDisplay  = circBonus ? (circBonus > 0 ? `+${circBonus}` : `${circBonus}`) : '';

              const parts = [
                `<div class="weapon-attack-roll"><strong>${name}</strong></div>`,
                `<div><strong>Type :</strong> ${isThrowing ? 'Jet' : 'Tir'}</div>`,
                `<div><strong>Objectif :</strong> ${target}</div>`,
                `<div><strong>Jet d'attaque :</strong> <strong>${raw}</strong></div>`,
                circDisplay ? `<div><strong>Circonstance :</strong> ${circDisplay}</div>` : '',
                `<div style="color:${success ? 'green' : 'red'}"><strong>${success ? 'RÉUSSITE' : 'ÉCHEC'}</strong></div>`,
                buildRerollButton(actor?.id || '', target, raw - target)
              ].filter(Boolean);

              if (!success) {
                ChatMessage.create({ user: game.user.id, speaker: ChatMessage.getSpeaker({ actor }), content: parts.join('') + `<div class="roll-details">${await attackRoll.render()}</div>` });
                return;
              }

              const weaponForDmg = weapon ? { ...weapon, bf: 0 } : {
                damage:  Number($row.find("input[name*='damage']").val())  || 0,
                perc:    !!$row.find("input[name*='perc']").prop('checked'),
                diceMin: Number($row.find("input[name*='diceMin']").val()) || 0,
                attributes: $row.find("input[name*='.attributes']").val() || ''
              };
              weaponForDmg.bf = 0;

              const attrText = weapon ? (weapon.attributes || '') : ($row.find("input[name*='.attributes']").val() || '');
              if (attrText) parts.push(`<div><strong>Attribut :</strong> ${attrText}</div>`);

              const hits = isThrowing ? Math.max(1, Math.floor((target - raw) / 10) + 1) : 1;
              parts.push(`<div><strong>Nombre de touches :</strong> ${hits}</div>`);

              const firstZone = zoneFromAttackRoll(raw);
              parts.push(`<div><strong>Zone touchée${hits > 1 ? ' (1)' : ''} :</strong> ${firstZone.zoneName}</div>`);
              const dmg1 = await rollWeaponDamage({ actor, weapon: weaponForDmg, circFuryConfirm, circDegatsBonus, skillLabel: 'CT' });
              parts.push(`<hr><div><strong>Impact 1 — ${firstZone.zoneName}</strong></div>${dmg1.html}`);

              for (let h = 1; h < hits; h++) {
                const extra     = await rollD100();
                const zoneInfo  = zoneFromAttackRoll(extra.total);
                parts.push(`<div><strong>Zone touchée (${h + 1}) :</strong> ${zoneInfo.zoneName}</div>`);
                const dmgH = await rollWeaponDamage({ actor, weapon: weaponForDmg, circFuryConfirm, circDegatsBonus, skillLabel: 'CT' });
                parts.push(`<hr><div><strong>Impact ${h + 1} — ${zoneInfo.zoneName}</strong></div>${dmgH.html}`);
              }

              ChatMessage.create({ user: game.user.id, speaker: ChatMessage.getSpeaker({ actor }), content: `<div class="spell-cast-result">${parts.join('')}</div>` });
            } catch (err) { console.error('Ranged attack failed', err); ui.notifications.error("Erreur lors du jet d'attaque"); }
          }
        },
        cancel: { label: 'Annuler' }
      },
      default: 'roll'
    }).render(true);
  });
}
