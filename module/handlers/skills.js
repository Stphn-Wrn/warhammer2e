const CONNAISSANCE_LABELS = {
  generale:   'Connaissance Générale',
  academique: 'Connaissance Académique',
  artistique: 'Expression Artistique',
  metier:     'Métier'
};

const CONNAISSANCE_CARA_LABELS = {
  cc: 'CC', ct: 'CT', force: 'FOR', endurance: 'END',
  agilite: 'AGI', intelligence: 'INT', forceMentale: 'FM', sociabilite: 'SOC'
};

const ALLOWED_CARA       = Object.keys(CONNAISSANCE_CARA_LABELS);
const SPECIAL_CONN_TYPES = new Set(['artistique', 'metier']);

export function wireSkillHandlers(sheet, html) {
  const getCurrentStats  = () => sheet.actor.system?.principal?.actuel || {};
  const getStatValue     = key => Number(getCurrentStats()[key]) || 0;
  const isSpecialType    = type => SPECIAL_CONN_TYPES.has((type || '').toString());

  // ── Connaissances row state ────────────────────────────────────────────────

  const updateConnRowState = $row => {
    const cara  = ($row.find("select[name$='.cara']").val() || 'intelligence').toString();
    const stat  = getStatValue(ALLOWED_CARA.includes(cara) ? cara : 'intelligence');
    const tRaw  = ($row.find("input[name$='.talents']").val() || '0').replace(/,/g, '.');
    const dRaw  = ($row.find("input[name$='.divers']").val()  || '0').replace(/,/g, '.');
    const total = (Number(stat) || 0) + (Number(tRaw) || 0) + (Number(dRaw) || 0);
    $row.find('.connaissance-target').val(total);
  };

  const bindConnRow = $row => {
    const $type = $row.find("select[name$='.type']");
    const $cara = $row.find("select[name$='.cara']");
    $type.off('.conn').on('change.conn', () => updateConnRowState($row));
    $cara.off('.conn').on('change.conn', () => {
      if (!isSpecialType(($type.val() || '').toString())) $cara.val('intelligence');
      updateConnRowState($row);
    });
    $row.find('.connaissance-talents, .connaissance-divers').off('.conn').on('change.conn', () => updateConnRowState($row));
    updateConnRowState($row);
  };

  html.find('.knowledge-table tbody tr').each((_, tr) => bindConnRow($(tr)));

  const handleConnRoll = ev => {
    ev.preventDefault();
    const $row     = $(ev.currentTarget).closest('tr');
    updateConnRowState($row);
    const rawName  = ($row.find("input[name$='.name']").val() || '').toString().trim();
    const type     = ($row.find("select[name$='.type']").val() || 'generale').toString().toLowerCase();
    const cara     = ($row.find("select[name$='.cara']").val() || 'intelligence').toString();
    const stat     = getStatValue(cara);
    const typeLabel= CONNAISSANCE_LABELS[type] || 'Connaissance';
    const caraLabel= CONNAISSANCE_CARA_LABELS[cara] || '';
    const skillName= `${typeLabel}${rawName ? ` : ${rawName}` : ''}${caraLabel ? ` (${caraLabel})` : ''}`;
    sheet._showSkillRollDialog(skillName, stat);
  };

  html.find('.connaissance-roll').on('click', handleConnRoll);

  html.find('.connaissance-add').on('click', ev => {
    ev.preventDefault();
    const tbody    = sheet.element.find('.knowledge-table tbody');
    if (!tbody.length) { ui.notifications.error('Section Connaissances introuvable.'); return; }
    const nextIdx  = Math.max(0, tbody.find('tr').length);
    const intValue = getStatValue('intelligence');
    const $row = $(`
      <tr>
        <td><input type="hidden" name="system.connaissances.${nextIdx}.id" value=""><input type="text" name="system.connaissances.${nextIdx}.name" value="" placeholder="Nom de la connaissance"></td>
        <td><select name="system.connaissances.${nextIdx}.type" class="connaissance-type">
          <option value="generale" selected>Générale</option>
          <option value="academique">Académique</option>
          <option value="artistique">Expr. Artistique</option>
          <option value="metier">Métier</option>
        </select></td>
        <td><select name="system.connaissances.${nextIdx}.cara" class="connaissance-cara">
          <option value="cc">CC</option><option value="ct">CT</option><option value="force">FOR</option>
          <option value="endurance">END</option><option value="agilite">AGI</option>
          <option value="intelligence" selected>INT</option><option value="forceMentale">FM</option><option value="sociabilite">SOC</option>
        </select></td>
        <td><input type="number" name="system.connaissances.${nextIdx}.talents" class="connaissance-talents" value="0"></td>
        <td><input type="number" name="system.connaissances.${nextIdx}.divers" class="connaissance-divers" value="0"></td>
        <td><input type="number" name="system.connaissances.${nextIdx}.targetValue" class="connaissance-target" value="${intValue}" readonly></td>
        <td><button type="button" class="connaissance-roll button">🎲</button></td>
        <td><button type="button" class="connaissance-delete">🗑</button></td>
      </tr>`);
    tbody.append($row);
    $row.find('.connaissance-roll').on('click', handleConnRoll);
    $row.find('.connaissance-delete').on('click', ev2 => { ev2.preventDefault(); $row.remove(); });
    bindConnRow($row);
    setTimeout(() => { try { $row[0].scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) {} }, 50);
    ui.notifications.info('Nouvelle connaissance ajoutée');
  });

  html.find('.connaissance-delete').on('click', ev => {
    ev.preventDefault();
    const $btn  = $(ev.currentTarget);
    const $tr   = $btn.closest('tr');
    const idVal = $tr.find("input[name$='.id']").val();
    if (!idVal) return $tr.remove();
    const name  = $tr.find("input[name$='.name']").val() || 'cette connaissance';

    Dialog.confirm({
      title: 'Supprimer la connaissance',
      content: `<p>Êtes-vous sûr de vouloir supprimer <strong>${name}</strong> ?</p>`,
      yes: async () => {
        try {
          const rows = sheet.element.find('.knowledge-table tbody tr').toArray();
          const list = rows.filter(r => r !== $tr[0]).map(r => {
            const $r    = $(r);
            const id    = $r.find("input[name$='.id']").val();
            const rname = ($r.find("input[name$='.name']").val() || '').toString();
            const type  = ($r.find("select[name$='.type']").val() || 'generale').toString().toLowerCase();
            const cara  = ($r.find("select[name$='.cara']").val() || 'intelligence').toString();
            const t     = Number($r.find("input[name$='.talents']").val() || 0) || 0;
            const d     = Number($r.find("input[name$='.divers']").val()  || 0) || 0;
            const stat  = getStatValue(ALLOWED_CARA.includes(cara) ? cara : 'intelligence');
            const obj   = { name: rname, type: CONNAISSANCE_LABELS[type] ? type : 'generale', cara: ALLOWED_CARA.includes(cara) ? cara : 'intelligence', talents: t, divers: d, targetValue: Number($r.find("input[name$='.targetValue']").val()) || (stat + t + d) };
            if (id) obj.id = id;
            return obj;
          });
          await sheet.actor.update({ 'system.connaissances': list });
          ui.notifications.info('Connaissance supprimée');
        } catch (err) { console.error(err); ui.notifications.error('Erreur lors de la suppression'); }
      },
      no: () => {}, defaultYes: false
    });
  });

  // ── Base skill changes ─────────────────────────────────────────────────────

  html.find("input[name*='skills.base'][name*='niveau'], input[name*='skills.base'][name*='talents'], input[name*='skills.base'][name*='divers']")
    .on('change', ev => {
      const input    = ev.currentTarget;
      sheet.actor.update({ [input.name]: parseInt(input.value) || 0 });
    });

  html.find("input[name*='skills.base'][name*='avance']").on('change', ev => {
    sheet.actor.update({ [ev.currentTarget.name]: ev.currentTarget.checked });
  });

  html.find("select[name*='skills.base'][name*='cara']").on('change', ev => {
    sheet.actor.update({ [ev.currentTarget.name]: ev.currentTarget.value });
  });

  // ── Skill roll buttons ─────────────────────────────────────────────────────

  const BASE_CARAC_MAP = {
    soinsAnimaux: 'intelligence', charisme: 'sociabilite', commandement: 'sociabilite',
    resistancePoison: 'endurance', deguisement: 'sociabilite', conduiteAttelage: 'agilite',
    dissimulation: 'agilite', evaluation: 'intelligence', jeu: 'intelligence',
    commerage: 'sociabilite', marchandage: 'sociabilite', survie: 'intelligence',
    perception: 'intelligence', equitation: 'agilite', canotage: 'force',
    escalade: 'force', fouille: 'intelligence', deplacementSilencieux: 'agilite', natation: 'force'
  };

  html.find('.skill-roll').on('click', ev => {
    ev.preventDefault();
    const btn       = ev.currentTarget;
    const skillName = btn.dataset.skill;
    if (!isNaN(skillName)) { sheet._handleAdvancedSkillRoll(parseInt(skillName)); return; }

    const skillData = sheet.actor.system.skills?.base?.[skillName];
    if (!skillData) return ui.notifications.warn('Compétence non trouvée');

    const niveau    = Number(skillData.niveau)  || 0;
    const talents   = Number(skillData.talents) || 0;
    const divers    = Number(skillData.divers)  || 0;
    const avance    = skillData.avance || false;
    const actuel    = sheet.actor.system.principal?.actuel || {};

    let caraValue = 0;
    if (skillName === 'intimidation') {
      const choice = skillData.cara || 'F';
      caraValue = (choice === 'Soc') ? (actuel.sociabilite || 0) : (actuel.force || 0);
    } else {
      const caraKey = BASE_CARAC_MAP[skillName];
      caraValue = caraKey ? (actuel[caraKey] || 0) : 0;
    }

    const base  = avance ? caraValue : Math.floor(caraValue / 2);
    const total = niveau + talents + divers + base;
    sheet._showSkillRollDialog(skillName, total);
  });

  // ── Advanced skill delete ──────────────────────────────────────────────────

  html.find('table.skills-table .skill-delete').on('click', ev => {
    ev.preventDefault(); ev.stopPropagation();
    const id     = ev.currentTarget.dataset.skillId;
    const skills = Array.isArray(sheet.actor.system.skills?.advanced) ? sheet.actor.system.skills.advanced.slice() : [];
    const idx    = skills.findIndex(s => String(s.id) === String(id));
    if (idx < 0) return ui.notifications.warn('Compétence non trouvée');
    Dialog.confirm({
      title: 'Supprimer la compétence',
      content: `<p>Êtes-vous sûr de vouloir supprimer <strong>${skills[idx]?.label || 'cette compétence'}</strong> ?</p>`,
      yes: () => { skills.splice(idx, 1); sheet.actor.update({ 'system.skills.advanced': skills }); },
      no: () => {}, defaultYes: false
    });
  });
}
