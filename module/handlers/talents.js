function collectRows($tbody) {
  return $tbody.find('tr').toArray().map(r => {
    const $r  = $(r);
    const obj = { name: $r.find("input[name$='.name']").val() || '', description: $r.find("input[name$='.description']").val() || '' };
    const id  = $r.find("input[name$='.id']").val();
    if (id) obj.id = id;
    return obj;
  });
}

export function wireTalentHandlers(sheet, html) {
  // ── Talents ────────────────────────────────────────────────────────────────

  html.find('.talent-add')
    .on('mousedown', ev => ev.preventDefault())
    .on('click', async ev => {
      ev.preventDefault();
      try {
        await sheet._addTalent();
        ui.notifications.info('Nouveau talent ajouté');
      } catch (err) { console.error(err); ui.notifications.error("Erreur lors de l'ajout du talent."); }
    });

  // Persist edits ourselves: Foundry's per-field auto-submit sends a single
  // dotted path like "system.talents.3.name", which expands into a sparse
  // array and wipes out every other talent. Stop that from happening and
  // rebuild the whole array from the DOM instead.
  html.find("table.skills-table input[name^='system.talents.']").on('change', async ev => {
    ev.stopPropagation();
    try {
      const tbody   = $(ev.currentTarget).closest('table.skills-table tbody');
      const talents = collectRows(tbody);
      await sheet.actor.update({ 'system.talents': talents });
    } catch (err) { console.error(err); ui.notifications.error("Erreur lors de la sauvegarde du talent."); }
  });

  html.find('.talent-delete').on('click', ev => {
    ev.preventDefault();
    const $btn  = $(ev.currentTarget);
    const $tr   = $btn.closest('tr');
    const name  = $tr.find("input[name$='.name']").val() || 'ce talent';
    Dialog.confirm({
      title: 'Supprimer le talent',
      content: `<p>Êtes-vous sûr de vouloir supprimer <strong>${name}</strong> ?</p>`,
      yes: async () => {
        try {
          const tbody   = $btn.closest('.section').find('table.skills-table tbody');
          $tr.remove();
          const talents = collectRows(tbody);
          await sheet.actor.update({ 'system.talents': talents });
          ui.notifications.info('Talent supprimé');
        } catch (err) { console.error(err); ui.notifications.error('Erreur lors de la suppression du talent'); }
      },
      no: () => {}, defaultYes: false
    });
  });

  // ── Règles spéciales ───────────────────────────────────────────────────────

  html.find('.regles-spe-add')
    .on('mousedown', ev => ev.preventDefault())
    .on('click', async ev => {
      ev.preventDefault();
      try {
        await sheet._addRegle();
        ui.notifications.info('Nouvelle ligne ajoutée');
      } catch (err) { console.error(err); ui.notifications.error("Erreur lors de l'ajout de la règle."); }
    });

  html.find("table.regle-table input[name^='system.regles.']").on('change', async ev => {
    ev.stopPropagation();
    try {
      const tbody  = $(ev.currentTarget).closest('table.regle-table tbody');
      const regles = collectRows(tbody);
      await sheet.actor.update({ 'system.regles': regles });
    } catch (err) { console.error(err); ui.notifications.error("Erreur lors de la sauvegarde de la règle."); }
  });

  html.find('.regle-delete').on('click', ev => {
    ev.preventDefault();
    const $btn  = $(ev.currentTarget);
    const $tr   = $btn.closest('tr');
    const name  = $tr.find("input[name$='.name']").val() || 'cette règle';
    Dialog.confirm({
      title: 'Supprimer la règle spéciale',
      content: `<p>Êtes-vous sûr de vouloir supprimer <strong>${name}</strong> ?</p>`,
      yes: async () => {
        try {
          const tbody  = sheet.element.find('.regle-table tbody');
          $tr.remove();
          const regles = collectRows(tbody);
          await sheet.actor.update({ 'system.regles': regles });
          ui.notifications.info('Règle supprimée');
        } catch (err) { console.error(err); ui.notifications.error('Erreur lors de la suppression de la règle'); }
      },
      no: () => {}, defaultYes: false
    });
  });
}
