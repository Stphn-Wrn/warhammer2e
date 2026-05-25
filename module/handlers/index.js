import { wireArmorHandlers }       from './armor.js';
import { wireInventoryHandlers }   from './inventory.js';
import { wireSkillHandlers }       from './skills.js';
import { wireCareerHandlers }      from './career.js';
import { wireTalentHandlers }      from './talents.js';
import { wireCoinHandlers }        from './coins.js';
import { wireWeaponHandlers }      from './weapons.js';
import { wireSpellHandlers }       from './spells.js';
import { wireChatRerollHandler, wireRaceHandler, wireXpHandler, wireStatRollHandler } from './misc.js';

function normalizeNumberInputs(html) {
  try {
    html.find('input[type="number"]').each((_, el) => {
      try {
        const $el = $(el);
        const raw = ($el.val() || '').toString();
        if (!raw) return;
        let cleaned = raw.replace(/ /g, '').replace(/\s+/g, '').replace(/,/g, '.');
        const n = Number(cleaned);
        if (Number.isFinite(n)) {
          const step     = $el.attr('step');
          const name     = $el.attr('name') || '';
          const isCareer = name.startsWith('system.principal.carriere') || name.startsWith('system.career.');
          if (step && String(step).indexOf('.') === -1 && Number(step) === 1 && !isCareer) $el.val(Math.round(n));
          else $el.val(n);
          return;
        }
        const m = raw.match(/-?\d+/);
        if (m) $el.val(parseInt(m[0], 10));
      } catch (e) {}
    });
  } catch (e) {}
}

export function wireSheetHandlers(sheet, html) {
  normalizeNumberInputs(html);

  wireChatRerollHandler();
  wireArmorHandlers(sheet, html);
  wireInventoryHandlers(sheet, html);
  wireSkillHandlers(sheet, html);
  wireCareerHandlers(sheet, html);
  wireTalentHandlers(sheet, html);
  wireCoinHandlers(sheet, html);
  wireWeaponHandlers(sheet, html);
  wireSpellHandlers(sheet, html);
  wireRaceHandler(sheet, html);
  wireXpHandler(sheet, html);
  wireStatRollHandler(sheet, html);
}
