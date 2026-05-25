export function wireTalentHandlers(sheet, html) {
  // ── Talents ────────────────────────────────────────────────────────────────

  html.find('.talent-add').on('click', ev => {
    ev.preventDefault();
    try {
      const $btn  = $(ev.currentTarget);
      const tbody = $btn.closest('.section').find('table.skills-table tbody').first();
      const idx   = Math.max(0, tbody.find('tr').length);
      const $row  = $(`
        <tr>
          <td><input type="hidden" name="system.talents.${idx}.id" value=""><input type="text" name="system.talents.${idx}.name" value="" placeholder="Nom du talent"></td>
          <td><input type="text" name="system.talents.${idx}.description" value="" placeholder="Description"></td>
          <td><button type="button" class="talent-delete">🗑</button></td>
        </tr>`);
      tbody.append($row);
      $row.find('.talent-delete').on('click', ev2 => { ev2.preventDefault(); $row.remove(); });
      setTimeout(() => { try { $row[0].scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) {} }, 50);
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

  html.find('.regles-spe-add').on('click', ev => {
    ev.preventDefault();
    try {
      const tbody = sheet.element.find('.regle-table tbody');
      const idx   = Math.max(0, tbody.find('tr').length);
      const $row  = $(`
        <tr>
          <td><input type="hidden" name="system.regles.${idx}.id" value=""><input type="text" name="system.regles.${idx}.name" value="" placeholder="Nom de la règle spéciale"></td>
          <td><input type="text" name="system.regles.${idx}.description" value="" placeholder="Description"></td>
          <td><button type="button" class="regle-delete">🗑</button></td>
        </tr>`);
      tbody.append($row);
      $row.find('.regle-delete').on('click', ev2 => { ev2.preventDefault(); $row.remove(); });
      setTimeout(() => { try { $row[0].scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) {} }, 50);
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
