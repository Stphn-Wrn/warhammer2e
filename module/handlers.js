import { openMaledictionDialog, openColereDialog, openSpellCastDialog } from './dialogs.js';
import { openGrantXpDialog } from './xp.js';
import { _recalculateDiceMin, _recalculateDiceMinRanged, getZoneFromD100, handleUlricFury, rollDiceFaces } from './utils.js';

export function wireSheetHandlers(sheet, html) {
  try {
    html.find('input[type="number"]').each((_, el) => {
      try {
        const $el = $(el);
        const raw = ($el.val() || '').toString();
        if (!raw) return;
        
        let cleaned = raw.replace(/\u00A0/g, '').replace(/\s+/g, '');
        
        cleaned = cleaned.replace(/,/g, '.');
        const n = Number(cleaned);
        if (Number.isFinite(n)) {
          
    const step = $el.attr('step');
    const nameAttr = ($el.attr('name') || '');

    const isCareerField = nameAttr.startsWith('system.principal.carriere') || nameAttr.startsWith('system.career.');
    if (step && String(step).indexOf('.') === -1 && Number(step) === 1 && !isCareerField) $el.val(Math.round(n));
    else $el.val(n);
          return;
        }
        
        const m = raw.match(/-?\d+/);
        if (m) $el.val(parseInt(m[0], 10));
      } catch (e) {  }
    });
  } catch (e) {  }

  
  html.find('.armor-equip').on('change', async ev => {

    try { ev.preventDefault(); ev.stopImmediatePropagation(); } catch(e){}
    const input = ev.currentTarget; 
    const $input = $(input);
    const zone = input.dataset.zone;
    const pa = Number(input.dataset.pa) || 0;
    
    let checked = false;
    try {
      if ($input.is(':checkbox')) checked = !!$input.prop('checked');
      else {
        const raw = ($input.val() || '').toString().toUpperCase().trim();
        checked = (raw === 'YES');
      }
    } catch (e) { checked = !!$input.prop('checked'); }

    
    const updates = {};
    const clickedName = $input.attr('name');
    updates[clickedName] = checked ? 'YES' : 'NO';
    
    try { if ($input.is(':checkbox')) $input.prop('checked', checked); } catch(e){}

    
    try {
      const clickedName = $input.attr('name') || '';
      const bonusField = clickedName.replace(/\.eq$/, '.bonus');
      const $bonusInput = html.find(`input[name='${bonusField}']`);
      if ($bonusInput.length) $bonusInput.prop('disabled', !checked);
    } catch(e) {  }

    
    let zoneTotal = 0;
    html.find(`.armor-equip[data-zone='${zone}']`).each((_, el) => {
      try {
        const $el = $(el);
        const val = ($el.val() || '').toString().toUpperCase().trim();
        const isEquipped = (val === 'YES') || ($el.is(':checkbox') && $el.prop('checked'));
        if (!isEquipped) return;
        const linePa = Number($el.data('pa')) || 0;
        const name = $el.attr('name') || '';
        const bonusField = name.replace(/\.eq$/, '.bonus');
        const $bonus = html.find(`input[name='${bonusField}']`);
        const bonusVal = ($bonus.val() || '').toString().replace(/,/g, '.');
        const lineBonus = Number(bonusVal) || 0;
        zoneTotal += (linePa + lineBonus);
      } catch (e) {  }
    });
    updates[`system.armorTotals.${zone}`] = zoneTotal;
    updates[`system.armorEquipped.${zone}`] = zoneTotal;

    
    try {
      const bonusField = clickedName.replace(/\.eq$/, '.bonus');
      const $bonusInput = html.find(`input[name='${bonusField}']`);
      const rawBonus = ($bonusInput.val() || '').toString().replace(/,/g, '.').trim();
      const parsedBonus = Number(rawBonus);
      updates[bonusField] = Number.isFinite(parsedBonus) ? parsedBonus : 0;
    } catch (e) {  }

    
    
    const zones = ["head","body","armLeft","armRight","legLeft","legRight"];
    let grandTotal = 0;
    for (const z of zones) {
      
      if (z === zone) {
        grandTotal += Number(zoneTotal) || 0;
        continue;
      }
      const $inp = html.find(`input[name='system.armorTotals.${z}']`);
      if ($inp.length) {
        const v = ($inp.val() || '').toString().replace(/,/g, '.');
        grandTotal += Number(v) || 0;
      } else {
        
        const actorVal = Number(sheet.actor.system.armorTotals?.[z]) || 0;
        grandTotal += actorVal;
      }
    }

    
    updates['system.armor.totalPA'] = grandTotal;

    try {
      console.debug('Persisting armor updates (checkbox) with grand total:', updates);
  await sheet.actor.update(updates);
  
  const $zoneInput = html.find(`input[name='system.armorTotals.${zone}']`);
  if ($zoneInput.length) $zoneInput.val(zoneTotal);
  const $grandInput = html.find(`input[name='system.armor.totalPA']`);
  if ($grandInput.length) $grandInput.val(grandTotal);
    } catch (err) {
      console.error('Unable to persist armor checkbox selection or totals', err);
      ui.notifications.error('Impossible de sauvegarder la sélection d\'armure — voir la console pour détails');
    }
  });

  Hooks.on('renderChatMessage', (app, html, data) => {
    try {
      html.find('.reroll-roll').off('click').on('click', async ev => {
        ev.preventDefault();
        const btn = ev.currentTarget;
        const $btn = $(btn);
        const actorId = $btn.data('actor-id');
        const target = Number($btn.data('target')) || 0;
        const modifier = Number($btn.data('modifier')) || 0;
        const actor = game.actors.get(actorId);
        if (!actor) { ui.notifications.error('Acteur introuvable pour la relance'); return; }

        const currentChance = Number(actor.system?.points?.chance) || 0;
        if (currentChance <= 0) { ui.notifications.warn('Pas assez de points de chance pour relancer'); return; }

        try { await actor.update({ 'system.points.chance': currentChance - 1 }); } catch (e) { console.error('Unable to consume chance for reroll', e); ui.notifications.error('Impossible de consommer un point de chance'); return; }

        const roll = new Roll('1d100');
        await roll.evaluate();
        const result = roll.total;
        const success = result <= target;
        const degrees = Math.floor(Math.abs(target - result) / 10);
        const resultText = success ? `<span style="color:green;"><strong>RÉUSSITE</strong>${degrees?` avec ${degrees} degré${degrees>1?'s':''}`:''}</span>` : `<span style="color:red;"><strong>ÉCHEC</strong>${degrees?` avec ${degrees} degré${degrees>1?'s':''}`:''}</span>`;

        let container = $btn.closest('.skill-roll-result');
        if (!container.length) container = $btn.closest('.stat-roll-result');
        if (!container.length) container = $btn.closest('.parade-roll');
        if (!container.length) container = $btn.closest('.weapon-attack-roll');
        // If the button isn't a child of the expected container, try to find the container inside the same chat message
        if (!container.length) {
          const msgRoot = $btn.closest('.message, .chat-message, .message-content');
          if (msgRoot && msgRoot.length) {
            const nested = msgRoot.find('.weapon-attack-roll').first();
            if (nested && nested.length) container = nested;
          }
        }
        if (container.length) {
          const info = `<div class="reroll-result">Relance : ${result} — ${resultText}</div>`;
          container.append(info);
          $btn.prop('disabled', true).text('Relancé');
        } else {
          ChatMessage.create({ user: game.user.id, speaker: ChatMessage.getSpeaker({ actor }), content: `Relance: ${result} — ${resultText}` });
        }
      });
    } catch (e) { console.error('Error wiring reroll buttons', e); }
  });

  
  html.find("input[name$='.bonus']").on('change', async ev => {
    
    try { ev.preventDefault(); ev.stopImmediatePropagation(); } catch(e){}
    const input = ev.currentTarget;
    const $input = $(input);
    const name = input.name || '';
    
    const parts = name.split('.');
    const zone = parts[2] || '';
    if (!zone) return;

    const updates = {};

    
    let zoneTotal = 0;
    html.find(`.armor-equip[data-zone='${zone}']`).each((_, el) => {
      try {
        const $el = $(el);
        const val = ($el.val() || '').toString().toUpperCase().trim();
        const isEquipped = (val === 'YES') || ($el.is(':checkbox') && $el.prop('checked'));
        if (!isEquipped) return;
        const linePa = Number($el.data('pa')) || 0;
        const lineName = $el.attr('name') || '';
        const bonusField = lineName.replace(/\.eq$/, '.bonus');
        const $bonus = html.find(`input[name='${bonusField}']`);
        const bonusVal = ($bonus.val() || '').toString().replace(/,/g, '.');
        const lineBonus = Number(bonusVal) || 0;
        zoneTotal += (linePa + lineBonus);
      } catch (e) {  }
    });

    updates[`system.armorTotals.${zone}`] = zoneTotal;
    updates[`system.armorEquipped.${zone}`] = zoneTotal;

    
    const zones = ["head","body","armLeft","armRight","legLeft","legRight"];
    let grandTotal = 0;
    for (const z of zones) {
      if (z === zone) { grandTotal += Number(zoneTotal) || 0; continue; }
      const $inp = html.find(`input[name='system.armorTotals.${z}']`);
      if ($inp.length) {
        const v = ($inp.val() || '').toString().replace(/,/g, '.');
        grandTotal += Number(v) || 0;
      } else {
        const actorVal = Number(sheet.actor.system.armorTotals?.[z]) || 0;
        grandTotal += actorVal;
      }
    }
    updates['system.armor.totalPA'] = grandTotal;

    try {
      const raw = ($input.val() || '').toString().replace(/,/g, '.').trim();
      const parsed = Number(raw);
      updates[name] = Number.isFinite(parsed) ? parsed : 0;

      await sheet.actor.update(updates);

      const $zoneInput = html.find(`input[name='system.armorTotals.${zone}']`);
      if ($zoneInput.length) $zoneInput.val(zoneTotal);
      const $grandInput = html.find(`input[name='system.armor.totalPA']`);
      if ($grandInput.length) $grandInput.val(grandTotal);
    } catch (err) {
      console.error('Unable to persist armor bonus changes', err);
    }
  });

  
  html.find("input[name*='skills.base'][name*='niveau']").on('change', ev => {
    const input = ev.currentTarget;
    const name = input.name;
    const newValue = parseInt(input.value) || 0;
    sheet.actor.update({ [name]: newValue });
  });

  try {
    const openRaceDialog = ev => {
      try { ev?.preventDefault(); } catch(e){}
    };

    html.find("button.race-button, input[name='system.bio.race']").on('click', ev => {
    });

    html.find("button.race-button, input[name='system.bio.race']").off('click').on('click', ev => {
      ev.preventDefault();
      ev.preventDefault();
  const races = ['Elfe', 'Halfelin', 'Humain', 'Nain', 'Ogre'];
      const subracesMap = {
        'Elfe': ['Elfe de Marienbourg', 'Haut Elfe', 'Elfe des bois', 'Elfe Noir'],
        'Halfelin': ['Halfelin du Moot', 'Halfelin des cités'],
        'Humain': ['Humain de l\'Averland', 'Humain Frontalier', 'Humain du Hochland', 'Humain du Middenland', 'Humain du Nordland', 'Humain du Stirland', 'Humain de l\'Ostermark', 'Humain Strigany', 'Humain du Talabecland', 'Humain de la Sylvanie', 'Humain du Wissenland', 'Bretonnien de l\'Aquitaine', 'Bretonnien - Artenois', 'Bretonnien - Bastogne', 'Bretonnien - Bordeleaux', 'Bretonnien - Brionne', 'Bretonnien - Couronne', 'Bretonnien - Gisoreux', 'Bretonnien - Gasconnie', 'Bretonnien - Lyonesse', 'Bretonnien - L\'anguille', 'Bretonnien - Montfort', 'Bretonnien - Moussillon', 'Bretonnien - Parravon', 'Gospodar - Est', 'Gospodar - Nord', 'Gospodar - Sud', 'Ungol - Est', 'Ungol - Nord', 'Ungol - Sud', 'Norse', ],
        'Nain': ['Nain des Karaks', 'Nain de l\'Empire'],
        'Ogre': ['Ogre Original', 'Ogre du Chaos'],
      };

      const content = document.createElement('div');
      const raceSelect = document.createElement('select');
      raceSelect.style.width = '100%';
      raceSelect.className = 'race-select';
      raceSelect.innerHTML = `<option value="">-- Choisir une race --</option>` + races.map(r => `<option value="${r}">${r}</option>`).join('');
      content.appendChild(raceSelect);

      const subLabel = document.createElement('div');
      subLabel.style.marginTop = '8px';
      subLabel.innerText = 'Sous-race';
      content.appendChild(subLabel);

      const subSelect = document.createElement('select');
      subSelect.style.width = '100%';
      subSelect.className = 'subrace-select';
      subSelect.innerHTML = `<option value="">-- Choisir une sous-race --</option>`;
      content.appendChild(subSelect);

      const d = new Dialog({
        title: 'Sélectionner la race',
        content: content.outerHTML,
        buttons: {
          ok: {
            label: 'Valider',
            callback: async (htmlDlg) => {
              try {
                const $dlg = $(htmlDlg);
                const r = ($dlg.find('.race-select').val() || '').toString();
                const sr = ($dlg.find('.subrace-select').val() || '').toString();
                await sheet.actor.update({ 'system.bio.race': r, 'system.bio.subrace': sr });
                try { foundry.utils.setProperty(sheet.actor, 'system.bio.race', r); } catch(e){}
                try { foundry.utils.setProperty(sheet.actor, 'system.bio.subrace', sr); } catch(e){}
                try { sheet.render(false); } catch(e){}
              } catch (err) { console.error('Unable to persist selected race/subrace', err); }
            }
          },
          cancel: { label: 'Annuler' }
        },
        default: 'ok',
        render: (htmlDlg) => {
          try {
            const $dlg = $(htmlDlg);
            const currentRace = sheet.actor.system?.bio?.race || '';
            const currentSub = sheet.actor.system?.bio?.subrace || '';
            const $rs = $dlg.find('.race-select');
            const $ss = $dlg.find('.subrace-select');
            const updateSubOptionsLocal = (r) => {
              const opts = subracesMap[r] || [];
              $ss.empty();
              $ss.append($(`<option value="">-- Choisir une sous-race --</option>`));
              for (const s of opts) $ss.append($(`<option value="${s}">${s}</option>`));
            };
            if ($rs.length) {
              $rs.off('change.race').on('change.race', () => updateSubOptionsLocal($rs.val()));
              updateSubOptionsLocal(currentRace);
              $rs.val(currentRace);
            }
            if ($ss.length) $ss.val(currentSub);
          } catch (e) {}
        }
      });
      d.render(true);
    });
  } catch (e) {  }
  html.find("input[name*='skills.base'][name*='talents'], input[name*='skills.base'][name*='divers']").on('change', ev => {
    const input = ev.currentTarget;
    const name = input.name;
    const newValue = parseInt(input.value) || 0;
    sheet.actor.update({ [name]: newValue });
  });
  html.find("input[name*='skills.base'][name*='avance']").on('change', ev => {
    const checkbox = ev.currentTarget;
    const name = checkbox.name;
    const newValue = checkbox.checked;
    sheet.actor.update({ [name]: newValue });
  });
  html.find("select[name*='skills.base'][name*='cara']").on('change', ev => {
    const select = ev.currentTarget;
    const name = select.name;
    const newValue = select.value;
    sheet.actor.update({ [name]: newValue });
  });

  
  html.find('.talent-add').on('click', ev => {
    ev.preventDefault();
    try {
      const $btn = $(ev.currentTarget);
      
      const tbody = $btn.closest('.section').find('table.skills-table tbody').first();
      const nextIndex = Math.max(0, tbody.find('tr').length);
      const rowHtml = `
        <tr>
          <td>
            <input type="hidden" name="system.talents.${nextIndex}.id" value="">
            <input type="text" name="system.talents.${nextIndex}.name" value="" placeholder="Nom du talent">
          </td>
          <td>
            <input type="text" name="system.talents.${nextIndex}.description" value="" placeholder="Description">
          </td>
          <td>
            <button type="button" class="talent-delete">🗑</button>
          </td>
        </tr>
      `;
  const $row = $(rowHtml);
  tbody.append($row);
      
      $row.find('.talent-delete').on('click', ev2 => { ev2.preventDefault(); $row.remove(); });
      setTimeout(() => { try { $row[0].scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch(e){} }, 50);
      ui.notifications.info('Nouveau talent ajouté');
    } catch (err) {
      console.error('Unable to insert dynamic talent row', err);
      ui.notifications.error('Erreur lors de l\'ajout local du talent.');
    }
  });

  html.find('.talent-delete').on('click', ev => {
    ev.preventDefault();
    const $btn = $(ev.currentTarget);
    const $tr = $btn.closest('tr');
    const talentNameLocal = $tr.find("input[name$='.name']").val() || $btn.data('talentName') || 'ce talent';

    Dialog.confirm({
      title: 'Supprimer le talent',
      content: `<p>Êtes-vous sûr de vouloir supprimer <strong>${talentNameLocal}</strong> ?</p>`,
      yes: async () => {
        try {
          
          const tbody = $btn.closest('.section').find('table.skills-table tbody').first();
          const rows = tbody.find('tr').toArray();
          const newTalents = [];
          for (let r of rows) {
            if (r === $tr[0]) continue;
            const $r = $(r);
            const idVal = $r.find("input[name$='.id']").val();
            const nameVal = $r.find("input[name$='.name']").val() || '';
            const descVal = $r.find("input[name$='.description']").val() || '';
            const obj = {};
            if (idVal) obj.id = idVal;
            obj.name = nameVal;
            obj.description = descVal;
            newTalents.push(obj);
          }
          await sheet.actor.update({ 'system.talents': newTalents });
          ui.notifications.info('Talent supprimé');
        } catch (err) {
          console.error('Unable to persist talents after delete', err);
          ui.notifications.error('Erreur lors de la suppression du talent');
        }
      },
      no: () => {},
      defaultYes: false
    });
  });

  
  html.find('.regles-spe-add').on('click', ev => {
    ev.preventDefault();
    try {
      const tbody = sheet.element.find('.regle-table tbody');
      const nextIndex = Math.max(0, tbody.find('tr').length);
      const rowHtml = `
        <tr>
          <td>
            <input type="hidden" name="system.regles.${nextIndex}.id" value="">
            <input type="text" name="system.regles.${nextIndex}.name" value="" placeholder="Nom de la règle spéciale">
          </td>
          <td>
            <input type="text" name="system.regles.${nextIndex}.description" value="" placeholder="Description">
          </td>
          <td>
            <button type="button" class="regle-delete">🗑</button>
          </td>
        </tr>
      `;
      const $row = $(rowHtml);
      tbody.append($row);
      
      $row.find('.regle-delete').on('click', ev2 => { ev2.preventDefault(); $row.remove(); });
      
      setTimeout(() => { try { $row[0].scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch(e){} }, 50);
      ui.notifications.info('Nouvelle ligne ajoutée');
    } catch (err) {
      console.error('Unable to insert dynamic regle row', err);
      ui.notifications.error('Erreur lors de l\'ajout local de la règle.');
    }
  });
  html.find('.regle-delete').on('click', ev => {
    ev.preventDefault();
    const $btn = $(ev.currentTarget);
    const $tr = $btn.closest('tr');
    const regleNameLocal = $tr.find("input[name$='.name']").val() || $btn.data('regleName') || 'cette règle';

    Dialog.confirm({
      title: "Supprimer la règle spéciale",
      content: `<p>Êtes-vous sûr de vouloir supprimer <strong>${regleNameLocal}</strong> ?</p>`,
      yes: async () => {
        try {
          
          const tbody = sheet.element.find('.regle-table tbody');
          const rows = tbody.find('tr').toArray();
          const newRegles = [];
          for (let r of rows) {
            if (r === $tr[0]) continue; 
            const $r = $(r);
            const idVal = $r.find("input[name$='.id']").val();
            const nameVal = $r.find("input[name$='.name']").val() || '';
            const descVal = $r.find("input[name$='.description']").val() || '';
            const obj = {};
            if (idVal) obj.id = idVal;
            obj.name = nameVal;
            obj.description = descVal;
            newRegles.push(obj);
          }

          await sheet.actor.update({ 'system.regles': newRegles });
          ui.notifications.info('Règle supprimée');
        } catch (err) {
          console.error('Unable to persist regles after delete', err);
          ui.notifications.error('Erreur lors de la suppression de la règle');
        }
      },
      no: () => {},
      defaultYes: false
    });
  });

  const connaissanceLabels = {
    generale: 'Connaissance Générale',
    academique: 'Connaissance Académique',
    artistique: 'Expression Artistique',
    metier: 'Métier'
  };
  const connaissanceCaraLabels = {
    cc: 'CC',
    ct: 'CT',
    force: 'FOR',
    endurance: 'END',
    agilite: 'AGI',
    intelligence: 'INT',
    forceMentale: 'FM',
    sociabilite: 'SOC'
  };
  const connaissanceAllowedCara = Object.keys(connaissanceCaraLabels);
  const connaissanceSpecialTypes = new Set(['artistique', 'metier']);
  const getCurrentStats = () => sheet.actor.system?.principal?.actuel || {};
  const getStatValue = key => {
    const stats = getCurrentStats();
    return Number(stats[key]) || 0;
  };
  const isSpecialType = type => connaissanceSpecialTypes.has((type || '').toString());

  const updateConnaissanceRowState = $row => {
    const $type = $row.find("select[name$='.type']");
    const $cara = $row.find("select[name$='.cara']");
    const type = ($type.val() || 'generale').toString().toLowerCase();
    let cara = ($cara.val() || 'intelligence').toString();
    if (!connaissanceAllowedCara.includes(cara)) cara = 'intelligence';
    $cara.removeClass('locked');
    const statValue = getStatValue(cara);
    let talents = 0;
    let divers = 0;
    try {
      const tRaw = ($row.find("input[name$='.talents']").val() || $row.find('.connaissance-talents').val() || '0').toString().replace(/,/g, '.');
      const dRaw = ($row.find("input[name$='.divers']").val() || $row.find('.connaissance-divers').val() || '0').toString().replace(/,/g, '.');
      talents = Number(tRaw) || 0;
      divers = Number(dRaw) || 0;
    } catch (e) { talents = 0; divers = 0; }
    const total = (Number(statValue) || 0) + talents + divers;
    const $target = $row.find('.connaissance-target');
    if ($target.length) $target.val(total);
  };

  const bindConnaissanceRow = $row => {
    const $type = $row.find("select[name$='.type']");
    const $cara = $row.find("select[name$='.cara']");
    $type.off('.connaissance').on('change.connaissance', () => updateConnaissanceRowState($row));
    $cara.off('.connaissance').on('change.connaissance', () => {
      const type = ($type.val() || 'generale').toString().toLowerCase();
      if (!isSpecialType(type)) {
        $cara.val('intelligence');
      }
      updateConnaissanceRowState($row);
    });
    $row.find('.connaissance-talents, .connaissance-divers').off('.connaissance').on('change.connaissance', () => updateConnaissanceRowState($row));
    updateConnaissanceRowState($row);
  };

  html.find('.knowledge-table tbody tr').each((_, tr) => bindConnaissanceRow($(tr)));

  const handleConnaissanceRoll = ev => {
    ev.preventDefault();
    const $btn = $(ev.currentTarget);
    const $row = $btn.closest('tr');
    updateConnaissanceRowState($row);
    const rawName = ($row.find("input[name$='.name']").val() || '').toString().trim();
  const type = ($row.find("select[name$='.type']").val() || 'generale').toString().toLowerCase();
    const cara = ($row.find("select[name$='.cara']").val() || 'intelligence').toString();
    const statValue = getStatValue(cara);
  const typeLabel = connaissanceLabels[type] || 'Connaissance';
  const caraLabel = connaissanceCaraLabels[cara] || '';
  const nameSuffix = rawName ? ` : ${rawName}` : '';
  const caraSuffix = caraLabel ? ` (${caraLabel})` : '';
  const skillName = `${typeLabel}${nameSuffix}${caraSuffix}`;
    sheet._showSkillRollDialog(skillName, statValue);
  };

  html.find('.connaissance-roll').on('click', handleConnaissanceRoll);

  html.find('.connaissance-add').on('click', ev => {
    ev.preventDefault();
    try {
      const tbody = sheet.element.find('.knowledge-table tbody');
      if (!tbody.length) {
        ui.notifications.error('Section Connaissances introuvable sur la fiche.');
        return;
      }
      const nextIndex = Math.max(0, tbody.find('tr').length);
      const intValue = getStatValue('intelligence');
      const rowHtml = `
        <tr>
          <td>
            <input type="hidden" name="system.connaissances.${nextIndex}.id" value="">
            <input type="text" name="system.connaissances.${nextIndex}.name" value="" placeholder="Nom de la connaissance">
          </td>
          <td>
            <select name="system.connaissances.${nextIndex}.type" class="connaissance-type">
              <option value="generale" selected>Générale</option>
              <option value="academique">Académique</option>
              <option value="artistique">Expr. Artistique</option>
              <option value="metier">Métier</option>
            </select>
          </td>
          <td>
            <select name="system.connaissances.${nextIndex}.cara" class="connaissance-cara">
              <option value="cc">CC</option>
              <option value="ct">CT</option>
              <option value="force">FOR</option>
              <option value="endurance">END</option>
              <option value="agilite">AGI</option>
              <option value="intelligence" selected>INT</option>
              <option value="forceMentale">FM</option>
              <option value="sociabilite">SOC</option>
            </select>
          </td>
          <td>
            <input type="number" name="system.connaissances.${nextIndex}.talents" class="connaissance-talents" value="0">
          </td>
          <td>
            <input type="number" name="system.connaissances.${nextIndex}.divers" class="connaissance-divers" value="0">
          </td>
          <td>
            <input type="number" name="system.connaissances.${nextIndex}.targetValue" class="connaissance-target" value="${intValue}" readonly>
          </td>
          <td>
            <button type="button" class="connaissance-roll button">🎲</button>
          </td>
          <td>
            <button type="button" class="connaissance-delete">🗑</button>
          </td>
        </tr>
      `;
      const $row = $(rowHtml);
      tbody.append($row);
      $row.find('.connaissance-roll').on('click', handleConnaissanceRoll);
      $row.find('.connaissance-delete').on('click', ev2 => { ev2.preventDefault(); $row.remove(); });
      bindConnaissanceRow($row);
      $row.find('.connaissance-talents, .connaissance-divers').on('change', () => updateConnaissanceRowState($row));
      setTimeout(() => { try { $row[0].scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch(e){} }, 50);
      ui.notifications.info('Nouvelle connaissance ajoutée');
    } catch (err) {
      console.error('Unable to insert dynamic connaissance row', err);
      ui.notifications.error('Erreur lors de l\'ajout local de la connaissance.');
    }
  });

  html.find('.connaissance-delete').on('click', ev => {
    ev.preventDefault();
    const $btn = $(ev.currentTarget);
    const $tr = $btn.closest('tr');
    const idVal = $tr.find("input[name$='.id']").val();
    if (!idVal) return $tr.remove();
    const connaissanceName = $tr.find("input[name$='.name']").val() || $btn.data('connaissanceName') || 'cette connaissance';

    Dialog.confirm({
      title: 'Supprimer la connaissance',
      content: `<p>Êtes-vous sûr de vouloir supprimer <strong>${connaissanceName}</strong> ?</p>`,
      yes: async () => {
        try {
          const tbody = sheet.element.find('.knowledge-table tbody');
          if (!tbody.length) return;
          const rows = tbody.find('tr').toArray();
          const newConnaissances = [];
          for (let r of rows) {
            if (r === $tr[0]) continue;
            const $r = $(r);
            const id = $r.find("input[name$='.id']").val();
            const name = ($r.find("input[name$='.name']").val() || '').toString();
            const type = ($r.find("select[name$='.type']").val() || 'generale').toString().toLowerCase();
            const cara = ($r.find("select[name$='.cara']").val() || 'intelligence').toString();
            const normalizedType = connaissanceLabels[type] ? type : 'generale';
            const normalizedCara = connaissanceAllowedCara.includes(cara) ? cara : 'intelligence';
            const talents = Number($r.find("input[name$='.talents']").val() || $r.find('.connaissance-talents').val() || 0) || 0;
            const divers = Number($r.find("input[name$='.divers']").val() || $r.find('.connaissance-divers').val() || 0) || 0;
            const finalCara = normalizedCara;
            const statValue = getStatValue(finalCara);
            const targetValue = Number($r.find("input[name$='.targetValue']").val()) || (statValue + talents + divers);
            const obj = { name, type: normalizedType, cara: finalCara, talents, divers, targetValue };
            if (id) obj.id = id;
            newConnaissances.push(obj);
          }

          await sheet.actor.update({ 'system.connaissances': newConnaissances });
          ui.notifications.info('Connaissance supprimée');
        } catch (err) {
          console.error('Unable to persist connaissances after delete', err);
          ui.notifications.error('Erreur lors de la suppression de la connaissance');
        }
      },
      no: () => {},
      defaultYes: false
    });
  });

  
  
  html.find('input[name="system.coins.copper"], input[name="system.coins.silver"], input[name="system.coins.gold"]').on('change', async ev => {
    ev.preventDefault();
    const input = ev.currentTarget;
    const name = input.name; 
    const val = Math.max(0, Number(input.value) || 0);
    try {
      await sheet.actor.update({ [name]: val });
      ui.notifications.info('Pièces mises à jour');
    } catch (err) {
      console.error('Unable to persist coin value', err);
      ui.notifications.error('Erreur lors de la persistance des pièces');
    }
  });

  
  html.find('input[name="system.points.chance"]').on('change', async ev => {
    ev.preventDefault();
    const input = ev.currentTarget;
    const raw = (input.value || '').toString().replace(/,/g, '.');
    let value = Number(raw);
    if (!Number.isFinite(value)) value = 0;
    const maxPd = Number(sheet.actor.system?.secondaire?.actuel?.pd) || 0;
    value = Math.max(0, Math.min(value, maxPd));
    input.value = value;
    try {
      await sheet.actor.update({ 'system.points.chance': value });
    } catch (err) {
      console.error('Unable to persist chance value', err);
      ui.notifications.error('Erreur lors de la mise à jour de la Chance');
    }
  });

  
  html.find('input[name="system.exchange.copper"], input[name="system.exchange.silver"], input[name="system.exchange.gold"]').on('change', async ev => {
    ev.preventDefault();
    const input = ev.currentTarget;
    const name = input.name; 
    const raw = (input.value || '').toString().replace(/,/g, '.');
    const val = Math.max(0, Number(raw) || 0);
    try {
      await sheet.actor.update({ [name]: val });
      ui.notifications.info('Taux de change mis à jour');
    } catch (err) {
      console.error('Unable to persist exchange rate', err);
      ui.notifications.error('Erreur lors de la persistance du taux de change');
    }
  });

  
  function computeTotalCO() {
    try {
      const $copper = html.find('input[name="system.coins.copper"]');
      const $silver = html.find('input[name="system.coins.silver"]');
      const $gold = html.find('input[name="system.coins.gold"]');

      const copper = Math.max(0, Number($copper.val()) || 0);
      const silver = Math.max(0, Number($silver.val()) || 0);
      const gold = Math.max(0, Number($gold.val()) || 0);

  
  
  const exchCopper = Number(html.find('input[name="system.exchange.copper"]').val());
  const exchSilver = Number(html.find('input[name="system.exchange.silver"]').val());
  const exchGold = Number(html.find('input[name="system.exchange.gold"]').val());
  const defaultCopper = 1 / 240;
  const defaultSilver = 0.05; 
  const defaultGold = 1.0;
  const valCopper = (isNaN(exchCopper) || exchCopper <= 0) ? defaultCopper : exchCopper;
  const valSilver = (isNaN(exchSilver) || exchSilver <= 0) ? defaultSilver : exchSilver;
  const valGold = (isNaN(exchGold) || exchGold <= 0) ? defaultGold : exchGold;

  
  const totalCO = (copper * valCopper) + (silver * valSilver) + (gold * valGold);

      
      const fmtInt = n => (Math.round(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
      const fmtTotal = n => {
        const v = (Math.round(n * 1000) / 1000).toFixed(3);
        
        return v.replace('.', ', ').replace(/\B(?=(\d{3})+(?!\d))/g, " ");
      };

      html.find('.co-value').text(fmtTotal(totalCO));
      html.find('.summary-copper').text(fmtInt(copper));
      html.find('.summary-silver').text(fmtInt(silver));
      html.find('.summary-gold').text(fmtInt(gold));
      html.find('.summary-total').text(fmtTotal(totalCO));
    } catch (err) {
      console.error('computeTotalCO failed', err);
    }
  }

  
  html.find('input[name^="system.coins."], input[name^="system.exchange."]').on('input change', () => computeTotalCO());

  
  try {
    
  
  
  
    html.find('input[name^="system.principal.carriere."]').on('change', async ev => {
      try {
        const input = ev.currentTarget;
        const name = input.name; 
        const raw = (input.value || '').toString().trim();
  
  
  
  const cleaned = raw === '' ? '0' : raw.replace(/[^0-9-]/g, '');
  const parsed = parseInt(cleaned, 10);
    if (!Number.isFinite(parsed)) return;
    
    try { console.debug('[DEBUG] Persisting career principal field', { name, raw, cleaned, parsed }); } catch(e){}
    
    await sheet.actor.update({ [name]: parsed });
      } catch (err) {  }
    });

  html.find('.notes-validate').on('click', async ev => {
    try {
      ev.preventDefault();
      const $btn = $(ev.currentTarget);
      const $section = $btn.closest('.section');
      const $textarea = $section.find('textarea[name="system.bio.notes"]');
      if (!$textarea.length) return;
      const raw = ($textarea.val() || '').toString();
      try { sheet._suppressNextRender = true; } catch(e){}
      await sheet.actor.update({ 'system.bio.notes': raw });
      const $span = $section.find('.notes-value');
      if ($span.length) $span.text(raw);
      ui.notifications.info('Notes sauvegardées');
    } catch (err) {
      console.error('Unable to persist bio notes', err);
      ui.notifications.error('Impossible de sauvegarder les notes');
    }
  });

    
    const mapSecondaryToPrincipal = {
      'combat': 'system.principal.carriere.cc',
      'shoot': 'system.principal.carriere.ct',
      'strength': 'system.principal.carriere.force',
      'endurance': 'system.principal.carriere.endurance',
      'agility': 'system.principal.carriere.agilite',
      'intelligence': 'system.principal.carriere.intelligence',
      'mentalStrength': 'system.principal.carriere.forceMentale',
      'social': 'system.principal.carriere.sociabilite'
    };

    
    
    
    const mapSecondaryToSecondaire = {
      'attacks': 'system.secondaire.carriere.a',
      'wounds': 'system.secondaire.carriere.b',
      'strengthBonus': 'system.secondaire.carriere.bf',
      'enduranceBonus': 'system.secondaire.carriere.be',
      'movement': 'system.secondaire.carriere.mvt',
      'magic': 'system.secondaire.carriere.mag',
      'frenzyPoints': 'system.secondaire.carriere.pf',
      'destinyPoints': 'system.secondaire.carriere.pd'
    };

    const careerTextareaPaths = [
      'system.career.primary.skills',
      'system.career.primary.talents',
      'system.career.primary.outcomes',
      'system.career.secondary.skills',
      'system.career.secondary.talents',
      'system.career.secondary.outcomes',
      'system.career.tertiary.skills',
      'system.career.tertiary.talents',
      'system.career.tertiary.outcomes',
      'system.career.quaternary.skills',
      'system.career.quaternary.talents',
      'system.career.quaternary.outcomes',
      'system.career.quinary.skills',
      'system.career.quinary.talents',
      'system.career.quinary.outcomes'
    ];

    careerTextareaPaths.forEach(path => {
      const selector = `textarea[name="${path}"]`;
      html.find(selector).off('.careerTextarea').on('change.careerTextarea', async ev => {
        ev.preventDefault();
        ev.stopPropagation();
        ev.stopImmediatePropagation();
        const textarea = ev.currentTarget;
        const newValue = (textarea.value ?? '').toString();
        const currentValue = ((foundry.utils.getProperty(sheet.actor, path) ?? '').toString());
        if (newValue === currentValue) return;
        try {
          await sheet.actor.update({ [path]: newValue }, { diff: false, render: false });
          try { foundry.utils.setProperty(sheet.actor, path, newValue); } catch (err) { console.debug('Unable to sync actor cache for career textarea', { path, err }); }
        } catch (err) {
          console.error('Unable to persist career textarea value', { path, err });
          try { ui.notifications.error("Erreur lors de la mise à jour du texte de carrière."); } catch (notifyErr) {}
        }
      });
    });

  
    html.find('input[name^="system.career.secondary."]').on('change', async ev => {
      try {
          const input = ev.currentTarget;
          const parts = input.name.split('.');
          const key = parts[parts.length - 1]; 
          const raw = (input.value || '').toString().trim();
          const cleaned = raw === '' ? '0' : raw.replace(/[^0-9-]/g, '');
          const parsed = parseInt(cleaned, 10);
          if (!Number.isFinite(parsed)) return;

          
          const targetSecondaire = mapSecondaryToSecondaire[key];
          if (targetSecondaire) {
            try { console.debug('[DEBUG] Persisting career secondary->secondaire', { inputName: input.name, key, raw, cleaned, parsed, targetSecondaire }); } catch(e){}
            try {
              const parentPath = targetSecondaire.replace(/\.[^.]+$/, ''); 
              const field = targetSecondaire.split('.').pop();
              const currentParent = sheet.actor.system.secondaire?.carriere ? foundry.utils.deepClone(sheet.actor.system.secondaire.carriere) : {};
              currentParent[field] = parsed;
              await sheet.actor.update({ [parentPath]: currentParent });
              
              try { sheet.actor.system.secondaire = sheet.actor.system.secondaire || {}; sheet.actor.system.secondaire.carriere = sheet.actor.system.secondaire.carriere || {}; sheet.actor.system.secondaire.carriere[field] = parsed; } catch(e) {}
            } catch (e) {  }
            try { sheet.render(false); } catch(e) {  }
            
            try {
              const $t = html.find(`input[name='${targetSecondaire}']`);
              if ($t.length) {
                if ($t.is(':checkbox')) $t.prop('checked', !!parsed);
                else $t.val(parsed);
              }
            } catch(e) {  }
          }

          
          
          const started = !!html.find('input[name="system.career.secondary.started"]').prop('checked');
          const targetPrincipal = mapSecondaryToPrincipal[key];
          if (started && targetPrincipal) {
            try { console.debug('[DEBUG] Mirroring secondary->principal', { inputName: input.name, key, raw, cleaned, parsed, targetPrincipal }); } catch(e){}
            try {
              
              
              
              
              const fieldP = targetPrincipal.split('.').pop();
              
              try {
                if (!sheet._backupPrincipalCarriereFromSecondary) sheet._backupPrincipalCarriereFromSecondary = foundry.utils.deepClone(sheet.actor.system.principal?.carriere || {});
              } catch(e) { sheet._backupPrincipalCarriereFromSecondary = foundry.utils.deepClone(sheet.actor.system.principal?.carriere || {}); }
              
              try { sheet.actor.system.principal = sheet.actor.system.principal || {}; sheet.actor.system.principal.carriere = sheet.actor.system.principal.carriere || {}; sheet.actor.system.principal.carriere[fieldP] = parsed; } catch(e) {}
              
            } catch (e) {  }
            try { sheet.render(false); } catch(e) {  }
            
            try {
              const $p = html.find(`input[name='${targetPrincipal}']`);
              if ($p.length) {
                
                const actorVal = Number(sheet.actor.system.principal?.carriere?.[fieldP]);
                if ($p.is(':checkbox')) $p.prop('checked', !!actorVal);
                else $p.val(Number.isFinite(actorVal) ? actorVal : parsed);
              }
            } catch(e) {  }
          }
      } catch (err) {  }
    });

    

    const registerAdditionalCareerHandlers = careerKey => {
      const ns = `.career-${careerKey}`;
      html.find(`input[name^="system.career.${careerKey}."]`).off(ns).on(`change${ns}`, async ev => {
        ev.preventDefault();
        const input = ev.currentTarget;
        const name = input?.name;
        if (!name) return;
        let value;
        try {
          if (input.type === 'checkbox') {
            value = !!input.checked;
          } else if (input.type === 'number') {
            const raw = (input.value ?? '').toString().trim().replace(/,/g, '.');
            const parsed = raw === '' ? 0 : Number(raw);
            value = Number.isFinite(parsed) ? parsed : 0;
          } else {
            value = (input.value ?? '').toString();
          }
          await sheet.actor.update({ [name]: value });
          try { foundry.utils.setProperty(sheet.actor, name, value); } catch (err) { console.debug('Unable to sync career field locally', { careerKey, name, err }); }
        } catch (err) {
          console.error('Unable to persist additional career field', { careerKey, name, err });
        }
      });
    };

    ['tertiary', 'quaternary', 'quinary'].forEach(registerAdditionalCareerHandlers);

    html.find('input[name^="system.career.primary."]').on('change', async ev => {
      try {
        const input = ev.currentTarget;
        const parts = input.name.split('.');
        const key = parts[parts.length - 1]; 
        const target = `system.principal.carriere.${key}`;
        const raw = (input.value || '').toString().trim();
        const cleaned = raw === '' ? '0' : raw.replace(/[^0-9-]/g, '');
        const parsed = parseInt(cleaned, 10);
        if (!Number.isFinite(parsed)) return;
        try { console.debug('[DEBUG] Mirroring career primary->principal', { inputName: input.name, raw, cleaned, parsed, target }); } catch(e){}
        await sheet.actor.update({ [target]: parsed });
      } catch (err) {  }
    });

      
      
      
      
      try {
        html.find('input[name="system.career.secondary.started"]').on('change', async ev => {
          try {
            const checked = !!ev.currentTarget.checked;
            try { await sheet.actor.update({ 'system.career.secondary.started': checked }); } catch(e) {  }

            const slot = 'secondary';
            const slotNameField = `system.career.${slot}Name`;
            const primaryKeys = Object.keys(mapSecondaryToPrincipal || {});
            const secondaryKeys = Object.keys(mapSecondaryToSecondaire || {});

            if (checked) {
              try { if (!sheet._backupPrincipalCarriereFromSecondary) sheet._backupPrincipalCarriereFromSecondary = foundry.utils.deepClone(sheet.actor.system.principal?.carriere || {}); } catch(e) { sheet._backupPrincipalCarriereFromSecondary = foundry.utils.deepClone(sheet.actor.system.principal?.carriere || {}); }
              try { if (!sheet._backupSecondaireCarriereFromSecondary) sheet._backupSecondaireCarriereFromSecondary = foundry.utils.deepClone(sheet.actor.system.secondaire?.carriere || {}); } catch(e) { sheet._backupSecondaireCarriereFromSecondary = foundry.utils.deepClone(sheet.actor.system.secondaire?.carriere || {}); }

              const updateData = {};

              const $nameInput = html.find(`input[name='${slotNameField}']`);
              const nameVal = $nameInput.length ? ($nameInput.val() || '').toString() : (sheet.actor.system.career?.[slot + 'Name'] || '');
              updateData['system.career.primaryName'] = nameVal;

              const newPrincipal = foundry.utils.deepClone(sheet.actor.system.principal?.carriere || {});
              for (const pk of primaryKeys) {
                try {
                  const inputSel = `input[name='system.career.${slot}.${pk}']`;
                  const $inp = html.find(inputSel);
                  const val = $inp.length ? Number(($inp.val() || '').toString().replace(/,/g, '.')) || 0 : Number(sheet.actor.system.career?.[slot]?.[pk]) || 0;
                  const princPath = mapSecondaryToPrincipal[pk];
                  const fieldP = princPath.split('.').pop();
                  newPrincipal[fieldP] = val;
                } catch(e) { }
              }
              updateData['system.principal.carriere'] = newPrincipal;

              const newSecondaire = foundry.utils.deepClone(sheet.actor.system.secondaire?.carriere || {});
              for (const sk of secondaryKeys) {
                try {
                  const inputSel = `input[name='system.career.${slot}.${sk}']`;
                  const $inp = html.find(inputSel);
                  const valRaw = $inp.length ? ($inp.val() || '').toString() : (sheet.actor.system.career?.[slot]?.[sk] || '0');
                  const val = sk === 'strengthBonus' || sk === 'enduranceBonus' || sk === 'frenzyPoints' || sk === 'destinyPoints' ? valRaw : Number(valRaw.toString().replace(/,/g, '.')) || 0;
                  const target = mapSecondaryToSecondaire[sk];
                  const field = target.split('.').pop();
                  newSecondaire[field] = val;
                } catch(e) { }
              }
              updateData['system.secondaire.carriere'] = newSecondaire;

              const lists = ['skills', 'talents', 'outcomes'];
              for (const lst of lists) {
                const field = `system.career.${slot}.${lst}`;
                const $ta = html.find(`textarea[name='${field}']`);
                updateData[`system.career.primary.${lst}`] = $ta.length ? ($ta.val() || '').toString() : (sheet.actor.system.career?.[slot]?.[lst] || '');
              }

              try {
                await sheet.actor.update(updateData);
                try { foundry.utils.setProperty(sheet.actor, 'system.principal.carriere', newPrincipal); } catch(e) {}
                try { foundry.utils.setProperty(sheet.actor, 'system.secondaire.carriere', newSecondaire); } catch(e) {}
                try { foundry.utils.setProperty(sheet.actor, 'system.career.primaryName', nameVal); } catch(e) {}
                for (const lst of lists) try { foundry.utils.setProperty(sheet.actor, `system.career.primary.${lst}`, updateData[`system.career.primary.${lst}`]); } catch(e) {}
              } catch (e) { console.error('Unable to persist career start mirror for secondary', e); }

              try { sheet.render(false); } catch (e) {}
              return;
            }

            const restoreData = {};
            if (sheet._backupPrincipalCarriereFromSecondary) {
              restoreData['system.principal.carriere'] = foundry.utils.deepClone(sheet._backupPrincipalCarriereFromSecondary);
            }
            if (sheet._backupSecondaireCarriereFromSecondary) {
              restoreData['system.secondaire.carriere'] = foundry.utils.deepClone(sheet._backupSecondaireCarriereFromSecondary);
            }
            try {
              if (Object.keys(restoreData).length) {
                await sheet.actor.update(restoreData);
                try { if (restoreData['system.principal.carriere']) foundry.utils.setProperty(sheet.actor, 'system.principal.carriere', restoreData['system.principal.carriere']); } catch(e) {}
                try { if (restoreData['system.secondaire.carriere']) foundry.utils.setProperty(sheet.actor, 'system.secondaire.carriere', restoreData['system.secondaire.carriere']); } catch(e) {}
              }
            } catch (e) { console.error('Unable to restore principal/secondaire from secondary backup', e); }

            try { delete sheet._backupPrincipalCarriereFromSecondary; } catch(e){}
            try { delete sheet._backupSecondaireCarriereFromSecondary; } catch(e){}
            try { sheet.render(false); } catch (e) {}
          } catch (err) {  }
        });
      } catch (e) {  }


      try {
        html.find('input[name="system.career.tertiary.started"]').on('change', async ev => {
          try {
            const checked = !!ev.currentTarget.checked;
            try { await sheet.actor.update({ 'system.career.tertiary.started': checked }); } catch(e) {  }
            const slot = 'tertiary';
            const slotNameField = `system.career.${slot}Name`;
            const primaryKeys = Object.keys(mapSecondaryToPrincipal || {});
            const secondaryKeys = Object.keys(mapSecondaryToSecondaire || {});

            if (checked) {
              try { if (!sheet._backupPrincipalCarriereFromTertiary) sheet._backupPrincipalCarriereFromTertiary = foundry.utils.deepClone(sheet.actor.system.principal?.carriere || {}); } catch(e) { sheet._backupPrincipalCarriereFromTertiary = foundry.utils.deepClone(sheet.actor.system.principal?.carriere || {}); }
              try { if (!sheet._backupSecondaireCarriereFromTertiary) sheet._backupSecondaireCarriereFromTertiary = foundry.utils.deepClone(sheet.actor.system.secondaire?.carriere || {}); } catch(e) { sheet._backupSecondaireCarriereFromTertiary = foundry.utils.deepClone(sheet.actor.system.secondaire?.carriere || {}); }

              const updateData = {};
              const $nameInput = html.find(`input[name='${slotNameField}']`);
              const nameVal = $nameInput.length ? ($nameInput.val() || '').toString() : (sheet.actor.system.career?.[slot + 'Name'] || '');
              updateData['system.career.primaryName'] = nameVal;

              const newPrincipal = foundry.utils.deepClone(sheet.actor.system.principal?.carriere || {});
              for (const pk of primaryKeys) {
                try {
                  const $inp = html.find(`input[name='system.career.${slot}.${pk}']`);
                  const val = $inp.length ? Number(($inp.val() || '').toString().replace(/,/g, '.')) || 0 : Number(sheet.actor.system.career?.[slot]?.[pk]) || 0;
                  const princPath = mapSecondaryToPrincipal[pk];
                  const fieldP = princPath.split('.').pop();
                  newPrincipal[fieldP] = val;
                } catch(e) { }
              }
              updateData['system.principal.carriere'] = newPrincipal;

              const newSecondaire = foundry.utils.deepClone(sheet.actor.system.secondaire?.carriere || {});
              for (const sk of secondaryKeys) {
                try {
                  const $inp = html.find(`input[name='system.career.${slot}.${sk}']`);
                  const valRaw = $inp.length ? ($inp.val() || '').toString() : (sheet.actor.system.career?.[slot]?.[sk] || '0');
                  const val = sk === 'strengthBonus' || sk === 'enduranceBonus' || sk === 'frenzyPoints' || sk === 'destinyPoints' ? valRaw : Number(valRaw.toString().replace(/,/g, '.')) || 0;
                  const target = mapSecondaryToSecondaire[sk];
                  const field = target.split('.').pop();
                  newSecondaire[field] = val;
                } catch(e) { }
              }
              updateData['system.secondaire.carriere'] = newSecondaire;

              const lists = ['skills', 'talents', 'outcomes'];
              for (const lst of lists) {
                const field = `system.career.${slot}.${lst}`;
                const $ta = html.find(`textarea[name='${field}']`);
                updateData[`system.career.primary.${lst}`] = $ta.length ? ($ta.val() || '').toString() : (sheet.actor.system.career?.[slot]?.[lst] || '');
              }

              try {
                await sheet.actor.update(updateData);
                try { foundry.utils.setProperty(sheet.actor, 'system.principal.carriere', newPrincipal); } catch(e) {}
                try { foundry.utils.setProperty(sheet.actor, 'system.secondaire.carriere', newSecondaire); } catch(e) {}
                try { foundry.utils.setProperty(sheet.actor, 'system.career.primaryName', nameVal); } catch(e) {}
                for (const lst of lists) try { foundry.utils.setProperty(sheet.actor, `system.career.primary.${lst}`, updateData[`system.career.primary.${lst}`]); } catch(e) {}
              } catch (e) { console.error('Unable to persist career start mirror for tertiary', e); }

              try { sheet.render(false); } catch (e) {}
              return;
            }

            const restoreData = {};
            if (sheet._backupPrincipalCarriereFromTertiary) restoreData['system.principal.carriere'] = foundry.utils.deepClone(sheet._backupPrincipalCarriereFromTertiary);
            if (sheet._backupSecondaireCarriereFromTertiary) restoreData['system.secondaire.carriere'] = foundry.utils.deepClone(sheet._backupSecondaireCarriereFromTertiary);
            try {
              if (Object.keys(restoreData).length) {
                await sheet.actor.update(restoreData);
                try { if (restoreData['system.principal.carriere']) foundry.utils.setProperty(sheet.actor, 'system.principal.carriere', restoreData['system.principal.carriere']); } catch(e) {}
                try { if (restoreData['system.secondaire.carriere']) foundry.utils.setProperty(sheet.actor, 'system.secondaire.carriere', restoreData['system.secondaire.carriere']); } catch(e) {}
              }
            } catch (e) { console.error('Unable to restore principal/secondaire from tertiary backup', e); }
            try { delete sheet._backupPrincipalCarriereFromTertiary; } catch(e){}
            try { delete sheet._backupSecondaireCarriereFromTertiary; } catch(e){}
            try { sheet.render(false); } catch (e) {}
          } catch (err) {  }
        });
      } catch (e) {  }

      try {
        html.find('input[name="system.career.quaternary.started"]').on('change', async ev => {
          try {
            const checked = !!ev.currentTarget.checked;
            try { await sheet.actor.update({ 'system.career.quaternary.started': checked }); } catch(e) {  }
            const slot = 'quaternary';
            const slotNameField = `system.career.${slot}Name`;
            const primaryKeys = Object.keys(mapSecondaryToPrincipal || {});
            const secondaryKeys = Object.keys(mapSecondaryToSecondaire || {});

            if (checked) {
              try { if (!sheet._backupPrincipalCarriereFromQuaternary) sheet._backupPrincipalCarriereFromQuaternary = foundry.utils.deepClone(sheet.actor.system.principal?.carriere || {}); } catch(e) { sheet._backupPrincipalCarriereFromQuaternary = foundry.utils.deepClone(sheet.actor.system.principal?.carriere || {}); }
              try { if (!sheet._backupSecondaireCarriereFromQuaternary) sheet._backupSecondaireCarriereFromQuaternary = foundry.utils.deepClone(sheet.actor.system.secondaire?.carriere || {}); } catch(e) { sheet._backupSecondaireCarriereFromQuaternary = foundry.utils.deepClone(sheet.actor.system.secondaire?.carriere || {}); }

              const updateData = {};
              const $nameInput = html.find(`input[name='${slotNameField}']`);
              const nameVal = $nameInput.length ? ($nameInput.val() || '').toString() : (sheet.actor.system.career?.[slot + 'Name'] || '');
              updateData['system.career.primaryName'] = nameVal;

              const newPrincipal = foundry.utils.deepClone(sheet.actor.system.principal?.carriere || {});
              for (const pk of primaryKeys) {
                try {
                  const $inp = html.find(`input[name='system.career.${slot}.${pk}']`);
                  const val = $inp.length ? Number(($inp.val() || '').toString().replace(/,/g, '.')) || 0 : Number(sheet.actor.system.career?.[slot]?.[pk]) || 0;
                  const princPath = mapSecondaryToPrincipal[pk];
                  const fieldP = princPath.split('.').pop();
                  newPrincipal[fieldP] = val;
                } catch(e) { }
              }
              updateData['system.principal.carriere'] = newPrincipal;

              const newSecondaire = foundry.utils.deepClone(sheet.actor.system.secondaire?.carriere || {});
              for (const sk of secondaryKeys) {
                try {
                  const $inp = html.find(`input[name='system.career.${slot}.${sk}']`);
                  const valRaw = $inp.length ? ($inp.val() || '').toString() : (sheet.actor.system.career?.[slot]?.[sk] || '0');
                  const val = sk === 'strengthBonus' || sk === 'enduranceBonus' || sk === 'frenzyPoints' || sk === 'destinyPoints' ? valRaw : Number(valRaw.toString().replace(/,/g, '.')) || 0;
                  const target = mapSecondaryToSecondaire[sk];
                  const field = target.split('.').pop();
                  newSecondaire[field] = val;
                } catch(e) { }
              }
              updateData['system.secondaire.carriere'] = newSecondaire;

              const lists = ['skills', 'talents', 'outcomes'];
              for (const lst of lists) {
                const field = `system.career.${slot}.${lst}`;
                const $ta = html.find(`textarea[name='${field}']`);
                updateData[`system.career.primary.${lst}`] = $ta.length ? ($ta.val() || '').toString() : (sheet.actor.system.career?.[slot]?.[lst] || '');
              }

              try {
                await sheet.actor.update(updateData);
                try { foundry.utils.setProperty(sheet.actor, 'system.principal.carriere', newPrincipal); } catch(e) {}
                try { foundry.utils.setProperty(sheet.actor, 'system.secondaire.carriere', newSecondaire); } catch(e) {}
                try { foundry.utils.setProperty(sheet.actor, 'system.career.primaryName', nameVal); } catch(e) {}
                for (const lst of lists) try { foundry.utils.setProperty(sheet.actor, `system.career.primary.${lst}`, updateData[`system.career.primary.${lst}`]); } catch(e) {}
              } catch (e) { console.error('Unable to persist career start mirror for quaternary', e); }

              try { sheet.render(false); } catch (e) {}
              return;
            }

            const restoreData = {};
            if (sheet._backupPrincipalCarriereFromQuaternary) restoreData['system.principal.carriere'] = foundry.utils.deepClone(sheet._backupPrincipalCarriereFromQuaternary);
            if (sheet._backupSecondaireCarriereFromQuaternary) restoreData['system.secondaire.carriere'] = foundry.utils.deepClone(sheet._backupSecondaireCarriereFromQuaternary);
            try {
              if (Object.keys(restoreData).length) {
                await sheet.actor.update(restoreData);
                try { if (restoreData['system.principal.carriere']) foundry.utils.setProperty(sheet.actor, 'system.principal.carriere', restoreData['system.principal.carriere']); } catch(e) {}
                try { if (restoreData['system.secondaire.carriere']) foundry.utils.setProperty(sheet.actor, 'system.secondaire.carriere', restoreData['system.secondaire.carriere']); } catch(e) {}
              }
            } catch (e) { console.error('Unable to restore principal/secondaire from quaternary backup', e); }
            try { delete sheet._backupPrincipalCarriereFromQuaternary; } catch(e){}
            try { delete sheet._backupSecondaireCarriereFromQuaternary; } catch(e){}
            try { sheet.render(false); } catch (e) {}
          } catch (err) {  }
        });
      } catch (e) {  }

      try {
        html.find('input[name="system.career.quinary.started"]').on('change', async ev => {
          try {
            const checked = !!ev.currentTarget.checked;
            try { await sheet.actor.update({ 'system.career.quinary.started': checked }); } catch(e) {  }
            const slot = 'quinary';
            const slotNameField = `system.career.${slot}Name`;
            const primaryKeys = Object.keys(mapSecondaryToPrincipal || {});
            const secondaryKeys = Object.keys(mapSecondaryToSecondaire || {});

            if (checked) {
              try { if (!sheet._backupPrincipalCarriereFromQuinary) sheet._backupPrincipalCarriereFromQuinary = foundry.utils.deepClone(sheet.actor.system.principal?.carriere || {}); } catch(e) { sheet._backupPrincipalCarriereFromQuinary = foundry.utils.deepClone(sheet.actor.system.principal?.carriere || {}); }
              try { if (!sheet._backupSecondaireCarriereFromQuinary) sheet._backupSecondaireCarriereFromQuinary = foundry.utils.deepClone(sheet.actor.system.secondaire?.carriere || {}); } catch(e) { sheet._backupSecondaireCarriereFromQuinary = foundry.utils.deepClone(sheet.actor.system.secondaire?.carriere || {}); }

              const updateData = {};
              const $nameInput = html.find(`input[name='${slotNameField}']`);
              const nameVal = $nameInput.length ? ($nameInput.val() || '').toString() : (sheet.actor.system.career?.[slot + 'Name'] || '');
              updateData['system.career.primaryName'] = nameVal;

              const newPrincipal = foundry.utils.deepClone(sheet.actor.system.principal?.carriere || {});
              for (const pk of primaryKeys) {
                try {
                  const $inp = html.find(`input[name='system.career.${slot}.${pk}']`);
                  const val = $inp.length ? Number(($inp.val() || '').toString().replace(/,/g, '.')) || 0 : Number(sheet.actor.system.career?.[slot]?.[pk]) || 0;
                  const princPath = mapSecondaryToPrincipal[pk];
                  const fieldP = princPath.split('.').pop();
                  newPrincipal[fieldP] = val;
                } catch(e) { }
              }
              updateData['system.principal.carriere'] = newPrincipal;

              const newSecondaire = foundry.utils.deepClone(sheet.actor.system.secondaire?.carriere || {});
              for (const sk of secondaryKeys) {
                try {
                  const $inp = html.find(`input[name='system.career.${slot}.${sk}']`);
                  const valRaw = $inp.length ? ($inp.val() || '').toString() : (sheet.actor.system.career?.[slot]?.[sk] || '0');
                  const val = sk === 'strengthBonus' || sk === 'enduranceBonus' || sk === 'frenzyPoints' || sk === 'destinyPoints' ? valRaw : Number(valRaw.toString().replace(/,/g, '.')) || 0;
                  const target = mapSecondaryToSecondaire[sk];
                  const field = target.split('.').pop();
                  newSecondaire[field] = val;
                } catch(e) { }
              }
              updateData['system.secondaire.carriere'] = newSecondaire;

              const lists = ['skills', 'talents', 'outcomes'];
              for (const lst of lists) {
                const field = `system.career.${slot}.${lst}`;
                const $ta = html.find(`textarea[name='${field}']`);
                updateData[`system.career.primary.${lst}`] = $ta.length ? ($ta.val() || '').toString() : (sheet.actor.system.career?.[slot]?.[lst] || '');
              }

              try {
                await sheet.actor.update(updateData);
                try { foundry.utils.setProperty(sheet.actor, 'system.principal.carriere', newPrincipal); } catch(e) {}
                try { foundry.utils.setProperty(sheet.actor, 'system.secondaire.carriere', newSecondaire); } catch(e) {}
                try { foundry.utils.setProperty(sheet.actor, 'system.career.primaryName', nameVal); } catch(e) {}
                for (const lst of lists) try { foundry.utils.setProperty(sheet.actor, `system.career.primary.${lst}`, updateData[`system.career.primary.${lst}`]); } catch(e) {}
              } catch (e) { console.error('Unable to persist career start mirror for quinary', e); }

              try { sheet.render(false); } catch (e) {}
              return;
            }

            const restoreData = {};
            if (sheet._backupPrincipalCarriereFromQuinary) restoreData['system.principal.carriere'] = foundry.utils.deepClone(sheet._backupPrincipalCarriereFromQuinary);
            if (sheet._backupSecondaireCarriereFromQuinary) restoreData['system.secondaire.carriere'] = foundry.utils.deepClone(sheet._backupSecondaireCarriereFromQuinary);
            try {
              if (Object.keys(restoreData).length) {
                await sheet.actor.update(restoreData);
                try { if (restoreData['system.principal.carriere']) foundry.utils.setProperty(sheet.actor, 'system.principal.carriere', restoreData['system.principal.carriere']); } catch(e) {}
                try { if (restoreData['system.secondaire.carriere']) foundry.utils.setProperty(sheet.actor, 'system.secondaire.carriere', restoreData['system.secondaire.carriere']); } catch(e) {}
              }
            } catch (e) { console.error('Unable to restore principal/secondaire from quinary backup', e); }
            try { delete sheet._backupPrincipalCarriereFromQuinary; } catch(e){}
            try { delete sheet._backupSecondaireCarriereFromQuinary; } catch(e){}
            try { sheet.render(false); } catch (e) {}
          } catch (err) {  }
        });
      } catch (e) {  }

    
    
    
    const mapPrimarySecondaryToSecondaire = {
      'attacks': 'a',
      'wounds': 'b',
      'strengthBonus': 'bf',
      'enduranceBonus': 'be',
      'movement': 'mvt',
      'magic': 'mag',
      'frenzyPoints': 'pf',
      'destinyPoints': 'pd'
    };

    html.find('input[name^="system.career.primary."]').on('change', async ev => {
      try {
        const input = ev.currentTarget;
        const parts = input.name.split('.');
        const key = parts[parts.length - 1];
        if (!mapPrimarySecondaryToSecondaire[key]) return; 
        const raw = (input.value || '').toString().trim();
        const cleaned = raw === '' ? '0' : raw.replace(/[^0-9-]/g, '');
        const parsed = parseInt(cleaned, 10);
        if (!Number.isFinite(parsed)) return;

        
        const field = mapPrimarySecondaryToSecondaire[key];
        const parentPath = 'system.secondaire.carriere';
        const currentParent = sheet.actor.system.secondaire?.carriere ? foundry.utils.deepClone(sheet.actor.system.secondaire.carriere) : {};
        currentParent[field] = parsed;
        try { console.debug('[DEBUG] Persisting primary career secondary->secondaire', { key, raw, cleaned, parsed, parentPath, field }); } catch(e){}
        await sheet.actor.update({ [parentPath]: currentParent });
        
        try { sheet.actor.system.secondaire = sheet.actor.system.secondaire || {}; sheet.actor.system.secondaire.carriere = sheet.actor.system.secondaire.carriere || {}; sheet.actor.system.secondaire.carriere[field] = parsed; } catch(e){}
        try { sheet.render(false); } catch(e){}
      } catch (e) {  }
    });
  } catch (e) {  }

  
  try { computeTotalCO(); } catch (e) {}

  
  try {
    html.find('.armor-equip').each((_, el) => {
      try {
        const $el = $(el);
        const name = $el.attr('name') || '';
        const bonusField = name.replace(/\.eq$/, '.bonus');
        const $bonusInput = html.find(`input[name='${bonusField}']`);
        if (!$bonusInput.length) return;
        const val = ($el.val() || '').toString().toUpperCase().trim();
        const isEquipped = (val === 'YES') || ($el.is(':checkbox') && $el.prop('checked'));
        $bonusInput.prop('disabled', !isEquipped);
      } catch (e) {  }
    });
  } catch (e) {  }

  
  
  
  
  try {
    html.find('.armor-tables, .armor-table').on('change', "input[name*='system.armor'][name$='.name'], input[name*='system.armor'][name$='.enc'], select[name*='system.armor'][name$='.qualite']", async ev => {
      try {
        ev.preventDefault(); ev.stopImmediatePropagation();
      } catch (e) {}
      try {
        const input = ev.currentTarget;
        const name = input.name;
        let value = input.value;
        if (!name) return;
        
        if (input.type === 'number' || name.endsWith('.enc')) {
          value = Number((value || '').toString().replace(/,/g, '.')) || 0;
        }
        await sheet.actor.update({ [name]: value });
      } catch (err) {  }
    });
  } catch (e) {  }

  

  
  html.find("table.skills-table .skill-delete").on('click', ev => {
    ev.preventDefault();
    ev.stopPropagation();
    const id = ev.currentTarget.dataset.skillId;
    const advancedSkills = sheet.actor.system.skills?.advanced;
    if (!advancedSkills || !Array.isArray(advancedSkills)) return ui.notifications.warn('Aucune compétence avancée trouvée');
    const skills = advancedSkills.slice();
    const idx = skills.findIndex(s => String(s.id) === String(id));
    if (idx < 0) return ui.notifications.warn('Compétence non trouvée');
    const skillName = skills[idx]?.label || 'cette compétence';
    Dialog.confirm({
      title: 'Supprimer la compétence',
      content: `<p>Êtes-vous sûr de vouloir supprimer <strong>${skillName}</strong> ?</p>`,
      yes: () => { skills.splice(idx, 1); sheet.actor.update({ 'system.skills.advanced': skills }); },
      no: () => {},
      defaultYes: false
    });
  });

  
  html.find('.skill-roll').on('click', ev => {
    ev.preventDefault();
    const button = ev.currentTarget;
    const skillName = button.dataset.skill;
    if (!isNaN(skillName)) { sheet._handleAdvancedSkillRoll(parseInt(skillName)); return; }
    const skillData = sheet.actor.system.skills?.base?.[skillName];
    if (!skillData) return ui.notifications.warn('Compétence non trouvée');
    const niveau = Number(skillData.niveau) || 0;
    const talents = Number(skillData.talents) || 0;
    const divers = Number(skillData.divers) || 0;
    const avance = skillData.avance || false;
    let caracValue = 0;
    if (skillName === 'intimidation') {
      const caraChoice = skillData.cara || 'F';
      caracValue = caraChoice === 'Soc' ? sheet.actor.system.principal?.actuel?.sociabilite || 0 : sheet.actor.system.principal?.actuel?.force || 0;
    } else {
      const caracMapping = {
        'soinsAnimaux': sheet.actor.system.principal?.actuel?.intelligence || 0,
        'charisme': sheet.actor.system.principal?.actuel?.sociabilite || 0,
        'commandement': sheet.actor.system.principal?.actuel?.sociabilite || 0,
        'resistanceAlcool': sheet.actor.system.principal?.actuel?.endurance || 0,
        'deguisement': sheet.actor.system.principal?.actuel?.sociabilite || 0,
        'conduiteAttelage': sheet.actor.system.principal?.actuel?.agilite || 0,
        'dissimulation': sheet.actor.system.principal?.actuel?.agilite || 0,
        'evaluation': sheet.actor.system.principal?.actuel?.intelligence || 0,
        'jeu': sheet.actor.system.principal?.actuel?.intelligence || 0,
        'commerage': sheet.actor.system.principal?.actuel?.sociabilite || 0,
        'marchandage': sheet.actor.system.principal?.actuel?.sociabilite || 0,
        'survie': sheet.actor.system.principal?.actuel?.intelligence || 0,
        'perception': sheet.actor.system.principal?.actuel?.intelligence || 0,
        'equitation': sheet.actor.system.principal?.actuel?.agilite || 0,
        'canotage': sheet.actor.system.principal?.actuel?.force || 0,
        'escalade': sheet.actor.system.principal?.actuel?.force || 0,
        'fouille': sheet.actor.system.principal?.actuel?.intelligence || 0,
        'deplacementSilencieux': sheet.actor.system.principal?.actuel?.agilite || 0,
        'natation': sheet.actor.system.principal?.actuel?.force || 0
      };
      caracValue = caracMapping[skillName] || 0;
    }
    const caracBase = avance ? caracValue : Math.floor(caracValue / 2);
    const skillTotal = niveau + talents + divers + caracBase;
    sheet._showSkillRollDialog(skillName, skillTotal);
  });

  
  const spellsSection = html.find('.spells-section');
  if (spellsSection.length) {
    spellsSection.find('.gold-tab[data-cat]').on('click', ev => {
      ev.preventDefault();
      const btn = ev.currentTarget;
      const cat = btn.dataset.cat;
      const normalizedCat = cat === 'profane' ? 'occulte' : cat;
      
      spellsSection.find('.gold-tab').removeClass('active');
      $(btn).addClass('active');
      const list = spellsSection.find('.spells-list');
      list.show();
      
      if (normalizedCat === 'occulte') {
        const rawSchool = sheet.actor.system?.spells?.school || '';
        const school = rawSchool === 'nothing' ? '' : rawSchool;
        if (school) return sheet._renderSpellsBySchool(school);
        list.empty().html('<div>Sélectionnez une science de la Magie pour afficher ces sorts.</div>');
        list.data('spellsView', 'message');
        return;
      }
      if (normalizedCat === 'divin') {
        const rawDivine = sheet.actor.system?.spells?.divine || '';
        const divine = rawDivine === 'nothing' ? '' : rawDivine;
        if (divine) return sheet._renderSpellsBySchool(divine);
        list.empty().html('<div>Sélectionnez un domaine divin pour afficher ces sorts.</div>');
        list.data('spellsView', 'message');
        return;
      }
      if (normalizedCat === 'owned') {
        sheet._renderOwnedSpells();
        return;
      }
      sheet._renderSpellsList(normalizedCat);
    });

    spellsSection.find('select[name="system.spells.school"]').on('change', async ev => {
      ev.preventDefault();
      let val = ev.currentTarget.value;
      if (val === 'nothing') val = '';
      try { await sheet.actor.update({ 'system.spells.school': val }); } catch (err) { console.error('Unable to persist selected school', err); }
      try { sheet._renderSpellsBySchool(val); } catch (err) { console.error('Unable to render spells by school', err); }
    });

    spellsSection.find('select[name="system.spells.divine"]').on('change', async ev => {
      ev.preventDefault();
      let val = ev.currentTarget.value;
      if (val === 'nothing') val = '';
      try { await sheet.actor.update({ 'system.spells.divine': val }); } catch (err) { console.error('Unable to persist selected divine domain', err); }
      try { sheet._renderSpellsBySchool(val); } catch (err) { console.error('Unable to render spells by divine domain', err); }
    });

    const currentSchoolRaw = spellsSection.find('select[name="system.spells.school"]').val();
    const currentSchool = currentSchoolRaw === 'nothing' ? '' : currentSchoolRaw;
    if (currentSchool) sheet._renderSpellsBySchool(currentSchool);

    
    spellsSection.find('[data-action="malediction-tzeentch"]').on('click', ev => { ev.preventDefault(); openMaledictionDialog(sheet.actor); });
    spellsSection.find('[data-action="colere-dieux"]').on('click', ev => { ev.preventDefault(); openColereDialog(sheet.actor); });
    spellsSection.find('[data-action="focalisation-roll"]').on('click', ev => {
      ev.preventDefault();
      try {
        const actor = sheet.actor;
        const findStat = (key) => {
          const stats = actor.system?.principal?.actuel || {};
          return Number(stats[key]) || 0;
        };
        const statMap = {
          cc: findStat('cc'), CC: findStat('cc'),
          ct: findStat('ct'), CT: findStat('ct'),
          force: findStat('force'), F: findStat('force'), f: findStat('force'),
          endurance: findStat('endurance'), E: findStat('endurance'), e: findStat('endurance'),
          agilite: findStat('agilite'), Ag: findStat('agilite'), ag: findStat('agilite'),
          intelligence: findStat('intelligence'), Int: findStat('intelligence'), int: findStat('intelligence'),
          forceMentale: findStat('forceMentale'), FM: findStat('forceMentale'), fm: findStat('forceMentale'),
          sociabilite: findStat('sociabilite'), Soc: findStat('sociabilite'), soc: findStat('sociabilite')
        };

        const focalRowInput = sheet.element.find('input[name^="system.skills.advanced"][name$=".key"][value="focalisation"]').first();
        let label = 'Focalisation';
        let cara = 'FM';
        let niveau = 0;
        let talents = 0;
        let divers = 0;
        let avance = false;

        if (focalRowInput.length) {
          const row = focalRowInput.closest('tr');
          const labelInput = row.find('input[name$=".label"]');
          const caraInput = row.find('input[name$=".cara"]');
          const niveauInput = row.find('input[name$=".niveau"]');
          const talentsInput = row.find('input[name$=".talents"]');
          const diversInput = row.find('input[name$=".divers"]');
          const avanceInput = row.find('input[name$=".avance"]');
          if (labelInput.length) label = (labelInput.val() || label).toString();
          if (caraInput.length) cara = (caraInput.val() || cara).toString();
          if (niveauInput.length) niveau = Number((niveauInput.val() || '').toString().replace(/,/g, '.')) || 0;
          if (talentsInput.length) talents = Number((talentsInput.val() || '').toString().replace(/,/g, '.')) || 0;
          if (diversInput.length) divers = Number((diversInput.val() || '').toString().replace(/,/g, '.')) || 0;
          if (avanceInput.length) avance = avanceInput.is(':checked') || ['true', 'on', '1'].includes((avanceInput.val() || '').toString().toLowerCase());
        } else {
          const advSkills = Array.isArray(actor.system?.skills?.advanced) ? actor.system.skills.advanced : [];
          const existing = advSkills.find(s => s && (String(s.key).toLowerCase() === 'focalisation' || (String(s.label || '').trim().toLowerCase() === 'focalisation')));
          const def = (sheet.constructor?.advancedSkillsList || []).find(s => String(s.key) === 'focalisation');
          if (existing) {
            label = (existing.label || label).toString();
            cara = (existing.cara || cara).toString();
            niveau = Number(existing.niveau) || 0;
            talents = Number(existing.talents) || 0;
            divers = Number(existing.divers) || 0;
            avance = existing.avance === true || existing.avance === 'true' || existing.avance === 'on' || existing.avance === 1 || existing.avance === '1';
          } else if (def) {
            label = def.label || label;
            cara = def.cara || cara;
          }
        }

  const normalizedCara = (cara || '').toString();
  let statValue = 0;
  if (Object.prototype.hasOwnProperty.call(statMap, normalizedCara)) statValue = statMap[normalizedCara];
  else if (Object.prototype.hasOwnProperty.call(statMap, normalizedCara.toLowerCase())) statValue = statMap[normalizedCara.toLowerCase()];
  else if (Object.prototype.hasOwnProperty.call(statMap, normalizedCara.toUpperCase())) statValue = statMap[normalizedCara.toUpperCase()];
        const caracBase = avance ? statValue : Math.floor(statValue / 2);
        const skillTotal = niveau + talents + divers + caracBase;
        sheet._showSkillRollDialog(label, skillTotal);
      } catch (err) {
        console.error('Unable to roll Focalisation', err);
        try { ui.notifications.error('Impossible de lancer le jet de Focalisation'); } catch (e) {}
      }
    });
  }

  
  
  if (!game.user.isGM) {
    html.find('.xp-grant').hide();
  }
  html.find('.xp-grant').on('click', ev => {
    ev.preventDefault();
    if (!game.user.isGM) return ui.notifications.warn('Seul le MJ peut attribuer des PX');
    openGrantXpDialog(sheet);
  });

  
  html.find('.stat-roll').on('click', ev => {
    ev.preventDefault();
    const btn = ev.currentTarget;
    const attr = btn.dataset.attr;
    if (!attr) return ui.notifications.warn('Attribut non spécifié');
    const actor = sheet.actor;
    const content = `
      <form>
        <div class="form-group">
          <label>Bonus/Malus</label>
          <input type="number" id="stat-bonus" value="0" />
        </div>
      </form>
    `;
    new Dialog({
      title: `Jet de caractéristique — ${attr}`,
      content,
      buttons: {
        roll: {
          label: 'Lancer',
          callback: async (dlgHtml) => {
            const bonus = Number(dlgHtml.find('#stat-bonus').val()) || 0;

            const baseVal = Number(actor.system.principal?.actuel?.[attr]) || 0;
            const target = baseVal + bonus;

            try {
              const roll = await new Roll('1d100').evaluate();
              const total = roll.total;
              const success = total <= target;
              const labels = { cc: 'de CC', ct: 'de CT', force: 'de Force', endurance: 'd\'Endurance', agilite: 'd\'Agilité', intelligence: 'd\'Intelligence', forceMentale: 'de Force Mentale', sociabilite: 'de Sociabilité' };
              const label = labels[attr] || attr;
              
              const bonusText = bonus !== 0 ? (bonus > 0 ? `+${bonus}` : `${bonus}`) : '0';

              const degrees = Math.floor(Math.abs(target - total) / 10);
              let resultText = '';
              if (success) {
                if (degrees === 0) resultText = `<span style="color: green;"><strong>RÉUSSITE</strong></span>`;
                else resultText = `<span style="color: green;"><strong>RÉUSSITE</strong> avec ${degrees} degré${degrees > 1 ? 's' : ''}</span>`;
              } else {
                if (degrees === 0) resultText = `<span style="color: red;"><strong>ÉCHEC</strong></span>`;
                else resultText = `<span style="color: red;"><strong>ÉCHEC</strong> avec ${degrees} degré${degrees > 1 ? 's' : ''}</span>`;
              }

              let contentMsg = `
                <div class="stat-roll-result">
                  <h3>Jet ${label}</h3>
                  <div><strong>Bonus/Malus :</strong> ${bonusText}</div>
                  <div><strong>Résultat :</strong> <strong>${total}</strong> vs <strong>${target}</strong></div>
                  <div>${resultText}</div>
                  <div class="roll-details">${await roll.render()}</div>
                  <br/>
                  <div class="reroll-controls">
                    <button class="reroll-roll" data-actor-id="${actor?.id || ''}" data-target="${target}" data-modifier="${total - target}">Relancer (Coût: 1 Chance)</button>
                  </div>
                </div>
              `;

              ChatMessage.create({ user: game.user.id, speaker: ChatMessage.getSpeaker({ actor }), content: contentMsg });
            } catch (err) {
              console.error('Stat roll failed', err);
              ui.notifications.error('Erreur lors du jet de caractéristique');
            }
          }
        },
        cancel: { label: 'Annuler' }
      },
      default: 'roll'
    }).render(true);
  });

    
  html.find("input[name='system.principal.base.cc']").on('change', async ev => {
    const input = ev.currentTarget;
    const newCc = Math.max(1, Number(input.value) || 0);
    
    html.find("input[name$='.diceMin']").each((_, el) => {
      const $el = $(el);
      
      if (($el.attr('name') || '').match(/^system\.weapons\.\d+\.diceMin$/)) {
        $el.val(newCc);
      }
    });

    
    try {
      const sysWeapons = Array.isArray(sheet.actor.system.weapons) ? sheet.actor.system.weapons.slice() : [];
      let changed = false;
      const updated = sysWeapons.map(w => {
        if (!w) return w;
        if (w.mastery) return w; 
        const current = Number(w.diceMin) || 0;
        if (current !== newCc) { changed = true; return Object.assign({}, w, { diceMin: newCc }); }
        return w;
      });
      if (changed) await sheet.actor.update({ 'system.weapons': updated });
    } catch (err) {
      console.error('Unable to persist updated diceMin from CC change', err);
    }
  });

  // Apply armor movement penalty checkbox: when checked apply -1 to system.secondaire.mod.mvt once; unchecking does nothing
  html.find('.apply-armor-move-penalty').off('change').on('change', async ev => {
    try {
      const input = ev.currentTarget;
      const checked = !!input.checked;
      // Persist checkbox state under system.armor.applyMovePenalty
      const updates = { 'system.armor.applyMovePenalty': checked };
      // Only apply -1 movement once. Track with system.armor.movePenaltyAppliedOnce
      const alreadyApplied = !!sheet.actor.system?.armor?.movePenaltyAppliedOnce;
      if (checked && !alreadyApplied) {
        const currentMod = sheet.actor.system.secondaire?.mod ? foundry.utils.deepClone(sheet.actor.system.secondaire.mod) : {};
        currentMod.mvt = (Number(currentMod.mvt) || 0) - 1;
        updates['system.secondaire.mod'] = currentMod;
        updates['system.armor.movePenaltyAppliedOnce'] = true;
      }
      await sheet.actor.update(updates);
      try { foundry.utils.setProperty(sheet.actor, 'system.armor.applyMovePenalty', checked); } catch(e){}
      try { if (updates['system.secondaire.mod']) foundry.utils.setProperty(sheet.actor, 'system.secondaire.mod', updates['system.secondaire.mod']); } catch(e){}
      try { if (updates['system.armor.movePenaltyAppliedOnce']) foundry.utils.setProperty(sheet.actor, 'system.armor.movePenaltyAppliedOnce', updates['system.armor.movePenaltyAppliedOnce']); } catch(e){}
      try { sheet.render(false); } catch(e){}
      if (checked) ui.notifications.info('Malus de mouvement appliqué (-1)');
    } catch (err) {
      console.error('Unable to apply armor movement penalty', err);
      ui.notifications.error('Impossible d\'appliquer le malus de mouvement');
    }
  });

    html.find('.apply-armor-agility-penalty').off('change').on('change', async ev => {
    try {
      const input = ev.currentTarget;
      const checked = !!input.checked;
        const updates = { 'system.armor.applyAgilityPenalty': checked };
        // Use a one-shot flag so the -10 is applied only once
        const alreadyApplied = !!sheet.actor.system?.armor?.agilityPenaltyAppliedOnce;
        if (checked && !alreadyApplied) {
          const currentMod = sheet.actor.system.principal?.mod ? foundry.utils.deepClone(sheet.actor.system.principal.mod) : {};
          currentMod.agilite = (Number(currentMod.agilite) || 0) - 10;
          updates['system.principal.mod'] = currentMod;
          updates['system.armor.agilityPenaltyAppliedOnce'] = true;
        }
        await sheet.actor.update(updates);
        try { foundry.utils.setProperty(sheet.actor, 'system.armor.applyAgilityPenalty', checked); } catch(e){}
        try { if (updates['system.principal.mod']) foundry.utils.setProperty(sheet.actor, 'system.principal.mod', updates['system.principal.mod']); } catch(e){}
        try { if (updates['system.armor.agilityPenaltyAppliedOnce']) foundry.utils.setProperty(sheet.actor, 'system.armor.agilityPenaltyAppliedOnce', updates['system.armor.agilityPenaltyAppliedOnce']); } catch(e){}
        try { sheet.render(false); } catch(e){}
        if (checked) ui.notifications.info("Malus d'agilité appliqué (-10)");
    } catch (err) {
      console.error('Unable to apply armor agility penalty', err);
      ui.notifications.error('Impossible d\'appliquer le malus d\'agilité');
    }
  });
  
  html.find("input[name='system.principal.base.ct']").on('change', async ev => {
    const input = ev.currentTarget;
    const newCt = Math.max(1, Number(input.value) || 0);
    
    html.find("input[name$='.diceMin']").each((_, el) => {
      const $el = $(el);
      
      if (($el.attr('name') || '').match(/^system\.rangedWeapons\.\d+\.diceMin$/)) {
        $el.val(newCt);
      }
    });

    
    try {
      const sysRanged = Array.isArray(sheet.actor.system.rangedWeapons) ? sheet.actor.system.rangedWeapons.slice() : [];
      let changed = false;
      const updated = sysRanged.map(w => {
        if (!w) return w;
        if (w.mastery) return w; 
        const current = Number(w.diceMin) || 0;
        if (current !== newCt) { changed = true; return Object.assign({}, w, { diceMin: newCt }); }
        return w;
      });
      if (changed) await sheet.actor.update({ 'system.rangedWeapons': updated });
    } catch (err) {
      console.error('Unable to persist updated diceMin from CT change', err);
    }
  });

  
  const updateWeaponsBfFromActor = async (newBfActuel) => {
    
    html.find("input[name$='.bf']").each((_, el) => {
      const $el = $(el);
      if (($el.attr('name') || '').match(/^system\.weapons\.\d+\.bf$/)) {
        $el.val(newBfActuel);
      }
    });

    
    try {
      const sysWeapons = Array.isArray(sheet.actor.system.weapons) ? sheet.actor.system.weapons.slice() : [];
      const oldBf = Number(sheet.actor.system.secondaire?.actuel?.bf) || 0;
      let changed = false;
      const updated = sysWeapons.map(w => {
        if (!w) return w;
        
        const current = Number(w.bf) || 0;
        if (current === oldBf) { changed = true; return Object.assign({}, w, { bf: newBfActuel }); }
        return w;
      });
      if (changed) await sheet.actor.update({ 'system.weapons': updated });
    } catch (err) {
      console.error('Unable to persist updated weapon BF from actor BF change', err);
    }
  };

  html.find("input[name='system.principal.base.force']").on('change', async ev => {
    const input = ev.currentTarget;
    const newForce = Number(input.value) || 0;
    const baseBf = Math.round(newForce / 10);
    const modBf = Number(sheet.actor.system.secondaire?.mod?.bf) || 0;
    const newBfActuel = (baseBf || 0) + (modBf || 0);
    await updateWeaponsBfFromActor(newBfActuel);
  });

  
  html.find("input[name='system.secondaire.mod.bf']").on('change', async ev => {
    const input = ev.currentTarget;
    const modBf = Number(input.value) || 0;
    
    const baseForce = Number(sheet.actor.system.principal?.actuel?.force) || 0;
    const baseBf = Math.round(baseForce / 10);
    const newBfActuel = (baseBf || 0) + (modBf || 0);
    await updateWeaponsBfFromActor(newBfActuel);
  });
  
  html.find(".weapons-table.melee").on("change", "input[name*='bonusCC'], select[name*='quality']", ev => {
    const $row = $(ev.currentTarget).closest('tr');
    _recalculateDiceMin.call(sheet, html, $row.get(0));
  });

  
  html.find(".weapons-table.melee").on("change", "input[type='checkbox'][name*='mastery']", ev => {
    const $row = $(ev.currentTarget).closest('tr');
    _recalculateDiceMin.call(sheet, html, $row.get(0));
  });

  
  html.find(".weapons-table.ranged").on("change", "input[name*='bonusCT'], select[name*='quality']", ev => {
    const $row = $(ev.currentTarget).closest('tr');
    _recalculateDiceMinRanged.call(sheet, html, $row.get(0));
  });

  
  html.find(".weapons-table.ranged").on("change", "input[type='checkbox'][name*='mastery']", ev => {
    const $row = $(ev.currentTarget).closest('tr');
    _recalculateDiceMinRanged.call(sheet, html, $row.get(0));
  });

  html.find(".weapons-table.ranged").on("change", "select[name*='type']", ev => {
    const $row = $(ev.currentTarget).closest('tr');
    _recalculateDiceMinRanged.call(sheet, html, $row.get(0));
  });

  
  html.find('.inventory-add').on('click', ev => {
    ev.preventDefault();
    try {
      const tbody = sheet.element.find('.inventory-table tbody');
      const nextIndex = Math.max(0, tbody.find('tr').length);
      const rowHtml = `
        <tr>
          <td><input type="checkbox" name="system.inventory.${nextIndex}.transported"></td>
          <td><input type="number" name="system.inventory.${nextIndex}.quantity" value="1" min="1"></td>
          <td><input type="text" name="system.inventory.${nextIndex}.name" value=""></td>
          <td><input type="number" step="0.1" name="system.inventory.${nextIndex}.weight" value="0"></td>
          <td><input type="text" name="system.inventory.${nextIndex}.description" value=""></td>
          <td><button type="button" class="inventory-delete">🗑</button></td>
          <input type="hidden" name="system.inventory.${nextIndex}.id" value="">
        </tr>
      `;
      const $row = $(rowHtml);
      tbody.append($row);
      $row.find('.inventory-delete').on('click', ev2 => { ev2.preventDefault(); $row.remove(); });
      setTimeout(() => { try { $row[0].scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch(e){} }, 50);
      ui.notifications.info('Nouvel objet ajouté — remplissez puis sauvegardez la fiche.');
    
    } catch (err) {
      console.error('Unable to insert dynamic inventory row', err);
      ui.notifications.error('Erreur lors de l\'ajout local de l\'objet.');
    }
  });

  html.find('.inventory-delete').on('click', ev => {
    ev.preventDefault();
    const $btn = $(ev.currentTarget);
    const $tr = $btn.closest('tr');
    const itemName = $tr.find("input[name$='.name']").val() || 'cet objet';
    Dialog.confirm({
      title: 'Supprimer l\'objet',
      content: `<p>Êtes-vous sûr de vouloir supprimer <strong>${itemName}</strong> ?</p>`,
      yes: async () => {
        try {
          const tbody = sheet.element.find('.inventory-table tbody');
          const rows = tbody.find('tr').toArray();
          const newInv = [];
          for (let r of rows) {
            if (r === $tr[0]) continue;
            const $r = $(r);
            const idVal = $r.find("input[name$='.id']").val();
            const transported = !!$r.find("input[name$='.transported']").prop('checked');
            const quantity = Number($r.find("input[name$='.quantity']").val()) || 1;
            const nameVal = $r.find("input[name$='.name']").val() || '';
            const weight = Number($r.find("input[name$='.weight']").val()) || 0;
            const desc = $r.find("input[name$='.description']").val() || '';
            const obj = { transported, quantity, name: nameVal, weight, description: desc };
            if (idVal) obj.id = idVal;
            newInv.push(obj);
          }
          await sheet.actor.update({ 'system.inventory': newInv });
          ui.notifications.info('Objet supprimé et persistance effectuée.');
        } catch (err) {
          console.error('Unable to persist inventory after delete', err);
          ui.notifications.error('Erreur lors de la suppression persistante de l\'objet');
        }
      },
      no: () => {},
      defaultYes: false
    });
  });

  
  html.find('.inventory-table').on('input change', "input[name*='.name'], input[name*='.quantity']", ev => {
    
  });

  

  

  
  html.find('.weapons-table.melee').on('click', '.gold-roll.melee-attack', ev => {
    ev.preventDefault();
    const $btn = $(ev.currentTarget);
    const $row = $btn.closest('tr');
    const actor = sheet.actor;

    
    const content = `
      <form>
        <div class="form-group">
          <label>Bonus de circonstance</label>
          <input type="number" id="circ-bonus" value="0" />
        </div>
        <div class="form-group">
          <label>Dégâts bonus</label>
          <input type="number" id="circ-degats-bonus" value="0" min="0" step="1" />
        </div>
        <div class="form-group">
          <label>Fureur confirmée</label>
          <select id="circ-fury-confirm">
            <option value="false" selected>Non</option>
            <option value="true">Oui</option>
          </select>
        </div>
      </form>
    `;

    new Dialog({
      title: 'Jet d\'attaque — circonstance',
      content,
      buttons: {
        roll: {
          label: 'Lancer',
          callback: async (dlgHtml) => {
            try {
              const circBonus = Number(dlgHtml.find('#circ-bonus').val()) || 0;
              const circNote = (dlgHtml.find('#circ-note').val() || '').toString();
              const circDegatsBonus = Number(dlgHtml.find('#circ-degats-bonus').val()) || 0;
              const circFuryConfirm = (dlgHtml.find('#circ-fury-confirm').val() === 'true');

              
              const idx = $btn.data('index');
              const weapon = (idx !== undefined && actor.system.weapons && Array.isArray(actor.system.weapons)) ? actor.system.weapons[idx] : null;
              const name = weapon?.name || $row.find("input[type='text']").first().val() || 'Arme';

              const q = weapon ? (weapon.quality || 'Ordinaire') : ($row.find("select[name*='quality']").val() || 'Ordinaire');
              const qmod = q === 'Exceptionnelle' ? 5 : (q === 'Mauvaise' ? -5 : 0);
              const bonusCC = weapon ? Number(weapon.bonusCC) || 0 : (Number($row.find("input[name*='bonusCC']").val()) || 0);

              const baseActuel = Number(actor.system.principal?.actuel?.cc) || 0;
              let computedTarget = Number(baseActuel) + Number(qmod) + Number(bonusCC) + Number(circBonus);
              const mastered = weapon ? !!weapon.mastery : !!$row.find("input[type='checkbox'][name*='mastery']").prop('checked');
              const finalTarget = mastered ? computedTarget : Math.floor(computedTarget / 2);

              
              const attackRoll = await new Roll('1d100').evaluate();
              const raw = attackRoll.total;
              const success = raw <= finalTarget;

              
              let zoneHtml = '';
              if (success) {
                
                
                const twoDigits = String(raw % 100).padStart(2, '0');
                const reversed = twoDigits.split('').reverse().join('');
                let zoneVal = Number(reversed);
                if (zoneVal === 0) zoneVal = 100;
                const zoneName = getZoneFromD100(zoneVal);
                zoneHtml = `<div><strong>Zone touchée :</strong> ${zoneName}</div>`;
              }

              const circText = circNote ? ` + circonstance (${circNote} ${circBonus >= 0 ? `+${circBonus}` : circBonus})` : (circBonus ? ` + circonstance ${circBonus >= 0 ? `+${circBonus}` : circBonus}` : '');

              
              const circBonusNum = Number(circBonus) || 0;
              const circDisplay = circBonusNum !== 0 ? (circBonusNum > 0 ? `+${circBonusNum}` : `${circBonusNum}`) : '';

              let contentMsg = `
                <div class="weapon-attack-roll">
                  <strong>${name}</strong>
                  <div><strong>Objectif :</strong> ${finalTarget}</div>
                  <div><strong>Jet d'attaque :</strong> <strong>${raw}</strong></div>
                  ${circDisplay ? `<div><strong>Circonstance :</strong> ${circDisplay}</div>` : ''}
                  <div style="color:${success ? 'green' : 'red'}"><strong>${success ? 'RÉUSSITE' : 'ÉCHEC'}</strong></div>
                  ${zoneHtml}
                  <br/>
                  <div class="reroll-controls">
                    <button class="reroll-roll" data-actor-id="${actor?.id || ''}" data-target="${finalTarget}" data-modifier="${raw - finalTarget}">Relancer (Coût: 1 Chance)</button>
                  </div>
                  <br/>
                </div>`;
              
              if (!success) {
                ChatMessage.create({ user: game.user.id, speaker: ChatMessage.getSpeaker({ actor }), content: `${contentMsg}<div class="roll-details">${await attackRoll.render()}</div>` });
              } else {
                
                try {
                  const bf = weapon ? Number(weapon.bf) || 0 : Number($row.find("input[name*='.bf']").val()) || 0;
                  const weaponDamage = weapon ? Number(weapon.damage) || 0 : Number($row.find("input[name*='damage']").val()) || 0;
                  const isPerc = weapon ? !!weapon.perc : !!$row.find("input[name*='perc']").prop('checked');

                  
                  const rollSingle = async () => {
                    const expr = `1d10`;
                    const r = await new Roll(expr).evaluate();
                    let face = 0;
                    try { face = (r.dice && r.dice[0] && Array.isArray(r.dice[0].results) && r.dice[0].results[0]) ? Number(r.dice[0].results[0].result) : 0; } catch (e) { face = 0; }
                    return { rollObj: r, face: Number(face || 0) };
                  };

                  
                  
                  
                  
                  
                  const modifiers = Number(weaponDamage) + (Number(bf) || 0);
                  let d1 = await rollSingle();
                  let d2 = null;
                  if (isPerc) d2 = await rollSingle();

                  
                  
                  
                  const initialTens = [];
                  if (d1.face === 10 || (d2 && d2.face === 10)) initialTens.push(10);

                  
                  const allExtras = [];
                  const allFuryLogs = [];
                  if (initialTens.length > 0) {
                    if (circFuryConfirm) {
                      
                      let cont = true;
                      while (cont) {
                        const extra = await rollDiceFaces('1d10');
                        const added = (extra.results && extra.results[0]) ? Number(extra.results[0]) : extra.total || 0;
                        allExtras.push(Number(added || 0));
                        allFuryLogs.push(`Relance d10 (fureur auto): ${added}`);
                        cont = (Number(added) === 10);
                      }
                    } else {
                      const diceMinVal = weapon ? Number(weapon.diceMin) || 0 : Number($row.find("input[name*='diceMin']").val()) || 0;
                      
                      const furyRes = await handleUlricFury(actor, initialTens, Number(diceMinVal), 'CC');
                      const returned = (furyRes.finalDiceArray || []).slice(initialTens.length).map(x => Number(x) || 0);
                      if (returned && returned.length) allExtras.push(...returned);
                      if (furyRes.furyLogs && furyRes.furyLogs.length) allFuryLogs.push(...furyRes.furyLogs);
                    }
                  }
                  const extrasSum = allExtras.reduce((s, v) => s + Number(v || 0), 0);

                  
                  let baseKept = d1.face;
                  let best = d1;
                  if (d2 && (Number(d2.face || 0) > Number(d1.face || 0))) { baseKept = d2.face; best = d2; }

                  
                  
                  const finalTotal = (Number(modifiers) || 0) + (Number(baseKept || 0)) + extrasSum + (Number(circDegatsBonus) || 0);
                  
                  best.total = finalTotal;
                  best.extras = allExtras;
                  best.furyLogs = allFuryLogs;
                  best.highestDie = baseKept;

                  
                  const summary = [];
                  summary.push(`<div><strong>Jet pour :</strong> ${name}</div>`);
                  summary.push(`<div><strong>Objectif :</strong> ${finalTarget}</div>`);
                  summary.push(`<div><strong>Jet d'attaque :</strong> ${raw}</div>`);
                  if (circDisplay) summary.push(`<div><strong>Circonstance :</strong> ${circDisplay}</div>`);
                  summary.push(`<div style="margin-top:8px"><strong>${zoneHtml ? zoneHtml.replace(/<[^>]+>/g,'') : ''}</strong></div>`);

                  
                  const attrText = weapon ? (weapon.attributes || '') : ($row.find("input[name*='.attributes']").val() || '');
                  if (attrText) summary.push(`<div><strong>Attribut :</strong> ${attrText}</div>`);

                  
                  summary.push(`<div><strong>Dégats de l'arme :</strong> ${baseKept}</div>`);
                  summary.push(`<div><strong>BF + Dégâts de l'arme :</strong> ${modifiers}</div>`);
                  if (Number(circDegatsBonus))  summary.push(`<div><strong>Dégâts bonus :</strong> ${circDegatsBonus}</div>`);
                  summary.push(`<div><strong>Fureur :</strong> ${extrasSum}</div>`);
                  summary.push(`<hr><div><strong>Total :</strong> ${best.total}</div>`);

                  summary.push(`<div class="roll-details">${await best.rollObj.render()}</div>`);
                  if (best.extras && best.extras.length) summary.push(`<div style="margin-top:6px"><strong>Dés observés (Fureur) :</strong> ${best.extras.join(', ')} — <em>le plus élevé (${best.highestDie}) est pris en compte</em></div>`);
                  if (d2) {
                    const other = (best === d1) ? d2 : d1;
                    summary.push(`<div style="margin-top:6px"><em>Percutant :</em> <div class="roll-details">${await other.rollObj.render()}</div></div>`);
                  }
                  if (best.furyLogs && best.furyLogs.length) {
                    summary.push(`<div style="margin-left:12px; margin-top:6px; color:darkred"><strong>Fureur d'Ulric:</strong><br>${best.furyLogs.map(l => `<div>${l}</div>`).join('')}</div>`);
                    
                  }

                  ChatMessage.create({ user: game.user.id, speaker: ChatMessage.getSpeaker({ actor }), content: `<div class="spell-cast-result">${summary.join('')}</div>` });
                } catch (err) {
                  console.error('Damage roll failed', err);
                }
              }
            } catch (err) {
              console.error('Melee attack failed', err);
              ui.notifications.error('Erreur lors du jet d\'attaque');
            }
          }
        },
        cancel: { label: 'Annuler' }
      },
      default: 'roll'
    }).render(true);
  });

  
  html.find('.weapons-table.ranged').on('click', '.gold-roll', ev => {
    ev.preventDefault();
    const $btn = $(ev.currentTarget);
    const $row = $btn.closest('tr');
    const actor = sheet.actor;

    const content = `
      <form>
        <div class="form-group">
          <label>Bonus de circonstance</label>
          <input type="number" id="circ-bonus" value="0" />
        </div>
        <div class="form-group">
          <label>Dégâts bonus</label>
          <input type="number" id="circ-degats-bonus" value="0" min="0" step="1" />
        </div>
        <div class="form-group">
          <label>Fureur confirmée</label>
          <select id="circ-fury-confirm">
            <option value="false" selected>Non</option>
            <option value="true">Oui</option>
          </select>
        </div>
      </form>
    `;

    new Dialog({
      title: 'Jet d\'attaque (distance) — circonstance',
      content,
      buttons: {
        roll: {
          label: 'Lancer',
          callback: async dlgHtml => {
            try {
              const circBonus = Number(dlgHtml.find('#circ-bonus').val()) || 0;
              const circDegatsBonus = Number(dlgHtml.find('#circ-degats-bonus').val()) || 0;
              const circFuryConfirm = (dlgHtml.find('#circ-fury-confirm').val() === 'true');

              const idx = $btn.data('index');
              const rangedWeapons = actor.system.rangedWeapons;
              const weapon = (idx !== undefined && rangedWeapons && Array.isArray(rangedWeapons)) ? rangedWeapons[idx] : null;
              const name = weapon?.name || $row.find("input[type='text']").first().val() || 'Arme à distance';

              const quality = weapon ? (weapon.quality || 'Ordinaire') : ($row.find("select[name*='quality']").val() || 'Ordinaire');
              const qualityMod = quality === 'Exceptionnelle' ? 5 : (quality === 'Mauvaise' ? -5 : 0);
              const bonusCT = weapon ? Number(weapon.bonusCT) || 0 : Number($row.find("input[name*='bonusCT']").val()) || 0;
              const typeRaw = weapon?.type || $row.find("select[name*='type']").val() || 'Tir';
              const type = (typeRaw || 'Tir').toString().trim();
              const isThrowing = type.toLowerCase() === 'jet';

              const baseCT = Number(actor.system.principal?.actuel?.ct) || 0;
              let computedTarget = baseCT + qualityMod + bonusCT + circBonus;
              const mastered = weapon ? !!weapon.mastery : !!$row.find("input[type='checkbox'][name*='mastery']").prop('checked');
              let finalTarget = mastered ? computedTarget : Math.floor(computedTarget / 2);
              if (isThrowing) finalTarget += 20;

              const attackRoll = await new Roll('1d100').evaluate();
              const raw = attackRoll.total;
              const success = raw <= finalTarget;

              const circDisplay = circBonus ? (circBonus > 0 ? `+${circBonus}` : `${circBonus}`) : '';

              const summaryParts = [];
              summaryParts.push(`<div class="weapon-attack-roll"><strong>${name}</strong></div>`);
              summaryParts.push(`<div><strong>Type :</strong> ${isThrowing ? 'Jet' : 'Tir'}</div>`);
              summaryParts.push(`<div><strong>Objectif :</strong> ${finalTarget}</div>`);
              summaryParts.push(`<div><strong>Jet d'attaque :</strong> <strong>${raw}</strong></div>`);
              if (circDisplay) summaryParts.push(`<div><strong>Circonstance :</strong> ${circDisplay}</div>`);
              summaryParts.push(`<div style="color:${success ? 'green' : 'red'}"><strong>${success ? 'RÉUSSITE' : 'ÉCHEC'}</strong></div>`);
              summaryParts.push(`<br/><div class="reroll-controls"><button class="reroll-roll" data-actor-id="${actor?.id || ''}" data-target="${finalTarget}" data-modifier="${raw - finalTarget}">Relancer (Coût: 1 Chance)</button></div><br/>`);

              if (!success) {
                const failContent = `${summaryParts.join('')}<div class="roll-details">${await attackRoll.render()}</div>`;
                ChatMessage.create({ user: game.user.id, speaker: ChatMessage.getSpeaker({ actor }), content: failContent });
                return;
              }

              const getZoneFromRoll = value => {
                const twoDigits = String(value % 100).padStart(2, '0');
                const reversed = twoDigits.split('').reverse().join('');
                let zoneVal = Number(reversed);
                if (zoneVal === 0) zoneVal = 100;
                const zoneName = getZoneFromD100(zoneVal);
                return { zoneName, original: value, computed: zoneVal };
              };

              const rollDamageForHit = async () => {
                const weaponDamage = weapon ? Number(weapon.damage) || 0 : Number($row.find("input[name*='damage']").val()) || 0;
                const isPerc = weapon ? !!weapon.perc : !!$row.find("input[name*='perc']").prop('checked');
                const diceMinVal = weapon ? Number(weapon.diceMin) || 0 : Number($row.find("input[name*='diceMin']").val()) || 0;

                const rollSingle = async () => {
                  const diceRoll = await new Roll('1d10').evaluate();
                  let face = 0;
                  try {
                    face = (diceRoll.dice && diceRoll.dice[0] && Array.isArray(diceRoll.dice[0].results) && diceRoll.dice[0].results[0]) ? Number(diceRoll.dice[0].results[0].result) : 0;
                  } catch (_) {
                    face = 0;
                  }
                  return { rollObj: diceRoll, face: Number(face || 0) };
                };

                const modifiers = Number(weaponDamage);
                let d1 = await rollSingle();
                let d2 = null;
                if (isPerc) d2 = await rollSingle();

                const initialTens = [];
                if (d1.face === 10) initialTens.push(10);
                if (d2 && d2.face === 10) initialTens.push(10);

                const extraFaces = [];
                const furyLogs = [];
                if (initialTens.length > 0) {
                  if (circFuryConfirm) {
                    let continueRolling = true;
                    while (continueRolling) {
                      const extra = await rollDiceFaces('1d10');
                      const added = (extra.results && extra.results[0]) ? Number(extra.results[0]) : extra.total || 0;
                      extraFaces.push(Number(added || 0));
                      furyLogs.push(`Relance d10 (fureur auto): ${added}`);
                      continueRolling = (Number(added) === 10);
                    }
                  } else {
                    const furyRes = await handleUlricFury(actor, initialTens, Number(diceMinVal), 'CT');
                    const returned = (furyRes.finalDiceArray || []).slice(initialTens.length).map(x => Number(x) || 0);
                    if (returned && returned.length) extraFaces.push(...returned);
                    if (furyRes.furyLogs && furyRes.furyLogs.length) furyLogs.push(...furyRes.furyLogs);
                  }
                }

                const extrasSum = extraFaces.reduce((sum, v) => sum + Number(v || 0), 0);
                let baseKept = d1.face;
                let best = d1;
                if (d2 && (Number(d2.face || 0) > Number(d1.face || 0))) { baseKept = d2.face; best = d2; }

                const finalTotal = modifiers + baseKept + extrasSum + circDegatsBonus;
                best.total = finalTotal;
                best.extras = extraFaces;
                best.furyLogs = furyLogs;
                best.highestDie = baseKept;
                
                const damageParts = [];
                damageParts.push(`<div><strong>Dégats de l'arme :</strong> ${baseKept}</div>`);
                damageParts.push(`<div><strong>BF + Dégâts de l'arme :</strong> ${modifiers}</div>`);
                  if (Number(circDegatsBonus))  damageParts.push(`<div><strong>Dégâts bonus :</strong> ${circDegatsBonus}</div>`);
                damageParts.push(`<div><strong>Fureur :</strong> ${extrasSum}</div>`);
                damageParts.push(`<hr><div><strong>Total :</strong> ${best.total}</div>`);

                if (circDegatsBonus) damageParts.push(`<div><strong>Dégâts bonus :</strong> ${circDegatsBonus}</div>`);
                damageParts.push(`<div class="roll-details">${await best.rollObj.render()}</div>`);
                if (extraFaces.length) damageParts.push(`<div><strong>Dés observés (Fureur) :</strong> ${extraFaces.join(', ')} — <em>le plus élevé (${best.highestDie}) est pris en compte</em></div>`);
                if (d2) {
                  const other = (best === d1) ? d2 : d1;
                  damageParts.push(`<div><em>Percutant :</em><div class="roll-details">${await other.rollObj.render()}</div></div>`);
                }
                if (furyLogs.length) damageParts.push(`<div style="color:darkred"><strong>Fureur d'Ulric:</strong><br>${furyLogs.map(l => `<div>${l}</div>`).join('')}</div>`);

                return damageParts.join('');
              };

              const hits = isThrowing ? Math.max(1, Math.floor((finalTarget - raw) / 10) + 1) : 1;
              const zoneSections = [];
              const damageSections = [];

              const firstZone = getZoneFromRoll(raw);
              zoneSections.push(`<div><strong>Zone touchée${hits > 1 ? ' (1)' : ''} :</strong> ${firstZone.zoneName}</div>`);
              damageSections.push(`<hr><div><strong>Impact 1 — ${firstZone.zoneName}</strong></div>${await rollDamageForHit()}`);

              for (let h = 1; h < hits; h++) {
                const additionalRoll = await new Roll('1d100').evaluate();
                const zoneInfo = getZoneFromRoll(additionalRoll.total);
                zoneSections.push(`<div><strong>Zone touchée (${h + 1}) :</strong> ${zoneInfo.zoneName}</div>`);
                damageSections.push(`<hr><div><strong>Impact ${h + 1} — ${zoneInfo.zoneName}</strong></div>${await rollDamageForHit()}`);
              }

              const attrText = weapon ? (weapon.attributes || '') : ($row.find("input[name*='.attributes']").val() || '');
              if (attrText) summaryParts.push(`<div><strong>Attribut :</strong> ${attrText}</div>`);
              summaryParts.push(...zoneSections);
              summaryParts.push(`<div><strong>Nombre de touches :</strong> ${hits}</div>`);
              summaryParts.push(...damageSections);

              ChatMessage.create({ user: game.user.id, speaker: ChatMessage.getSpeaker({ actor }), content: `<div class="spell-cast-result">${summaryParts.join('')}</div>` });
            } catch (err) {
              console.error('Ranged attack failed', err);
              ui.notifications.error('Erreur lors du jet d\'attaque');
            }
          }
        },
        cancel: { label: 'Annuler' }
      },
      default: 'roll'
    }).render(true);
  });

  
  html.find('.weapons-table.melee').on('click', '.gold-roll.melee-parade', async ev => {
    ev.preventDefault();
    const $btn = $(ev.currentTarget);
    const $row = $btn.closest('tr');
    const actor = sheet.actor;
    try {
      const idx = $btn.data('index');
      const weapon = (idx !== undefined && actor.system.weapons && Array.isArray(actor.system.weapons)) ? actor.system.weapons[idx] : null;
      const name = weapon?.name || $row.find("input[type='text']").first().val() || 'Arme';
      const diceMin = weapon ? (Number(weapon.diceMin) || 0) : (Number($row.find("input[name*='.diceMin']").val()) || 0);
      const def = weapon ? (Number(weapon.def) || 0) : (Number($row.find("input[name*='.def']").val()) || 0);
      const target = Number(diceMin) + Number(def || 0);

      const roll = await new Roll('1d100').evaluate();
      const total = roll.total;
      const success = total <= target;

      let content = `
        <div class="parade-roll">
          <strong>Parade — ${name}</strong>
          <div><strong>Objectif :</strong> ${target}</div>
          <div><strong>Jet :</strong> <strong>${total}</strong></div>
          <div style="color:${success ? 'green' : 'red'}"><strong>${success ? 'RÉUSSITE' : 'ÉCHEC'}</strong></div>
          <div class="roll-details">${await roll.render()}</div>
          <br/>
          <div class="reroll-controls">
            <button class="reroll-roll" data-actor-id="${actor?.id || ''}" data-target="${target}" data-modifier="${total - target}">Relancer (Coût: 1 Chance)</button>
          </div>
          <br/>
        </div>
      `;
      ChatMessage.create({ user: game.user.id, speaker: ChatMessage.getSpeaker({ actor }), content });
    } catch (err) {
      console.error('Parade failed', err);
      ui.notifications.error('Erreur lors du jet de parade');
    }
  });
}
