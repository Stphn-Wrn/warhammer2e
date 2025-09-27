import { openMaledictionDialog, openColereDialog, openSpellCastDialog } from './dialogs.js';
import { openGrantXpDialog } from './xp.js';

export function wireSheetHandlers(sheet, html) {
  // Armor equip toggles
  html.find('.armor-equip').on('change', ev => {
    const input = ev.currentTarget;
    const zone = input.dataset.zone;
    const pa = Number(input.dataset.pa) || 0;
    const val = (input.value || '').toUpperCase().trim();

    // Uncheck other inputs for same zone
    html.find(`.armor-equip[data-zone='${zone}']`).each((_, el) => {
      if (el !== input) el.value = 'NO';
    });
    input.value = (val === 'YES') ? 'YES' : 'NO';

    const bonusInput = html.find(`input[name='system.armor.${zone}Bonus']`);
    const bonusValue = (bonusInput.val() || '').toString().replace(/,/g, '.');
    const bonus = Number(bonusValue) || 0;
    const equipped = (input.value === 'YES') ? (pa + bonus) : 0;
    sheet.actor.update({ [`system.armorEquipped.${zone}`]: equipped });
  });

  // Skill base listeners (niveau, talents, divers, avance, cara)
  html.find("input[name*='skills.base'][name*='niveau']").on('change', ev => {
    const input = ev.currentTarget;
    const name = input.name;
    const newValue = parseInt(input.value) || 0;
    sheet.actor.update({ [name]: newValue });
  });
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

  // Talents add/delete
  html.find('.talent-add').on('click', ev => { ev.preventDefault(); sheet._addTalent(); });
  html.find('.talent-delete').on('click', ev => {
    ev.preventDefault();
    const id = ev.currentTarget.dataset.talentId;
    const talents = Array.isArray(sheet.actor.system.talents) ? sheet.actor.system.talents : [];
    const idx = talents.findIndex(t => String(t.id) === String(id));
    const talentName = talents[idx]?.name || 'ce talent';
    Dialog.confirm({
      title: 'Supprimer le talent',
      content: `<p>Êtes-vous sûr de vouloir supprimer <strong>${talentName}</strong> ?</p>`,
      yes: async () => { await sheet._deleteTalentById(id); },
      no: () => {},
      defaultYes: false
    });
  });

  // Regles spe add/delete
  html.find('.regles-spe-add').on('click', ev => { ev.preventDefault(); sheet._addRegle(); });
  html.find('.regle-delete').on('click', ev => {
    ev.preventDefault();
    const id = ev.currentTarget.dataset.regleId;
    const regles = Array.isArray(sheet.actor.system.regles) ? sheet.actor.system.regles : [];
    const idx = regles.findIndex(r => String(r.id) === String(id));
    const regleName = regles[idx]?.name || 'cette règle';
    Dialog.confirm({
      title: "Supprimer la règle spéciale",
      content: `<p>Êtes-vous sûr de vouloir supprimer <strong>${regleName}</strong> ?</p>`,
      yes: async () => { await sheet._deleteRegleById(id); },
      no: () => {},
      defaultYes: false
    });
  });

  // Advanced skill add
  html.find('.skill-add').on('click', ev => {
    ev.preventDefault();
    const allSkills = sheet.constructor.advancedSkillsList;
    let currentSkills = sheet.actor.system.skills?.advanced;
    if (!Array.isArray(currentSkills)) currentSkills = [];
    const currentKeys = currentSkills.map(s => s.key);
    const availableSkills = allSkills.filter(s => !currentKeys.includes(s.key));
    let options = availableSkills.map(s => `<option value='${s.key}'>${s.label}</option>`).join('');
    const content = `<form><div class='form-group'><label>Choisir une compétence avancée :</label><select id='advanced-skill-select'>${options}</select></div></form>`;
    new Dialog({
      title: 'Ajouter une compétence avancée',
      content,
      buttons: {
        add: {
          label: 'Ajouter',
          callback: async (htmlDialog) => {
            const selectedKey = htmlDialog.find('#advanced-skill-select').val();
            const skillDef = allSkills.find(s => s.key === selectedKey);
            if (!skillDef) return;
            const sys = sheet.actor.system;
            let skills = Array.isArray(sys.skills?.advanced) ? sys.skills.advanced.slice() : [];
            if (!skills.some(s => s.key === skillDef.key)) {
              const newSkill = {
                id: sys._nextId ?? Date.now(),
                key: skillDef.key,
                label: skillDef.label,
                cara: skillDef.cara,
                niveau: 0,
                talents: 0,
                divers: 0,
                total: 0,
                avance: false
              };
              const nextId = (Number(sys._nextId) || Date.now()) + 1;
              skills.push(newSkill);
              try {
                await sheet.actor.update({ 'system.skills.advanced': skills, 'system._nextId': nextId });
                try { sheet.render(false); } catch(e) {}
              } catch (err) {
                console.error('Unable to persist advanced skill', err);
                ui.notifications.error('Impossible d\'ajouter la compétence avancée.');
              }
            }
          }
        },
        cancel: { label: 'Annuler' }
      },
      default: 'add'
    }).render(true);
  });

  // Advanced skill delete
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

  // Skill roll buttons
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

  // Spells tab interactions
  const spellsSection = html.find('.spells-section');
  if (spellsSection.length) {
    spellsSection.find('.gold-tab[data-cat]').on('click', ev => {
      ev.preventDefault();
      const cat = ev.currentTarget.dataset.cat;
      if (cat === 'occulte') {
        const school = sheet.actor.system?.spells?.school || '';
        if (school) return sheet._renderSpellsBySchool(school);
      }
      if (cat === 'divin') {
        const divine = sheet.actor.system?.spells?.divine || '';
        if (divine) return sheet._renderSpellsBySchool(divine);
      }
      sheet._renderSpellsList(cat);
    });

    spellsSection.find('select[name="system.spells.school"]').on('change', async ev => {
      ev.preventDefault();
      const val = ev.currentTarget.value;
      try { await sheet.actor.update({ 'system.spells.school': val }); } catch (err) { console.error('Unable to persist selected school', err); }
      try { sheet._renderSpellsBySchool(val); } catch (err) { console.error('Unable to render spells by school', err); }
    });

    spellsSection.find('select[name="system.spells.divine"]').on('change', async ev => {
      ev.preventDefault();
      const val = ev.currentTarget.value;
      try { await sheet.actor.update({ 'system.spells.divine': val }); } catch (err) { console.error('Unable to persist selected divine domain', err); }
      try { sheet._renderSpellsBySchool(val); } catch (err) { console.error('Unable to render spells by divine domain', err); }
    });

    const currentSchool = spellsSection.find('select[name="system.spells.school"]').val();
    if (currentSchool) sheet._renderSpellsBySchool(currentSchool);

    // Buttons
    spellsSection.find('[data-action="malediction-tzeentch"]').on('click', ev => { ev.preventDefault(); openMaledictionDialog(sheet.actor); });
    spellsSection.find('[data-action="colere-dieux"]').on('click', ev => { ev.preventDefault(); openColereDialog(sheet.actor); });
  }

  // XP grant button (GM only) — near the XP field on the header
  // Hide button for non-GMs to avoid relying on template context
  if (!game.user.isGM) {
    html.find('.xp-grant').hide();
  }
  html.find('.xp-grant').on('click', ev => {
    ev.preventDefault();
    if (!game.user.isGM) return ui.notifications.warn('Seul le MJ peut attribuer des PX');
    openGrantXpDialog(sheet);
  });

  // Stat rolls from principal profile using a dialog (allows choosing source and adding a bonus)
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
              // Short label without leading 'de '
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

              const contentMsg = `
                <div class="stat-roll-result">
                  <h3>Jet ${label}</h3>
                  <div><strong>Bonus/Malus :</strong> ${bonusText}</div>
                  <div><strong>Résultat :</strong> <strong>${total}</strong> vs <strong>${target}</strong></div>
                  <div>${resultText}</div>
                  <div class="roll-details">${await roll.render()}</div>
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

  // Combat initiative roll: 1d10 + 1d10 per 10 points of Agilité
  html.find('.combat-roll[data-attr="initiative"]').on('click', async ev => {
    ev.preventDefault();
    const actor = sheet.actor;
    const agilite = Number(actor.system.principal?.actuel?.agilite) || 0;
    const tens = Math.floor(agilite / 10);

    try {
      // Base d10
      const baseRoll = await new Roll('1d10').evaluate();
      let total = baseRoll.total;
      let detailsHtml = `<div>Base: ${total}</div>`;

      // Add one d10 per ten agility
      let extraRolls = [];
      if (tens > 0) {
        extraRolls = [];
        for (let i = 0; i < tens; i++) {
          const r = await new Roll('1d10').evaluate();
          extraRolls.push(r);
          total += r.total;
        }
        detailsHtml += `<div>Agilité (${agilite}) => ${tens} d10 additionnels</div>`;
        detailsHtml += `<div>Extras: ${extraRolls.map(r => r.total).join(', ')}</div>`;
      }

      // If there's an active combat and it's in setup/preparation (round 0 or not started), set the combatant's initiative
      const combat = game.combat;
      if (combat && combat.combatants && (combat.round === 0 || !combat.started)) {
        // Find the combatant corresponding to this actor
        const combatant = combat.combatants.find(c => c.actor?.id === actor.id || c.token?.actorId === actor.id);
        if (combatant) {
          try {
            await combatant.update({ initiative: total });
            // Post chat message after setting initiative
              const content = `
              <div class="initiative-roll">
                Initiative : <strong>${total}</strong>
              </div>
            `;
            ChatMessage.create({ user: game.user.id, speaker: ChatMessage.getSpeaker({ actor }), content });
          } catch (e) {
            console.error('Unable to set combatant initiative', e);
            ui.notifications.warn('Impossible de définir l\'initiative sur le combatant');
          }
        } else {
          // No combatant found: just post chat
          const content = `
            <div class="initiative-roll">
              Initiative : <strong>${total}</strong>
              <div>${detailsHtml}</div>
            </div>
          `;
          ChatMessage.create({ user: game.user.id, speaker: ChatMessage.getSpeaker({ actor }), content });
        }
      } else {
        // No active combat or combat already running: post chat message
        const content = `
          <div class="initiative-roll">
            <strong>${actor.name}</strong> — Initiative : <strong>${total}</strong>
            <div class="roll-details">${await baseRoll.render()}${tens > 0 ? extraRolls.map(r => `<div class="roll-details">${r.total}</div>`).join('') : ''}</div>
            <div>${detailsHtml}</div>
          </div>
        `;
        ChatMessage.create({ user: game.user.id, speaker: ChatMessage.getSpeaker({ actor }), content });
      }
    } catch (err) {
      console.error('Initiative roll failed', err);
      ui.notifications.error('Erreur lors du jet d\'initiative');
    }
  });
}
