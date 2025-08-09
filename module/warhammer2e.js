// ===== Helpers Handlebars =====
Hooks.once("init", () => {
  // (array "A" "B") -> ["A","B"]
  Handlebars.registerHelper("array", (...args) => args.slice(0, -1));
  // upper "int" -> "INT"
  Handlebars.registerHelper("upper", (s) => String(s ?? "").toUpperCase());
  Handlebars.registerHelper("uppercase", (s) => String(s ?? "").toUpperCase());

});

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

    // garde-fous
    sys.principal ??= {};
    for (const k of ["talents", "carriere", "avance", "modificateur"]) {
      sys.principal[k] ??= { cc:0, ct:0, force:0, endurance:0, agilite:0, intelligence:0, forceMentale:0, sociabilite:0 };
    }

    const base = sys.caracteristiques;
    const P = sys.principal;

    const sum = (s) =>
      (Number(base?.[s])||0) +
      (Number(P.talents?.[s])||0) +
      (Number(P.carriere?.[s])||0) +
      (Number(P.avance?.[s])||0) +
      (Number(P.modificateur?.[s])||0);

    data.derived = {
      principal: {
        actuel: {
          cc: sum("cc"),
          ct: sum("ct"),
          force: sum("force"),
          endurance: sum("endurance"),
          agilite: sum("agilite"),
          intelligence: sum("intelligence"),
          forceMentale: sum("forceMentale"),
          sociabilite: sum("sociabilite")
        }
      }
    };

    data.system = sys;
    data.type = this.actor.type;
    return data;
  }

  activateListeners(html) {
    super.activateListeners(html);
    // (plus tard) listeners de jets ici
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
  getData(options) {
    const data = super.getData(options);
    data.system = this.item.system;
    return data;
  }
}

// ===== Preload templates =====
async function preloadHandlebarsTemplates() {
  return loadTemplates([
    "systems/warhammer2e/templates/actor/character-sheet.html",
    "systems/warhammer2e/templates/item/item-sheet.html"
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

  preloadHandlebarsTemplates();
});
