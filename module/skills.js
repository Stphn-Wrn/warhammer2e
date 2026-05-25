import { buildSkillCaracLookup, computeSkillTotal } from './utils.js';
import { BASE_SKILL_LABELS } from './constants/advancedSkills.js';
import { rollD100, formatD100Result, buildRerollButton } from './rolls/RollService.js';

export function getSkillDisplayName(skillName) {
  return BASE_SKILL_LABELS[skillName] ?? skillName;
}

export function handleAdvancedSkillRoll(sheet, skillIndex) {
  const skillData = Array.isArray(sheet.actor.system.skills?.advanced) ? sheet.actor.system.skills.advanced[skillIndex] : undefined;
  if (!skillData) {
    ui.notifications.warn("Compétence avancée non trouvée");
    return;
  }

  const cara = skillData.cara;
  const skillName = skillData.label || "Compétence";

  if (!cara) {
    ui.notifications.warn("Aucune caractéristique sélectionnée pour cette compétence");
    return;
  }

  const caracMapping = buildSkillCaracLookup(sheet.actor.system.principal?.actuel);
  const caracValue = Number(caracMapping[cara]) || 0;
  const skillTotal = computeSkillTotal(skillData, caracValue);

  showSkillRollDialog(sheet, skillName, skillTotal);
}

export function showSkillRollDialog(sheet, skillName, skillTotal) {
  const skillDisplayName = getSkillDisplayName(skillName);
  const content = `
    <div class="skill-roll-dialog">
      <h3>Jet de ${skillDisplayName}</h3>
      <div class="form-group">
        <label>Total de la compétence:</label>
        <input type="number" id="skill-total" value="${skillTotal}" readonly>
      </div>
      <div class="form-group">
        <label>Bonus/Malus:</label>
        <input type="number" id="skill-modifier" value="0" min="-99" max="99">
      </div>
      <div class="form-group">
        <label>Total final:</label>
        <input type="number" id="final-total" value="${skillTotal}" readonly>
      </div>
    </div>
  `;

  new Dialog({
    title: `${skillDisplayName}`,
    content,
    buttons: {
      roll: {
        icon: '<i class="fas fa-dice"></i>',
        label: "Lancer le dé",
        callback: async (html) => {
          const modifier = parseInt(html.find("#skill-modifier").val()) || 0;
          const finalTotal = skillTotal + modifier;
          await rollSkillTest(sheet, skillName, finalTotal, modifier);
        }
      },
      cancel: {
        icon: '<i class="fas fa-times"></i>',
        label: "Annuler"
      }
    },
    default: "roll",
    render: (html) => {
      html.find("#skill-modifier").on("input", (ev) => {
        const modifier = parseInt(ev.target.value) || 0;
        html.find("#final-total").val(skillTotal + modifier);
      });
    }
  }).render(true);
}

export async function rollSkillTest(sheet, skillName, targetNumber, modifier) {
  const roll = await rollD100();
  const { html: resultHtml } = formatD100Result(roll.total, targetNumber);
  const skillDisplayName = getSkillDisplayName(skillName);
  const modifierStr = modifier !== 0 ? ` (${targetNumber - modifier}${modifier >= 0 ? '+' : ''}${modifier})` : '';

  ChatMessage.create({
    user: game.user.id,
    speaker: ChatMessage.getSpeaker({actor: sheet.actor}),
    content: `
      <div class="skill-roll-result">
        <h3>Jet de ${skillDisplayName}</h3>
        <div><strong>Cible:</strong> ${targetNumber}${modifierStr}</div>
        <div><strong>Résultat:</strong> ${roll.total}</div>
        <div>${resultHtml}</div>
        </br>
        ${buildRerollButton(sheet.actor.id, targetNumber, modifier)}
      </div>
    `,
    sound: CONFIG.sounds.dice
  });
}
