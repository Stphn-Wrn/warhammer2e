export class GestionRessourcesApp extends Application {
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "gestion-ressources",
      title: "Gestion des Ressources",
      template: "systems/warhammer2e/templates/assets/gestion-ressources.html",
      width: 400,
      height: "auto",
      resizable: true,
    });
  }

  activateListeners(html) {
  super.activateListeners(html);

  const playerActors = game.actors.filter(a => a.hasPlayerOwner && (a.type === "character" || a.type === "monster"));
  const options = playerActors.map(a => `<option value="${a.id}">${a.name}</option>`).join("");

  html.find("select.resource-target").each((i, sel) => {
    sel.innerHTML = `<option value="">-- Sélectionner un acteur --</option>` + options;
  });

  html.find("input[name='reset-luck']").on("click", async ev => {
    ev.preventDefault();
    if (!game.user.isGM) return ui.notifications.warn("Seul le MJ peut utiliser cette option.");

    const targetId = html.find("select[name='reset-luck-target']").val();
    const customValue = html.find("input[name='reset-luck-value']").val();

    if (!targetId) return ui.notifications.warn("Veuillez choisir un acteur.");

    const actor = game.actors.get(targetId);
    if (!actor) return ui.notifications.error("Acteur introuvable.");

    const maxLuck = Number(actor.system?.secondaire?.actuel?.pd) || 0;
    const value = customValue !== "" ? Number(customValue) : maxLuck;

    await actor.update({ "system.points.chance": Math.clamp(value, 0, maxLuck) });

    ui.notifications.info(`${actor.name} reçoit ${value} Point(s) de Chance.`);
  });

  html.find("input[name='heal-all']").on("click", async ev => {
    ev.preventDefault();
    if (!game.user.isGM) return ui.notifications.warn("Seul le MJ peut utiliser cette option.");

    const targetId = html.find("select[name='heal-all-target']").val();
    const customValue = html.find("input[name='heal-all-value']").val();

    if (!targetId) return ui.notifications.warn("Veuillez choisir un acteur.");

    const actor = game.actors.get(targetId);
    if (!actor) return ui.notifications.error("Acteur introuvable.");

    const maxWounds = Number(actor.system?.secondaire?.actuel?.b) || 0;
    const value = customValue !== "" ? Number(customValue) : maxWounds;

    await actor.update({ "system.combat.hp": Math.clamp(value, 0, maxWounds) });

    ui.notifications.info(`${actor.name} récupère ${value} Point(s) de Blessure.`);
  });

html.find("input[name='reset-luck-custom']").on("click", async ev => {
  ev.preventDefault();
  if (!game.user.isGM) return ui.notifications.warn("MJ uniquement.");

  const id = html.find("select[name='reset-luck-target']").val();
  const value = html.find("input[name='reset-luck-value']").val();

  if (!id) return ui.notifications.warn("Sélectionnez un acteur.");
  if (value === "") return ui.notifications.warn("Entrez une valeur de chance.");

  const actor = game.actors.get(id);
  const max = Number(actor.system?.secondaire?.actuel?.pd) || 0;

  const val = Math.clamp(Number(value), 0, max);

  await actor.update({ "system.points.chance": val });
  ui.notifications.info(`${actor.name} reçoit ${val} Point(s) de Chance.`);
});

}
}
