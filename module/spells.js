import { openSpellCastDialog } from './dialogs.js';

// Internal cache for loaded spells
let _spellsCache = null;

export async function loadSpells() {
  if (_spellsCache) return _spellsCache;
  try {
    const res = await fetch('systems/warhammer2e/spells.json');
    const data = await res.json();

    // Normalize into a flat map of lists keyed by school/domain name
    const normalized = {};

    const copyMap = (obj) => {
      if (!obj || typeof obj !== 'object') return;
      for (const [k, v] of Object.entries(obj)) {
        if (Array.isArray(v)) normalized[k] = v;
      }
    };

    for (const [k, v] of Object.entries(data)) {
      if (Array.isArray(v) && v.length && typeof v[0] === 'object' && ('id' in v[0] || 'name' in v[0])) {
        normalized[k] = v;
      }
    }

    if ('ecole' in data) {
      const e = data.ecole;
      if (Array.isArray(e)) {
        for (const part of e) if (part && typeof part === 'object') copyMap(part);
      } else copyMap(e);
    }

    if ('divin' in data) {
      const d = data.divin;
      if (Array.isArray(d)) {
        if (d.length && d.every(it => it && typeof it === 'object' && 'domain' in it)) {
          for (const s of d) {
            const domain = s.domain || 'unknown';
            normalized[domain] ??= [];
            normalized[domain].push(s);
          }
        } else {
          for (const part of d) if (part && typeof part === 'object') copyMap(part);
        }
      } else copyMap(d);
    }

    for (const [k, v] of Object.entries(data)) {
      if (!(k in normalized) && Array.isArray(v)) normalized[k] = v;
    }

    _spellsCache = normalized;
    return normalized;
  } catch (err) {
    console.error('Unable to load spells.json', err);
    _spellsCache = {};
    return _spellsCache;
  }
}

export async function renderSpellsList(sheet, cat) {
  const data = await loadSpells();
  const container = sheet.element.find('.spells-list');
  container.empty().show();
  const rawSpells = data[cat] || [];
  if (!rawSpells.length) {
    container.html('<div>Aucun sort trouvé pour cette catégorie.</div>');
    return;
  }

  const ownedMap = sheet.actor.system?.spellsOwned || {};
  const spells = rawSpells.slice().sort((a, b) => {
    const da = Number(a.difficulte) || 0;
    const db = Number(b.difficulte) || 0;
    if (da !== db) return da - db;
    const ao = !!ownedMap[a.id];
    const bo = !!ownedMap[b.id];
    if (ao !== bo) return ao ? -1 : 1;
    return String(a.name || '').localeCompare(String(b.name || ''));
  });

  const html = [];
  for (const s of spells) {
    const owned = !!(sheet.actor.system?.spellsOwned && sheet.actor.system.spellsOwned[s.id]);
    html.push(`
      <div class="spell-card" data-spell-id="${s.id}" style="border:1px solid #ccc; border-radius:8px; padding:12px; margin-bottom:12px; background:#f7f5f2;">
        <h3 style="text-align:center; color:#6b4b1a; margin:4px 0 8px">${s.name}</h3>
        <div style="display:flex; align-items:stretch; gap:12px">
          <div style="flex:1">
            <table style="width:100%; border-collapse:collapse; text-align:center;">
              <tr><th>Difficulté</th><th>Temps d'\incantation</th><th>Durée</th><th>Portée</th><th>Cible/Zone</th><th>Soin</th></tr>
              <tr>
                <td style="padding:8px">${s.difficulte ?? ''}</td>
                <td style="padding:8px">${s.temps ?? ''}</td>
                <td style="padding:8px">${s.duree ?? ''}</td>
                <td style="padding:8px">${s.portee ?? ''}</td>
                <td style="padding:8px">${s.cible ?? ''}</td>
                <td style="padding:8px">${s.soin ?? ''}</td>
              </tr>
            </table>
            <div style="display:flex; gap:12px; align-items:flex-start; margin-top:8px">
              <div style="width:160px; text-align:center">
                <div style="font-size:12px; color:#555">Ingrédient</div>
                <div style="font-weight:600; padding:8px 0">${s.ingredient ?? ''}</div>
                </div>
              <div style="flex:1; text-align:center">
                <div style="height:1px; background:#ddd; margin:8px 0"></div>
                <div style="text-align:left;">${s.description ?? ''}</div>
              </div>
              <div style="width:180px; text-align:center">
                <div style="margin-bottom:8px">Attaques<br><div style="background:#fff; padding:6px; border-radius:4px">${s.attaques ?? 'None'}</div></div>
                <div>Dégâts<br><div style="background:#fff; padding:6px; border-radius:4px">${s.degats ?? 'None'}</div></div>
              </div>
            </div>
          </div>
          <div style="width:120px; display:flex; flex-direction:column; gap:8px; align-items:center;">
            <button type="button" class="spell-launch" data-spell-id="${s.id}" style="background:#b7863a; color:#fff; border:none; padding:8px 12px; border-radius:6px;">🎲 Lancer</button>
            <label style="font-size:12px"><input type="checkbox" class="spell-owned" data-spell-id="${s.id}" ${owned? 'checked':''}> Possédé</label>
          </div>
        </div>
      </div>
    `);
  }
  container.html(html.join(''));

  container.find('.spell-launch').on('click', ev => {
    const id = ev.currentTarget.dataset.spellId;
    loadSpells().then(spellsData => {
      const spell = (spellsData[cat] || []).find(s => s.id === id);
      if (!spell) return ui.notifications.warn('Sort introuvable');
      // Open dialog with the canonical spell data (no per-card overrides)
      openSpellCastDialog(sheet.actor, spell);
    });
  });

  container.find('.spell-owned').on('change', async ev => {
    try { ev.preventDefault(); ev.stopImmediatePropagation(); } catch(e){}
    const id = ev.currentTarget.dataset.spellId;
    const checked = !!ev.currentTarget.checked;
    try {
      // Ask the sheet to suppress a single automatic render if any framework
      // hook attempts to re-render after the update.
      try { sheet._suppressNextRender = true; } catch(e){}
      // Persist without forcing a sheet re-render
      await sheet.actor.update({ [`system.spellsOwned.${id}`]: checked }, { render: false });
    } catch (err) {
      console.error('Unable to persist spell owned state', err);
    }
  });
}

export async function renderSpellsBySchool(sheet, schoolKey) {
  const data = await loadSpells();
  const container = sheet.element.find('.spells-list');
  container.empty().show();
  if (!schoolKey) {
    container.html('<div>Sélectionnez un domaine pour afficher ses sorts.</div>');
    return;
  }
  const rawSpells = data[schoolKey] || [];
  if (!rawSpells.length) {
    container.html('<div>Aucun sort trouvé pour ce domaine.</div>');
    return;
  }

  const ownedMap = sheet.actor.system?.spellsOwned || {};
  const spells = rawSpells.slice().sort((a, b) => {
    const da = Number(a.difficulte) || 0;
    const db = Number(b.difficulte) || 0;
    if (da !== db) return da - db;
    const ao = !!ownedMap[a.id];
    const bo = !!ownedMap[b.id];
    if (ao !== bo) return ao ? -1 : 1;
    return String(a.name || '').localeCompare(String(b.name || ''));
  });

  const html = [];
  for (const s of spells) {
    const owned = !!(sheet.actor.system?.spellsOwned && sheet.actor.system.spellsOwned[s.id]);
    html.push(`
      <div class="spell-card" data-spell-id="${s.id}" style="border:1px solid #ccc; border-radius:8px; padding:12px; margin-bottom:12px; background:#f7f5f2;">
        <h3 style="text-align:center; color:#6b4b1a; margin:4px 0 8px">${s.name}</h3>
        <div style="display:flex; align-items:stretch; gap:12px">
          <div style="flex:1">
            <table style="width:100%; border-collapse:collapse; text-align:center;">
              <tr><th>Difficulté</th><th>Temps d'\incantation</th><th>Durée</th><th>Portée</th><th>Cible/Zone</th><th>Soin</th></tr>
              <tr>
                <td style="padding:8px">${s.difficulte ?? ''}</td>
                <td style="padding:8px">${s.temps ?? ''}</td>
                <td style="padding:8px">${s.duree ?? ''}</td>
                <td style="padding:8px">${s.portee ?? ''}</td>
                <td style="padding:8px">${s.cible ?? ''}</td>
                <td style="padding:8px">${s.soin ?? ''}</td>
              </tr>
            </table>
            <div style="display:flex; gap:12px; align-items:flex-start; margin-top:8px">
              <div style="width:160px; text-align:center">
                <div style="font-size:12px; color:#555">Ingrédient</div>
                <div style="font-weight:600; padding:8px 0">${s.ingredient ?? ''}</div>
                </div>
              <div style="flex:1; text-align:center">
                <div style="height:1px; background:#ddd; margin:8px 0"></div>
                <div style="text-align:left;">${s.description ?? ''}</div>
              </div>
              <div style="width:180px; text-align:center">
                <div style="margin-bottom:8px">Attaques<br><div style="background:#fff; padding:6px; border-radius:4px">${s.attaques ?? 'None'}</div></div>
                <div>Dégâts<br><div style="background:#fff; padding:6px; border-radius:4px">${s.degats ?? 'None'}</div></div>
              </div>
            </div>
          </div>
          <div style="width:120px; display:flex; flex-direction:column; gap:8px; align-items:center;">
            <button type="button" class="spell-launch" data-spell-id="${s.id}" style="background:#b7863a; color:#fff; border:none; padding:8px 12px; border-radius:6px;">🎲 Lancer</button>
            <label style="font-size:12px"><input type="checkbox" class="spell-owned" data-spell-id="${s.id}" ${owned? 'checked':''}> Possédé</label>
          </div>
        </div>
      </div>
    `);
  }
  container.html(html.join(''));

  container.find('.spell-launch').on('click', ev => {
    const id = ev.currentTarget.dataset.spellId;
    loadSpells().then(spellsData => {
      const spell = (spellsData[schoolKey] || []).find(s => s.id === id);
      if (!spell) return ui.notifications.warn('Sort introuvable');
      // Open dialog with the canonical spell data (no per-card overrides)
      openSpellCastDialog(sheet.actor, spell);
    });
  });

  container.find('.spell-owned').on('change', async ev => {
    try { ev.preventDefault(); ev.stopImmediatePropagation(); } catch(e){}
    const id = ev.currentTarget.dataset.spellId;
    const checked = !!ev.currentTarget.checked;
    try {
      try { sheet._suppressNextRender = true; } catch(e){}
      // Persist without forcing a sheet re-render
      await sheet.actor.update({ [`system.spellsOwned.${id}`]: checked }, { render: false });
    } catch (err) {
      console.error('Unable to persist spell owned state', err);
    }
  });
}
