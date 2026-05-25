export const PRINCIPAL_KEYS = ['cc', 'ct', 'force', 'endurance', 'agilite', 'intelligence', 'forceMentale', 'sociabilite'];

export const SECONDARY_KEYS = ['a', 'b', 'bf', 'be', 'mag', 'mvt', 'pf', 'pd'];

// Mapping from advanced-skill cara codes → actor system keys
export const CARAC_SKILL_TO_SYSTEM = {
  CC: 'cc', CT: 'ct', F: 'force', E: 'endurance',
  Ag: 'agilite', Int: 'intelligence', FM: 'forceMentale', Soc: 'sociabilite'
};

// Mapping from legacy getData caraMapping keys → system keys (uppercase → camelCase)
export const CARAC_DISPLAY_LABELS = {
  cc: 'CC', ct: 'CT', force: 'FOR', endurance: 'END',
  agilite: 'AGI', intelligence: 'INT', forceMentale: 'FM', sociabilite: 'SOC'
};

export const STAT_ROLL_LABELS = {
  cc: 'de CC', ct: 'de CT', force: 'de Force', endurance: "d'Endurance",
  agilite: "d'Agilité", intelligence: "d'Intelligence",
  forceMentale: 'de Force Mentale', sociabilite: 'de Sociabilité'
};
