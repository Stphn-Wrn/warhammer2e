import { WarhammerActorSheet } from './sheet/WarhammerActorSheet.js';
import { WarhammerItemSheet } from './WarhammerItemSheet.js';
import { registerHandlebarsHelpers, preloadHandlebarsTemplates } from './helpers.js';

class WarhammerActor extends Actor {}

Hooks.once('init', function () {
  console.log('Warhammer2e | init');
  CONFIG.Actor.documentClass = WarhammerActor;

  Actors.unregisterSheet('core', ActorSheet);
  Actors.registerSheet('warhammer2e', WarhammerActorSheet, { types: ['character', 'monster'], makeDefault: true });

  Items.unregisterSheet('core', ItemSheet);
  Items.registerSheet('warhammer2e', WarhammerItemSheet, { types: ['sort'], makeDefault: true });

  // Suppress spurious re-renders triggered from within _updateObject
  try {
    const _origRender = WarhammerActorSheet.prototype.render;
    WarhammerActorSheet.prototype.render = function (...args) {
      try { if (this._suppressNextRender) { this._suppressNextRender = false; return this; } } catch (e) {}
      return _origRender.apply(this, args);
    };
  } catch (e) {}

  registerHandlebarsHelpers();
  preloadHandlebarsTemplates();
});

Hooks.on('preCreateToken', (token, options, userId) => {
  const actor = token.actor;
  if (!actor) return;
  token.updateSource({ actorLink: actor.type !== 'monster' });
});

Hooks.on('renderActorSheet', (app, html) => {
  const img = html[0]?.querySelector('[data-action="showPortrait"]');
  if (!img) return;

  img.addEventListener('click', async event => {
    event.stopImmediatePropagation();
    event.preventDefault();

    const actor     = app.actor;
    const imagePath = actor?.img;
    if (!imagePath) return;

    if (!game.user.isGM) {
      return new ImagePopout(imagePath, { title: actor.name, shareable: false }).render(true);
    }

    const content = `
      <div class="portrait-dialog" style="display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;">
        <img src="${imagePath}" style="max-width:100%;max-height:65vh;border-radius:6px;border:1px solid #000;box-shadow:0 0 12px rgba(0,0,0,0.8);margin-bottom:1rem;"/>
        <div class="portrait-buttons" style="display:flex;gap:10px;justify-content:center;margin-top:5px;">
          <button type="button" class="show-all"><i class="fas fa-eye"></i> Montrer à tout le monde</button>
          <button type="button" class="edit-img"><i class="fas fa-edit"></i> Modifier l'image</button>
        </div>
      </div>`;

    const dlg = new Dialog({
      title: `Portrait de ${actor.name}`,
      content,
      buttons: {},
      render: html => {
        html[0].querySelector('.show-all')?.addEventListener('click', async () => {
          await ChatMessage.create({
            user: game.user.id,
            speaker: ChatMessage.getSpeaker({ actor }),
            content: `<div class="portrait-broadcast" style="text-align:center;"><h3 style="margin-bottom:8px;">${actor.name}</h3><img src="${imagePath}" style="max-width:280px;border:2px solid #3a2a1c;border-radius:6px;box-shadow:0 0 6px rgba(0,0,0,0.5);" /></div>`
          });
          const popout = new ImagePopout(imagePath, { title: actor.name, shareable: true });
          popout.render(true);
          popout.shareImage();
        });

        html[0].querySelector('.edit-img')?.addEventListener('click', async () => {
          const fp = new FilePicker({
            type: 'image',
            current: imagePath || 'icons/',
            callback: async path => {
              await actor.update({ img: path });
              ui.notifications.info(`${actor.name} : portrait mis à jour.`);
              dlg.close();
            },
            top:  Math.min(window.innerHeight - 700, window.innerHeight / 2 - 350),
            left: Math.min(window.innerWidth  - 720, window.innerWidth  / 2 - 360)
          });
          fp.render(true);
        });
      },
      default: ''
    }, { width: 650, height: 'auto', resizable: true });

    dlg.render(true);
  });
});

Hooks.once('ready', () => {
  Combatant.prototype._getInitiativeFormula = function () {
    const actor   = this.actor;
    if (!actor) return '1d10';
    const agilite = Number(actor.system.principal?.actuel?.agilite) || 0;
    const nbDes   = 1 + Math.floor(agilite / 10);
    return Array(nbDes).fill('1d10').join(' + ');
  };
});
