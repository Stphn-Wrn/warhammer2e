export function wireCoinHandlers(sheet, html) {
  html.find('input[name="system.coins.copper"], input[name="system.coins.silver"], input[name="system.coins.gold"]')
    .on('change', async ev => {
      ev.preventDefault();
      const input = ev.currentTarget;
      const val   = Math.max(0, Number(input.value) || 0);
      try { await sheet.actor.update({ [input.name]: val }); ui.notifications.info('Pièces mises à jour'); }
      catch (err) { console.error(err); ui.notifications.error('Erreur lors de la persistance des pièces'); }
    });

  html.find('input[name="system.exchange.copper"], input[name="system.exchange.silver"], input[name="system.exchange.gold"]')
    .on('change', async ev => {
      ev.preventDefault();
      const raw = (ev.currentTarget.value || '').toString().replace(/,/g, '.');
      const val = Math.max(0, Number(raw) || 0);
      try { await sheet.actor.update({ [ev.currentTarget.name]: val }); ui.notifications.info('Taux de change mis à jour'); }
      catch (err) { console.error(err); ui.notifications.error('Erreur lors de la persistance du taux de change'); }
    });

  html.find('input[name="system.points.chance"]').on('change', async ev => {
    ev.preventDefault();
    let value = Number((ev.currentTarget.value || '').toString().replace(/,/g, '.'));
    if (!Number.isFinite(value)) value = 0;
    const max = Number(sheet.actor.system?.secondaire?.actuel?.pd) || 0;
    value = Math.max(0, Math.min(value, max));
    ev.currentTarget.value = value;
    try { await sheet.actor.update({ 'system.points.chance': value }); }
    catch (err) { console.error(err); ui.notifications.error('Erreur lors de la mise à jour de la Chance'); }
  });

  function computeTotalCO() {
    try {
      const copper = Math.max(0, Number(html.find('input[name="system.coins.copper"]').val()) || 0);
      const silver = Math.max(0, Number(html.find('input[name="system.coins.silver"]').val()) || 0);
      const gold   = Math.max(0, Number(html.find('input[name="system.coins.gold"]').val())   || 0);

      const rawC = Number(html.find('input[name="system.exchange.copper"]').val());
      const rawS = Number(html.find('input[name="system.exchange.silver"]').val());
      const rawG = Number(html.find('input[name="system.exchange.gold"]').val());

      const valC = (isNaN(rawC) || rawC <= 0) ? 1 / 240 : rawC;
      const valS = (isNaN(rawS) || rawS <= 0) ? 0.05    : rawS;
      const valG = (isNaN(rawG) || rawG <= 0) ? 1.0     : rawG;

      const total = copper * valC + silver * valS + gold * valG;

      const fmtInt   = n => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
      const fmtTotal = n => ((Math.round(n * 1000) / 1000).toFixed(3)).replace('.', ', ').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

      html.find('.co-value').text(fmtTotal(total));
      html.find('.summary-copper').text(fmtInt(copper));
      html.find('.summary-silver').text(fmtInt(silver));
      html.find('.summary-gold').text(fmtInt(gold));
      html.find('.summary-total').text(fmtTotal(total));
    } catch (err) { console.error('computeTotalCO failed', err); }
  }

  html.find('input[name^="system.coins."], input[name^="system.exchange."]').on('input change', () => computeTotalCO());
  try { computeTotalCO(); } catch (e) {}
}
