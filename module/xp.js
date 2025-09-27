// Simple XP awarding dialog for GMs
export async function openGrantXpDialog(sheet) {
  const actor = sheet.actor;
  if (!game.user.isGM) return ui.notifications.warn('Seul le MJ peut attribuer des PX');

  const content = `
    <form>
      <div class="form-group">
        <label>Montant de PX à attribuer</label>
        <input type="number" id="xp-amount" name="xp-amount" value="0" min="0" />
      </div>
      <div class="form-group">
        <label>Raison / description (optionnel)</label>
        <input type="text" id="xp-reason" name="xp-reason" />
      </div>
      <div class="form-group">
        <label><input type="checkbox" id="xp-to-chat" checked /> Annoncer dans le chat</label>
      </div>
      <div class="form-group">
        <label><input type="checkbox" id="xp-to-all" /> Appliquer à tous les personnages joueurs (exclut les PNJ)</label>
      </div>
      <div class="form-group">
        <label><input type="checkbox" id="xp-include-npcs" /> Inclure les PNJ également</label>
      </div>
    </form>
  `;

  new Dialog({
    title: `Attribuer des PX à ${actor.name}`,
    content,
    buttons: {
      grant: {
        icon: '<i class="fas fa-check"></i>',
        label: 'Attribuer',
        callback: async (dlgHtml) => {
          const amount = Number(dlgHtml.find('#xp-amount').val()) || 0;
          const reason = (dlgHtml.find('#xp-reason').val() || '').toString().trim();
          const announce = !!dlgHtml.find('#xp-to-chat').prop('checked');
          const toAll = !!dlgHtml.find('#xp-to-all').prop('checked');
          if (amount <= 0) return ui.notifications.warn('Entrez un montant supérieur à 0');

          if (toAll) {
            // Award to player characters by default (actors of type 'character' that have a player owner)
            const includeNpcs = !!dlgHtml.find('#xp-include-npcs').prop('checked');
            let targets = game.actors.filter(a => a.type === 'character');
            if (!includeNpcs) targets = targets.filter(a => a.hasPlayerOwner === true || a.hasPlayerOwner === undefined ? a.hasPlayerOwner : false);
            // fallback: if hasPlayerOwner is not available, include actors with any assigned players
            targets = targets.filter(a => includeNpcs ? true : a.hasPlayerOwner || (a.ownership && Object.values(a.ownership).some(v=>v>=1)));
            const results = [];
            for (const a of targets) {
              const sys = a.system || {};
              sys.xp = sys.xp || {};
              const current = Number(sys.xp.total) || 0;
              const next = current + amount;
              const history = Array.isArray(sys.xp.history) ? sys.xp.history.slice() : [];
              history.push({ id: Date.now(), by: game.user.id, amount, reason, date: (new Date()).toISOString() });
              try {
                await a.update({ 'system.xp.total': next, 'system.xp.history': history });
                results.push({ actor: a.name, success: true });
                // Re-render any open sheet for this actor
                const openSheet = ui.windows.find(w => w.actor && w.actor.id === a.id);
                if (openSheet) try { openSheet.render(false); } catch (e) {}
              } catch (err) {
                console.error('Unable to award XP to', a.name, err);
                results.push({ actor: a.name, success: false, error: err.message });
              }
            }
            // Announce summary
            if (announce) {
              const successCount = results.filter(r => r.success).length;
              ChatMessage.create({ user: game.user.id, content: `<div class="xp-award"><strong>${game.user.name}</strong> a attribué <strong>${amount} PX</strong> à <strong>${successCount}</strong> personnages${reason ? ` &ndash; ${reason}` : ''}.</div>` });
            }
            ui.notifications.info(`PX attribués à ${results.length} personnages (${results.filter(r=>r.success).length} réussites)`);
            return;
          }

          // Single actor award
          const sys = actor.system || {};
          sys.xp = sys.xp || {};
          const current = Number(sys.xp.total) || 0;
          const next = current + amount;
          const history = Array.isArray(sys.xp.history) ? sys.xp.history.slice() : [];
          history.push({ id: Date.now(), by: game.user.id, amount, reason, date: (new Date()).toISOString() });

          try {
            await actor.update({ 'system.xp.total': next, 'system.xp.history': history });
            try { sheet.render(false); } catch (e) {}
            if (announce) {
              ChatMessage.create({
                user: game.user.id,
                speaker: ChatMessage.getSpeaker({ actor }),
                content: `<div class="xp-award"><strong>${game.user.name}</strong> a attribué <strong>${amount} PX</strong> à <strong>${actor.name}</strong>${reason ? ` &ndash; ${reason}` : ''}.</div>`
              });
            }
          } catch (err) {
            console.error('Unable to award XP', err);
            ui.notifications.error('Impossible d\'attribuer les PX.');
          }
        }
      },
      cancel: { label: 'Annuler' }
    },
    default: 'grant'
  }).render(true);
}
