import { parseDamageSpec, getZoneFromD100, rollDiceFaces, handleUlricFury } from './utils.js';

export async function openMaledictionDialog(actor) {
  const choices = [
    'Échos mineurs du Chaos',
    'Échos majeurs du Chaos',
    'Échos destructeurs du Chaos'
  ];

  const content = `
    <form>
      <div class="form-group">
        <label>Choisir un tirage :</label>
        <select id="echo-select">
          ${choices.map(c => `<option value="${c}">${c}</option>`).join('')}
        </select>
      </div>
    </form>
  `;

  new Dialog({
    title: "Malédiction de Tzeentch",
    content,
    buttons: {
      roll: {
        label: "Tirer",
        callback: async (html) => {
          const sel = html.find('#echo-select').val();
          try {
            const text = await resolveEchoTableResult(sel);
            ChatMessage.create({
              user: game.user.id,
              speaker: ChatMessage.getSpeaker({actor: actor}),
              content: `
                <div class="malediction-result">
                  <h3>${sel}</h3>
                  <div>${text}</div>
                </div>
              `
            });
          } catch (err) {
            console.error('Erreur Malédiction:', err);
            ui.notifications.error('Impossible de récupérer les Échos.');
          }
        }
      },
      cancel: { label: 'Annuler' }
    },
    default: 'roll'
  }).render(true);
}

async function resolveEchoTableResult(tableName) {
  const url = `systems/warhammer2e/echos.json`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Impossible de charger ${url}`);
  const data = await resp.json();
  const table = (data.tables || []).find(t => t.name === tableName);
  if (!table) throw new Error('Table non trouvée: ' + tableName);
  const roll = await new Roll('1d100').evaluate();
  const val = roll.total;
  const result = (table.results || []).find(r => r.range && r.range.length === 2 && val >= r.range[0] && val <= r.range[1]);
  if (!result) return `Jet: ${val} — Aucun résultat trouvé.`;
  return `Jet: ${val} — ${result.text}`;
}

export async function openColereDialog(actor) {
  const content = `
    <div class="form-group">
      <p>Souhaitez-vous tirer sur <strong>Colère des Dieux</strong> ?</p>
    </div>
  `;

  new Dialog({
    title: 'Colère des Dieux',
    content,
    buttons: {
      roll: {
        label: 'Tirer',
        callback: async () => {
          try {
            const text = await resolveColereResult();
            ChatMessage.create({
              user: game.user.id,
              speaker: ChatMessage.getSpeaker({actor: actor}),
              content: `
                <div class="colere-result">
                  <h3>Colère des Dieux</h3>
                  <div>${text}</div>
                </div>
              `
            });
          } catch (err) {
            console.error('Erreur Colère:', err);
            ui.notifications.error('Impossible de charger Colère des Dieux.');
          }
        }
      },
      cancel: { label: 'Annuler' }
    },
    default: 'roll'
  }).render(true);
}

async function resolveColereResult() {
  const url = `systems/warhammer2e/colere.json`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Impossible de charger ${url}`);
  const data = await resp.json();
  const roll = await new Roll('1d100').evaluate();
  const val = roll.total;
  const result = (data.results || []).find(r => r.range && r.range.length === 2 && val >= r.range[0] && val <= r.range[1]);
  if (!result) return `Jet: ${val} — Aucun résultat trouvé.`;
  return `Jet: ${val} — ${result.text}`;
}

// Spell casting dialog
export async function openSpellCastDialog(actor, spell) {
  const defaultMag = Number(actor?.system?.secondaire?.actuel?.mag) || 0;
  const defaultDiff = Number(spell?.difficulte) || 0;
  const ingredientBonus = Number(spell?.bonusIngredient ?? spell?.ingredientBonus) || 1;

  const content = `
    <form>
      <div class="form-group">
        <label>Difficulté</label>
        <input type="number" id="spell-difficulty" value="${defaultDiff}" readonly>
      </div>
      <div class="form-group">
        <label>Dé de magie</label>
        <input type="number" id="spell-mag-dice" value="${defaultMag}" min="1" max="6">
      </div>
      <div class="form-group">
        <label>Bonus</label>
        <input type="number" id="spell-flat-bonus" value="0">
      </div>
      <div class="form-group">
        <label><input type="checkbox" id="spell-focal"> Focalisation (+${defaultMag})</label>
      </div>
      <div class="form-group">
        <label><input type="checkbox" id="spell-ingredient"> Ingrédient (+${ingredientBonus})</label>
      </div>
      <div class="form-group">
        <label>Dégâts bonus</label>
        <input type="number" id="spell-degats-bonus" value="0" min="0" step="1">
      </div>
      <div class="form-group">
        <label>Fureur confirmée</label>
        <select id="spell-fury-confirm">
          <option value="false" selected>Non</option>
          <option value="true">Oui</option>
        </select>
      </div>
    </form>
  `;

  new Dialog({
    title: `Lancer : ${spell.name}`,
    content,
    buttons: {
      cast: {
        label: 'Lancer',
        callback: async (html) => {
          const diff = Number(html.find('#spell-difficulty').val()) || 0;
          let magDice = Number(html.find('#spell-mag-dice').val()) || 0;
          const focal = !!html.find('#spell-focal').prop('checked');
          const ingr = !!html.find('#spell-ingredient').prop('checked');
          const degatsBonusInput = Number(html.find('#spell-degats-bonus').val()) || 0;
          const fureurConfirmInput = (html.find('#spell-fury-confirm').val() === 'true');
          const magBonus = focal ? (Number(defaultMag) || 0) : 0;
          let flatBonus = Number(html.find('#spell-flat-bonus').val()) || 0;
          if (ingr) flatBonus += Number(ingredientBonus) || 0;

          if (magDice <= 0 && magBonus <= 0) {
            ui.notifications.warn('Il faut au moins 1 dé de magie pour lancer le sort.');
            return;
          }

          try {
            const roll = await new Roll(`${magDice}d10`).evaluate();
            const dice = (roll.dice && roll.dice[0] && roll.dice[0].results) ? roll.dice[0].results.map(r => r.result) : [];

            const counts = {};
            let ones = 0;
            for (const d of dice) {
              counts[d] = (counts[d] || 0) + 1;
              if (d === 1) ones++;
            }

            const dupes = [];
            for (const [face, cnt] of Object.entries(counts)) {
              if (cnt >= 2) {
                const label = cnt === 2 ? 'Double' : (cnt === 3 ? 'Triple' : `${cnt}x`);
                dupes.push(`${label} de ${face}`);
              }
            }

            const diceHtml = dice.map((d, i) => {
              const cls = (d === 1) ? 'die-one' : (counts[d] >= 2 ? 'die-dupe' : 'die-normal');
              return `<span class="die ${cls}" style="display:inline-block; padding:6px; margin:3px; border-radius:4px; background:#fff; border:1px solid #ccc;">${d}</span>`;
            }).join('');

            const sumDice = dice.reduce((a,b)=>a+b,0);
            const total = sumDice + magBonus + flatBonus;

            const success = total >= diff;

            const summary = [];
            summary.push(`<div><strong>Jet pour :</strong> ${spell.name}</div>`);
            summary.push(`<div><strong>Dés de magie :</strong> ${magDice}</div>`);
            summary.push(`<div><strong>Bonus d'ingrédient :</strong> ${ingr ? `Oui (+${ingredientBonus})` : 'Non'}</div>`);
            summary.push(`<div><strong>Focalisation :</strong> ${focal? `Oui (+${magBonus})` : 'Non'}</div>`);
            summary.push(`<div><strong>Difficulté :</strong> ${diff}</div>`);
            summary.push(`<div style="margin-top:8px">${diceHtml}</div>`);
            if (ones > 0) summary.push(`<div style="color:crimson; margin-top:6px"><strong>1 détecté(s):</strong> ${ones}</div>`);
            if (dupes.length) summary.push(`<div style="color:darkorange; margin-top:6px"><strong>Doubles/Multiples:</strong> ${dupes.join(', ')}</div>`);
            summary.push(`<div style="margin-top:6px"><strong>Résultat des dés :</strong> ${sumDice}</div>`);
            summary.push(`<div style="margin-top:6px"><strong>Bonus de focalisation :</strong> ${magBonus}</div>`);
            summary.push(`<div style="margin-top:6px"><strong>Bonus/Malus :</strong> ${flatBonus}</div>`);

            if (success) {
              const attacksField = spell?.attaques;
              let attackCount = 0;
              const magValue = Number(defaultMag) || 0;
              if (typeof attacksField === 'string' && attacksField.toLowerCase() === 'magie') {
                attackCount = magValue;
              } else if (!isNaN(Number(attacksField)) && Number(attacksField) > 0) {
                attackCount = Number(attacksField);
              }

              if (attackCount > 0) {
                const dmgSpec = parseDamageSpec(spell?.degats ?? spell?.degat ?? '1d10+0');
                const attacksRoll = await new Roll(`${attackCount}d100`).evaluate();
                const attackResults = (attacksRoll.dice && attacksRoll.dice[0] && attacksRoll.dice[0].results) ? attacksRoll.dice[0].results.map(r => r.result) : [];
                summary.push(`<hr><div><strong>Attaques (${attackCount}):</strong></div>`);
                for (let i=0;i<attackResults.length;i++) {
                  const atkVal = attackResults[i];
                  // Reverse the last two digits to map to hit zone (00 treated as 100)
                  const twoDigits = String(atkVal % 100).padStart(2, '0');
                  const reversed = twoDigits.split('').reverse().join('');
                  let zoneVal = Number(reversed);
                  if (zoneVal === 0) zoneVal = 100;
                  const zone = getZoneFromD100(zoneVal);
                  summary.push(`<div style="margin-top:8px"><strong>Attaque ${i+1}:</strong> d100=${atkVal} → ${zone}</div>`);
                  const flat = dmgSpec.flat || 0;
                  const dmgExpression = `1d10${flat ? `+${flat}` : ''}`;
                  const dmgRoll = await rollDiceFaces(dmgExpression);
                  let dmgDice = dmgRoll.results.slice();
                  let furyLogs = [];
                  // If fureurConfirmInput is true, auto-apply fureur without confirmation
                  if (fureurConfirmInput) {
                    const original = dmgDice.slice();
                    const final = dmgDice.slice();
                    for (let oi = 0; oi < original.length; oi++) {
                      if (Number(original[oi]) === 10) {
                        let cont = true;
                        while (cont) {
                          const extra = await rollDiceFaces('1d10');
                          const added = (extra.results && extra.results[0]) ? Number(extra.results[0]) : extra.total || 0;
                          final.push(added);
                          furyLogs.push(`Relance d10 (fureur auto): ${added}`);
                          cont = (Number(added) === 10);
                        }
                      }
                    }
                    dmgDice = final;
                  } else {
                    const furyResult = await handleUlricFury(actor, dmgDice);
                    dmgDice = furyResult.finalDiceArray;
                    furyLogs = furyResult.furyLogs;
                  }
                  // Sum dice + flat base + degats bonus from dialog
                  const dmgSum = dmgDice.reduce((a,b)=>a+b,0) + (Number(flat) || 0) + (Number(degatsBonusInput) || 0);
                  summary.push(`<div style="margin-left:12px">Dégâts (${dmgExpression}): ${dmgDice.join(', ')} ${flat? `+ ${flat}` : ''}${degatsBonusInput ? ` + ${degatsBonusInput}` : ''} → <strong>${dmgSum}</strong></div>`);
                  if (furyLogs.length) {
                    summary.push(`<div style="margin-left:12px; margin-top:6px; color:darkred"><strong>Fureur d'Ulric :</strong><br>${furyLogs.map(l => `<div>${l}</div>`).join('')}</div>`);
                  }
                }
              }
            } else {
              summary.push(`<div style="color:red; margin-top:8px;"><strong>ÉCHEC</strong> — Aucun dégât n'est infligé.</div>`);
            }

            ChatMessage.create({
              user: game.user.id,
              speaker: ChatMessage.getSpeaker({actor}),
              content: `<div class="spell-cast-result">${summary.join('')}</div>`
            });
          } catch (err) {
            console.error('Erreur roll spell:', err);
            ui.notifications.error('Erreur lors du lancer du sort.');
          }
        }
      },
      cancel: { label: 'Annuler' }
    },
    default: 'cast'
  }).render(true);
}
