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
    const response = await fetch("systems/warhammer2e/json/crits.json");
    if (!response.ok) {
      ui.notifications.error("Impossible de charger le fichier crits.json");
      return null;
    }
    this.critData = await response.json();
    return this.critData;
  }

  getCritResultValue(d100, critValue) {
    const table = this.constructor.critData;
    if (!table) return null;
    const row = table.ranges.find(r => d100 >= r.min && d100 <= r.max);
    if (!row) return null;
    return row.values[critValue - 1];
  }

  async activateListeners(html) {
    super.activateListeners(html);
    await this.constructor.loadCritData();

    const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
    const playerActors = game.actors.filter(a => a.hasPlayerOwner && (a.type === "character" || a.type === "monster"));

    const actorOptions = playerActors
      .map(a => `<option value="${a.id}">${a.name}</option>`)
      .join("");
    html.find("select.resource-target").each((_, sel) => {
      sel.innerHTML = `<option value="">-- Sélectionner un acteur --</option>` + actorOptions;
    });

    const applyResourceValue = async ({ inputBtn, selectName, valueName, getMax, updatePath, successMsg, allMsg }) => {
      html.find(inputBtn).on("click", async ev => {
        ev.preventDefault();
        if (!game.user.isGM) return ui.notifications.warn("Seul le MJ peut utiliser cette option.");

        const targetId = html.find(`select[name='${selectName}']`).val();
        const customValue = html.find(`input[name='${valueName}']`).val();

        const computeValue = (actor) => {
          const max = getMax(actor);
          return clamp(customValue !== "" ? Number(customValue) : max, 0, max);
        };

        if (!targetId) {
          for (const actor of playerActors) {
            await actor.update({ [updatePath]: computeValue(actor) });
          }
          return ui.notifications.info(allMsg(customValue));
        }

        const actor = game.actors.get(targetId);
        if (!actor) return ui.notifications.error("Acteur introuvable.");
        await actor.update({ [updatePath]: computeValue(actor) });
        ui.notifications.info(successMsg(actor, computeValue(actor)));
      });
    };

    applyResourceValue({
      inputBtn:   "input[name='reset-luck']",
      selectName: 'reset-luck-target',
      valueName:  'reset-luck-value',
      getMax:     actor => Number(actor.system?.secondaire?.actuel?.pd) || 0,
      updatePath: 'system.points.chance',
      successMsg: (actor, value) => `${actor.name} reçoit ${value} Point(s) de Chance.`,
      allMsg:     (customValue) => `Tous les acteurs reçoivent ${customValue !== "" ? customValue : "leurs max"} points de Chance.`
    });

    applyResourceValue({
      inputBtn:   "input[name='heal-all']",
      selectName: 'heal-all-target',
      valueName:  'heal-all-value',
      getMax:     actor => Number(actor.system?.secondaire?.actuel?.b) || 0,
      updatePath: 'system.combat.hp',
      successMsg: (actor, value) => `${actor.name} récupère ${value} Point(s) de Blessure.`,
      allMsg:     (customValue) => `Tous les acteurs récupèrent ${customValue !== "" ? customValue : "leurs max"} points de Blessure.`
    });

    // ---------- Coup critique ----------
    html.find("input[name='apply-critique']").on("click", async ev => {
      ev.preventDefault();
      if (!game.user.isGM) return ui.notifications.warn("Seul le MJ peut lancer les critiques.");

      const zone = html.find("select[name='critique-zone']").val();
      const d100 = Number(html.find("input[name='critique-roll-d100']").val());
      const critValue = Number(html.find("input[name='critique-roll-value']").val());

      if (!zone)                                return ui.notifications.warn("Sélectionnez une zone.");
      if (!d100 || d100 < 1 || d100 > 100)     return ui.notifications.warn("Entrez un résultat d100 valide.");
      if (!critValue || critValue < 1 || critValue > 10) return ui.notifications.warn("La valeur critique doit être entre +1 et +10.");

      const finalIndex = this.getCritResultValue(d100, critValue);
      if (!finalIndex) return ui.notifications.error("Impossible de résoudre le critique.");

      const table = this.constructor.critData[zone];
      const entry = table.find(e => e.roll === finalIndex);
      if (!entry) return ui.notifications.error("Aucun résultat correspondant dans la table critique.");

      const label = this.constructor.critData[`${zone}_label`] ?? `Coup critique – ${zone}`;

      ChatMessage.create({
        content: `
          <h2>${label}</h2>
          <p><strong>d100 :</strong> ${d100}</p>
          <p><strong>Critique :</strong> +${critValue}</p>
          <p><strong>Résultat final :</strong> ${finalIndex}</p>
          <hr/>
          <p><strong>Effet :</strong> ${entry.effet}</p>
          <p><em><strong>Type d'opération médicale :</strong> ${entry.operation}</em></p>
        `
      });
    });
  }

}
