import { ARMOR_ZONES } from '../constants/armorZones.js';

// ── Advanced Skills ──────────────────────────────────────────────────────────

function extractAdvancedSkillsFromFormData(formData) {
  const map = {};
  for (const k of Object.keys(formData)) {
    const m = k.match(/^system\.skills\.advanced\.(\d+)\.(.+)$/);
    if (!m) continue;
    const [, idx, prop] = m;
    map[idx] ??= {};
    map[idx][prop] = formData[k];
    delete formData[k];
  }
  return Object.keys(map).sort((a, b) => Number(a) - Number(b)).map(i => map[i]);
}

function coerceAdvancedSkillEntry(e) {
  if ('niveau'  in e) e.niveau  = Number(e.niveau)  || 0;
  if ('talents' in e) e.talents = Number(e.talents) || 0;
  if ('divers'  in e) e.divers  = Number(e.divers)  || 0;
  if ('avance'  in e) e.avance  = e.avance === true || e.avance === 'true' || e.avance === 'on' || e.avance === '1';
  return e;
}

function mergeAdvancedSkills(existing, fromForm) {
  const merged = existing.slice();
  for (const entry of fromForm) {
    const ent = coerceAdvancedSkillEntry(Object.assign({}, entry));
    let idx = -1;
    if (ent.id)  idx = merged.findIndex(s => String(s.id)  === String(ent.id));
    if (idx < 0 && ent.key) idx = merged.findIndex(s => s.key === ent.key);
    if (idx >= 0) merged[idx] = foundry.utils.mergeObject(merged[idx], ent, { inplace: false });
    else merged.push(ent);
  }

  const seen   = new Map();
  const result = [];
  for (const s of merged) {
    const key = s.id  ? `id:${s.id}`
              : s.key ? `key:${s.key}`
              : s.label ? `lab:${(s.label || '').toString().trim().toLowerCase()}|${s.cara || ''}`
              : `rnd:${Math.random()}`;
    if (seen.has(key)) {
      const merged_ = foundry.utils.mergeObject(seen.get(key), s, { inplace: false });
      seen.set(key, merged_);
      const i = result.indexOf(seen.get(key));
      if (i >= 0) result[i] = merged_;
    } else {
      seen.set(key, s);
      result.push(s);
    }
  }
  return result;
}

// ── Connaissances ────────────────────────────────────────────────────────────

const ALLOWED_CONN_TYPES = new Set(['generale', 'academique', 'artistique', 'metier']);
const SPECIAL_CONN_TYPES = new Set(['artistique', 'metier']);
const ALLOWED_CONN_CARA  = ['cc', 'ct', 'force', 'endurance', 'agilite', 'intelligence', 'forceMentale', 'sociabilite'];

function sanitizeConnaissances(raw, actor) {
  const entries = Array.isArray(raw) ? raw
    : (raw && typeof raw === 'object')
        ? Object.keys(raw).filter(k => /^\d+$/.test(k)).sort((a, b) => Number(a) - Number(b)).map(k => raw[k])
        : [];

  return entries.filter(Boolean).map(entry => {
    const name     = (entry.name  ?? '').toString().trim();
    const type     = (entry.type  ?? '').toString().toLowerCase();
    const normType = ALLOWED_CONN_TYPES.has(type) ? type : 'generale';
    let   cara     = (entry.cara  ?? '').toString();
    if (!ALLOWED_CONN_CARA.includes(cara)) cara = 'intelligence';
    if (!SPECIAL_CONN_TYPES.has(normType)) cara = 'intelligence';
    const id      = (entry.id !== undefined && entry.id !== null && entry.id !== '') ? entry.id : undefined;
    const talents = Number(entry.talents ?? 0) || 0;
    const divers  = Number(entry.divers  ?? 0) || 0;
    const statVal = Number(actor.system?.principal?.actuel?.[cara]) || 0;
    const payload = { name, type: normType, cara, talents, divers, targetValue: Number(entry.targetValue ?? (statVal + talents + divers)) || 0 };
    if (id !== undefined) payload.id = id;
    return payload;
  });
}

// ── Armor ────────────────────────────────────────────────────────────────────

function sanitizeArmorUpdate(updateData, actor) {
  try {
    const existing = actor.system?.armor || {};
    updateData.system.armor = updateData.system.armor || {};
    for (const z of ARMOR_ZONES) {
      const newZone = updateData.system.armor[z] || {};
      const oldZone = existing[z] || {};
      for (const slot of ['light', 'medium', 'heavy']) {
        const n = newZone[slot] || {};
        const o = oldZone[slot] || {};
        if (n.eq !== undefined) {
          const raw = n.eq;
          n.eq = (raw === true || String(raw).toLowerCase() === 'on' || String(raw).toLowerCase() === 'true' || String(raw).toUpperCase() === 'YES' || String(raw) === '1') ? 'YES' : 'NO';
        } else {
          n.eq = o.eq !== undefined ? o.eq : 'NO';
        }
        n.name   = n.name   !== undefined ? n.name   : (o.name   !== undefined ? o.name   : '');
        n.qualite= n.qualite!== undefined ? n.qualite: (o.qualite!== undefined ? o.qualite: 'Ordinaire');
        n.enc    = Number(n.enc ?? o.enc ?? 0) || 0;
        newZone[slot] = n;
      }
      updateData.system.armor[z] = newZone;
    }
  } catch (e) { console.debug('armor preserve merge failed', e); }
}

// ── Points de Chance ─────────────────────────────────────────────────────────

function clampChancePoints(updateData, actor) {
  if (!updateData.system.points || !Object.prototype.hasOwnProperty.call(updateData.system.points, 'chance')) return;
  let v = Number(updateData.system.points.chance);
  if (!Number.isFinite(v)) v = 0;
  const max = Number(actor.system?.secondaire?.actuel?.pd) || 0;
  updateData.system.points.chance = Math.max(0, Math.min(v, max));
}

// ── Entry point ──────────────────────────────────────────────────────────────

export async function updateActorObject(sheet, formData) {
  const fromForm   = extractAdvancedSkillsFromFormData(formData);
  const existing   = Array.isArray(sheet.actor.system.skills?.advanced) ? sheet.actor.system.skills.advanced.slice() : [];
  const finalSkills= mergeAdvancedSkills(existing, fromForm);

  const updateData = foundry.utils.expandObject(formData);
  updateData.system               ??= {};
  updateData.system.skills        ??= {};
  updateData.system.skills.advanced = finalSkills;

  clampChancePoints(updateData, sheet.actor);

  if (updateData.system.connaissances) {
    updateData.system.connaissances = sanitizeConnaissances(updateData.system.connaissances, sheet.actor);
  }

  if (updateData.system.armor) sanitizeArmorUpdate(updateData, sheet.actor);

  await sheet.actor.update(updateData);
  try { sheet.render(false); } catch (e) {}
}
