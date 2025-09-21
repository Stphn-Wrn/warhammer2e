// ===== Documents =====
class WarhammerActor extends Actor {}
class WarhammerItem extends Item {}

// ===== Actor Sheet =====
class WarhammerActorSheet extends ActorSheet {
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

    // ----- Profil Principal -----
    sys.principal ??= {};
    for (const k of ["base", "talents", "carriere", "avance", "mod", "actuel"]) {
      sys.principal[k] ??= { cc: 0, ct: 0, force: 0, endurance: 0, agilite: 0, intelligence: 0, forceMentale: 0, sociabilite: 0 };
    }

    const P = sys.principal;
    const sumPrincipal = (s) =>
      (Number(P.base?.[s]) || 0) +
      (Number(P.talents?.[s]) || 0) +
      (Number(P.carriere?.[s]) || 0) +
      (Number(P.avance?.[s]) || 0) +
      (Number(P.mod?.[s]) || 0);

    sys.principal.actuel = {
      cc: sumPrincipal("cc"),
      ct: sumPrincipal("ct"),
      force: sumPrincipal("force"),
      endurance: sumPrincipal("endurance"),
      agilite: sumPrincipal("agilite"),
      intelligence: sumPrincipal("intelligence"),
      forceMentale: sumPrincipal("forceMentale"),
      sociabilite: sumPrincipal("sociabilite")
    };

    // ----- Profil Secondaire -----
    sys.secondaire ??= {};
    for (const k of ["base", "talents", "carriere", "avance", "mod", "actuel"]) {
      sys.secondaire[k] ??= { a: 0, b: 0, bf: 0, be: 0, mag: 0, mvt: 0, pf: 0, pd: 0 };
    }

    const S = sys.secondaire;

    // BF et BE de base = arrondi
    S.base.bf = Math.round((sys.principal.actuel.force || 0) / 10);
    S.base.be = Math.round((sys.principal.actuel.endurance || 0) / 10);

    const sumSecondaire = (s) =>
      (Number(S.base?.[s]) || 0) +
      (Number(S.talents?.[s]) || 0) +
      (Number(S.carriere?.[s]) || 0) +
      (Number(S.avance?.[s]) || 0) +
      (Number(S.mod?.[s]) || 0);

    // Actuel = spécial pour bf et be
    sys.secondaire.actuel = {
      a: sumSecondaire("a"),
      b: sumSecondaire("b"),
      bf: (S.base.bf || 0) + (S.mod.bf || 0),
      be: (S.base.be || 0) + (S.mod.be || 0),
      mag: sumSecondaire("mag"),
      mvt: sumSecondaire("mvt"),
      pf: sumSecondaire("pf"),
      pd: sumSecondaire("pd")
    };

    sys.combat ??= {};
    const mvt = sys.secondaire.actuel.mvt || 0;

    sys.combat.move = mvt * 2;

    sys.combat.charge = mvt * 4;

    sys.combat.course = mvt * 6;

    sys.combat.jump = mvt + 6;

    // ----- Sécurisation des tableaux dynamiques -----
    sys.skills ??= {};
    sys.skills.advanced ??= [];
    if (!Array.isArray(sys.skills.advanced)) sys.skills.advanced = Object.values(sys.skills.advanced);

    sys.talents ??= [];
    if (!Array.isArray(sys.talents)) sys.talents = Object.values(sys.talents);

    sys.regles ??= [];
    if (!Array.isArray(sys.regles)) sys.regles = Object.values(sys.regles);

    // ----- Calcul des Points d'Armure -----
    sys.armor ??= {};
    // Ex: sys.armor = { head:0, body:0, armLeft:0, armRight:0, legLeft:0, legRight:0 }

    sys.armorTotals = {
      head: (sys.armor.head || 0) + sys.secondaire.actuel.be,
      armLeft: (sys.armor.armLeft || 0) + sys.secondaire.actuel.be,
      armRight: (sys.armor.armRight || 0) + sys.secondaire.actuel.be,
      body: (sys.armor.body || 0) + sys.secondaire.actuel.be,
      legLeft: (sys.armor.legLeft || 0) + sys.secondaire.actuel.be,
      legRight: (sys.armor.legRight || 0) + sys.secondaire.actuel.be
    };



    // ----- Données renvoyées au template -----
    data.system = sys;
    data.type = this.actor.type;
    return data;
  }

  activateListeners(html) {
    super.activateListeners(html);

    // Onglets
    new Tabs({
      navSelector: ".tabs",
      contentSelector: ".sheet-body",
      initial: "main"
    });

    // ===== COMPÉTENCES AVANCÉES =====
    html.find(".skill-add").click(ev => {
      ev.preventDefault();
      let skills = duplicate(this.actor.system.skills.advanced) || [];
      if (!Array.isArray(skills)) skills = [];

      skills.push({
        label: "",
        cara: "",
        niveau: 0,
        talents: 0,
        divers: 0,
        total: 0,
        avance: false
      });

      this.actor.update({ "system.skills.advanced": skills });
    });

    html.find(".skill-delete").click(ev => {
      ev.preventDefault();
      const idx = Number(ev.currentTarget.dataset.skill);
      if (!confirm("Voulez-vous vraiment supprimer cette compétence avancée ?")) return;

      let skills = duplicate(this.actor.system.skills.advanced) || [];
      skills.splice(idx, 1);
      this.actor.update({ "system.skills.advanced": skills });
    });

    html.find(".skill-roll").click(ev => {
      const idx = Number(ev.currentTarget.dataset.skill);
      const skill = this.actor.system.skills.advanced[idx];
      ui.notifications.info(`Jet pour ${skill?.label || "Compétence"} (${skill?.cara || "-"})`);
    });

    // ===== TALENTS =====
    html.find(".talent-add").click(ev => {
      ev.preventDefault();
      let talents = duplicate(this.actor.system.talents) || [];
      if (!Array.isArray(talents)) talents = [];

      talents.push({ name: "", description: "" });
      this.actor.update({ "system.talents": talents });
    });

    html.find(".talent-delete").click(ev => {
      ev.preventDefault();
      const index = Number(ev.currentTarget.dataset.talent);
      if (!confirm("Voulez-vous vraiment supprimer ce talent ?")) return;

      let talents = duplicate(this.actor.system.talents) || [];
      talents.splice(index, 1);
      this.actor.update({ "system.talents": talents });
    });

    // ===== RÈGLES SPÉCIALES =====
    html.find(".regles-spe-add").click(ev => {
      ev.preventDefault();
      let regles = duplicate(this.actor.system.regles) || [];
      if (!Array.isArray(regles)) regles = [];

      regles.push({ name: "", description: "" });
      this.actor.update({ "system.regles": regles });
    });

    html.find(".regle-delete").click(ev => {
      ev.preventDefault();
      const index = Number(ev.currentTarget.dataset.regle);
      if (!confirm("Voulez-vous vraiment supprimer cette règle spéciale ?")) return;

      let regles = duplicate(this.actor.system.regles) || [];
      regles.splice(index, 1);
      this.actor.update({ "system.regles": regles });
    });

  }
}

// ===== Item Sheet minimal =====
class WarhammerItemSheet extends ItemSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["warhammer2e", "sheet", "item"],
      template: "systems/warhammer2e/templates/item/item-sheet.html",
      width: 520,
      height: 420
    });
  }
  getData() {
    const data = super.getData();
    return data;
  }
}

// ===== Preload templates =====
async function preloadHandlebarsTemplates() {
  return loadTemplates([
    "systems/warhammer2e/templates/actor/character-sheet.html",
    "systems/warhammer2e/templates/item/item-sheet.html",
    "systems/warhammer2e/templates/actor/tabs/tab-main.html",
    "systems/warhammer2e/templates/actor/tabs/tab-bio.html",
    "systems/warhammer2e/templates/actor/tabs/tab-weapons.html",
    "systems/warhammer2e/templates/actor/tabs/tab-armor.html",
    "systems/warhammer2e/templates/actor/tabs/tab-spells.html",
    "systems/warhammer2e/templates/actor/tabs/tab-career.html",
    "systems/warhammer2e/templates/actor/tabs/tab-inventory.html"
  ]);
}

// ===== Init registration =====
Hooks.once("init", function () {
  console.log("Warhammer2e | init");
  CONFIG.Actor.documentClass = WarhammerActor;
  CONFIG.Item.documentClass = WarhammerItem;

  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("warhammer2e", WarhammerActorSheet, { types: ["character", "npc"], makeDefault: true });

  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("warhammer2e", WarhammerItemSheet, { types: ["skill", "talent", "weapon"], makeDefault: true });

  Handlebars.registerHelper("capitalize", function (str) {
    if (typeof str !== "string") return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
  });

  Handlebars.registerHelper("sum", function (a, b) {
    return (Number(a) || 0) + (Number(b) || 0);
  });

  preloadHandlebarsTemplates();
});


