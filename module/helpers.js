import { buildSkillCaracLookup, computeSkillTotal } from './utils.js';

export function registerHandlebarsHelpers() {
  Handlebars.registerHelper("capitalize", function (str) {
    if (typeof str !== "string") return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
  });

  Handlebars.registerHelper("eq", (a, b) => a === b);

  Handlebars.registerHelper("skillTotal", function (skill, caracValue) {
    if (!skill || typeof skill !== 'object') return 0;
    return computeSkillTotal(skill, Number(caracValue) || 0);
  });

  Handlebars.registerHelper("advancedSkillTotal", function (skill, actorData) {
    if (!skill || typeof skill !== 'object' || !actorData?.principal) return 0;
    const cara = skill.cara;
    if (!cara) return (Number(skill.niveau) || 0) + (Number(skill.talents) || 0) + (Number(skill.divers) || 0);
    const caracMapping = buildSkillCaracLookup(actorData.principal?.actuel);
    return computeSkillTotal(skill, Number(caracMapping[cara]) || 0);
  });

  Handlebars.registerHelper("sum", function (a, b) {
    const n1 = Number.isFinite(Number(a)) ? Number(a) : 0;
    const n2 = Number.isFinite(Number(b)) ? Number(b) : 0;
    return n1 + n2;
  });
}

export async function preloadHandlebarsTemplates() {
  return loadTemplates([
    "systems/warhammer2e/templates/actor/character-sheet.html",
    "systems/warhammer2e/templates/item/item-sheet.html",
    "systems/warhammer2e/templates/actor/tabs/tab-main.html",
    "systems/warhammer2e/templates/actor/tabs/tab-bio.html",
    "systems/warhammer2e/templates/actor/tabs/tab-weapons.html",
    "systems/warhammer2e/templates/actor/tabs/tab-armor.html",
    "systems/warhammer2e/templates/actor/tabs/tab-spells.html",
    "systems/warhammer2e/templates/actor/tabs/tab-career.html",
    "systems/warhammer2e/templates/actor/tabs/tab-inventory.html"
  ]);
}
