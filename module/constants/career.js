export const CAREER_SLOTS = ['secondary', 'tertiary', 'quaternary', 'quinary'];

export const MAP_SECONDARY_TO_PRINCIPAL = {
  combat:        'system.principal.carriere.cc',
  shoot:         'system.principal.carriere.ct',
  strength:      'system.principal.carriere.force',
  endurance:     'system.principal.carriere.endurance',
  agility:       'system.principal.carriere.agilite',
  intelligence:  'system.principal.carriere.intelligence',
  mentalStrength:'system.principal.carriere.forceMentale',
  social:        'system.principal.carriere.sociabilite'
};

export const MAP_SECONDARY_TO_SECONDAIRE = {
  attacks:        'system.secondaire.carriere.a',
  wounds:         'system.secondaire.carriere.b',
  strengthBonus:  'system.secondaire.carriere.bf',
  enduranceBonus: 'system.secondaire.carriere.be',
  movement:       'system.secondaire.carriere.mvt',
  magic:          'system.secondaire.carriere.mag',
  frenzyPoints:   'system.secondaire.carriere.pf',
  destinyPoints:  'system.secondaire.carriere.pd'
};

export const MAP_PRIMARY_TO_SECONDAIRE = {
  attacks:        'a',
  wounds:         'b',
  strengthBonus:  'bf',
  enduranceBonus: 'be',
  movement:       'mvt',
  magic:          'mag',
  frenzyPoints:   'pf',
  destinyPoints:  'pd'
};

export const CAREER_TEXTAREA_PATHS = [
  'system.career.primary.skills',   'system.career.primary.talents',   'system.career.primary.outcomes',
  'system.career.secondary.skills', 'system.career.secondary.talents', 'system.career.secondary.outcomes',
  'system.career.tertiary.skills',  'system.career.tertiary.talents',  'system.career.tertiary.outcomes',
  'system.career.quaternary.skills','system.career.quaternary.talents','system.career.quaternary.outcomes',
  'system.career.quinary.skills',   'system.career.quinary.talents',   'system.career.quinary.outcomes'
];
