import { openMaledictionDialog, openColereDialog } from '../dialogs.js';

export function wireSpellHandlers(sheet, html) {
  const spells = html.find('.spells-section');
  if (!spells.length) return;

  spells.find('.gold-tab[data-cat]').on('click', ev => {
    ev.preventDefault();
    const cat  = ev.currentTarget.dataset.cat;
    const norm = cat === 'profane' ? 'occulte' : cat;

    spells.find('.gold-tab').removeClass('active');
    $(ev.currentTarget).addClass('active');

    const list = spells.find('.spells-list');
    list.show();

    if (norm === 'occulte') {
      const school = (sheet.actor.system?.spells?.school || '') === 'nothing' ? '' : (sheet.actor.system?.spells?.school || '');
      if (school) return sheet._renderSpellsBySchool(school);
      list.empty().html('<div>Sélectionnez une science de la Magie pour afficher ces sorts.</div>');
      list.data('spellsView', 'message');
      return;
    }
    if (norm === 'divin') {
      const divine = (sheet.actor.system?.spells?.divine || '') === 'nothing' ? '' : (sheet.actor.system?.spells?.divine || '');
      if (divine) return sheet._renderSpellsBySchool(divine);
      list.empty().html('<div>Sélectionnez un domaine divin pour afficher ces sorts.</div>');
      list.data('spellsView', 'message');
      return;
    }
    if (norm === 'owned') { sheet._renderOwnedSpells(); return; }
    sheet._renderSpellsList(norm);
  });

  spells.find('select[name="system.spells.school"]').on('change', async ev => {
    ev.preventDefault();
    let val = ev.currentTarget.value;
    if (val === 'nothing') val = '';
    try { await sheet.actor.update({ 'system.spells.school': val }); } catch (err) { console.error(err); }
    try { sheet._renderSpellsBySchool(val); } catch (err) { console.error(err); }
  });

  spells.find('select[name="system.spells.divine"]').on('change', async ev => {
    ev.preventDefault();
    let val = ev.currentTarget.value;
    if (val === 'nothing') val = '';
    try { await sheet.actor.update({ 'system.spells.divine': val }); } catch (err) { console.error(err); }
    try { sheet._renderSpellsBySchool(val); } catch (err) { console.error(err); }
  });

  const currentSchool = (spells.find('select[name="system.spells.school"]').val() || '') === 'nothing' ? '' : (spells.find('select[name="system.spells.school"]').val() || '');
  if (currentSchool) sheet._renderSpellsBySchool(currentSchool);

  spells.find('[data-action="malediction-tzeentch"]').on('click', ev => { ev.preventDefault(); openMaledictionDialog(sheet.actor); });
  spells.find('[data-action="colere-dieux"]').on('click',        ev => { ev.preventDefault(); openColereDialog(sheet.actor); });

  spells.find('[data-action="focalisation-roll"]').on('click', ev => {
    ev.preventDefault();
    try {
      const actor   = sheet.actor;
      const actuel  = actor.system?.principal?.actuel || {};
      const statMap = {
        cc: actuel.cc || 0, CC: actuel.cc || 0,
        ct: actuel.ct || 0, CT: actuel.ct || 0,
        force: actuel.force || 0, F: actuel.force || 0, f: actuel.force || 0,
        endurance: actuel.endurance || 0, E: actuel.endurance || 0, e: actuel.endurance || 0,
        agilite: actuel.agilite || 0, Ag: actuel.agilite || 0, ag: actuel.agilite || 0,
        intelligence: actuel.intelligence || 0, Int: actuel.intelligence || 0, int: actuel.intelligence || 0,
        forceMentale: actuel.forceMentale || 0, FM: actuel.forceMentale || 0, fm: actuel.forceMentale || 0,
        sociabilite: actuel.sociabilite || 0, Soc: actuel.sociabilite || 0, soc: actuel.sociabilite || 0
      };

      let label = 'Focalisation', cara = 'FM', niveau = 0, talents = 0, divers = 0, avance = false;

      const $focalRow = sheet.element.find('input[name^="system.skills.advanced"][name$=".key"][value="focalisation"]').first();
      if ($focalRow.length) {
        const row = $focalRow.closest('tr');
        label   = (row.find('input[name$=".label"]').val()   || label).toString();
        cara    = (row.find('input[name$=".cara"]').val()    || cara).toString();
        niveau  = Number((row.find('input[name$=".niveau"]').val() || '').replace(/,/g, '.')) || 0;
        talents = Number((row.find('input[name$=".talents"]').val()|| '').replace(/,/g, '.')) || 0;
        divers  = Number((row.find('input[name$=".divers"]').val() || '').replace(/,/g, '.')) || 0;
        avance  = row.find('input[name$=".avance"]').is(':checked') || ['true', 'on', '1'].includes((row.find('input[name$=".avance"]').val() || '').toLowerCase());
      } else {
        const existing = (Array.isArray(actor.system?.skills?.advanced) ? actor.system.skills.advanced : []).find(s => s && (String(s.key).toLowerCase() === 'focalisation' || String(s.label || '').trim().toLowerCase() === 'focalisation'));
        if (existing) {
          label   = (existing.label || label).toString();
          cara    = (existing.cara  || cara).toString();
          niveau  = Number(existing.niveau)  || 0;
          talents = Number(existing.talents) || 0;
          divers  = Number(existing.divers)  || 0;
          avance  = existing.avance === true || existing.avance === 'true' || existing.avance === 'on' || existing.avance === 1 || existing.avance === '1';
        } else {
          const def = (sheet.constructor?.advancedSkillsList || []).find(s => String(s.key) === 'focalisation');
          if (def) { label = def.label || label; cara = def.cara || cara; }
        }
      }

      const stat     = statMap[cara] ?? statMap[cara.toLowerCase()] ?? statMap[cara.toUpperCase()] ?? 0;
      const caraBase = avance ? stat : Math.floor(stat / 2);
      sheet._showSkillRollDialog(label, niveau + talents + divers + caraBase);
    } catch (err) {
      console.error('Unable to roll Focalisation', err);
      try { ui.notifications.error('Impossible de lancer le jet de Focalisation'); } catch (e) {}
    }
  });
}
