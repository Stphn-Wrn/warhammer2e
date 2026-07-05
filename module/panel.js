import { GestionRessourcesApp } from "./gestion-ressources.js";

function toggleGestionRessources() {
  const existing = foundry.applications.instances.get("gestion-ressources");
  if (existing) existing.close();
  else new GestionRessourcesApp().render({ force: true });
}

Hooks.on("getSceneControlButtons", controls => {
  controls.tokens.tools.myTool = {
    name: "myTool",
    title: "Gestion des Ressources",
    icon: "fa-solid fa-wrench",
    order: Object.keys(controls.tokens.tools).length,
    button: true,
    visible: game.user.isGM,
    onChange: toggleGestionRessources
  };
});

Hooks.on("renderSettings", (app, html) => {
  if (!game.user.isGM) return;
  const button = $(`<button style="margin-top:4px"><i class="fa-solid fa-wrench"></i> Gestion des Ressources</button>`);
  button.on("click", toggleGestionRessources);
  html.find("#settings-game").append(button);
});
