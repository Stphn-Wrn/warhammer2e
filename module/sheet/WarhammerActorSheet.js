import { ADVANCED_SKILLS_LIST } from '../constants/advancedSkills.js';
import { wireSheetHandlers } from '../handlers/index.js';
import { sanitizeSystem } from './data/sanitize.js';
import { preparePrincipal, prepareArmorAgilityPenalty, prepareSecondaire, preparePoints, prepareCombat, buildCaracMapping } from './data/stats.js';
import { prepareArmor } from './data/armor.js';
import { prepareInventory } from './data/inventory.js';
import { prepareWeapons } from './data/weapons.js';
import { prepareBaseSkills, prepareTalentsAndRegles, prepareConnaissances, prepareAdvancedSkills } from './data/skills.js';
import { updateActorObject } from './updateObject.js';
import { handleAdvancedSkillRoll, showSkillRollDialog, getSkillDisplayName, rollSkillTest } from '../skills.js';
import { loadSpells, renderSpellsList, renderSpellsBySchool, renderOwnedSpells } from '../spells.js';
import { findTalentIndexById, addTalent, deleteTalentById, findRegleIndexById, addRegle, deleteRegleById, findConnaissanceIndexById, addConnaissance, deleteConnaissanceById } from '../talents.js';

export class WarhammerActorSheet extends ActorSheet {
  static get advancedSkillsList() { return ADVANCED_SKILLS_LIST; }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ['warhammer2e', 'sheet', 'actor'],
      template: 'systems/warhammer2e/templates/actor/character-sheet.html',
      width: 920,
      height: 800,
      tabs: [{ navSelector: '.tabs', contentSelector: '.sheet-body', initial: 'main' }]
    });
  }

  getData(options) {
    const data = super.getData(options);
    const sys  = this.actor.system;

    sanitizeSystem(sys);
    preparePrincipal(sys);
    prepareArmorAgilityPenalty(sys);
    prepareSecondaire(sys);
    preparePoints(sys);
    prepareCombat(sys);
    prepareArmor(sys);

    Object.assign(data, prepareInventory(sys));
    prepareWeapons(sys);

    sys.spellsOwned ??= {};
    sys._nextId ??= Number(sys._nextId) || 1;

    const caracMapping = buildCaracMapping(sys);
    prepareBaseSkills(sys, caracMapping);
    prepareTalentsAndRegles(sys);
    prepareConnaissances(sys);
    data.displayAdvanced = prepareAdvancedSkills(sys, this.constructor.advancedSkillsList);

    data.system = sys;
    data.type   = this.actor.type;
    return data;
  }

  activateListeners(html) {
    super.activateListeners(html);
    new foundry.applications.ux.Tabs({ navSelector: '.tabs', contentSelector: '.sheet-body', initial: 'main' });
    wireSheetHandlers(this, html);
  }

  async _updateObject(event, formData) {
    return updateActorObject(this, formData);
  }

  // ── Spells (prototype-style static assignment kept for compat) ──────────────
  static loadSpells = loadSpells;

  async _renderSpellsList(cat)        { return renderSpellsList(this, cat); }
  async _renderSpellsBySchool(school) { return renderSpellsBySchool(this, school); }
  async _renderOwnedSpells()          { return renderOwnedSpells(this); }

  // ── Talent / Règle / Connaissance delegators ────────────────────────────────
  _findTalentIndexById(id)    { return findTalentIndexById(this, id); }
  _addTalent()                { return addTalent(this); }
  _deleteTalentById(id)       { return deleteTalentById(this, id); }
  _findRegleIndexById(id)     { return findRegleIndexById(this, id); }
  _addRegle(template)         { return addRegle(this, template); }
  _deleteRegleById(id)        { return deleteRegleById(this, id); }
  _findConnaissanceIndexById(id) { return findConnaissanceIndexById(this, id); }
  _addConnaissance(type)      { return addConnaissance(this, type); }
  _deleteConnaissanceById(id) { return deleteConnaissanceById(this, id); }

  // ── Skill roll delegators ───────────────────────────────────────────────────
  _handleAdvancedSkillRoll(skillIndex)                 { return handleAdvancedSkillRoll(this, skillIndex); }
  _showSkillRollDialog(skillName, skillTotal)           { return showSkillRollDialog(this, skillName, skillTotal); }
  _getSkillDisplayName(skillName)                       { return getSkillDisplayName(skillName); }
  async _rollSkillTest(skillName, targetNumber, modifier) { return rollSkillTest(this, skillName, targetNumber, modifier); }
}
