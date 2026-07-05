export class WarhammerItemSheet extends ItemSheet {

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ['warhammer2e', 'sheet', 'item'],
      template: 'systems/warhammer2e/templates/item/item-sheet.html',
      width: 620,
      height: 'auto',
      resizable: true
    });
  }

  getData() {
    const data = super.getData();
    data.name         = this.item.name;
    data.isSort       = this.item.type === 'sort';
    data.isTalent     = this.item.type === 'talent';
    data.isWeapon     = this.item.type === 'weapon';
    data.isSkill      = this.item.type === 'skill';
    data.isAmmunition = this.item.type === 'ammunition';
    data.imgDisplay   = this.item.img || 'icons/svg/book.svg';
    return data;
  }

  async _updateObject(event, formData) {
    return this.item.update(foundry.utils.expandObject(formData));
  }
}
