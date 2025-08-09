export class Warhammer2eActorDataSchema extends foundry.abstract.DataSchema {
    static defineSchema() {
      return {
        caracteristiques: new foundry.data.fields.SchemaField({
          cc: new foundry.data.fields.NumberField({ label: "CC", required: true, initial: 0 }),
          ct: new foundry.data.fields.NumberField({ label: "CT", required: true, initial: 0 }),
          force: new foundry.data.fields.NumberField({ label: "F", required: true, initial: 0 }),
          endurance: new foundry.data.fields.NumberField({ label: "E", required: true, initial: 0 }),
          agilite: new foundry.data.fields.NumberField({ label: "Ag", required: true, initial: 0 }),
          intelligence: new foundry.data.fields.NumberField({ label: "Int", required: true, initial: 0 }),
          forceMentale: new foundry.data.fields.NumberField({ label: "FM", required: true, initial: 0 }),
          sociabilite: new foundry.data.fields.NumberField({ label: "Soc", required: true, initial: 0 }),
          attaques: new foundry.data.fields.NumberField({ label: "A", required: true, initial: 1 }),
          blessures: new foundry.data.fields.NumberField({ label: "B", required: true, initial: 10 }),
          magie: new foundry.data.fields.NumberField({ label: "Mag", required: true, initial: 0 }),
          pointsDestin: new foundry.data.fields.NumberField({ label: "PD", required: true, initial: 0 })
        })
      };
    }
  }
  