import { RACES, SUBRACES_MAP } from '../constants/races.js';
import { STAT_ROLL_LABELS } from '../constants/characteristics.js';
import { rollD100, formatD100Result, buildRerollButton } from '../rolls/RollService.js';
import { openGrantXpDialog } from '../xp.js';

// ── Chat reroll handler ────────────────────────────────────────────────────

export function wireChatRerollHandler() {
  Hooks.on('renderChatMessage', (app, html) => {
    try {
      html.find('.reroll-roll').off('click').on('click', async ev => {
        ev.preventDefault();
        const $btn    = $(ev.currentTarget);
        const actorId = $btn.data('actor-id');
        const target  = Number($btn.data('target'))   || 0;
        const modifier= Number($btn.data('modifier')) || 0;
        const actor   = game.actors.get(actorId);
        if (!actor) { ui.notifications.error('Acteur introuvable pour la relance'); return; }

        const currentChance = Number(actor.system?.points?.chance) || 0;
        if (currentChance <= 0) { ui.notifications.warn('Pas assez de points de chance pour relancer'); return; }

        try { await actor.update({ 'system.points.chance': currentChance - 1 }); }
        catch (e) { console.error('Unable to consume chance for reroll', e); ui.notifications.error('Impossible de consommer un point de chance'); return; }

        const roll   = await rollD100();
        const result = roll.total;
        const { html: text } = formatD100Result(result, target);

        const messageId = $btn.closest('.chat-message').data('message-id');
        const message   = game.messages.get(messageId);
        if (message) {
          message.update({ content: message.content + `</br><div class="reroll-result">Relance : ${result} — ${text}</div>` });
          $btn.prop('disabled', true).text('Relancé');
        } else {
          ChatMessage.create({ user: game.user.id, speaker: ChatMessage.getSpeaker({ actor }), content: `Relance: ${result} — ${text}` });
        }
      });
    } catch (e) { console.error('Error wiring reroll buttons', e); }
  });
}

// ── Race dialog ────────────────────────────────────────────────────────────

export function wireRaceHandler(sheet, html) {
  try {
    html.find('button.race-button, input[name="system.bio.race"]').off('click').on('click', ev => {
      ev.preventDefault();

      const content    = document.createElement('div');
      const raceSelect = document.createElement('select');
      raceSelect.style.width = '100%';
      raceSelect.className   = 'race-select';
      raceSelect.innerHTML   = `<option value="">-- Choisir une race --</option>` + RACES.map(r => `<option value="${r}">${r}</option>`).join('');
      content.appendChild(raceSelect);

      const subLabel         = document.createElement('div');
      subLabel.style.marginTop = '8px';
      subLabel.innerText     = 'Sous-race';
      content.appendChild(subLabel);

      const subSelect        = document.createElement('select');
      subSelect.style.width  = '100%';
      subSelect.className    = 'subrace-select';
      subSelect.innerHTML    = `<option value="">-- Choisir une sous-race --</option>`;
      content.appendChild(subSelect);

      const d = new Dialog({
        title: 'Sélectionner la race',
        content: content.outerHTML,
        buttons: {
          ok: {
            label: 'Valider',
            callback: async htmlDlg => {
              try {
                const r  = ($(htmlDlg).find('.race-select').val()    || '').toString();
                const sr = ($(htmlDlg).find('.subrace-select').val() || '').toString();
                await sheet.actor.update({ 'system.bio.race': r, 'system.bio.subrace': sr });
                try { foundry.utils.setProperty(sheet.actor, 'system.bio.race',    r);  } catch (e) {}
                try { foundry.utils.setProperty(sheet.actor, 'system.bio.subrace', sr); } catch (e) {}
                try { sheet.render(false); } catch (e) {}
              } catch (err) { console.error('Unable to persist race/subrace', err); }
            }
          },
          cancel: { label: 'Annuler' }
        },
        default: 'ok',
        render: htmlDlg => {
          try {
            const $dlg         = $(htmlDlg);
            const currentRace  = sheet.actor.system?.bio?.race    || '';
            const currentSub   = sheet.actor.system?.bio?.subrace || '';
            const $rs          = $dlg.find('.race-select');
            const $ss          = $dlg.find('.subrace-select');
            const updateSubs   = race => {
              $ss.empty().append('<option value="">-- Choisir une sous-race --</option>');
              for (const s of (SUBRACES_MAP[race] || [])) $ss.append(`<option value="${s}">${s}</option>`);
            };
            if ($rs.length) {
              $rs.off('change.race').on('change.race', () => updateSubs($rs.val()));
              updateSubs(currentRace);
              $rs.val(currentRace);
            }
            if ($ss.length) $ss.val(currentSub);
          } catch (e) {}
        }
      });
      d.render(true);
    });
  } catch (e) {}
}

// ── XP grant ──────────────────────────────────────────────────────────────

export function wireXpHandler(sheet, html) {
  if (!game.user.isGM) html.find('.xp-grant').hide();
  html.find('.xp-grant').on('click', ev => {
    ev.preventDefault();
    if (!game.user.isGM) return ui.notifications.warn('Seul le MJ peut attribuer des PX');
    openGrantXpDialog(sheet);
  });
}

// ── Stat roll ──────────────────────────────────────────────────────────────

export function wireStatRollHandler(sheet, html) {
  html.find('.stat-roll').on('click', ev => {
    ev.preventDefault();
    const attr = ev.currentTarget.dataset.attr;
    if (!attr) return ui.notifications.warn('Attribut non spécifié');
    const actor = sheet.actor;

    new Dialog({
      title: `Jet de caractéristique — ${attr}`,
      content: `<form><div class="form-group"><label>Bonus/Malus</label><input type="number" id="stat-bonus" value="0" /></div></form>`,
      buttons: {
        roll:   { label: 'Lancer',        callback: async dlg => doStatRoll(actor, attr, Number(dlg.find('#stat-bonus').val()) || 0, false) },
        gmroll: { label: 'BlindRoll GM',  callback: async dlg => doStatRoll(actor, attr, Number(dlg.find('#stat-bonus').val()) || 0, true)  },
        cancel: { label: 'Annuler' }
      },
      default: 'roll'
    }).render(true);
  });
}

async function doStatRoll(actor, attr, bonus, blind) {
  const base   = Number(actor.system.principal?.actuel?.[attr]) || 0;
  const target = base + bonus;
  const roll   = await rollD100();
  const total  = roll.total;
  const { html: resultText } = formatD100Result(total, target);
  const label        = STAT_ROLL_LABELS[attr] || attr;
  const bonusDisplay = bonus >= 0 ? `+${bonus}` : `${bonus}`;

  ChatMessage.create({
    user:    game.user.id,
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `
      <div class="stat-roll-result">
        <h3>Jet ${label}</h3>
        <div><strong>Bonus/Malus :</strong> ${bonusDisplay}</div>
        <div><strong>Résultat :</strong> <strong>${total}</strong> vs <strong>${target}</strong></div>
        <div>${resultText}</div>
        <div class="roll-details">${await roll.render()}</div>
        <br/>${buildRerollButton(actor.id, target, total - target)}
      </div>`,
    blind,
    whisper: blind ? ChatMessage.getWhisperRecipients('GM') : []
  });
}
