export function prepareBaseSkills(sys, caracMapping) {
  sys.skills     ??= {};
  sys.skills.base??= {};
  sys._nextId    ??= Number(sys._nextId) || 1;

  for (const [skillKey, skill] of Object.entries(sys.skills.base)) {
    if (!skill || typeof skill !== 'object') continue;
    skill.niveau ??= 0;
    skill.talents??= 0;
    skill.divers ??= 0;
    skill.avance ??= false;

    let caraValue = 0;
    if (skillKey === 'intimidation') {
      const choice = skill.cara || 'F';
      caraValue = (choice === 'Soc') ? (caracMapping['SOC'] || 0) : (caracMapping['FOR'] || 0);
    } else {
      caraValue = caracMapping[skill.cara] || 0;
    }

    const caraBase = skill.avance ? caraValue : Math.floor(caraValue / 2);
    skill.total = (Number(skill.niveau) || 0) + (Number(skill.talents) || 0) + (Number(skill.divers) || 0) + caraBase;
  }
}

export function prepareTalentsAndRegles(sys) {
  if (Array.isArray(sys.talents)) {
    for (const t of sys.talents) {
      if (t && (t.id === undefined || t.id === null)) t.id = sys._nextId++;
    }
  } else {
    sys.talents = [];
  }

  if (Array.isArray(sys.regles)) {
    for (const r of sys.regles) {
      if (r && (r.id === undefined || r.id === null)) r.id = sys._nextId++;
    }
  } else {
    sys.regles = [];
  }
}

export function prepareConnaissances(sys) {
  if (!Array.isArray(sys.connaissances)) {
    if (sys.connaissances && typeof sys.connaissances === 'object') {
      sys.connaissances = Object.keys(sys.connaissances)
        .filter(k => /^\d+$/.test(k))
        .sort((a, b) => Number(a) - Number(b))
        .map(k => sys.connaissances[k]);
    } else {
      sys.connaissances = [];
    }
  }

  const allowedTypes = new Set(['generale', 'academique', 'artistique', 'metier']);
  const allowedCara  = ['cc', 'ct', 'force', 'endurance', 'agilite', 'intelligence', 'forceMentale', 'sociabilite'];

  for (const c of sys.connaissances) {
    if (!c || typeof c !== 'object') continue;
    if (c.id === undefined || c.id === null || c.id === '') c.id = sys._nextId++;
    c.name = (c.name ?? '').toString();
    const type = (c.type ?? '').toString().toLowerCase();
    c.type = allowedTypes.has(type) ? type : 'generale';
    let cara = (c.cara ?? '').toString();
    if (!allowedCara.includes(cara)) cara = 'intelligence';
    c.cara = cara;
    c.targetValue = Number(sys.principal?.actuel?.[cara]) || 0;
  }
}

export function prepareAdvancedSkills(sys, advancedSkillsList) {
  sys._nextId ??= Number(sys._nextId) || 1;

  if (!Array.isArray(sys.skills.advanced)) {
    sys.skills.advanced = [];
  } else {
    for (const s of sys.skills.advanced) {
      if (s && (s.id === undefined || s.id === null)) s.id = sys._nextId++;
    }
  }

  const existingByKey = new Map();
  for (const s of sys.skills.advanced) {
    if (s && s.key) existingByKey.set(String(s.key), s);
  }

  const displayAdvanced = [];
  for (const def of advancedSkillsList) {
    const existing = existingByKey.get(String(def.key));
    if (existing) {
      existing.niveau ??= 0;
      existing.talents??= 0;
      existing.divers ??= 0;
      existing.total  ??= 0;
      existing.avance ??= false;
      existing.cara   ??= def.cara ?? '';
      displayAdvanced.push(existing);
    } else {
      displayAdvanced.push({
        id: sys._nextId++, key: def.key, label: def.label,
        cara: def.cara || '', niveau: 0, talents: 0, divers: 0, total: 0, avance: false
      });
    }
  }

  return displayAdvanced;
}
