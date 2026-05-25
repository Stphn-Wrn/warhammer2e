import {
  MAP_SECONDARY_TO_PRINCIPAL,
  MAP_SECONDARY_TO_SECONDAIRE,
  MAP_PRIMARY_TO_SECONDAIRE,
  CAREER_SLOTS,
  CAREER_TEXTAREA_PATHS
} from '../constants/career.js';

const FLOAT_KEYS = new Set(['strengthBonus', 'enduranceBonus', 'frenzyPoints', 'destinyPoints']);

function parseCareerInput(raw, key) {
  if (FLOAT_KEYS.has(key)) return raw.toString();
  const cleaned = raw === '' ? '0' : raw.toString().replace(/[^0-9-]/g, '');
  const n = parseInt(cleaned, 10);
  return Number.isFinite(n) ? n : 0;
}

async function applyCareerSlotAsPrimary(sheet, html, slot) {
  const primaryKeys   = Object.keys(MAP_SECONDARY_TO_PRINCIPAL);
  const secondaryKeys = Object.keys(MAP_SECONDARY_TO_SECONDAIRE);
  const backupPKey    = `_backupPrincipalCarriereFrom${capitalize(slot)}`;
  const backupSKey    = `_backupSecondaireCarriereFrom${capitalize(slot)}`;

  try {
    if (!sheet[backupPKey]) sheet[backupPKey] = foundry.utils.deepClone(sheet.actor.system.principal?.carriere || {});
  } catch (e) { sheet[backupPKey] = foundry.utils.deepClone(sheet.actor.system.principal?.carriere || {}); }
  try {
    if (!sheet[backupSKey]) sheet[backupSKey] = foundry.utils.deepClone(sheet.actor.system.secondaire?.carriere || {});
  } catch (e) { sheet[backupSKey] = foundry.utils.deepClone(sheet.actor.system.secondaire?.carriere || {}); }

  const updateData = {};

  const $nameInput = html.find(`input[name='system.career.${slot}Name']`);
  const nameVal    = $nameInput.length ? ($nameInput.val() || '').toString() : (sheet.actor.system.career?.[`${slot}Name`] || '');
  updateData['system.career.primaryName'] = nameVal;

  const newPrincipal = foundry.utils.deepClone(sheet.actor.system.principal?.carriere || {});
  for (const pk of primaryKeys) {
    try {
      const $inp = html.find(`input[name='system.career.${slot}.${pk}']`);
      const val  = $inp.length ? Number(($inp.val() || '').toString().replace(/,/g, '.')) || 0 : Number(sheet.actor.system.career?.[slot]?.[pk]) || 0;
      newPrincipal[MAP_SECONDARY_TO_PRINCIPAL[pk].split('.').pop()] = val;
    } catch (e) {}
  }
  updateData['system.principal.carriere'] = newPrincipal;

  const newSecondaire = foundry.utils.deepClone(sheet.actor.system.secondaire?.carriere || {});
  for (const sk of secondaryKeys) {
    try {
      const $inp   = html.find(`input[name='system.career.${slot}.${sk}']`);
      const rawVal = $inp.length ? ($inp.val() || '').toString() : (sheet.actor.system.career?.[slot]?.[sk] || '0');
      newSecondaire[MAP_SECONDARY_TO_SECONDAIRE[sk].split('.').pop()] = parseCareerInput(rawVal, sk);
    } catch (e) {}
  }
  updateData['system.secondaire.carriere'] = newSecondaire;

  for (const lst of ['skills', 'talents', 'outcomes']) {
    const $ta = html.find(`textarea[name='system.career.${slot}.${lst}']`);
    updateData[`system.career.primary.${lst}`] = $ta.length ? ($ta.val() || '').toString() : (sheet.actor.system.career?.[slot]?.[lst] || '');
  }

  try {
    await sheet.actor.update(updateData);
    try { foundry.utils.setProperty(sheet.actor, 'system.principal.carriere', newPrincipal); } catch (e) {}
    try { foundry.utils.setProperty(sheet.actor, 'system.secondaire.carriere', newSecondaire); } catch (e) {}
    try { foundry.utils.setProperty(sheet.actor, 'system.career.primaryName', nameVal); } catch (e) {}
    for (const lst of ['skills', 'talents', 'outcomes']) {
      try { foundry.utils.setProperty(sheet.actor, `system.career.primary.${lst}`, updateData[`system.career.primary.${lst}`]); } catch (e) {}
    }
  } catch (e) { console.error(`Unable to persist career start mirror for ${slot}`, e); }

  try { sheet.render(false); } catch (e) {}
}

async function restoreFromCareerSlot(sheet, slot) {
  const backupPKey = `_backupPrincipalCarriereFrom${capitalize(slot)}`;
  const backupSKey = `_backupSecondaireCarriereFrom${capitalize(slot)}`;
  const restoreData = {};
  if (sheet[backupPKey]) restoreData['system.principal.carriere']  = foundry.utils.deepClone(sheet[backupPKey]);
  if (sheet[backupSKey]) restoreData['system.secondaire.carriere'] = foundry.utils.deepClone(sheet[backupSKey]);
  try {
    if (Object.keys(restoreData).length) {
      await sheet.actor.update(restoreData);
      try { if (restoreData['system.principal.carriere'])  foundry.utils.setProperty(sheet.actor, 'system.principal.carriere',  restoreData['system.principal.carriere']);  } catch (e) {}
      try { if (restoreData['system.secondaire.carriere']) foundry.utils.setProperty(sheet.actor, 'system.secondaire.carriere', restoreData['system.secondaire.carriere']); } catch (e) {}
    }
  } catch (e) { console.error(`Unable to restore from ${slot} backup`, e); }
  try { delete sheet[backupPKey]; } catch (e) {}
  try { delete sheet[backupSKey]; } catch (e) {}
  try { sheet.render(false); } catch (e) {}
}

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

export function wireCareerHandlers(sheet, html) {
  // Textarea persistence for all career slots
  for (const path of CAREER_TEXTAREA_PATHS) {
    html.find(`textarea[name="${path}"]`).off('.careerTextarea').on('change.careerTextarea', async ev => {
      ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation();
      const newValue     = (ev.currentTarget.value ?? '').toString();
      const currentValue = ((foundry.utils.getProperty(sheet.actor, path) ?? '').toString());
      if (newValue === currentValue) return;
      try {
        await sheet.actor.update({ [path]: newValue }, { diff: false, render: false });
        try { foundry.utils.setProperty(sheet.actor, path, newValue); } catch (err) {}
      } catch (err) {
        console.error('Unable to persist career textarea', { path, err });
        try { ui.notifications.error('Erreur lors de la mise à jour du texte de carrière.'); } catch (e) {}
      }
    });
  }

  // Primary career principal fields
  html.find('input[name^="system.principal.carriere."]').on('change', async ev => {
    try {
      const input   = ev.currentTarget;
      const cleaned = (input.value || '').toString().trim().replace(/[^0-9-]/g, '') || '0';
      const parsed  = parseInt(cleaned, 10);
      if (Number.isFinite(parsed)) await sheet.actor.update({ [input.name]: parsed });
    } catch (err) {}
  });

  html.find('input[name^="system.career.primary."]').on('change', async ev => {
    try {
      const input  = ev.currentTarget;
      const key    = input.name.split('.').pop();
      const target = `system.principal.carriere.${key}`;
      const cleaned= (input.value || '').toString().trim().replace(/[^0-9-]/g, '') || '0';
      const parsed = parseInt(cleaned, 10);
      if (Number.isFinite(parsed)) await sheet.actor.update({ [target]: parsed });
    } catch (err) {}
  });

  // Primary career secondary-stat mirroring
  const mapPrimaryToSecondaire = MAP_PRIMARY_TO_SECONDAIRE;
  html.find('input[name^="system.career.primary."]').on('change', async ev => {
    try {
      const input = ev.currentTarget;
      const key   = input.name.split('.').pop();
      if (!mapPrimaryToSecondaire[key]) return;
      const cleaned= (input.value || '').toString().trim().replace(/[^0-9-]/g, '') || '0';
      const parsed = parseInt(cleaned, 10);
      if (!Number.isFinite(parsed)) return;
      const field  = mapPrimaryToSecondaire[key];
      const parent = foundry.utils.deepClone(sheet.actor.system.secondaire?.carriere || {});
      parent[field]= parsed;
      await sheet.actor.update({ 'system.secondaire.carriere': parent });
      try { sheet.actor.system.secondaire = sheet.actor.system.secondaire || {}; sheet.actor.system.secondaire.carriere = sheet.actor.system.secondaire.carriere || {}; sheet.actor.system.secondaire.carriere[field] = parsed; } catch (e) {}
      try { sheet.render(false); } catch (e) {}
    } catch (err) {}
  });

  // Secondary career stat changes
  html.find('input[name^="system.career.secondary."]').on('change', async ev => {
    try {
      const input = ev.currentTarget;
      const key   = input.name.split('.').pop();
      const raw   = (input.value || '').toString().trim();

      const targetSec = MAP_SECONDARY_TO_SECONDAIRE[key];
      if (targetSec) {
        const parsed = parseCareerInput(raw, key);
        if (!Number.isFinite(Number(parsed))) return;
        const field  = targetSec.split('.').pop();
        const parent = foundry.utils.deepClone(sheet.actor.system.secondaire?.carriere || {});
        parent[field]= parsed;
        try {
          await sheet.actor.update({ 'system.secondaire.carriere': parent });
          try { sheet.actor.system.secondaire.carriere = sheet.actor.system.secondaire.carriere || {}; sheet.actor.system.secondaire.carriere[field] = parsed; } catch (e) {}
        } catch (e) {}
        try { sheet.render(false); } catch (e) {}
        try {
          const $t = html.find(`input[name='${targetSec}']`);
          if ($t.length) $t.is(':checkbox') ? $t.prop('checked', !!parsed) : $t.val(parsed);
        } catch (e) {}
      }

      const started      = !!html.find('input[name="system.career.secondary.started"]').prop('checked');
      const targetPrinc  = MAP_SECONDARY_TO_PRINCIPAL[key];
      if (started && targetPrinc) {
        try {
          const parsed = parseInt((raw || '0').replace(/[^0-9-]/g, ''), 10);
          if (!Number.isFinite(parsed)) return;
          const fieldP = targetPrinc.split('.').pop();
          try { sheet.actor.system.principal = sheet.actor.system.principal || {}; sheet.actor.system.principal.carriere = sheet.actor.system.principal.carriere || {}; sheet.actor.system.principal.carriere[fieldP] = parsed; } catch (e) {}
          try { sheet.render(false); } catch (e) {}
          const $p = html.find(`input[name='${targetPrinc}']`);
          if ($p.length) {
            const actorVal = Number(sheet.actor.system.principal?.carriere?.[fieldP]);
            $p.is(':checkbox') ? $p.prop('checked', !!actorVal) : $p.val(Number.isFinite(actorVal) ? actorVal : parsed);
          }
        } catch (e) {}
      }
    } catch (err) {}
  });

  // Additional career slots (tertiary/quaternary/quinary) generic handler
  for (const slot of ['tertiary', 'quaternary', 'quinary']) {
    html.find(`input[name^="system.career.${slot}."]`).off(`.career-${slot}`).on(`change.career-${slot}`, async ev => {
      ev.preventDefault();
      const input = ev.currentTarget;
      const name  = input?.name;
      if (!name) return;
      let value;
      try {
        if (input.type === 'checkbox') {
          value = !!input.checked;
        } else if (input.type === 'number') {
          const raw    = (input.value ?? '').toString().trim().replace(/,/g, '.');
          const parsed = raw === '' ? 0 : Number(raw);
          value = Number.isFinite(parsed) ? parsed : 0;
        } else {
          value = (input.value ?? '').toString();
        }
        await sheet.actor.update({ [name]: value });
        try { foundry.utils.setProperty(sheet.actor, name, value); } catch (err) {}
      } catch (err) { console.error('Unable to persist additional career field', { slot, name, err }); }
    });
  }

  // Notes validation
  html.find('.notes-validate').on('click', async ev => {
    try {
      ev.preventDefault();
      const $textarea = $(ev.currentTarget).closest('.section').find('textarea[name="system.bio.notes"]');
      if (!$textarea.length) return;
      const raw = ($textarea.val() || '').toString();
      try { sheet._suppressNextRender = true; } catch (e) {}
      await sheet.actor.update({ 'system.bio.notes': raw });
      $(ev.currentTarget).closest('.section').find('.notes-value').text(raw);
      ui.notifications.info('Notes sauvegardées');
    } catch (err) { console.error(err); ui.notifications.error('Impossible de sauvegarder les notes'); }
  });

  // "Started" toggles for each career slot
  for (const slot of CAREER_SLOTS) {
    try {
      html.find(`input[name="system.career.${slot}.started"]`).on('change', async ev => {
        try {
          const checked = !!ev.currentTarget.checked;
          try { await sheet.actor.update({ [`system.career.${slot}.started`]: checked }); } catch (e) {}
          if (checked) {
            await applyCareerSlotAsPrimary(sheet, html, slot);
          } else {
            await restoreFromCareerSlot(sheet, slot);
          }
        } catch (err) {}
      });
    } catch (e) {}
  }
}
