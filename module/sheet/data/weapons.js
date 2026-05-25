const MIN_WEAPON_SLOTS = 8;

export function prepareWeapons(sys) {
  sys.weapons       ??= [];
  sys.rangedWeapons ??= [];

  const ccBase = Number(sys.principal?.base?.cc) || 0;
  const ctBase = Number(sys.principal?.base?.ct) || 0;
  const bfActuel = Number(sys.secondaire?.actuel?.bf) || 0;
  const defaultMeleeDiceMin  = Math.max(1, ccBase);
  const defaultRangedDiceMin = Math.max(1, ctBase);

  for (let i = 0; i < MIN_WEAPON_SLOTS; i++) {
    sys.weapons[i] ??= {};
    const w = sys.weapons[i];
    w.name      ??= '';
    w.quality   ??= 'Ordinaire';
    w.enc       ??= 0;
    w.bonusCC   ??= 0;
    w.diceMin   ??= defaultMeleeDiceMin;
    w.damage    ??= 0;
    w.perc      ??= false;
    w.bf         = bfActuel;
    w.def       ??= 0;
    w.attributes??= '';
    w.mastery   ??= false;
    w.par       ??= 0;
  }

  for (let i = 0; i < MIN_WEAPON_SLOTS; i++) {
    sys.rangedWeapons[i] ??= {};
    const r = sys.rangedWeapons[i];
    r.name       ??= '';
    r.quality    ??= 'Ordinaire';
    r.enc        ??= 0;
    r.bonusCT    ??= 0;
    r.diceMin    ??= defaultRangedDiceMin;
    r.damage     ??= 0;
    r.perc       ??= false;
    r.attributes ??= '';
    r.type       ??= '';
    r.rech       ??= '';
    r.portee     ??= '';
    r.munitions  ??= '';
    r.atq        ??= '';
    r.deg        ??= '';
    r.mastery    ??= false;
  }
}
