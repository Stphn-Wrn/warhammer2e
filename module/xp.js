async function applyXpToActor(actor, amount, reason) {
  const sys = actor.system || {};
  sys.xp = sys.xp || {};
  const current = Number(sys.xp.total) || 0;
  const next = current + amount;
  const history = Array.isArray(sys.xp.history) ? sys.xp.history.slice() : [];
  history.push({
    id: Date.now(),
    by: game.user.id,
    amount,
    action: amount > 0 ? 'add' : 'remove',
    previous: current,
    next,
    reason,
    date: new Date().toISOString()
  });
  await actor.update({ 'system.xp.total': next, 'system.xp.history': history });
  return next;
}

export async function openGrantXpDialog(sheet) {
  const actor = sheet.actor;
  if (!game.user.isGM) return ui.notifications.warn('Seul le MJ peut attribuer des PX');

  const content = `
    <form>
      <div class="form-group">
        <label>Montant de PX (positif pour donner, négatif pour retirer)</label>
        <input type="number" id="xp-amount" name="xp-amount" value="0" />
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
          if (amount === 0) return ui.notifications.warn('Entrez un montant différent de 0');

          const verb = amount > 0 ? 'a attribué' : 'a retiré';
          const display = Math.abs(amount);

          if (toAll) {
            const includeNpcs = !!dlgHtml.find('#xp-include-npcs').prop('checked');
            let targets = game.actors.filter(a => a.type === 'character');
            if (!includeNpcs) targets = targets.filter(a => a.hasPlayerOwner || (a.ownership && Object.values(a.ownership).some(v => v >= 1)));
            const results = [];
            for (const a of targets) {
              try {
                await applyXpToActor(a, amount, reason);
                results.push({ actor: a.name, success: true });
                const openSheet = ui.windows.find(w => w.actor && w.actor.id === a.id);
                if (openSheet) try { openSheet.render(false); } catch (e) {}
              } catch (err) {
                console.error('Unable to award XP to', a.name, err);
                results.push({ actor: a.name, success: false, error: err.message });
              }
            }
            if (announce) {
              ChatMessage.create({
                user: game.user.id,
                content: `<div class="xp-award"><strong>${game.user.name}</strong> ${verb} <strong>${display} PX</strong> à <strong>${results.filter(r => r.success).length}</strong> personnages${reason ? ` &ndash; ${reason}` : ''}.</div>`
              });
            }
            try { await _recordXpJournal({ by: game.user, amount, reason, recipients: results.map(r => r.actor) }); } catch (e) { console.warn('Warhammer2e | Unable to record XP in journal', e); }
            ui.notifications.info(`${amount > 0 ? 'PX attribués' : 'PX retirés'} à ${results.length} personnages (${results.filter(r => r.success).length} réussites)`);
            return;
          }

          try {
            await applyXpToActor(actor, amount, reason);
            try { sheet.render(false); } catch (e) {}
            if (announce) {
              ChatMessage.create({
                user: game.user.id,
                speaker: ChatMessage.getSpeaker({ actor }),
                content: `<div class="xp-award"><strong>${game.user.name}</strong> ${verb} <strong>${display} PX</strong> à <strong>${actor.name}</strong>${reason ? ` &ndash; ${reason}` : ''}.</div>`
              });
            }
            try { await _recordXpJournal({ by: game.user, amount, reason, recipients: [actor.name] }); } catch (e) { console.warn('Warhammer2e | Unable to record XP in journal', e); }
          } catch (err) {
            console.error('Unable to award XP', err);
            ui.notifications.error("Impossible d'attribuer les PX.");
          }
        }
      },
      cancel: { label: 'Annuler' }
    },
    default: 'grant'
  }).render(true);
}

async function _recordXpJournal({ by, amount, reason, recipients }) {
  const title = 'XP Log';
  const when = new Date().toLocaleString();
  const gmName = by?.name || 'GM';
  const recList = Array.isArray(recipients) ? recipients.join(', ') : (recipients || 'N/A');
  const verb = amount > 0 ? 'a attribué' : 'a retiré';
  const display = Math.abs(amount);
  const entryLine = `<p><strong>${when}</strong> — <em>${gmName}</em> ${verb} <strong>${display} PX</strong> à <strong>${recList}</strong>${reason ? ` &ndash; ${reason}` : ''}</p>`;

  try {
    const je = (game.journal?.getName ? game.journal.getName(title) : null)
      || Array.from(game.journal || []).find(j => j.name === title)
      || game.journal?.find?.(j => j.name === title)
      || null;

    if (je) {
      try {
        if (je.createEmbeddedDocuments) {
          await je.createEmbeddedDocuments('JournalEntryPage', [{ name: `XP ${when}`, type: 'text', text: { content: entryLine } }]);
          return true;
        }
      } catch (e) {
        console.warn('Warhammer2e | _recordXpJournal createEmbeddedDocuments failed, will fallback', e);
      }
      try {
        const oldTop = je.data?.content || je.data?.text?.content || '';
        await (je.update?.({ content: oldTop + entryLine }) || je.update({ content: oldTop + entryLine }));
        return true;
      } catch (e) {
        console.warn('Warhammer2e | _recordXpJournal top-level update failed', e);
      }
      return false;
    }

    if (typeof JournalEntry.create === 'function') {
      try {
        await JournalEntry.create({ name: title, pages: [{ name: 'Log', type: 'text', text: { content: entryLine } }] });
        return true;
      } catch (e) {
        console.warn('Warhammer2e | _recordXpJournal create with pages failed, will fallback', e);
        await JournalEntry.create({ name: title, content: entryLine });
        return true;
      }
    }
  } catch (err) {
    console.warn('Warhammer2e | _recordXpJournal error', err);
  }
  return false;
}
