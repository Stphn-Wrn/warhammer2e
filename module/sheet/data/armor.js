import { ARMOR_ZONES } from '../../constants/armorZones.js';

const EMPTY_SLOT = () => ({ eq: 'NO', name: '', qualite: 'Ordinaire', enc: 0 });
const EMPTY_ZONE = () => ({ light: EMPTY_SLOT(), medium: EMPTY_SLOT(), heavy: EMPTY_SLOT() });

export function prepareArmor(sys) {
  sys.armor ??= {};

  for (const zone of ARMOR_ZONES) {
    const z = sys.armor[zone];
    if (!z || typeof z !== 'object' || Array.isArray(z)) {
      sys.armor[zone] = EMPTY_ZONE();
    } else {
      z.light  ??= EMPTY_SLOT();
      z.medium ??= EMPTY_SLOT();
      z.heavy  ??= EMPTY_SLOT();
    }
  }

  for (const zone of ARMOR_ZONES) sys.armor[`${zone}Bonus`] ??= 0;

  sys.armorEquipped ??= {};
  for (const zone of ARMOR_ZONES) sys.armorEquipped[zone] = Number(sys.armorEquipped[zone]) || 0;

  const be = sys.secondaire.actuel.be;
  sys.armorTotals = {};
  for (const zone of ARMOR_ZONES) sys.armorTotals[zone] = sys.armorEquipped[zone] + be;
}
