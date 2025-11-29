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
    html.find(".btn-test").on("click", () => {
      ui.notifications.info("Bouton dans la fenêtre cliqué !");
    });

    html.find("input[name='reset-luck']").on('click', async (ev) => {
      ev.preventDefault();
      const actorIds = game.actors.filter(a => a.type === 'character' || a.type === 'monster').map(a => a.id);
      for (const aid of actorIds) {
        try {
          const actor = game.actors.get(aid);
          if (!actor) continue;
          const maxPd = Number(actor.system?.secondaire?.actuel?.pd) || 0;
          await actor.update({ 'system.points.chance': maxPd });
        } catch (e) { console.error('Unable to reset luck for actor', aid, e); }
      }
      try { canvas.tokens.releaseAll(); } catch(e) {}
      ui.notifications.info('Points de chance réinitialisés pour tous les acteurs');
    });

    html.find("input[name='heal-all']").on('click', async (ev) => {
      ev.preventDefault();
      const actorIds = game.actors.filter(a => a.type === 'character' || a.type === 'monster').map(a => a.id);
      for (const aid of actorIds) {
        try {
          const actor = game.actors.get(aid);
          if (!actor) continue;
          const maxBl = Number(actor.system?.secondaire?.actuel?.b) || 0;
          await actor.update({ 'system.combat.hp': maxBl });
        } catch (e) { console.error('Unable to heal actor', aid, e); }
      }
      try { canvas.tokens.releaseAll(); } catch(e) {}
      ui.notifications.info('Points de Blessure remis au maximum pour tous les acteurs');
    });
  }
}
