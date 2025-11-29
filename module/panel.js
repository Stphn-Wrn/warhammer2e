import { GestionRessourcesApp } from "./gestion-ressources.js";

Hooks.on("getSceneControlButtons", controls => {
  controls.tokens.tools.myTool = {
    name: "myTool",
    title: "Gestion Des Ressources",
    icon: "fa-solid fa-wrench",
    order: Object.keys(controls.tokens.tools).length,
    button: true,
    visible: game.user.isGM,
    onChange: () => {
      const existing = foundry.applications.instances.get("my-tool");
      if ( existing ) existing.close();
      else new GestionRessourcesApp().render({force: true});
    }
  };
});
