function nextId(sys) {
  return Number(sys._nextId) || Date.now();
}

function addArrayItem(sheet, collectionKey, newItem) {
  const sys = sheet.actor.system;
  const arr = Array.isArray(sys[collectionKey]) ? sys[collectionKey].slice() : [];
  const id = nextId(sys);
  arr.push({ id, ...newItem });
  return sheet.actor.update({ [`system.${collectionKey}`]: arr, 'system._nextId': id + 1 });
}

function deleteArrayItemById(sheet, collectionKey, id) {
  const sys = sheet.actor.system;
  const arr = Array.isArray(sys[collectionKey]) ? sys[collectionKey].slice() : [];
  const idx = arr.findIndex(item => String(item.id) === String(id));
  if (idx < 0) return Promise.resolve(false);
  arr.splice(idx, 1);
  return sheet.actor.update({ [`system.${collectionKey}`]: arr }).then(() => true);
}

export function findArrayItemIndex(collection, id) {
  return (Array.isArray(collection) ? collection : []).findIndex(item => String(item.id) === String(id));
}

// Keep named aliases used by WarhammerActorSheet and handlers
export const findTalentIndexById      = (sheet, id) => findArrayItemIndex(sheet.actor.system.talents,       id);
export const findRegleIndexById       = (sheet, id) => findArrayItemIndex(sheet.actor.system.regles,        id);
export const findConnaissanceIndexById = (sheet, id) => findArrayItemIndex(sheet.actor.system.connaissances, id);

export const regleTemplates = [
  { key: 'blank', name: 'Vide', description: '' },
  { key: 'combat-enchainement', name: 'Enchaînement (combat)', description: "Permet de réaliser un enchaînement offensif particulier, modifiant l'ordre d'attaque." },
  { key: 'furtivite', name: 'Furtivité améliorée', description: 'Le personnage bénéficie d\'un bonus lors des actions discrètes en terrain urbain.' }
];

export const addTalent      = (sheet)           => addArrayItem(sheet, 'talents',       { name: '', description: '' });
export const deleteTalentById = (sheet, id)     => deleteArrayItemById(sheet, 'talents', id);

export const addRegle = (sheet, template) => addArrayItem(sheet, 'regles', {
  name:        (template?.name)        || '',
  description: (template?.description) || ''
});
export const deleteRegleById = (sheet, id) => deleteArrayItemById(sheet, 'regles', id);

export const addConnaissance = (sheet, type = 'generale') => addArrayItem(sheet, 'connaissances', {
  name: '',
  type: type === 'academique' ? 'academique' : 'generale'
});
export const deleteConnaissanceById = (sheet, id) => deleteArrayItemById(sheet, 'connaissances', id);
