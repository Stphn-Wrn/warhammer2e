import { INVENTORY_CATEGORY_OPTIONS, INVENTORY_CHILD_TO_PARENT, INVENTORY_DETAIL_OPTIONS, INVENTORY_ICON_MAP, INVENTORY_QUALITY_OPTIONS, WEAPON_PRESETS } from '../inventoryConstants.js';

function buildOptions(options, selected) {
  return options.map(o => `<option value="${o.value}" ${o.value === selected ? 'selected' : ''}>${o.label}</option>`).join('');
}

function buildSubOptions(parentVal, selected) {
  const cat  = INVENTORY_CATEGORY_OPTIONS.find(o => o.value === parentVal);
  const subs = Array.isArray(cat?.children) ? cat.children : [];
  return subs.map(o => `<option value="${o.value}" ${o.value === selected ? 'selected' : ''}>${o.label}</option>`).join('');
}

function buildDetailOptions(subVal, selected) {
  return (INVENTORY_DETAIL_OPTIONS[subVal] || [])
    .map(o => `<option value="${o.value}" ${o.value === selected ? 'selected' : ''}>${o.label}</option>`)
    .join('');
}

function findDetailParent(detailVal) {
  if (!detailVal) return '';
  for (const [parentKey, options] of Object.entries(INVENTORY_DETAIL_OPTIONS)) {
    if (options.some(o => o.value === detailVal)) return parentKey;
  }
  return '';
}

export function wireInventoryHandlers(sheet, html) {
  // Slot click: open picker dialog
  html.find('.inventory-slot').off('click').on('click', async ev => {
    if (ev.currentTarget?.classList?.contains('bag-slot')) return;
    ev.preventDefault();
    const slotIndex = Number(ev.currentTarget.dataset.index) || 0;
    const actor     = sheet.actor;
    if (!actor?.isOwner) { ui.notifications.warn('Vous ne pouvez pas modifier cet inventaire.'); return; }

    const current        = Array.isArray(actor.system?.inventory) ? (actor.system.inventory[slotIndex] || {}) : {};
    const currentNote    = current.note    || '';
    const currentQuality = current.quality || 'ordinaire';

    let initialType    = current.type    || '';
    let initialSubType = current.subType || '';
    let initialDetail  = current.detail  || '';

    if (!initialSubType && INVENTORY_CHILD_TO_PARENT[initialType]) {
      initialSubType = initialType;
      initialType    = INVENTORY_CHILD_TO_PARENT[initialType];
    }
    if (!initialDetail) {
      const inferredParent = findDetailParent(current.subType || '');
      if (inferredParent) {
        initialDetail  = current.subType;
        if (!initialSubType) initialSubType = inferredParent;
        if (!initialType)    initialType    = INVENTORY_CHILD_TO_PARENT[inferredParent] || 'weapon';
      }
    }
    if (!INVENTORY_CATEGORY_OPTIONS.some(o => o.value === initialType)) initialType = '';

    const categoryHtml = buildOptions(INVENTORY_CATEGORY_OPTIONS, initialType);
    const subHtml      = buildSubOptions(initialType, initialSubType);
    const detailHtml   = buildDetailOptions(initialSubType, initialDetail);
    const qualityHtml  = buildOptions(INVENTORY_QUALITY_OPTIONS, currentQuality);
    const initialPresetNote = (!currentNote && WEAPON_PRESETS[initialDetail]?.note) ? WEAPON_PRESETS[initialDetail].note : '';
    const initialNote  = currentNote || initialPresetNote;

    const content = `
      <div class="option-line flexcol" style="gap:12px;align-items:flex-start;padding:12px;border:1px solid #c7b08a;border-radius:12px;background:#f7f4ee;">
        <div class="option-control" style="display:flex;flex-direction:column;gap:6px;width:100%;">
          <label style="font-weight:700;font-size:16px;">Contenu de la case</label>
          <select name="slotType" style="width:100%;">${categoryHtml}</select>
        </div>
        <div class="option-control sub-select-group" style="display:${subHtml ? 'flex' : 'none'};flex-direction:column;gap:6px;width:100%;">
          <label style="font-weight:700;font-size:16px;">Détail</label>
          <select name="slotSubType" style="width:100%;">${subHtml}</select>
        </div>
        <div class="option-control detail-select-group" style="display:${detailHtml ? 'flex' : 'none'};flex-direction:column;gap:6px;width:100%;">
          <label style="font-weight:700;font-size:16px;">Arme</label>
          <select name="slotDetail" style="width:100%;">${detailHtml}</select>
        </div>
        <div class="option-control" style="display:flex;flex-direction:column;gap:6px;width:100%;">
          <label style="font-weight:700;font-size:16px;">Qualité</label>
          <select name="slotQuality" style="width:100%;">${qualityHtml}</select>
        </div>
        <div class="option-control" style="display:flex;flex-direction:column;gap:6px;width:100%;">
          <label style="font-weight:700;font-size:16px;">Note (facultatif)</label>
          <input type="text" name="slotLabel" value="${initialNote || ''}" style="width:100%;" />
        </div>
      </div>`;

    return new Promise(resolve => {
      const dlg = new Dialog({
        title: `Case d'inventaire #${slotIndex + 1}`,
        content,
        buttons: {
          save: {
            label: 'Enregistrer',
            callback: async html => {
              const form        = html[0];
              const typeRaw     = form.querySelector('select[name="slotType"]').value   || '';
              const subSelect   = form.querySelector('select[name="slotSubType"]');
              let   subTypeVal  = subSelect ? (subSelect.value || '') : '';
              const detailSelect= form.querySelector('select[name="slotDetail"]');
              const detailVal   = detailSelect ? (detailSelect.value || '') : '';
              const qualityVal  = (form.querySelector('select[name="slotQuality"]')?.value || 'ordinaire');
              let   typeVal     = typeRaw;
              if (!subTypeVal && INVENTORY_CHILD_TO_PARENT[typeVal]) { subTypeVal = typeVal; typeVal = INVENTORY_CHILD_TO_PARENT[typeVal]; }
              const category    = INVENTORY_CATEGORY_OPTIONS.find(o => o.value === typeVal);
              const child       = category?.children?.find(c => c.value === subTypeVal);
              const detailOpt   = (INVENTORY_DETAIL_OPTIONS[subTypeVal] || []).find(o => o.value === detailVal);
              const selLabel    = detailOpt?.label || child?.label || category?.label || '';
              const noteVal     = (form.querySelector('input[name="slotLabel"]').value || '').trim();
              const iconKey     = detailVal || subTypeVal || typeVal;
              const icon        = INVENTORY_ICON_MAP[iconKey] || detailOpt?.icon || child?.icon || '';
              const inv = Array.isArray(actor.system?.inventory) ? actor.system.inventory.slice() : [];
              while (inv.length <= slotIndex) inv.push({ type: '', subType: '', label: '', icon: '' });
              inv[slotIndex] = { type: typeVal, subType: subTypeVal, detail: detailVal, quality: qualityVal, label: selLabel, note: noteVal, icon };
              await actor.update({ 'system.inventory': inv });
              resolve();
            }
          },
          clear: {
            label: 'Vider',
            callback: async () => {
              const inv = Array.isArray(actor.system?.inventory) ? actor.system.inventory.slice() : [];
              while (inv.length <= slotIndex) inv.push({ type: '', subType: '', label: '', icon: '' });
              inv[slotIndex] = { type: '', subType: '', label: '', note: '', icon: '' };
              await actor.update({ 'system.inventory': inv });
              resolve();
            }
          },
          cancel: { label: 'Annuler', callback: () => resolve() }
        },
        default: 'save',
        render: htmlDlg => {
          const $dlg          = $(htmlDlg);
          const $typeSelect   = $dlg.find('select[name="slotType"]');
          const $subGroup     = $dlg.find('.sub-select-group');
          const $subSelect    = $dlg.find('select[name="slotSubType"]');
          const $detailGroup  = $dlg.find('.detail-select-group');
          const $detailSelect = $dlg.find('select[name="slotDetail"]');
          const $noteInput    = $dlg.find('input[name="slotLabel"]');
          let   lastPreset    = (!currentNote && initialPresetNote) ? initialPresetNote : '';

          $dlg.find('select[name="slotQuality"]').val(currentQuality || 'ordinaire');

          const refreshSub = typeVal => {
            const html = buildSubOptions(typeVal, typeVal === initialType ? initialSubType : '');
            if (!html) { $subSelect.html(''); $subSelect.val(''); $subGroup.hide(); $detailSelect.html(''); $detailSelect.val(''); $detailGroup.hide(); return ''; }
            $subSelect.html(html); $subGroup.show(); return $subSelect.val();
          };
          const refreshDetail = (subVal, def) => {
            const html = buildDetailOptions(subVal, def);
            if (!html) { $detailSelect.html(''); $detailSelect.val(''); $detailGroup.hide(); return ''; }
            $detailSelect.html(html); $detailGroup.show(); return $detailSelect.val() || '';
          };
          const applyPreset = detailVal => {
            const preset = WEAPON_PRESETS[detailVal]?.note || '';
            if (!preset) return;
            const existing = ($noteInput.val() || '').trim();
            if (!existing || (lastPreset && existing === lastPreset)) { $noteInput.val(preset); lastPreset = preset; }
          };

          const initSub    = refreshSub(initialType);
          const initDetail = refreshDetail(initialSubType, (initialSubType === initSub) ? initialDetail : '');
          applyPreset(initDetail || initialDetail);

          $typeSelect.off('change.inv').on('change.inv', ev => {
            const sub = refreshSub(ev.currentTarget.value || '');
            applyPreset(refreshDetail(sub || '', ''));
          });
          $subSelect.off('change.inv').on('change.inv', ev => {
            applyPreset(refreshDetail(ev.currentTarget.value || '', '') || '');
          });
          $detailSelect.off('change.inv').on('change.inv', ev => applyPreset(ev.currentTarget.value || ''));
        }
      });
      dlg.render(true);
    });
  });

  // Drag & Drop reorder
  html.find('.inventory-slot').off('dragstart').on('dragstart', ev => {
    if (ev.currentTarget?.classList?.contains('bag-slot')) return;
    try { ev.stopPropagation(); } catch (e) {}
    const idx = Number(ev.currentTarget?.dataset?.index);
    if (Number.isNaN(idx)) return;
    const dt = ev.originalEvent?.dataTransfer;
    if (!dt) return;
    dt.effectAllowed = 'move';
    dt.setData('text/plain', String(idx));
  });

  html.find('.inventory-slot').off('dragover').on('dragover', ev => {
    if (ev.currentTarget?.classList?.contains('bag-slot')) return;
    try { ev.preventDefault(); ev.stopPropagation(); } catch (e) {}
    const dt = ev.originalEvent?.dataTransfer;
    if (dt) dt.dropEffect = 'move';
  });

  html.find('.inventory-slot').off('drop').on('drop', async ev => {
    if (ev.currentTarget?.classList?.contains('bag-slot')) return;
    try { ev.preventDefault(); ev.stopPropagation(); } catch (e) {}
    const dt      = ev.originalEvent?.dataTransfer;
    const fromIdx = dt ? Number(dt.getData('text/plain')) : NaN;
    const toIdx   = Number(ev.currentTarget?.dataset?.index);
    if (Number.isNaN(fromIdx) || Number.isNaN(toIdx) || fromIdx === toIdx) return;
    const inv = Array.isArray(sheet.actor.system?.inventory) ? sheet.actor.system.inventory.slice() : [];
    const max = Math.max(fromIdx, toIdx);
    while (inv.length <= max) inv.push({ type: '', subType: '', label: '', note: '', icon: '' });
    [inv[fromIdx], inv[toIdx]] = [inv[toIdx], inv[fromIdx]];
    try { await sheet.actor.update({ 'system.inventory': inv }); } catch (e) { console.error('Inventory swap failed', e); }
  });
}
