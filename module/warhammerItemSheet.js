class WarhammerItemSheet extends ItemSheet {
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["warhammer2e", "sheet", "item"],
      template: "systems/warhammer2e/templates/item/item-sheet.html",
      width: 640,
      height: 520,
      tabs: [{ navSelector: ".tabs", contentSelector: ".sheet-body", initial: "description" }]
    });
  }

  getData(options) {
    const data = super.getData(options);
    data.system = data.item.system || {};
    data.isWeapon = data.item.type === "weapon";
    data.isSkill = data.item.type === "skill";
    data.isTalent = data.item.type === "talent";
    data.isOther = !["weapon", "skill", "talent"].includes(data.item.type);
    return data;
  }

  activateListeners(html) {
    super.activateListeners(html);

    // Changement de type : sauvegarde puis re-render pour que le template s'adapte
    html.find("select[name='type']").on("change", async ev => {
      ev.preventDefault();
      await this._onSubmit(ev);
      this.render();
    });

    // Bouton supprimer avec confirmation
    html.find(".item-delete").on("click", ev => {
      ev.preventDefault();
      const itemName = this.item.name || "cet objet";
      new Dialog({
        title: `Supprimer ${itemName}`,
        content: `<p>Confirmer la suppression de <strong>${itemName}</strong> ?</p>`,
        buttons: {
          yes: {
            icon: '<i class="fas fa-check"></i>',
            label: "Oui",
            callback: async () => { await this.item.delete(); }
          },
          no: { icon: '<i class="fas fa-times"></i>', label: "Non" }
        },
        default: "no"
      }).render(true);
    });

    // Preview rapide (ex : degats)
    html.find("input[name='system.damage']").on("input", ev => {
      const v = ev.currentTarget.value;
      const out = html.find(".damage-preview");
      out.text(v ? `Formule: ${v}` : "");
    });
  }

  /* Persist item data */
  async _updateObject(event, formData) {
    await this.item.update(formData);
  }
}

/* Register the sheet so it is available in Foundry */
Hooks.once("init", () => {
  Items.registerSheet("warhammer2e", WarhammerItemSheet, { makeDefault: false });
});