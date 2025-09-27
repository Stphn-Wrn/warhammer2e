// Handlebars helpers and template preloader for Warhammer2e
export function registerHandlebarsHelpers() {
  Handlebars.registerHelper("capitalize", function (str) {
    if (typeof str !== "string") return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
  });

  Handlebars.registerHelper("eq", (a, b) => a === b);

  Handlebars.registerHelper("skillTotal", function (skill, caracValue) {
    if (!skill || typeof skill !== 'object') return 0;
    const niveau = Number(skill.niveau) || 0;
    const talents = Number(skill.talents) || 0;
    const divers = Number(skill.divers) || 0;
    const avance = skill.avance || false;
    const caraVal = Number(caracValue) || 0;
    const caraBase = avance ? caraVal : Math.floor(caraVal / 2);
    return niveau + talents + divers + caraBase;
  });

  Handlebars.registerHelper("advancedSkillTotal", function (skill, actorData) {
    if (!skill || typeof skill !== 'object' || !actorData || !actorData.principal) return 0;
    const niveau = Number(skill.niveau) || 0;
    const talents = Number(skill.talents) || 0;
    const divers = Number(skill.divers) || 0;
    const avance = skill.avance || false;
    const cara = skill.cara;
    if (!cara) return niveau + talents + divers;
    const caracMapping = {
      "CC": actorData.principal.actuel.cc,
      "CT": actorData.principal.actuel.ct,
      "F": actorData.principal.actuel.force,
      "E": actorData.principal.actuel.endurance,
      "Ag": actorData.principal.actuel.agilite,
      "Int": actorData.principal.actuel.intelligence,
      "FM": actorData.principal.actuel.forceMentale,
      "Soc": actorData.principal.actuel.sociabilite
    };
    const caracValue = Number(caracMapping[cara]) || 0;
    const caraBase = avance ? caracValue : Math.floor(caracValue / 2);
    return niveau + talents + divers + caraBase;
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
