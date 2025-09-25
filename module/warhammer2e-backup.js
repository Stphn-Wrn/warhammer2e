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
      sys.principal[k] ??= {
        cc: 0, ct: 0, force: 0, endurance: 0,
        agilite: 0, intelligence: 0,
        forceMentale: 0, sociabilite: 0
      };
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
    S.base.bf = Math.round((sys.principal.actuel.force || 0) / 10);
    S.base.be = Math.round((sys.principal.actuel.endurance || 0) / 10);

    const sumSecondaire = (s) =>
      (Number(S.base?.[s]) || 0) +
      (Number(S.talents?.[s]) || 0) +
      (Number(S.carriere?.[s]) || 0) +
      (Number(S.avance?.[s]) || 0) +
      (Number(S.mod?.[s]) || 0);

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

    // ----- Combat -----
    sys.combat ??= {};
    const mvt = sys.secondaire.actuel.mvt || 0;
    sys.combat.move = mvt * 2;
    sys.combat.charge = mvt * 4;
    sys.combat.course = mvt * 6;
    sys.combat.jump = mvt + 6;

    // ----- Armures -----
    sys.armor ??= {};

    // Helper d'init pour une zone d'armure (light/medium/heavy)
    const initZone = () => ({
      light:  { eq: "NO", name: "", qualite: "Ordinaire", enc: 0 },
      medium: { eq: "NO", name: "", qualite: "Ordinaire", enc: 0 },
      heavy:  { eq: "NO", name: "", qualite: "Ordinaire", enc: 0 }
    });

    // Initialiser structure par zone si besoin
    for (const zone of ["head", "body", "armLeft", "armRight", "legLeft", "legRight"]) {
      const z = sys.armor[zone];
      if (!z || typeof z !== "object" || Array.isArray(z)) {
        sys.armor[zone] = initZone();
      } else {
        // S'assurer que chaque sous-objet existe
        sys.armor[zone].light  ??= { eq: "NO", name: "", qualite: "Ordinaire", enc: 0 };
        sys.armor[zone].medium ??= { eq: "NO", name: "", qualite: "Ordinaire", enc: 0 };
        sys.armor[zone].heavy  ??= { eq: "NO", name: "", qualite: "Ordinaire", enc: 0 };
      }
    }

    // Bonus par zone (numériques)
    sys.armor.headBonus ??= 0;
    sys.armor.bodyBonus ??= 0;
    sys.armor.armLeftBonus ??= 0;
    sys.armor.armRightBonus ??= 0;
    sys.armor.legLeftBonus ??= 0;
    sys.armor.legRightBonus ??= 0;

    // Valeur équipée (PA de la pièce + bonus), séparée de sys.armor.{zone} (qui est un objet)
    sys.armorEquipped ??= {};
    for (const zone of ["head", "body", "armLeft", "armRight", "legLeft", "legRight"]) {
      sys.armorEquipped[zone] = Number(sys.armorEquipped[zone]) || 0;
    }

    // Totaux affichés = PA équipé + BE
    sys.armorTotals = {
      head:    sys.armorEquipped.head    + sys.secondaire.actuel.be,
      body:    sys.armorEquipped.body    + sys.secondaire.actuel.be,
      armLeft: sys.armorEquipped.armLeft + sys.secondaire.actuel.be,
      armRight:sys.armorEquipped.armRight+ sys.secondaire.actuel.be,
      legLeft: sys.armorEquipped.legLeft + sys.secondaire.actuel.be,
      legRight:sys.armorEquipped.legRight+ sys.secondaire.actuel.be
    };

    // ----- Données renvoyées au template -----
    data.system = sys;
    data.type = this.actor.type;
    return data;
  }

  activateListeners(html) {
    super.activateListeners(html);

    // Onglets (API V13+)
    new foundry.applications.ux.Tabs({
      navSelector: ".tabs",
      contentSelector: ".sheet-body",
      initial: "main"
    });

    const zones = ["head","body","armLeft","armRight","legLeft","legRight"];

    // Quand on tape YES/NO dans un champ d'équipement
    html.find(".armor-equip").on("change", ev => {
      const input = ev.currentTarget;
      const zone = input.dataset.zone;
      const pa = Number(input.dataset.pa) || 0;
      const val = (input.value || "").toUpperCase().trim();

      // Mettre tous NO (dans le DOM + déclencher change pour persister)
      html.find(`.armor-equip[data-zone='${zone}']`).each((_, el) => {
        if (el !== input) {
          el.value = "NO";
          $(el).trigger("change");
        }
      });

      // Mettre la ligne cliquée à YES (persistée)
      input.value = (val === "YES") ? "YES" : "NO";
      $(input).trigger("change");

      // Recalcule PA équipé = PA de la ligne + bonus de la zone
      const bonusInput = html.find(`input[name='system.armor.${zone}Bonus']`);
      const bonusValue = (bonusInput.val() || "").toString().replace(/,/g, '.');
      const bonus = Number(bonusValue) || 0;
      const equipped = (input.value === "YES") ? (pa + bonus) : 0;

      this.actor.update({ [`system.armorEquipped.${zone}`]: equipped });
    });

    // Quand un Bonus change, on recalcule la zone si une ligne est "YES"
    html.find(".armor-equip").on("change", ev => {
      const input = ev.currentTarget;
      const zone = input.dataset.zone;
      const pa = Number(input.dataset.pa) || 0;
      const val = (input.value || "").toUpperCase().trim();

      // Mettre tous les autres à NO (sans retrigger change)
      html.find(`.armor-equip[data-zone='${zone}']`).each((_, el) => {
        if (el !== input) el.value = "NO";
      });

      // Forcer la valeur YES/NO sur l’input cliqué
      input.value = (val === "YES") ? "YES" : "NO";

      // Calcul bonus
      const bonusInput = html.find(`input[name='system.armor.${zone}Bonus']`);
      const bonusValue = (bonusInput.val() || "").toString().replace(/,/g, '.');
      const bonus = Number(bonusValue) || 0;
      const equipped = (input.value === "YES") ? (pa + bonus) : 0;

      // Mettre à jour l’acteur (une seule fois)
      this.actor.update({ [`system.armorEquipped.${zone}`]: equipped });
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
    return super.getData();
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

  // Comparaison stricte
  Handlebars.registerHelper("eq", (a, b) => a === b);

  // Somme robuste (évite NaN / [object Object])
  Handlebars.registerHelper("sum", function (a, b) {
    const n1 = Number.isFinite(Number(a)) ? Number(a) : 0;
    const n2 = Number.isFinite(Number(b)) ? Number(b) : 0;
    return n1 + n2;
  });

  preloadHandlebarsTemplates();
});
