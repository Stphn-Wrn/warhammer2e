import { ARMOR_ZONES } from '../constants/armorZones.js';

function computeZoneTotal(html, zone) {
  let total = 0;
  html.find(`.armor-equip[data-zone='${zone}']`).each((_, el) => {
    try {
      const $el = $(el);
      const val = ($el.val() || '').toString().toUpperCase().trim();
      const isEquipped = val === 'YES' || ($el.is(':checkbox') && $el.prop('checked'));
      if (!isEquipped) return;
      const linePa    = Number($el.data('pa')) || 0;
      const bonusName = ($el.attr('name') || '').replace(/\.eq$/, '.bonus');
      const lineBonus = Number((html.find(`input[name='${bonusName}']`).val() || '').replace(/,/g, '.')) || 0;
      total += linePa + lineBonus;
    } catch (e) {}
  });
  return total;
}

function computeGrandTotal(html, sheet, overrideZone, overrideValue) {
  let grand = 0;
  for (const z of ARMOR_ZONES) {
    if (z === overrideZone) { grand += Number(overrideValue) || 0; continue; }
    const $inp = html.find(`input[name='system.armorTotals.${z}']`);
    grand += $inp.length ? (Number(($inp.val() || '').replace(/,/g, '.')) || 0) : (Number(sheet.actor.system.armorTotals?.[z]) || 0);
  }
  return grand;
}

function setEquipReadonlyState(html, clickedName, checked) {
  try {
    const bonusField = clickedName.replace(/\.eq$/, '.bonus');
    const $bonus = html.find(`input[name='${bonusField}']`);
    if ($bonus.length) { $bonus.prop('readonly', !checked); $bonus.toggleClass('editable', !!checked); }
  } catch (e) {}
}

export function wireArmorHandlers(sheet, html) {
  // Normalize boolean armor flags
  try {
    const armor   = sheet.actor?.system?.armor || {};
    const updates = {};
    for (const field of ['applyMovePenalty', 'applyAgilityPenalty', 'movePenaltyAppliedOnce', 'agilityPenaltyAppliedOnce']) {
      if (typeof armor[field] === 'string') {
        updates[`system.armor.${field}`] = (armor[field] || '').toLowerCase() === 'true';
      }
    }
    if (Object.keys(updates).length) sheet.actor.update(updates).catch(() => {});
  } catch (e) {}

  // Initialize readonly state of bonus inputs
  try {
    html.find('.armor-equip').each((_, el) => {
      try {
        const $el  = $(el);
        const val  = ($el.val() || '').toString().toUpperCase().trim();
        const equipped = val === 'YES' || ($el.is(':checkbox') && $el.prop('checked'));
        const bonusField = ($el.attr('name') || '').replace(/\.eq$/, '.bonus');
        const $bonus = html.find(`input[name='${bonusField}']`);
        if ($bonus.length) { $bonus.prop('readonly', !equipped); $bonus.prop('disabled', !equipped); $bonus.toggleClass('editable', !!equipped); }
      } catch (e) {}
    });
  } catch (e) {}

  // Equip checkbox change
  html.find('.armor-equip').on('change', async ev => {
    try { ev.preventDefault(); ev.stopImmediatePropagation(); } catch (e) {}
    const $input = $(ev.currentTarget);
    const zone   = ev.currentTarget.dataset.zone;
    let checked  = false;
    try { checked = $input.is(':checkbox') ? !!$input.prop('checked') : ($input.val() || '').toString().toUpperCase().trim() === 'YES'; }
    catch (e) { checked = !!$input.prop('checked'); }

    const clickedName = $input.attr('name');
    const updates     = { [clickedName]: checked ? 'YES' : 'NO' };

    try { if ($input.is(':checkbox')) $input.prop('checked', checked); } catch (e) {}
    setEquipReadonlyState(html, clickedName, checked);

    // bonus of clicked row
    try {
      const bonusField = clickedName.replace(/\.eq$/, '.bonus');
      const $bonus = html.find(`input[name='${bonusField}']`);
      const raw    = ($bonus.val() || '').toString().replace(/,/g, '.').trim();
      const parsed = Number(raw);
      updates[bonusField] = Number.isFinite(parsed) ? parsed : 0;
    } catch (e) {}

    const zoneTotal = computeZoneTotal(html, zone);
    updates[`system.armorTotals.${zone}`]  = zoneTotal;
    updates[`system.armorEquipped.${zone}`]= zoneTotal;
    updates['system.armor.totalPA']        = computeGrandTotal(html, sheet, zone, zoneTotal);

    try {
      await sheet.actor.update(updates);
      html.find(`input[name='system.armorTotals.${zone}']`).val(zoneTotal);
      html.find(`input[name='system.armor.totalPA']`).val(updates['system.armor.totalPA']);
    } catch (err) {
      console.error('Unable to persist armor checkbox selection', err);
      ui.notifications.error("Impossible de sauvegarder la sélection d'armure");
    }
  });

  // Bonus input change
  html.find("input[name$='.bonus']").on('change', async ev => {
    try { ev.preventDefault(); ev.stopImmediatePropagation(); } catch (e) {}
    if (!sheet.actor?.isOwner && !sheet?.isEditable) {
      ui.notifications.warn("Vous n'avez pas la permission de modifier les bonus d'armure sur cette fiche.");
      return;
    }
    const $input = $(ev.currentTarget);
    const name   = ev.currentTarget.name || '';
    const zone   = name.split('.')[2] || '';
    if (!zone) return;

    const zoneTotal = computeZoneTotal(html, zone);
    const grandTotal= computeGrandTotal(html, sheet, zone, zoneTotal);

    const raw    = ($input.val() || '').toString().replace(/,/g, '.').trim();
    const parsed = Number(raw);
    const updates = {
      [name]: Number.isFinite(parsed) ? parsed : 0,
      [`system.armorTotals.${zone}`]:   zoneTotal,
      [`system.armorEquipped.${zone}`]: zoneTotal,
      'system.armor.totalPA':           grandTotal
    };

    try {
      await sheet.actor.update(updates);
      html.find(`input[name='system.armorTotals.${zone}']`).val(zoneTotal);
      html.find(`input[name='system.armor.totalPA']`).val(grandTotal);
    } catch (err) { console.error('Unable to persist armor bonus changes', err); }
  });

  // Name / enc / qualite changes on armor tables
  try {
    html.find('.armor-tables, .armor-table').on('change',
      "input[name*='system.armor'][name$='.name'], input[name*='system.armor'][name$='.enc'], select[name*='system.armor'][name$='.qualite']",
      async ev => {
        try { ev.preventDefault(); ev.stopImmediatePropagation(); } catch (e) {}
        const input = ev.currentTarget;
        const name  = input.name;
        if (!name) return;
        let value = input.value;
        if (input.type === 'number' || name.endsWith('.enc')) value = Number((value || '').toString().replace(/,/g, '.')) || 0;
        try { await sheet.actor.update({ [name]: value }); } catch (err) {}
      }
    );
  } catch (e) {}

  // Move penalty toggle
  html.find('.apply-armor-move-penalty').off('change').on('change', async ev => {
    try {
      ev.preventDefault(); ev.stopImmediatePropagation();
      const checked      = ev.currentTarget.checked;
      const alreadyApplied = !!sheet.actor.system.armor.movePenaltyAppliedOnce;
      const updates      = { 'system.armor.applyMovePenalty': checked };
      if (checked && !alreadyApplied) {
        const mod = foundry.utils.deepClone(sheet.actor.system.secondaire.mod || {});
        mod.mvt = (Number(mod.mvt) || 0) - 1;
        updates['system.secondaire.mod'] = mod;
        updates['system.armor.movePenaltyAppliedOnce'] = true;
      }
      if (!checked && alreadyApplied) {
        const mod = foundry.utils.deepClone(sheet.actor.system.secondaire.mod || {});
        mod.mvt = (Number(mod.mvt) || 0) + 1;
        updates['system.secondaire.mod'] = mod;
        updates['system.armor.movePenaltyAppliedOnce'] = false;
      }
      await sheet.actor.update(updates);
      ui.notifications.info(checked ? 'Malus de mouvement appliqué (-1)' : 'Malus de mouvement retiré');
    } catch (err) { console.error(err); }
  });

  // Agility penalty toggle
  html.find('.apply-armor-agility-penalty').off('change').on('change', async ev => {
    try {
      ev.preventDefault(); ev.stopImmediatePropagation();
      const checked      = ev.currentTarget.checked;
      const alreadyApplied = !!sheet.actor.system.armor.agilityPenaltyAppliedOnce;
      const updates      = { 'system.armor.applyAgilityPenalty': checked };
      if (checked && !alreadyApplied) {
        const mod = foundry.utils.deepClone(sheet.actor.system.principal.mod || {});
        mod.agilite = (Number(mod.agilite) || 0) - 10;
        updates['system.principal.mod'] = mod;
        updates['system.armor.agilityPenaltyAppliedOnce'] = true;
      }
      if (!checked && alreadyApplied) {
        const mod = foundry.utils.deepClone(sheet.actor.system.principal.mod || {});
        mod.agilite = (Number(mod.agilite) || 0) + 10;
        updates['system.principal.mod'] = mod;
        updates['system.armor.agilityPenaltyAppliedOnce'] = false;
      }
      await sheet.actor.update(updates);
      ui.notifications.info(checked ? 'Malus d’agilité appliqué (-10)' : 'Malus d’agilité retiré');
    } catch (err) { console.error(err); }
  });
}
