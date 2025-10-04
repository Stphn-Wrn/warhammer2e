export function findTalentIndexById(sheet, id) {
  const talents = Array.isArray(sheet.actor.system.talents) ? sheet.actor.system.talents : [];
  return talents.findIndex(t => String(t.id) === String(id));
}

export async function addTalent(sheet) {
  const sys = sheet.actor.system;
  const talents = Array.isArray(sys.talents) ? sys.talents.slice() : [];
  const id = sys._nextId ?? Date.now();
  const nextId = (Number(sys._nextId) || Date.now()) + 1;
  const newTalent = { id, name: "", description: "" };
  talents.push(newTalent);
  return sheet.actor.update({ "system.talents": talents, "system._nextId": nextId });
}

export async function deleteTalentById(sheet, id) {
  const sys = sheet.actor.system;
  const talents = Array.isArray(sys.talents) ? sys.talents.slice() : [];
  const idx = talents.findIndex(t => String(t.id) === String(id));
  if (idx < 0) return Promise.resolve(false);
  talents.splice(idx, 1);
  return sheet.actor.update({ "system.talents": talents }).then(() => true);
}

export function findRegleIndexById(sheet, id) {
  const regles = Array.isArray(sheet.actor.system.regles) ? sheet.actor.system.regles : [];
  return regles.findIndex(r => String(r.id) === String(id));
}

export function findConnaissanceIndexById(sheet, id) {
  const connaissances = Array.isArray(sheet.actor.system.connaissances) ? sheet.actor.system.connaissances : [];
  return connaissances.findIndex(c => String(c.id) === String(id));
}

export const regleTemplates = [
  { key: 'blank', name: 'Vide', description: '' },
  { key: 'combat-enchainement', name: 'Enchaînement (combat)', description: 'Permet de réaliser un enchaînement offensif particulier, modifiant l\'ordre d\'attaque.' },
  { key: 'furtivite', name: 'Furtivité améliorée', description: 'Le personnage bénéficie d\'un bonus lors des actions discrètes en terrain urbain.' }
];

export async function addRegle(sheet, template) {
  const sys = sheet.actor.system;
  const regles = Array.isArray(sys.regles) ? sys.regles.slice() : [];
  const id = sys._nextId ?? Date.now();
  const nextId = (Number(sys._nextId) || Date.now()) + 1;
  const newRegle = { id, name: (template && template.name) ? template.name : '', description: (template && template.description) ? template.description : '' };
  regles.push(newRegle);
  return sheet.actor.update({ "system.regles": regles, "system._nextId": nextId });
}

export async function deleteRegleById(sheet, id) {
  const sys = sheet.actor.system;
  const regles = Array.isArray(sys.regles) ? sys.regles.slice() : [];
  const idx = regles.findIndex(r => String(r.id) === String(id));
  if (idx < 0) return Promise.resolve(false);
  regles.splice(idx, 1);
  return sheet.actor.update({ "system.regles": regles }).then(() => true);
}

export async function addConnaissance(sheet, type = 'generale') {
  const sys = sheet.actor.system;
  const connaissances = Array.isArray(sys.connaissances) ? sys.connaissances.slice() : [];
  const id = sys._nextId ?? Date.now();
  const nextId = (Number(sys._nextId) || Date.now()) + 1;
  const newConnaissance = { id, name: '', type: (type === 'academique' ? 'academique' : 'generale') };
  connaissances.push(newConnaissance);
  return sheet.actor.update({ 'system.connaissances': connaissances, 'system._nextId': nextId });
}

export async function deleteConnaissanceById(sheet, id) {
  const sys = sheet.actor.system;
  const connaissances = Array.isArray(sys.connaissances) ? sys.connaissances.slice() : [];
  const idx = connaissances.findIndex(c => String(c.id) === String(id));
  if (idx < 0) return Promise.resolve(false);
  connaissances.splice(idx, 1);
  return sheet.actor.update({ 'system.connaissances': connaissances }).then(() => true);
}
