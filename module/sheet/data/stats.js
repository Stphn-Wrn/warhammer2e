import { PRINCIPAL_KEYS } from '../../constants/characteristics.js';
import { sanitizeNumberFields } from './sanitize.js';

export function preparePrincipal(sys) {
  sys.principal ??= {};
  for (const k of ['base', 'talents', 'carriere', 'avance', 'mod', 'actuel']) {
    sys.principal[k] ??= { cc: 0, ct: 0, force: 0, endurance: 0, agilite: 0, intelligence: 0, forceMentale: 0, sociabilite: 0 };
  }

  sanitizeNumberFields(sys.principal.base,    PRINCIPAL_KEYS);
  sanitizeNumberFields(sys.principal.talents,  PRINCIPAL_KEYS);
  sanitizeNumberFields(sys.principal.carriere, PRINCIPAL_KEYS);
  sanitizeNumberFields(sys.principal.avance,   PRINCIPAL_KEYS);
  sanitizeNumberFields(sys.principal.mod,      PRINCIPAL_KEYS);

  const P = sys.principal;
  const sum = s => (Number(P.base?.[s]) || 0) + (Number(P.talents?.[s]) || 0) + (Number(P.avance?.[s]) || 0) + (Number(P.mod?.[s]) || 0);

  sys.principal.actuel = {
    cc:           sum('cc'),
    ct:           sum('ct'),
    force:        sum('force'),
    endurance:    sum('endurance'),
    agilite:      sum('agilite'),
    intelligence: sum('intelligence'),
    forceMentale: sum('forceMentale'),
    sociabilite:  sum('sociabilite')
  };
}

export function prepareArmorAgilityPenalty(sys) {
  try {
    const zones = ['head', 'body', 'armLeft', 'armRight', 'legLeft', 'legRight'];
    const hasMediumOutsideHead = zones.some(z => {
      if (z === 'head') return false;
      return (sys.armor?.[z]?.medium?.eq || '').toString().toUpperCase() === 'YES';
    });
    sys.principal.actuel.agiliteRaw = Number(sys.principal.actuel.agilite) || 0;
    sys.armor ??= {};
    sys.armor.mediumAgilityPenaltyPercent = hasMediumOutsideHead ? 10 : 0;
    sys.armor.mediumAgilityPenaltyApplied = hasMediumOutsideHead;
  } catch (e) {}
}

export function prepareSecondaire(sys) {
  sys.secondaire ??= {};
  for (const k of ['base', 'talents', 'carriere', 'avance', 'mod', 'actuel']) {
    sys.secondaire[k] ??= { a: 0, b: 0, bf: 0, be: 0, mag: 0, mvt: 0, pf: 0, pd: 0 };
  }

  const S = sys.secondaire;
  S.base.bf = Math.floor((sys.principal.actuel.force || 0) / 10);
  S.base.be = Math.floor((sys.principal.actuel.endurance || 0) / 10);

  const sum = s => (Number(S.base?.[s]) || 0) + (Number(S.talents?.[s]) || 0) + (Number(S.avance?.[s]) || 0) + (Number(S.mod?.[s]) || 0);

  sys.secondaire.actuel = {
    a:   sum('a'),
    b:   sum('b'),
    bf:  (S.base.bf || 0) + (S.mod.bf || 0),
    be:  (S.base.be || 0) + (S.mod.be || 0),
    mag: sum('mag'),
    mvt: sum('mvt'),
    pf:  sum('pf'),
    pd:  sum('pd')
  };
}

export function preparePoints(sys) {
  sys.points ??= {};
  const keys = ['destin', 'chance', 'folie', 'corruption'];
  sanitizeNumberFields(sys.points, keys);
  for (const k of keys) sys.points[k] = Number(sys.points[k]) || 0;

  if (sys.points.destin < 0)     sys.points.destin = 0;
  if (sys.points.folie < 0)      sys.points.folie = 0;
  if (sys.points.corruption < 0) sys.points.corruption = 0;

  const chanceMax = Number(sys.secondaire?.actuel?.pd) || 0;
  sys.points.chance = Math.max(0, Math.min(sys.points.chance, chanceMax));
}

export function prepareCombat(sys) {
  sys.combat ??= {};
  const mvt = sys.secondaire.actuel.mvt || 0;
  sys.combat.move   = mvt * 2;
  sys.combat.charge = mvt * 4;
  sys.combat.course = mvt * 6;
  sys.combat.jump   = mvt + 6;
}

export function buildCaracMapping(sys) {
  const a = sys.principal.actuel;
  return {
    INT: a.intelligence  || 0,
    SOC: a.sociabilite   || 0,
    AGI: a.agilite       || 0,
    END: a.endurance     || 0,
    FOR: a.force         || 0,
    CC:  a.cc            || 0,
    CT:  a.ct            || 0,
    FM:  a.forceMentale  || 0
  };
}
