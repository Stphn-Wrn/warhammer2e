import { INVENTORY_CHILD_TO_PARENT, INVENTORY_ICON_MAP, INVENTORY_LABEL_MAP, INVENTORY_QUALITY_COLORS } from '../../inventoryConstants.js';

const MIN_NON_TRANSPORTED_SLOTS = 10;

const BAG_CAPACITIES = {
  backpack: 3, pouch: 2, satchel: 4, grizzly: 6, medic: 12, holster: 0
};

const BAG_DISPLAY_NAMES = {
  backpack: 'Sac à dos',
  pouch:    'Sac Bandoulière',
  satchel:  'Sac large',
  grizzly:  'Sac grizzly',
  medic:    'Sac médical',
  holster:  'Poche/Holster/Bandoulière à potions'
};

const BAG_ICON = 'icons/containers/bags/pack-leather-strapped-tan.webp';

function normalizeSlot(slot) {
  const rawType    = slot?.type    || '';
  const rawSub     = slot?.subType || '';
  const rawDetail  = (slot?.detail  || '').toString().trim();
  const rawQuality = (slot?.quality || 'ordinaire').toString().toLowerCase();

  let type    = rawType;
  let subType = rawSub;
  if (!subType && INVENTORY_CHILD_TO_PARENT[rawType]) {
    subType = rawType;
    type    = INVENTORY_CHILD_TO_PARENT[rawType];
  }

  const note      = (slot?.note || '').toString().trim();
  const iconKey   = rawDetail || subType || type;
  const icon      = (slot?.icon || '').toString().trim() || INVENTORY_ICON_MAP[iconKey] || '';
  const label     = (slot?.label || '').toString().trim() || INVENTORY_LABEL_MAP[iconKey] || INVENTORY_LABEL_MAP[subType || type] || '';
  const quality   = ['mauvaise', 'ordinaire', 'exceptionnelle'].includes(rawQuality) ? rawQuality : 'ordinaire';
  const borderColor = INVENTORY_QUALITY_COLORS[quality] || INVENTORY_QUALITY_COLORS.ordinaire;

  return { type, subType: subType || '', detail: rawDetail, quality, label, note, icon, borderColor };
}

function mapSlotForDisplay(slot, index) {
  return {
    index,
    type:        slot?.type        || '',
    subType:     slot?.subType     || '',
    detail:      slot?.detail      || '',
    quality:     slot?.quality     || 'ordinaire',
    label:       slot?.label       || '',
    note:        slot?.note        || '',
    icon:        slot?.icon        || '',
    borderColor: slot?.borderColor || INVENTORY_QUALITY_COLORS.ordinaire
  };
}

export function prepareInventory(sys) {
  sys.inventory    ??= [];
  sys.inventoryBag ??= '';
  sys.strongShoulders = Boolean(sys.strongShoulders);

  const beVal = Number(sys.secondaire?.actuel?.be) || 0;
  const bfVal = Number(sys.secondaire?.actuel?.bf) || 0;

  const inventorySlotsBase = beVal + bfVal * 2 + 1 + (sys.strongShoulders ? 2 : 0);
  const inventorySlotsBag  = BAG_CAPACITIES[sys.inventoryBag] || 0;
  const bagSlotCost        = sys.inventoryBag ? 1 : 0;

  if (!Array.isArray(sys.inventory)) sys.inventory = [];

  const normalized      = sys.inventory.map(normalizeSlot);
  const qualityBonus    = normalized.filter(s => s.subType?.startsWith('armor') && s.quality === 'exceptionnelle').length;
  const inventorySlotsTotal = Math.max(0, inventorySlotsBase + inventorySlotsBag - bagSlotCost) + qualityBonus;

  const bagSlotDisplay = sys.inventoryBag ? {
    index: null, isBagSlot: true, type: 'bag', subType: 'bag', detail: '',
    quality: 'ordinaire', label: BAG_DISPLAY_NAMES[sys.inventoryBag] || 'Sac porté',
    note: 'Occupe 1 case', icon: BAG_ICON, borderColor: INVENTORY_QUALITY_COLORS.ordinaire
  } : null;

  const totalSlotsFinal = Math.max(0, inventorySlotsTotal);
  const overflowItems   = normalized.slice(totalSlotsFinal);
  const overflowDisplay = [...overflowItems];
  while (overflowDisplay.length < MIN_NON_TRANSPORTED_SLOTS) {
    overflowDisplay.push({ type: '', subType: '', detail: '', quality: 'ordinaire', label: '', note: '', icon: '', borderColor: INVENTORY_QUALITY_COLORS.ordinaire });
  }

  const carriedPadded = normalized.slice(0, totalSlotsFinal);
  while (carriedPadded.length < totalSlotsFinal) {
    carriedPadded.push({ type: '', subType: '', label: '', icon: '' });
  }

  const inventorySlots    = carriedPadded.map((s, i) => mapSlotForDisplay(s, i));
  const inventoryOverflow = overflowDisplay.map((s, i) => mapSlotForDisplay(s, totalSlotsFinal + i));

  const baseEnd = inventorySlotsBase + qualityBonus;
  const inventoryBaseSlots      = inventorySlots.slice(0, baseEnd);
  const inventoryBagSlots       = inventorySlots.slice(baseEnd, totalSlotsFinal);
  const inventoryBaseSlotsDisplay = bagSlotDisplay ? [bagSlotDisplay, ...inventoryBaseSlots] : inventoryBaseSlots;

  sys.inventory = [...carriedPadded, ...overflowItems];

  return {
    inventorySlotsBase,
    inventorySlotsBag,
    inventorySlotsTotal,
    inventorySlots,
    inventoryOverflow,
    inventoryBaseSlots,
    inventoryBagSlots,
    inventoryBaseSlotsDisplay
  };
}
