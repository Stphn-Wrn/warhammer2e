import { openSpellCastDialog } from './dialogs.js';

let _spellsCache = null;

function slugify(str) {
  const base = (str ?? '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || '';
}

function escapeHtml(value) {
  return (value ?? '')
    .toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeSpell(spell, sourceKey, index) {
  const data = { ...(spell || {}) };
  const safeSource = (sourceKey || '').toString();
  let id = (data.id ?? '').toString().trim();
  const name = (data.name ?? '').toString().trim();
  if (!id) {
    const base = slugify(name) || `spell-${safeSource || 'generic'}-${index}`;
    id = safeSource ? `${safeSource}-${base}` : base;
  }
  data.id = id;
  data.__source = safeSource || 'generic';
  return data;
}

export async function loadSpells() {
  if (_spellsCache) return _spellsCache;
  try {
    const res = await fetch('systems/warhammer2e/spells.json');
    const raw = await res.json();
    const normalized = {};

    const addList = (key, list, sourceKey) => {
      const arr = Array.isArray(list) ? list : [];
      const sanitized = arr.map((spell, idx) => sanitizeSpell(spell, sourceKey ?? key, idx));
      normalized[key] = sanitized;
      return sanitized;
    };

  const flatCategories = ['commune', 'commune-chaos', 'commune-glace', 'mineure', 'runes', 'rituels'];
  for (const key of flatCategories) addList(key, raw?.[key], key);

    const occultAggregate = [];
    const occultObj = raw?.ecole || {};
    for (const [domain, list] of Object.entries(occultObj)) {
      const sanitized = addList(domain, list, domain);
      occultAggregate.push(...sanitized);
    }
    normalized.occulte = occultAggregate;

    const divineAggregate = [];
    const divineObj = raw?.divin || {};
    for (const [domain, list] of Object.entries(divineObj)) {
      const sanitized = addList(domain, list, domain);
      divineAggregate.push(...sanitized);
    }
    normalized.divin = divineAggregate;

    _spellsCache = normalized;
    return normalized;
  } catch (err) {
    console.error('Warhammer2e | impossible de charger spells.json', err);
    _spellsCache = {};
    return _spellsCache;
  }
}

function sortSpells(spells, ownedMap) {
  const map = ownedMap || {};
  return (spells || []).slice().sort((a, b) => {
    const da = Number(a?.difficulte) || 0;
    const db = Number(b?.difficulte) || 0;
    if (da !== db) return da - db;
    const ao = !!map[a?.id];
    const bo = !!map[b?.id];
    if (ao !== bo) return ao ? -1 : 1;
    const nameA = (a?.name ?? '').toString().toLowerCase();
    const nameB = (b?.name ?? '').toString().toLowerCase();
    return nameA.localeCompare(nameB);
  });
}

function formatCell(value) {
  const str = (value ?? '').toString().trim();
  return str ? escapeHtml(str) : '&mdash;';
}

function formatDescription(value) {
  const str = (value ?? '').toString().trim();
  if (!str) return '<em>Aucune description.</em>';
  return escapeHtml(str).replace(/\n+/g, '<br>');
}

function buildSpellCardHTML(spell, owned, fallbackSource) {
  const source = spell?.__source || fallbackSource || '';
  if (source === 'runes') return buildRuneCardHTML(spell, owned);
  const {
    id,
    name = '',
    difficulte,
    temps,
    duree,
    portee,
    cible,
    soin,
    ingredient,
    description,
    attaques,
    degats
  } = spell || {};
  const launchSource = source;
  return `
    <div class="spell-card" data-spell-id="${escapeHtml(id)}" style="border:1px solid #ccc; border-radius:8px; padding:12px; margin-bottom:12px; background:#f7f5f2;">
      <h3 style="text-align:center; color:#6b4b1a; margin:4px 0 8px">${escapeHtml(name)}</h3>
      <div style="display:flex; align-items:stretch; gap:12px">
        <div style="flex:1">
          <table style="width:100%; border-collapse:collapse; text-align:center;">
            <tr><th>Difficulté</th><th>Temps d'incantation</th><th>Durée</th><th>Portée</th><th>Cible/Zone</th><th>Soin</th></tr>
            <tr>
              <td style="padding:8px">${formatCell(difficulte)}</td>
              <td style="padding:8px">${formatCell(temps)}</td>
              <td style="padding:8px">${formatCell(duree)}</td>
              <td style="padding:8px">${formatCell(portee)}</td>
              <td style="padding:8px">${formatCell(cible)}</td>
              <td style="padding:8px">${formatCell(soin)}</td>
            </tr>
          </table>
          <div style="display:flex; gap:12px; align-items:flex-start; margin-top:8px">
            <div style="width:160px; text-align:center">
              <div style="font-size:12px; color:#555">Ingrédient</div>
              <div style="font-weight:600; padding:8px 0">${formatCell(ingredient)}</div>
            </div>
            <div style="flex:1; text-align:center">
              <div style="height:1px; background:#ddd; margin:8px 0"></div>
              <div style="text-align:left;">${formatDescription(description)}</div>
            </div>
            <div style="width:180px; text-align:center">
              <div style="margin-bottom:8px">Attaques<br><div style="background:#fff; padding:6px; border-radius:4px">${formatCell(attaques)}</div></div>
              <div>Dégâts<br><div style="background:#fff; padding:6px; border-radius:4px">${formatCell(degats)}</div></div>
            </div>
          </div>
        </div>
        <div style="width:120px; display:flex; flex-direction:column; gap:8px; align-items:center;">
          <button type="button" class="spell-launch" data-spell-id="${escapeHtml(id)}" data-source="${escapeHtml(launchSource)}" style="background:#b7863a; color:#fff; border:none; padding:8px 12px; border-radius:6px;">🎲 Lancer</button>
          <label style="font-size:12px"><input type="checkbox" class="spell-owned" data-spell-id="${escapeHtml(id)}" ${owned ? 'checked' : ''}> Possédé</label>
        </div>
      </div>
    </div>
  `;
}

function buildRuneCardHTML(spell, owned) {
  const {
    id,
    name = '',
    difficulte,
    activation,
    type,
    ['description-permanente']: descPermanent,
    ['description-temporaire']: descTemporary
  } = spell || {};

  return `
    <div class="spell-card rune-card" data-spell-id="${escapeHtml(id)}" style="border:1px solid #ccc; border-radius:8px; padding:12px; margin-bottom:12px; background:#f1f4f7;">
      <h3 style="text-align:center; color:#1a4b6b; margin:4px 0 12px">${escapeHtml(name)}</h3>
      <div style="display:flex; gap:16px; align-items:flex-start;">
        <div style="flex:1; display:grid; grid-template-columns:repeat(auto-fit, minmax(160px,1fr)); gap:12px;">
          <div style="background:#fff; border-radius:6px; padding:10px; text-align:center;">
            <div style="font-size:12px; color:#4a4a4a; text-transform:uppercase; letter-spacing:0.5px;">Difficulté</div>
            <div style="font-weight:600; font-size:18px; margin-top:4px;">${formatCell(difficulte)}</div>
          </div>
          <div style="background:#fff; border-radius:6px; padding:10px; text-align:center;">
            <div style="font-size:12px; color:#4a4a4a; text-transform:uppercase; letter-spacing:0.5px;">Activation</div>
            <div style="font-weight:600; font-size:18px; margin-top:4px;">${formatCell(activation)}</div>
          </div>
          <div style="background:#fff; border-radius:6px; padding:10px; text-align:center;">
            <div style="font-size:12px; color:#4a4a4a; text-transform:uppercase; letter-spacing:0.5px;">Type</div>
            <div style="font-weight:600; font-size:18px; margin-top:4px;">${formatCell(type)}</div>
          </div>
        </div>
        <div style="width:160px; display:flex; flex-direction:column; gap:8px; justify-content:center; align-items:center;">
          <button type="button" class="rune-write" data-spell-id="${escapeHtml(id)}" data-difficulte="${escapeHtml(difficulte)}" style="background:#1a4b6b; color:#fff; border:none; padding:8px 14px; border-radius:6px;">✍️ Écriture</button>
          <label style="font-size:12px"><input type="checkbox" class="spell-owned" data-spell-id="${escapeHtml(id)}" ${owned ? 'checked' : ''}> Possédé</label>
        </div>
      </div>
      <div style="margin-top:16px; display:grid; gap:12px;">
        <div style="background:#fff; border-radius:6px; padding:12px;">
          <div style="font-weight:600; color:#1a4b6b; margin-bottom:6px;">Version permanente</div>
          <div>${formatDescription(descPermanent)}</div>
        </div>
        <div style="background:#fff; border-radius:6px; padding:12px;">
          <div style="font-weight:600; color:#1a4b6b; margin-bottom:6px;">Version temporaire</div>
          <div>${formatDescription(descTemporary)}</div>
        </div>
      </div>
    </div>
  `;
}

function bindSpellCardEvents(sheet, container) {
  container.find('.spell-launch').off('.spells').on('click.spells', async ev => {
    ev.preventDefault();
    const id = ev.currentTarget.dataset.spellId;
    const sourceKey = ev.currentTarget.dataset.source || '';
    if (!sourceKey) {
      ui.notifications.warn('Source du sort inconnue');
      return;
    }
    try {
      const spellsData = await loadSpells();
      const list = Array.isArray(spellsData[sourceKey]) ? spellsData[sourceKey] : [];
      const spell = list.find(s => s.id === id);
      if (!spell) {
        ui.notifications.warn('Sort introuvable');
        return;
      }
      openSpellCastDialog(sheet.actor, spell);
    } catch (err) {
      console.error('Warhammer2e | impossible de lancer le sort', err);
      ui.notifications.error("Impossible de lancer ce sort");
    }
  });

  container.find('.rune-write').off('.spells').on('click.spells', async ev => {
    ev.preventDefault();
    const id = ev.currentTarget.dataset.spellId;
    const diffRaw = ev.currentTarget.dataset.difficulte;
    const difficulte = Number(diffRaw) || 0;
    const actor = sheet.actor;
    const spellsData = await loadSpells();
    const runes = Array.isArray(spellsData.runes) ? spellsData.runes : [];
    const spell = runes.find(r => r.id === id);
    if (!spell) {
      ui.notifications.warn('Rune introuvable dans les données.');
      return;
    }
    const mag = Number(actor?.system?.principal?.actuel?.magie) || 0;
    if (mag <= 0) {
      ui.notifications.warn("Il vous faut au minimum 1 point de Magie pour écrire une rune.");
      return;
    }
    const roll = await new Roll(`${mag}d10`).evaluate();
    const diceResults = roll?.dice?.[0]?.results?.map(r => r.result) || [];
    const total = roll.total || 0;
    const success = total <= difficulte;
    const flavorLines = [
      `<strong>Écriture de rune :</strong> ${escapeHtml(spell.name || '')}`,
      `Difficulté : ${escapeHtml(String(difficulte))}`,
      `Magie (dés) : ${escapeHtml(String(mag))}d10`,
      `Résultats : ${escapeHtml(diceResults.join(', ') || '-')}`,
      `Total : ${escapeHtml(String(total))}`,
      success ? '<span style="color:#1a7f3c; font-weight:600">Réussite</span>' : '<span style="color:#a32020; font-weight:600">Échec</span>'
    ];
    roll.toMessage({
      flavor: `<div style="text-align:left; line-height:1.4">${flavorLines.join('<br>')}</div>`,
      speaker: ChatMessage.getSpeaker({ actor })
    });
  });

  container.find('.spell-owned').off('.spells').on('change.spells', async ev => {
    try { ev.preventDefault(); ev.stopImmediatePropagation(); } catch (e) {}
    const id = ev.currentTarget.dataset.spellId;
    const checked = !!ev.currentTarget.checked;
    try { sheet._suppressNextRender = true; } catch (e) {}
    try {
      await sheet.actor.update({ [`system.spellsOwned.${id}`]: checked }, { render: false });
      const view = container.data('spellsView');
      if (view === 'owned') await renderOwnedSpells(sheet);
    } catch (err) {
      console.error("Warhammer2e | impossible de sauvegarder l'état 'Possédé' du sort", err);
      ui.notifications.error("Impossible de sauvegarder l'état 'Possédé' du sort");
    }
  });
}

export async function renderSpellsList(sheet, cat) {
  const data = await loadSpells();
  const container = sheet.element.find('.spells-list');
  container.empty().show().data('spellsView', 'category');
  const raw = Array.isArray(data[cat]) ? data[cat] : [];
  if (!raw.length) {
    container.html('<div>Aucun sort trouvé pour cette catégorie.</div>');
    return;
  }
  const ownedMap = sheet.actor.system?.spellsOwned || {};
  const html = sortSpells(raw, ownedMap).map(spell => buildSpellCardHTML(spell, !!ownedMap[spell.id], cat)).join('');
  container.html(html);
  bindSpellCardEvents(sheet, container);
}

export async function renderSpellsBySchool(sheet, schoolKey) {
  const effectiveKey = !schoolKey || schoolKey === 'nothing' ? '' : schoolKey;
  const data = await loadSpells();
  const container = sheet.element.find('.spells-list');
  container.empty().show().data('spellsView', 'school');
  if (!effectiveKey) {
    container.html('<div>Sélectionnez un domaine pour afficher ses sorts.</div>');
    return;
  }
  const raw = Array.isArray(data[effectiveKey]) ? data[effectiveKey] : [];
  if (!raw.length) {
    container.html('<div>Aucun sort trouvé pour ce domaine.</div>');
    return;
  }
  const ownedMap = sheet.actor.system?.spellsOwned || {};
  const html = sortSpells(raw, ownedMap).map(spell => buildSpellCardHTML(spell, !!ownedMap[spell.id], effectiveKey)).join('');
  container.html(html);
  bindSpellCardEvents(sheet, container);
}

export async function renderOwnedSpells(sheet) {
  const data = await loadSpells();
  const container = sheet.element.find('.spells-list');
  container.empty().show().data('spellsView', 'owned');
  const ownedMap = sheet.actor.system?.spellsOwned || {};
  const ownedIds = Object.entries(ownedMap).filter(([, value]) => !!value).map(([id]) => id);
  if (!ownedIds.length) {
    container.html('<div>Aucun sort possédé pour le moment. Cochez la case “Possédé” sur un sort pour l’ajouter ici.</div>');
    return;
  }

  const sections = [];

  const pushSimpleSection = (label, key) => {
    const spells = (data[key] || []).filter(spell => ownedMap[spell.id]);
    if (!spells.length) return;
    const cards = sortSpells(spells, ownedMap).map(spell => buildSpellCardHTML(spell, true, spell.__source)).join('');
    sections.push(`<div class="owned-spell-group"><h3 class="owned-spell-title">${escapeHtml(label)}</h3>${cards}</div>`);
  };

  pushSimpleSection('Magie commune', 'commune');
  pushSimpleSection('Magie commune (Chaos)', 'commune-chaos');
  pushSimpleSection('Magie commune (Glace)', 'commune-glace');
  pushSimpleSection('Magie mineure', 'mineure');

  const occultDomains = [
    { key: 'bete', label: 'Domaine de la Bête' },
    { key: 'mort', label: 'Domaine de la Mort' },
    { key: 'feu', label: 'Domaine du Feu' },
    { key: 'cieux', label: 'Domaine des Cieux' },
    { key: 'vie', label: 'Domaine de la Vie' },
    { key: 'lumiere', label: 'Domaine de la Lumière' },
    { key: 'metal', label: 'Domaine du Métal' },
    { key: 'ombres', label: 'Domaine des Ombres' },
    { key: 'glace', label: 'Domaine de Glace' },
    { key: 'autre', label: 'Autres domaines occultes' }
  ];
  const occultSections = [];
  for (const domain of occultDomains) {
    const spells = (data[domain.key] || []).filter(spell => ownedMap[spell.id]);
    if (!spells.length) continue;
    const cards = sortSpells(spells, ownedMap).map(spell => buildSpellCardHTML(spell, true, spell.__source)).join('');
    occultSections.push(`<div class="owned-spell-subgroup"><h4>${escapeHtml(domain.label)}</h4>${cards}</div>`);
  }
  if (occultSections.length) {
    sections.push(`<div class="owned-spell-group"><h3 class="owned-spell-title">Sorts occultes</h3>${occultSections.join('')}</div>`);
  }

  const divineDomains = [
    { key: 'manann', label: 'Domaine de Manann' },
    { key: 'morr', label: 'Domaine de Morr' },
    { key: 'myrmidia', label: 'Domaine de Myrmidia' },
    { key: 'shallya', label: 'Domaine de Shallya' },
    { key: 'sigmar', label: 'Domaine de Sigmar' },
    { key: 'taal', label: 'Domaine de Taal & Rhya' },
    { key: 'ulric', label: 'Domaine d’Ulric' },
    { key: 'verena', label: 'Domaine de Verena' },
    { key: 'skaven-peste', label: 'Domaine de la Peste (Skaven)' },
    { key: 'skaven-ruse', label: 'Domaine de la Ruse (Skaven)' },
    { key: 'skaven-warp', label: 'Domaine du Warp (Skaven)' },
    { key: 'necromancie', label: 'Domaine de la Nécromancie' },
    { key: 'nurgle', label: 'Domaine de Nurgle' },
    { key: 'slaanesh', label: 'Domaine de Slaanesh' },
    { key: 'tzeentch', label: 'Domaine de Tzeentch' },
    { key: 'chaos', label: 'Domaine du Chaos' },
    { key: 'autre', label: 'Autres domaines divins' }
  ];
  const divineSections = [];
  for (const domain of divineDomains) {
    const spells = (data[domain.key] || []).filter(spell => ownedMap[spell.id]);
    if (!spells.length) continue;
    const cards = sortSpells(spells, ownedMap).map(spell => buildSpellCardHTML(spell, true, spell.__source)).join('');
    divineSections.push(`<div class="owned-spell-subgroup"><h4>${escapeHtml(domain.label)}</h4>${cards}</div>`);
  }
  if (divineSections.length) {
    sections.push(`<div class="owned-spell-group"><h3 class="owned-spell-title">Sorts divins</h3>${divineSections.join('')}</div>`);
  }

  pushSimpleSection('Runes', 'runes');
  pushSimpleSection('Rituels', 'rituels');

  if (!sections.length) {
    container.html('<div>Aucun sort possédé trouvé dans les catégories connues.</div>');
    return;
  }

  container.html(sections.join(''));
  bindSpellCardEvents(sheet, container);
}
