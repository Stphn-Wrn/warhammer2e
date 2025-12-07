export class GestionRessourcesApp extends Application {

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "gestion-ressources",
      title: "Gestion des Ressources",
      template: "systems/warhammer2e/templates/assets/gestion-ressources.html",
      width: 400,
      height: "auto",
      resizable: true
    });
  }

  static critData = null;

  static async loadCritData() {
    if (this.critData) return this.critData;

    const path = "systems/warhammer2e/json/crits.json";
    const response = await fetch(path);
    if (!response.ok) {
      ui.notifications.error("Impossible de charger le fichier crits.json");
      return null;
    }

    this.critData = await response.json();
    console.log("CRIT DATA LOADED", this.critData);
    return this.critData;
  }

  getCritResultValue(d100, critValue) {
    const table = this.constructor.critData;
    if (!table) return null;

    const row = table.ranges.find(r => d100 >= r.min && d100 <= r.max);
    if (!row) return null;

    const index = critValue - 1;
    return row.values[index];
  }


  async activateListeners(html) {
    super.activateListeners(html);

    await this.constructor.loadCritData();

    const playerActors = game.actors.filter(a =>
      a.hasPlayerOwner && (a.type === "character" || a.type === "monster")
    );

    const options = playerActors
      .map(a => `<option value="${a.id}">${a.name}</option>`)
      .join("");

    html.find("select.resource-target").each((i, sel) => {
      sel.innerHTML = `<option value="">-- Sélectionner un acteur --</option>` + options;
    });


    html.find("input[name='reset-luck']").on("click", async ev => {
      ev.preventDefault();

      if (!game.user.isGM)
        return ui.notifications.warn("Seul le MJ peut utiliser cette option.");

      const targetId = html.find("select[name='reset-luck-target']").val();
      const customValue = html.find("input[name='reset-luck-value']").val();

      if (!targetId)
        return ui.notifications.warn("Veuillez choisir un acteur.");

      const actor = game.actors.get(targetId);
      if (!actor) return ui.notifications.error("Acteur introuvable.");

      const maxLuck = Number(actor.system?.secondaire?.actuel?.pd) || 0;
      const value = customValue !== "" ? Number(customValue) : maxLuck;

      await actor.update({
        "system.points.chance": Math.clamp(value, 0, maxLuck)
      });

      ui.notifications.info(`${actor.name} reçoit ${value} point(s) de Chance.`);
    });

    html.find("input[name='heal-all']").on("click", async ev => {
      ev.preventDefault();

      if (!game.user.isGM)
        return ui.notifications.warn("Seul le MJ peut utiliser cette option.");

      const targetId = html.find("select[name='heal-all-target']").val();
      const customValue = html.find("input[name='heal-all-value']").val();

      if (!targetId)
        return ui.notifications.warn("Veuillez choisir un acteur.");

      const actor = game.actors.get(targetId);
      if (!actor) return ui.notifications.error("Acteur introuvable.");

      const maxWounds = Number(actor.system?.secondaire?.actuel?.b) || 0;
      const value = customValue !== "" ? Number(customValue) : maxWounds;

      await actor.update({
        "system.combat.hp": Math.clamp(value, 0, maxWounds)
      });

      ui.notifications.info(`${actor.name} récupère ${value} point(s) de Blessure.`);
    });


    html.find("input[name='apply-critique']").on("click", async ev => {
      ev.preventDefault();

      if (!game.user.isGM)
        return ui.notifications.warn("Seul le MJ peut lancer les critiques.");

      const zone = html.find("select[name='critique-zone']").val();
      const d100 = Number(html.find("input[name='critique-roll-d100']").val());
      const critValue = Number(html.find("input[name='critique-roll-value']").val());

      if (!zone)
        return ui.notifications.warn("Sélectionnez une zone.");

      if (!d100 || d100 < 1 || d100 > 100)
        return ui.notifications.warn("Entrez un résultat d100 valide.");

      if (!critValue || critValue < 1 || critValue > 10)
        return ui.notifications.warn("La valeur critique doit être entre +1 et +10.");

      const finalIndex = this.getCritResultValue(d100, critValue);
      if (!finalIndex)
        return ui.notifications.error("Impossible de résoudre le critique.");

      const table = this.constructor.critData[zone];
      const entry = table.find(e => e.roll === finalIndex);

      if (!entry)
        return ui.notifications.error("Aucun résultat correspondant dans la table critique.");
        const label = this.constructor.critData[`${zone}_label`];

      ChatMessage.create({
        content: `
          <h2>${label}</h2>
          <p><strong>d100 :</strong> ${d100}</p>
          <p><strong>Critique :</strong> +${critValue}</p>
          <p><strong>Résultat final :</strong> ${finalIndex}</p>
          <hr/>
          <p><strong>Effet :</strong> ${entry.effet}</p>
          <p><em> <strong>Type d'opération médicale : </strong> ${entry.operation}</em></p>
        `
      });
    });
  }
}
