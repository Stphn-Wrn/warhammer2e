import { Warhammer2eActorDataSchema } from "../fields.js";

Hooks.once("init", function () {
  console.log("Warhammer v2 | Initialisation du système");

  CONFIG.Actor.dataModels = CONFIG.Actor.dataModels || {};
  CONFIG.Actor.dataModels["personnage"] = Warhammer2eActorDataSchema;
  CONFIG.Actor.dataModels["monstre"] = Warhammer2eActorDataSchema;
  CONFIG.Actor.dataModels["pnj"] = Warhammer2eActorDataSchema;

  // Enregistre la fiche par défaut
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("warhammer2e", class extends ActorSheet {
    static get defaultOptions() {
      return mergeObject(super.defaultOptions, {
        template: "templates/actor/character-sheet.html",
        classes: ["warhammer2e", "sheet", "actor"],
      });
    }
  }, { types: ["personnage", "monstre", "pnj"], makeDefault: true });
});
