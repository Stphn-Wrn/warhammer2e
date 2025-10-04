import { wireSheetHandlers } from './handlers.js';
import { handleAdvancedSkillRoll, showSkillRollDialog, getSkillDisplayName, rollSkillTest } from './skills.js';
import { loadSpells, renderSpellsList, renderSpellsBySchool, renderOwnedSpells } from './spells.js';
import { registerHandlebarsHelpers, preloadHandlebarsTemplates } from './helpers.js';
import { findTalentIndexById, addTalent, deleteTalentById, findRegleIndexById, addRegle, deleteRegleById, findConnaissanceIndexById, addConnaissance, deleteConnaissanceById } from './talents.js';

class WarhammerActor extends Actor {}
class WarhammerItem extends Item {}
class WarhammerActorSheet extends ActorSheet {
  static get advancedSkillsList() {
    return [
      { key: "dressage", label: "Dressage", cara: "Soc" },
      { key: "baratin", label: "Baratin", cara: "Soc" },
      { key: "focalisation", label: "Focalisation", cara: "FM" },
      { key: "empriseAnimaux", label: "Emprise sur les animaux", cara: "Soc" },
      { key: "esquive", label: "Esquive", cara: "Ag" },
      { key: "pistage", label: "Pistage", cara: "Int" },
      { key: "soins", label: "Soins", cara: "Int" },
      { key: "hypnotisme", label: "Hypnotisme", cara: "FM" },
      { key: "lectureLevres", label: "Lecture sur les lèvres", cara: "Int" },
      { key: "sensMagie", label: "Sens de la magie", cara: "FM" },
      { key: "orientation", label: "Orientation", cara: "Int" },
      { key: "crochetage", label: "Crochetage", cara: "Ag" },
      { key: "preparationPoison", label: "Préparation de Poison", cara: "Int" },
      { key: "lireEcrire", label: "Lire/Écrire", cara: "Int" },
      { key: "navigation", label: "Navigation", cara: "Ag" },
      { key: "braconnage", label: "Braconnage", cara: "Ag" },
      { key: "filature", label: "Filature", cara: "Ag" },
      { key: "escamotage", label: "Escamotage", cara: "Ag" },
      { key: "torture", label: "Torture", cara: "Soc" },
      { key: "ventriloquie", label: "Ventriloquie", cara: "Soc" }
    ];
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["warhammer2e", "sheet", "actor"],
      template: "systems/warhammer2e/templates/actor/character-sheet.html",
      width: 920,
      height: 800,
      tabs: [{ navSelector: ".tabs", contentSelector: ".sheet-body", initial: "main" }]
    });
  }

  getData(options) {
    const data = super.getData(options);
    const sys = this.actor.system;

    const sanitizeNumberFields = (obj, keys=[]) => {
      if (!obj || typeof obj !== 'object') return;
      for (const k of keys) {
        if (obj[k] === undefined || obj[k] === null) continue;
        try {
          const raw = String(obj[k]).replace(/,/g, '.').trim();
          const n = Number(raw);
          if (Number.isFinite(n)) {
            obj[k] = n;
            continue;
          }
          const digits = raw.replace(/[^0-9-]/g, '');
          if (digits.length > 0) {
            const ni = parseInt(digits, 10);
            if (!Number.isNaN(ni)) obj[k] = ni;
            else obj[k] = 0;
          } else {
            obj[k] = 0;
          }
        } catch (e) {}
      }
    };

    const sanitizeNumericStringsRecursive = (node) => {
      if (node === null || node === undefined) return;
      if (Array.isArray(node)) {
        for (let i = 0; i < node.length; i++) sanitizeNumericStringsRecursive(node[i]);
        return;
      }
      if (typeof node !== 'object') return;
      for (const key of Object.keys(node)) {
        try {
          const val = node[key];
          if (val === null || val === undefined) continue;
          if (typeof val === 'string') {
            if (/^[\s0-9.,-]+$/.test(val)) {
              const raw = val.replace(/\s/g, '').replace(/,/g, '.');
              const n = Number(raw);
              if (Number.isFinite(n)) { node[key] = n; continue; }
              const digits = raw.replace(/[^0-9-]/g, '');
              if (digits.length > 0) {
                const ni = parseInt(digits, 10);
                node[key] = Number.isNaN(ni) ? 0 : ni;
              } else {
                node[key] = 0;
              }
            }
            continue;
          }
          if (typeof val === 'object') sanitizeNumericStringsRecursive(val);
        } catch (e) {}
      }
    };

    try { sanitizeNumericStringsRecursive(sys); } catch (e) {}

    sys.principal ??= {};
    for (const k of ["base", "talents", "carriere", "avance", "mod", "actuel"]) {
      sys.principal[k] ??= { cc: 0, ct: 0, force: 0, endurance: 0, agilite: 0, intelligence: 0, forceMentale: 0, sociabilite: 0 };
    }

    const principalKeys = ["cc","ct","force","endurance","agilite","intelligence","forceMentale","sociabilite"];
    sanitizeNumberFields(sys.principal.base, principalKeys);
    sanitizeNumberFields(sys.principal.talents, principalKeys);
    sanitizeNumberFields(sys.principal.carriere, principalKeys);
    sanitizeNumberFields(sys.principal.avance, principalKeys);
    sanitizeNumberFields(sys.principal.mod, principalKeys);

    const P = sys.principal;
    const sumPrincipal = (s) => (Number(P.base?.[s]) || 0) + (Number(P.talents?.[s]) || 0) + (Number(P.avance?.[s]) || 0) + (Number(P.mod?.[s]) || 0);

    sys.principal.actuel = {
      cc: sumPrincipal("cc"), ct: sumPrincipal("ct"), force: sumPrincipal("force"), endurance: sumPrincipal("endurance"),
      agilite: sumPrincipal("agilite"), intelligence: sumPrincipal("intelligence"), forceMentale: sumPrincipal("forceMentale"), sociabilite: sumPrincipal("sociabilite")
    };

    sys.secondaire ??= {};
    for (const k of ["base", "talents", "carriere", "avance", "mod", "actuel"]) {
      sys.secondaire[k] ??= { a: 0, b: 0, bf: 0, be: 0, mag: 0, mvt: 0, pf: 0, pd: 0 };
    }

    const S = sys.secondaire;
    S.base.bf = Math.round((sys.principal.actuel.force || 0) / 10);
    S.base.be = Math.round((sys.principal.actuel.endurance || 0) / 10);

    const sumSecondaire = (s) => (Number(S.base?.[s]) || 0) + (Number(S.talents?.[s]) || 0) + (Number(S.avance?.[s]) || 0) + (Number(S.mod?.[s]) || 0);

    sys.secondaire.actuel = { a: sumSecondaire("a"), b: sumSecondaire("b"), bf: (S.base.bf || 0) + (S.mod.bf || 0), be: (S.base.be || 0) + (S.mod.be || 0), mag: sumSecondaire("mag"), mvt: sumSecondaire("mvt"), pf: sumSecondaire("pf"), pd: sumSecondaire("pd") };

  sys.points ??= {};
  const pointKeys = ["destin", "chance", "folie", "corruption"];
  sanitizeNumberFields(sys.points, pointKeys);
  for (const key of pointKeys) sys.points[key] = Number(sys.points[key]) || 0;
  if (sys.points.destin < 0) sys.points.destin = 0;
  if (sys.points.folie < 0) sys.points.folie = 0;
  if (sys.points.corruption < 0) sys.points.corruption = 0;
  const chanceMax = Number(sys.secondaire?.actuel?.pd) || 0;
  if (sys.points.chance < 0) sys.points.chance = 0;
  if (sys.points.chance > chanceMax) sys.points.chance = chanceMax;

    sys.combat ??= {};
    const mvt = sys.secondaire.actuel.mvt || 0;
    sys.combat.move = mvt * 2;
    sys.combat.charge = mvt * 4;
    sys.combat.course = mvt * 6;
    sys.combat.jump = mvt + 6;

    sys.armor ??= {};
    const initZone = () => ({ light: { eq: "NO", name: "", qualite: "Ordinaire", enc: 0 }, medium: { eq: "NO", name: "", qualite: "Ordinaire", enc: 0 }, heavy: { eq: "NO", name: "", qualite: "Ordinaire", enc: 0 } });
    for (const zone of ["head", "body", "armLeft", "armRight", "legLeft", "legRight"]) {
      const z = sys.armor[zone];
      if (!z || typeof z !== "object" || Array.isArray(z)) sys.armor[zone] = initZone();
      else {
        sys.armor[zone].light ??= { eq: "NO", name: "", qualite: "Ordinaire", enc: 0 };
        sys.armor[zone].medium ??= { eq: "NO", name: "", qualite: "Ordinaire", enc: 0 };
        sys.armor[zone].heavy ??= { eq: "NO", name: "", qualite: "Ordinaire", enc: 0 };
      }
    }

    sys.armor.headBonus ??= 0; sys.armor.bodyBonus ??= 0; sys.armor.armLeftBonus ??= 0; sys.armor.armRightBonus ??= 0; sys.armor.legLeftBonus ??= 0; sys.armor.legRightBonus ??= 0;
    sys.armorEquipped ??= {};
    for (const zone of ["head", "body", "armLeft", "armRight", "legLeft", "legRight"]) sys.armorEquipped[zone] = Number(sys.armorEquipped[zone]) || 0;
    sys.armorTotals = { head: sys.armorEquipped.head + sys.secondaire.actuel.be, body: sys.armorEquipped.body + sys.secondaire.actuel.be, armLeft: sys.armorEquipped.armLeft + sys.secondaire.actuel.be, armRight: sys.armorEquipped.armRight + sys.secondaire.actuel.be, legLeft: sys.armorEquipped.legLeft + sys.secondaire.actuel.be, legRight: sys.armorEquipped.legRight + sys.secondaire.actuel.be };

    sys.spellsOwned ??= {};

  sys.weapons ??= [];
  sys.rangedWeapons ??= [];
    const MIN_WEAPON_SLOTS = 8;
  const ccBase = Number(sys.principal?.base?.cc) || 0;
  const ctBase = Number(sys.principal?.base?.ct) || 0;
    const bfActuel = Number(sys.secondaire?.actuel?.bf) || 0;
  const defaultMeleeDiceMin = Math.max(1, ccBase);
  const defaultRangedDiceMin = Math.max(1, ctBase);
    for (let wi = 0; wi < MIN_WEAPON_SLOTS; wi++) {
      sys.weapons[wi] ??= {};
      sys.weapons[wi].name ??= '';
      sys.weapons[wi].quality ??= 'Ordinaire';
      sys.weapons[wi].enc ??= 0;
      sys.weapons[wi].bonusCC ??= 0;
      sys.weapons[wi].diceMin ??= defaultMeleeDiceMin;
      sys.weapons[wi].damage ??= 0;
      sys.weapons[wi].perc ??= false;
  sys.weapons[wi].bf = bfActuel;
      sys.weapons[wi].def ??= 0;
      sys.weapons[wi].attributes ??= '';
      sys.weapons[wi].mastery ??= false;
      sys.weapons[wi].par ??= 0;
    }

    for (let wi = 0; wi < MIN_WEAPON_SLOTS; wi++) {
      sys.rangedWeapons[wi] ??= {};
      sys.rangedWeapons[wi].name ??= '';
      sys.rangedWeapons[wi].quality ??= 'Ordinaire';
      sys.rangedWeapons[wi].enc ??= 0;
      sys.rangedWeapons[wi].bonusCT ??= 0;
      sys.rangedWeapons[wi].diceMin ??= defaultRangedDiceMin;
      sys.rangedWeapons[wi].damage ??= 0;
      sys.rangedWeapons[wi].perc ??= false;
      sys.rangedWeapons[wi].attributes ??= '';
      sys.rangedWeapons[wi].type ??= '';
      sys.rangedWeapons[wi].rech ??= '';
      sys.rangedWeapons[wi].portee ??= '';
      sys.rangedWeapons[wi].munitions ??= '';
      sys.rangedWeapons[wi].atq ??= '';
      sys.rangedWeapons[wi].deg ??= '';
      sys.rangedWeapons[wi].mastery ??= false;
    }

    sys.skills ??= {}; sys.skills.base ??= {}; sys.skills.advanced ??= [];
    sys._nextId ??= Number(sys._nextId) || 1;

  const defaultSkillCaracteristics = {};
    for (const [skillKey, defaultCara] of Object.entries(defaultSkillCaracteristics)) {
      sys.skills.base[skillKey] ??= {};
      sys.skills.base[skillKey].cara ??= defaultCara;
      sys.skills.base[skillKey].niveau ??= 0;
      sys.skills.base[skillKey].talents ??= 0;
      sys.skills.base[skillKey].divers ??= 0;
      sys.skills.base[skillKey].avance ??= false;
    }

    const caraMapping = { INT: sys.principal.actuel.intelligence || 0, SOC: sys.principal.actuel.sociabilite || 0, AGI: sys.principal.actuel.agilite || 0, END: sys.principal.actuel.endurance || 0, FOR: sys.principal.actuel.force || 0, CC: sys.principal.actuel.cc || 0, CT: sys.principal.actuel.ct || 0, FM: sys.principal.actuel.forceMentale || 0 };

    for (const [skillKey, skill] of Object.entries(sys.skills.base)) {
      if (skill && typeof skill === 'object') {
        skill.niveau ??= 0; skill.talents ??= 0; skill.divers ??= 0; skill.avance ??= false;
        let caraValue = 0;
        if (skillKey === 'intimidation') {
          const caraChoice = skill.cara || 'F';
          caraValue = (caraChoice === 'Soc') ? caraMapping['SOC'] || 0 : caraMapping['FOR'] || 0;
        } else {
          caraValue = caraMapping[skill.cara] || 0;
        }
        const caraBase = skill.avance ? caraValue : Math.floor(caraValue / 2);
        skill.total = (Number(skill.niveau) || 0) + (Number(skill.talents) || 0) + (Number(skill.divers) || 0) + caraBase;
      }
    }

    if (Array.isArray(sys.talents)) for (const t of sys.talents) if (t && (t.id === undefined || t.id === null)) t.id = sys._nextId++;
    else sys.talents = [];
    if (Array.isArray(sys.regles)) for (const r of sys.regles) if (r && (r.id === undefined || r.id === null)) r.id = sys._nextId++;
    else sys.regles = [];
    if (!Array.isArray(sys.connaissances)) {
      if (sys.connaissances && typeof sys.connaissances === 'object') {
        const entries = Object.keys(sys.connaissances)
          .filter(k => /^\d+$/.test(k))
          .sort((a, b) => Number(a) - Number(b))
          .map(k => sys.connaissances[k]);
        sys.connaissances = entries;
      } else sys.connaissances = [];
    }
    const allowedConnaissanceTypes = new Set(['generale', 'academique', 'artistique', 'metier']);
    const specialConnaissanceTypes = new Set(['artistique', 'metier']);
    const allowedConnaissanceCara = ['cc', 'ct', 'force', 'endurance', 'agilite', 'intelligence', 'forceMentale', 'sociabilite'];
    if (Array.isArray(sys.connaissances)) {
      for (const c of sys.connaissances) {
        if (!c || typeof c !== 'object') continue;
        if (c.id === undefined || c.id === null || c.id === '') c.id = sys._nextId++;
        c.name = (c.name ?? '').toString();
        const type = (c.type ?? '').toString().toLowerCase();
        const normalizedType = allowedConnaissanceTypes.has(type) ? type : 'generale';
        c.type = normalizedType;
        let cara = (c.cara ?? '').toString();
        if (!allowedConnaissanceCara.includes(cara)) cara = 'intelligence';
        if (!specialConnaissanceTypes.has(normalizedType)) cara = 'intelligence';
        c.cara = cara;
        const statValue = Number(sys.principal?.actuel?.[cara]) || 0;
        c.targetValue = statValue;
      }
    }
    if (!Array.isArray(sys.skills.advanced)) sys.skills.advanced = [];
    else for (const s of sys.skills.advanced) if (s && (s.id === undefined || s.id === null)) s.id = sys._nextId++;

    const displayAdvanced = [];
    const existingByKey = new Map();
    if (Array.isArray(sys.skills.advanced)) for (const s of sys.skills.advanced) if (s && s.key) existingByKey.set(String(s.key), s);
    for (const def of this.constructor.advancedSkillsList) {
      const existing = existingByKey.get(String(def.key));
      if (existing) {
        existing.niveau ??= 0; existing.talents ??= 0; existing.divers ??= 0; existing.total ??= 0; existing.avance ??= false;
        existing.cara ??= def.cara ?? '';
        displayAdvanced.push(existing);
      } else {
        const tmp = { id: sys._nextId++, key: def.key, label: def.label, cara: def.cara || '', niveau: 0, talents: 0, divers: 0, total: 0, avance: false };
        displayAdvanced.push(tmp);
      }
    }
    data.displayAdvanced = displayAdvanced;

    data.system = sys; data.type = this.actor.type; return data;
  }

  _findTalentIndexById(id) { return findTalentIndexById(this, id); }
  _addTalent() { return addTalent(this); }
  _deleteTalentById(id) { return deleteTalentById(this, id); }
  _findRegleIndexById(id) { return findRegleIndexById(this, id); }
  _addRegle(template) { return addRegle(this, template); }
  _deleteRegleById(id) { return deleteRegleById(this, id); }
  _findConnaissanceIndexById(id) { return findConnaissanceIndexById(this, id); }
  _addConnaissance(type) { return addConnaissance(this, type); }
  _deleteConnaissanceById(id) { return deleteConnaissanceById(this, id); }

  activateListeners(html) {
    super.activateListeners(html);
    new foundry.applications.ux.Tabs({ navSelector: ".tabs", contentSelector: ".sheet-body", initial: "main" });
    wireSheetHandlers(this, html);
  }

  _handleAdvancedSkillRoll(skillIndex) { return handleAdvancedSkillRoll(this, skillIndex); }
  _showSkillRollDialog(skillName, skillTotal) { return showSkillRollDialog(this, skillName, skillTotal); }
  _getSkillDisplayName(skillName) { return getSkillDisplayName(skillName); }
  async _rollSkillTest(skillName, targetNumber, modifier) { return rollSkillTest(this, skillName, targetNumber, modifier); }

  async _updateObject(event, formData) {
    const advancedMap = {};
    for (const k of Object.keys(formData)) {
      const m = k.match(/^system\.skills\.advanced\.(\d+)\.(.+)$/);
      if (m) { const idx = m[1]; const prop = m[2]; advancedMap[idx] ??= {}; advancedMap[idx][prop] = formData[k]; delete formData[k]; }
    }
    const fromForm = Object.keys(advancedMap).sort((a,b)=>Number(a)-Number(b)).map(i=>advancedMap[i]);
    for (const e of fromForm) { if ('niveau' in e) e.niveau = Number(e.niveau) || 0; if ('talents' in e) e.talents = Number(e.talents) || 0; if ('divers' in e) e.divers = Number(e.divers) || 0; if ('avance' in e) e.avance = (e.avance === true || e.avance === 'true' || e.avance === 'on' || e.avance === '1'); }
    const existing = Array.isArray(this.actor.system.skills?.advanced) ? this.actor.system.skills.advanced.slice() : [];
    const merged = existing.slice();
    for (const entry of fromForm) {
      const ent = Object.assign({}, entry);
      if (ent.id) ent.id = ent.id;
      let idx = -1; if (ent.id) idx = merged.findIndex(s => String(s.id) === String(ent.id)); if (idx === -1 && ent.key) idx = merged.findIndex(s => s.key === ent.key);
      if (idx >= 0) merged[idx] = foundry.utils.mergeObject(merged[idx], ent, { inplace: false }); else merged.push(ent);
    }
    const seen = new Map(); const deduped = [];
    for (const s of merged) {
      const idKey = s.id ? `id:${String(s.id)}` : null; const keyKey = (!idKey && s.key) ? `key:${String(s.key)}` : null; const label = (s.label || '').toString().trim().toLowerCase(); const cara = (s.cara || '').toString(); const labKey = (!idKey && !keyKey && label) ? `lab:${label}|${cara}` : null; const mapKey = idKey || keyKey || labKey || `idx:${Math.random()}`;
      if (seen.has(mapKey)) { const existingEntry = seen.get(mapKey); const mergedEntry = foundry.utils.mergeObject(existingEntry, s, { inplace: false }); seen.set(mapKey, mergedEntry); const arrIdx = deduped.findIndex(x=>x===existingEntry); if (arrIdx >= 0) deduped[arrIdx] = mergedEntry; } else { seen.set(mapKey, s); deduped.push(s); }
    }
    const finalMerged = deduped;
    const updateData = foundry.utils.expandObject(formData);
    updateData.system = updateData.system || {}; updateData.system.skills = updateData.system.skills || {}; updateData.system.skills.advanced = finalMerged;
    if (updateData.system.points && Object.prototype.hasOwnProperty.call(updateData.system.points, 'chance')) {
      let chanceVal = Number(updateData.system.points.chance);
      if (!Number.isFinite(chanceVal)) chanceVal = 0;
      const pdMax = Number(this.actor.system?.secondaire?.actuel?.pd) || 0;
      if (chanceVal < 0) chanceVal = 0;
      if (chanceVal > pdMax) chanceVal = pdMax;
      updateData.system.points.chance = chanceVal;
    }
    if (updateData.system.connaissances) {
      const raw = updateData.system.connaissances;
      let entries;
      if (Array.isArray(raw)) entries = raw;
      else if (raw && typeof raw === 'object') {
        entries = Object.keys(raw)
          .filter(k => /^\d+$/.test(k))
          .sort((a, b) => Number(a) - Number(b))
          .map(k => raw[k]);
      } else entries = [];
      const allowedTypes = new Set(['generale', 'academique', 'artistique', 'metier']);
      const specialTypes = new Set(['artistique', 'metier']);
      const allowedCara = ['cc', 'ct', 'force', 'endurance', 'agilite', 'intelligence', 'forceMentale', 'sociabilite'];
      const sanitized = [];
      for (const entry of entries) {
        if (!entry || typeof entry !== 'object') continue;
        const name = (entry.name ?? '').toString().trim();
        const type = (entry.type ?? '').toString().toLowerCase();
        const normType = allowedTypes.has(type) ? type : 'generale';
        let cara = (entry.cara ?? '').toString();
        if (!allowedCara.includes(cara)) cara = 'intelligence';
        if (!specialTypes.has(normType)) cara = 'intelligence';
        const id = (entry.id !== undefined && entry.id !== null && entry.id !== '') ? entry.id : undefined;
        const payload = { name, type: normType, cara };
        if (id !== undefined) payload.id = id;
        sanitized.push(payload);
      }
      updateData.system.connaissances = sanitized;
    }
    await this.actor.update(updateData);
    try { this.render(false); } catch (e) {}
  }
}

WarhammerActorSheet.loadSpells = loadSpells;
WarhammerActorSheet.prototype._renderSpellsList = async function(cat) { return renderSpellsList(this, cat); };
WarhammerActorSheet.prototype._renderSpellsBySchool = async function(schoolKey) { return renderSpellsBySchool(this, schoolKey); };
WarhammerActorSheet.prototype._renderOwnedSpells = async function() { return renderOwnedSpells(this); };

Hooks.once("init", function () {
  console.log("Warhammer2e | init");
  CONFIG.Actor.documentClass = WarhammerActor;
  CONFIG.Item.documentClass = WarhammerItem;

  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("warhammer2e", WarhammerActorSheet, { types: ["character","npc"], makeDefault: true });

  try {
    const _origRender = WarhammerActorSheet.prototype.render;
    WarhammerActorSheet.prototype.render = function(...args) {
      try {
        if (this._suppressNextRender) { this._suppressNextRender = false; return this; }
      } catch (e) {}
      return _origRender.apply(this, args);
    };
  } catch (e) {}

  Items.unregisterSheet("core", ItemSheet);

  registerHandlebarsHelpers();
  preloadHandlebarsTemplates();
});

Hooks.once('ready', () => {
  try {
    if (typeof Combatant !== 'undefined' && Combatant.prototype && Combatant.prototype.rollInitiative) {
      const _origRollInitiative = Combatant.prototype.rollInitiative;
      Combatant.prototype.rollInitiative = async function(options = {}) {
        const actor = this.actor || (this.token ? this.token.actor : null) || (this.actorId ? game.actors.get(this.actorId) : null);
        const agilite = actor?.system?.principal?.actuel?.agilite ? Number(actor.system.principal.actuel.agilite) : 0;
        const tens = Math.floor((agilite || 0) / 10);

  const count = 1 + (tens || 0);
  const expr = `${count}d10`;

  const roll = await new Roll(expr).evaluate();
  const total = roll.total;

        if (options.update !== false) {
          try { await this.update({ initiative: total }); } catch (e) { console.error('Failed to set initiative on combatant', e); }
        }

        try {
          const speaker = ChatMessage.getSpeaker({ actor });
          const faces = (roll.dice || []).flatMap(d => (d.results || []).map(r => r.result));
          const facesStr = faces.length ? faces.join(' + ') : '';
          const content = `<div class="initiative-roll"><strong>${actor?.name || 'Combatant'}</strong> — Initiative : <strong>${total}</strong>${facesStr ? ` (result ${facesStr})` : ''}</div>`;
          ChatMessage.create({ user: game.user.id, speaker, content });
        } catch (e) { console.warn('Failed to create initiative chat message', e); }

        return roll;
      };
      console.log('Warhammer2e | Patched Combatant.rollInitiative to use 1d10 + 1d10 per 10 Agilité');
    }
    try {
      if (typeof Combat !== 'undefined' && Combat.prototype && Combat.prototype.rollAll) {
        const _origRollAll = Combat.prototype.rollAll;
        Combat.prototype.rollAll = async function(options = {}) {
          try {
            await _origRollAll.call(this, options);
          } catch (err) {
          }

          const results = [];
          for (const c of this.combatants) {
            try {
              const actor = c.actor || (c.token ? c.token.actor : null) || (c.actorId ? game.actors.get(c.actorId) : null) || null;
              const agilite = actor?.system?.principal?.actuel?.agilite ? Number(actor.system.principal.actuel.agilite) : 0;
              const tens = Math.floor((agilite || 0) / 10);
              const count = 1 + (tens || 0);
              const expr = `${count}d10`;
              const roll = await new Roll(expr).evaluate();
              const total = roll.total;
              if (options.update !== false) {
                try { await c.update({ initiative: total }); } catch (e) { console.warn('Warhammer2e | Failed to update combatant initiative', e); }
              }
              try {
                const speaker = ChatMessage.getSpeaker({ actor });
                const faces = (roll.dice || []).flatMap(d => (d.results || []).map(r => r.result));
                const facesStr = faces.length ? faces.join(' + ') : '';
                const content = `<div class="initiative-roll"><strong>${actor?.name || 'Combatant'}</strong> — Initiative : <strong>${total}</strong>${facesStr ? ` (result ${facesStr})` : ''}</div>`;
                ChatMessage.create({ user: game.user.id, speaker, content });
              } catch (e) {}
              results.push({ combatant: c, roll, total });
            } catch (err) {
              console.warn('Warhammer2e | rollAll failed for combatant', err);
            }
          }
          return results;
        };
        console.log('Warhammer2e | Patched Combat.rollAll to use system initiative formula');
      }
    } catch (err) { console.warn('Warhammer2e | Unable to patch Combat.rollAll', err); }
  } catch (err) {
    console.warn('Warhammer2e | Unable to patch Combatant.rollInitiative', err);
  }
});

async function _resolveEchoTableResult(tableName) {
  const url = `systems/warhammer2e/echos.json`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Impossible de charger ${url}`);
  const data = await resp.json();
  const table = (data.tables || []).find(t => t.name === tableName);
  if (!table) throw new Error('Table non trouvée: ' + tableName);
  const roll = await new Roll('1d100').evaluate();
  const val = roll.total;
  const result = (table.results || []).find(r => r.range && r.range.length === 2 && val >= r.range[0] && val <= r.range[1]);
  if (!result) return `Jet: ${val} — Aucun résultat trouvé.`;
  return `Jet: ${val} — ${result.text}`;
}

async function _openColereDialog(actor) {
  const content = `
    <div class="form-group">
      <p>Souhaitez-vous tirer sur <strong>Colère des Dieux</strong> ?</p>
    </div>
  `;

  new Dialog({
    title: 'Colère des Dieux',
    content,
    buttons: {
      roll: {
        label: 'Tirer',
        callback: async () => {
          try {
            const text = await _resolveColereResult();
            ChatMessage.create({
              user: game.user.id,
              speaker: ChatMessage.getSpeaker({actor: actor}),
              content: `
                <div class="colere-result">
                  <h3>Colère des Dieux</h3>
                  <div>${text}</div>
                </div>
              `
            });
          } catch (err) {
            console.error('Erreur Colère:', err);
            ui.notifications.error('Impossible de charger Colère des Dieux.');
          }
        }
      },
      cancel: { label: 'Annuler' }
    },
    default: 'roll'
  }).render(true);
}

async function _resolveColereResult() {
  const url = `systems/warhammer2e/colere.json`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Impossible de charger ${url}`);
  const data = await resp.json();
  const roll = await new Roll('1d100').evaluate();
  const val = roll.total;
  const result = (data.results || []).find(r => r.range && r.range.length === 2 && val >= r.range[0] && val <= r.range[1]);
  if (!result) return `Jet: ${val} — Aucun résultat trouvé.`;
  return `Jet: ${val} — ${result.text}`;
}
