export function wireTalentHandlers(sheet, html) {
  // ── Talents ────────────────────────────────────────────────────────────────

  html.find('.talent-add').on('click', async ev => {
    ev.preventDefault();
    try {
      await sheet._addTalent();
      ui.notifications.info('Nouveau talent ajouté');
    } catch (err) { console.error(err); ui.notifications.error("Erreur lors de l'ajout du talent."); }
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
          const rows     = $btn.closest('.section').find('table.skills-table tbody tr').toArray();
          const talents  = rows.filter(r => r !== $tr[0]).map(r => {
            const $r = $(r);
            const obj = { name: $r.find("input[name$='.name']").val() || '', description: $r.find("input[name$='.description']").val() || '' };
            const id  = $r.find("input[name$='.id']").val();
            if (id) obj.id = id;
            return obj;
          });
          await sheet.actor.update({ 'system.talents': talents });
          ui.notifications.info('Talent supprimé');
        } catch (err) { console.error(err); ui.notifications.error('Erreur lors de la suppression du talent'); }
      },
      no: () => {}, defaultYes: false
    });
  });

  // ── Règles spéciales ───────────────────────────────────────────────────────

  html.find('.regles-spe-add').on('click', async ev => {
    ev.preventDefault();
    try {
      await sheet._addRegle();
      ui.notifications.info('Nouvelle ligne ajoutée');
    } catch (err) { console.error(err); ui.notifications.error("Erreur lors de l'ajout de la règle."); }
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
          const rows   = sheet.element.find('.regle-table tbody tr').toArray();
          const regles = rows.filter(r => r !== $tr[0]).map(r => {
            const $r = $(r);
            const obj = { name: $r.find("input[name$='.name']").val() || '', description: $r.find("input[name$='.description']").val() || '' };
            const id  = $r.find("input[name$='.id']").val();
            if (id) obj.id = id;
            return obj;
          });
          await sheet.actor.update({ 'system.regles': regles });
          ui.notifications.info('Règle supprimée');
        } catch (err) { console.error(err); ui.notifications.error('Erreur lors de la suppression de la règle'); }
      },
      no: () => {}, defaultYes: false
    });
  });
}
