// Helpers for managing talents and regles (rules) on an actor sheet
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

export async function addRegle(sheet) {
  const sys = sheet.actor.system;
  const regles = Array.isArray(sys.regles) ? sys.regles.slice() : [];
  const id = sys._nextId ?? Date.now();
  const nextId = (Number(sys._nextId) || Date.now()) + 1;
  const newRegle = { id, name: "", description: "" };
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
