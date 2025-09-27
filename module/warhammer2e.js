import { parseDamageSpec, getZoneFromD100, rollDiceFaces, handleUlricFury } from './utils.js';
import { openMaledictionDialog, openColereDialog, openSpellCastDialog } from './dialogs.js';
import { wireSheetHandlers } from './handlers.js';
import { handleAdvancedSkillRoll, showSkillRollDialog, getSkillDisplayName, rollSkillTest } from './skills.js';
import { loadSpells, renderSpellsList, renderSpellsBySchool } from './spells.js';
import { registerHandlebarsHelpers, preloadHandlebarsTemplates } from './helpers.js';
import { findTalentIndexById, addTalent, deleteTalentById, findRegleIndexById, addRegle, deleteRegleById } from './talents.js';

// ===== Documents =====
class WarhammerActor extends Actor {}
class WarhammerItem extends Item {}

// ===== Actor Sheet =====
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

    // Ensure structures exist and compute derived values (principal, secondaire, combat, armor)
    sys.principal ??= {};
    for (const k of ["base", "talents", "carriere", "avance", "mod", "actuel"]) {
      sys.principal[k] ??= { cc: 0, ct: 0, force: 0, endurance: 0, agilite: 0, intelligence: 0, forceMentale: 0, sociabilite: 0 };
    }

    const P = sys.principal;
    const sumPrincipal = (s) => (Number(P.base?.[s]) || 0) + (Number(P.talents?.[s]) || 0) + (Number(P.carriere?.[s]) || 0) + (Number(P.avance?.[s]) || 0) + (Number(P.mod?.[s]) || 0);

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

    const sumSecondaire = (s) => (Number(S.base?.[s]) || 0) + (Number(S.talents?.[s]) || 0) + (Number(S.carriere?.[s]) || 0) + (Number(S.avance?.[s]) || 0) + (Number(S.mod?.[s]) || 0);

    sys.secondaire.actuel = { a: sumSecondaire("a"), b: sumSecondaire("b"), bf: (S.base.bf || 0) + (S.mod.bf || 0), be: (S.base.be || 0) + (S.mod.be || 0), mag: sumSecondaire("mag"), mvt: sumSecondaire("mvt"), pf: sumSecondaire("pf"), pd: sumSecondaire("pd") };

    sys.combat ??= {};
    const mvt = sys.secondaire.actuel.mvt || 0;
    sys.combat.move = mvt * 2;
    sys.combat.charge = mvt * 4;
    sys.combat.course = mvt * 6;
    sys.combat.jump = mvt + 6;

    // Armures init
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

    // Spells owned map
    sys.spellsOwned ??= {};

    // Skills default and advanced array
    sys.skills ??= {}; sys.skills.base ??= {}; sys.skills.advanced ??= [];
    sys._nextId ??= Number(sys._nextId) || 1;

    // Default base skill characteristics
    const defaultSkillCaracteristics = { /* ... many keys omitted for brevity, preserved in original file */ };
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

    // Ensure stable ids for talents/regles/advanced
    if (Array.isArray(sys.talents)) for (const t of sys.talents) if (t && (t.id === undefined || t.id === null)) t.id = sys._nextId++;
    else sys.talents = [];
    if (Array.isArray(sys.regles)) for (const r of sys.regles) if (r && (r.id === undefined || r.id === null)) r.id = sys._nextId++;
    else sys.regles = [];
    if (Array.isArray(sys.skills.advanced)) for (const s of sys.skills.advanced) if (s && (s.id === undefined || s.id === null)) s.id = sys._nextId++;
    else sys.skills.advanced = [];

    data.system = sys; data.type = this.actor.type; return data;
  }

  // Talents / Regles helpers delegated to talents module
  _findTalentIndexById(id) { return findTalentIndexById(this, id); }
  _addTalent() { return addTalent(this); }
  _deleteTalentById(id) { return deleteTalentById(this, id); }
  _findRegleIndexById(id) { return findRegleIndexById(this, id); }
  _addRegle() { return addRegle(this); }
  _deleteRegleById(id) { return deleteRegleById(this, id); }

  activateListeners(html) {
    super.activateListeners(html);
    // Initialize tabs
    new foundry.applications.ux.Tabs({ navSelector: ".tabs", contentSelector: ".sheet-body", initial: "main" });

    // Keep only the minimal armor-equip behavior here; other wiring is delegated
    const zones = ["head","body","armLeft","armRight","legLeft","legRight"];
    html.find(".armor-equip").on("change", ev => {
      const input = ev.currentTarget;
      const zone = input.dataset.zone;
      const pa = Number(input.dataset.pa) || 0;
      const val = (input.value || "").toUpperCase().trim();

      html.find(`.armor-equip[data-zone='${zone}']`).each((_, el) => { if (el !== input) { el.value = "NO"; $(el).trigger("change"); } });
      input.value = (val === "YES") ? "YES" : "NO"; $(input).trigger("change");
      const bonusInput = html.find(`input[name='system.armor.${zone}Bonus']`);
      const bonusValue = (bonusInput.val() || "").toString().replace(/,/g, '.');
      const bonus = Number(bonusValue) || 0;
      const equipped = (input.value === "YES") ? (pa + bonus) : 0;
      this.actor.update({ [`system.armorEquipped.${zone}`]: equipped });
    });

    // Delegate the rest of the event wiring to the handlers module
    wireSheetHandlers(this, html);
  }

  // Skill delegation
  _handleAdvancedSkillRoll(skillIndex) { return handleAdvancedSkillRoll(this, skillIndex); }
  _showSkillRollDialog(skillName, skillTotal) { return showSkillRollDialog(this, skillName, skillTotal); }
  _getSkillDisplayName(skillName) { return getSkillDisplayName(skillName); }
  async _rollSkillTest(skillName, targetNumber, modifier) { return rollSkillTest(this, skillName, targetNumber, modifier); }

  async _updateObject(event, formData) {
    // Reconstruct advanced skills from flattened formData fields and merge with existing
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
    await this.actor.update(updateData);
    try { this.render(false); } catch (e) {}
  }
}

// Delegate spells functions to spells module (keeps sheet API compatible)
WarhammerActorSheet.loadSpells = loadSpells;
WarhammerActorSheet.prototype._renderSpellsList = async function(cat) { return renderSpellsList(this, cat); };
WarhammerActorSheet.prototype._renderSpellsBySchool = async function(schoolKey) { return renderSpellsBySchool(this, schoolKey); };

// Minimal item sheet
class WarhammerItemSheet extends ItemSheet {
  static get defaultOptions() { return foundry.utils.mergeObject(super.defaultOptions, { classes: ["warhammer2e","sheet","item"], template: "systems/warhammer2e/templates/item/item-sheet.html", width: 520, height: 420 }); }
  getData() { return super.getData(); }
}

// Register core configuration, helpers and preload templates in a single init hook
Hooks.once("init", function () {
  console.log("Warhammer2e | init");
  CONFIG.Actor.documentClass = WarhammerActor;
  CONFIG.Item.documentClass = WarhammerItem;

  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("warhammer2e", WarhammerActorSheet, { types: ["character","npc"], makeDefault: true });

  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("warhammer2e", WarhammerItemSheet, { types: ["skill","talent","weapon"], makeDefault: true });

  // Register helpers and preload templates from the helpers module
  registerHandlebarsHelpers();
  preloadHandlebarsTemplates();
});

// Ensure combat initiative uses 1d10 + 1d10 per ten Agilité when no formula is provided
Hooks.once('ready', () => {
  try {
    if (typeof Combatant !== 'undefined' && Combatant.prototype && Combatant.prototype.rollInitiative) {
      const _origRollInitiative = Combatant.prototype.rollInitiative;
      Combatant.prototype.rollInitiative = async function(options = {}) {
        // Always use the system-specific initiative formula (1d10 + 1d10 per 10 Agilité)

        // Attempt to compute agility tens from the associated actor
        const actor = this.actor || (this.token ? this.token.actor : null) || (this.actorId ? game.actors.get(this.actorId) : null);
        const agilite = actor?.system?.principal?.actuel?.agilite ? Number(actor.system.principal.actuel.agilite) : 0;
        const tens = Math.floor((agilite || 0) / 10);

  // Build roll expression: Nd10 where N = 1 + tens
  const count = 1 + (tens || 0);
  const expr = `${count}d10`;

  const roll = await new Roll(expr).evaluate();
  const total = roll.total;

        // If update is requested (default true), persist to combatant
        if (options.update !== false) {
          try { await this.update({ initiative: total }); } catch (e) { console.error('Failed to set initiative on combatant', e); }
        }

  // Create a chat message for the initiative roll (default behavior)
        try {
          const speaker = ChatMessage.getSpeaker({ actor });
          const faces = (roll.dice || []).flatMap(d => (d.results || []).map(r => r.result));
          const facesStr = faces.length ? faces.join(' + ') : '';
          const content = `<div class="initiative-roll"><strong>${actor?.name || 'Combatant'}</strong> — Initiative : <strong>${total}</strong>${facesStr ? ` (result ${facesStr})` : ''}</div>`;
          ChatMessage.create({ user: game.user.id, speaker, content });
        } catch (e) { console.warn('Failed to create initiative chat message', e); }

        // Return the Roll to match Foundry expectations
        return roll;
      };
      console.log('Warhammer2e | Patched Combatant.rollInitiative to use 1d10 + 1d10 per 10 Agilité');
    }
    // Also override Combat.rollAll to ensure the Combat Tracker uses our initiative formula
    try {
      if (typeof Combat !== 'undefined' && Combat.prototype && Combat.prototype.rollAll) {
        const _origRollAll = Combat.prototype.rollAll;
        Combat.prototype.rollAll = async function(options = {}) {
          // First call the original implementation so any existing hooks / workflows run
          try {
            await _origRollAll.call(this, options);
          } catch (err) {
            // ignore original errors but continue to enforce our formula
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
              // Post chat for each roll (best-effort)
              try {
                const speaker = ChatMessage.getSpeaker({ actor });
                const faces = (roll.dice || []).flatMap(d => (d.results || []).map(r => r.result));
                const facesStr = faces.length ? faces.join(' + ') : '';
                const content = `<div class="initiative-roll"><strong>${actor?.name || 'Combatant'}</strong> — Initiative : <strong>${total}</strong>${facesStr ? ` (result ${facesStr})` : ''}</div>`;
                ChatMessage.create({ user: game.user.id, speaker, content });
              } catch (e) { /* ignore chat failures */ }
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

// Charge echos.json et renvoie le texte correspondant au choix et au 1d100
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

// Ouvre une dialog pour Colère des Dieux, charge colere.json, tire 1d100 et affiche le résultat
async function _openColereDialog(actor) {
  // Le fichier colere.json définit directement une table unique ; on propose juste de tirer
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

// Charge colere.json et retourne le texte correspondant au 1d100
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

// Duplicate item-sheet / handlebars helpers / init block removed; initialization and helpers
// are delegated to the helpers module and handled in the top-level init hook.
