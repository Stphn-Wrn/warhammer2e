export function getSkillDisplayName(skillName) {
  const names = {
    'soinsAnimaux': 'Soins des animaux',
    'charisme': 'Charisme',
    'commandement': 'Commandement', 
    'resistanceAlcool': 'Résistance à l\'alcool',
    'deguisement': 'Déguisement',
    'conduiteAttelage': 'Conduite d\'attelages',
    'dissimulation': 'Dissimulation',
    'evaluation': 'Évaluation',
    'jeu': 'Jeu',
    'commerage': 'Commérage',
    'marchandage': 'Marchandage',
    'intimidation': 'Intimidation',
    'survie': 'Survie',
    'perception': 'Perception',
    'equitation': 'Équitation',
    'canotage': 'Canotage',
    'escalade': 'Escalade',
    'fouille': 'Fouille',
    'deplacementSilencieux': 'Déplacement Silencieux',
    'natation': 'Natation'
  };
  return names[skillName] || skillName;
}

export function handleAdvancedSkillRoll(sheet, skillIndex) {
  const skillData = Array.isArray(sheet.actor.system.skills?.advanced) ? sheet.actor.system.skills.advanced[skillIndex] : undefined;
  if (!skillData) {
    ui.notifications.warn("Compétence avancée non trouvée");
    return;
  }

  const niveau = Number(skillData.niveau) || 0;
  const talents = Number(skillData.talents) || 0;
  const divers = Number(skillData.divers) || 0;
  const avance = skillData.avance || false;
  const cara = skillData.cara;
  const skillName = skillData.label || "Compétence";

  if (!cara) {
    ui.notifications.warn("Aucune caractéristique sélectionnée pour cette compétence");
    return;
  }

  const caracMapping = {
    "CC": sheet.actor.system.principal?.actuel?.cc || 0,
    "CT": sheet.actor.system.principal?.actuel?.ct || 0,
    "F": sheet.actor.system.principal?.actuel?.force || 0,
    "E": sheet.actor.system.principal?.actuel?.endurance || 0,
    "Ag": sheet.actor.system.principal?.actuel?.agilite || 0,
    "Int": sheet.actor.system.principal?.actuel?.intelligence || 0,
    "FM": sheet.actor.system.principal?.actuel?.forceMentale || 0,
    "Soc": sheet.actor.system.principal?.actuel?.sociabilite || 0
  };

  const caracValue = Number(caracMapping[cara]) || 0;
  const caracBase = avance ? caracValue : Math.floor(caracValue / 2);
  const skillTotal = niveau + talents + divers + caracBase;

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
    content: content,
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
        const finalTotal = skillTotal + modifier;
        html.find("#final-total").val(finalTotal);
      });
    }
  }).render(true);
}

export async function rollSkillTest(sheet, skillName, targetNumber, modifier) {
  const roll = new Roll("1d100");
  await roll.evaluate();
  const result = roll.total;
  const success = result <= targetNumber;
  const degrees = Math.floor(Math.abs(targetNumber - result) / 10);
  const skillDisplayName = getSkillDisplayName(skillName);

  let resultText = "";
  if (success) {
    if (degrees === 0) resultText = `<span style="color: green;"><strong>RÉUSSITE</strong></span>`;
    else resultText = `<span style="color: green;"><strong>RÉUSSITE</strong> avec ${degrees} degré${degrees > 1 ? 's' : ''}</span>`;
  } else {
    if (degrees === 0) resultText = `<span style="color: red;"><strong>ÉCHEC</strong></span>`;
    else resultText = `<span style="color: red;"><strong>ÉCHEC</strong> avec ${degrees} degré${degrees > 1 ? 's' : ''}</span>`;
  }

  const chatData = {
    user: game.user.id,
    speaker: ChatMessage.getSpeaker({actor: sheet.actor}),
    content: `
      <div class="skill-roll-result">
        <h3>Jet de ${skillDisplayName}</h3>
        <div><strong>Cible:</strong> ${targetNumber}${modifier !== 0 ? ` (${targetNumber - modifier}${modifier >= 0 ? '+' : ''}${modifier})` : ''}</div>
        <div><strong>Résultat:</strong> ${result}</div>
        <div>${resultText}</div>
      </div>
    `,
    sound: CONFIG.sounds.dice
  };

    chatData.content = `
      <div class="skill-roll-result">
        <h3>Jet de ${skillDisplayName}</h3>
        <div><strong>Cible:</strong> ${targetNumber}${modifier !== 0 ? ` (${targetNumber - modifier}${modifier >= 0 ? '+' : ''}${modifier})` : ''}</div>
        <div><strong>Résultat:</strong> ${result}</div>
        <div>${resultText}</div>
        </br>
        <div class="reroll-controls">
          <button class="reroll-roll" data-actor-id="${sheet.actor.id}" data-target="${targetNumber}" data-modifier="${modifier}">Relancer (Coût: 1 Chance)</button>
        </div>
      </div>
    `;

  ChatMessage.create(chatData);
}
