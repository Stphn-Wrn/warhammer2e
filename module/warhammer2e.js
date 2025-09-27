// ===== Documents =====
class WarhammerActor extends Actor {}
class WarhammerItem extends Item {}

// ===== Actor Sheet =====
class WarhammerActorSheet extends ActorSheet {
  // Liste des compétences avancées disponibles dans le système
  static get advancedSkillsList() {
    return [
      { key: "dressage", label: "Dressage", cara: "Soc" },
      { key: "baratin", label: "Baratin", cara: "Soc" },
      { key: "focalisation", label: "Focalisation", cara: "FM" },
      { key: "empriseAnimaux", label: "Emprise sur les animaux", cara: "Soc" },
      { key: "esquive", label: "Esquive", cara: "Ag" },
      { key: "pistage", label: "Pistage", cara: "Int" },
      { key: "soins", label: "Soins", cara: "Int" },
      { key: "hypnotisme", label: "Hypnotisme", cara: "FM" },
      { key: "lectureLevres", label: "Lecture sur les lèvres", cara: "Int" },
      { key: "sensMagie", label: "Sens de la magie", cara: "FM" },
      { key: "orientation", label: "Orientation", cara: "Int" },
      { key: "crochetage", label: "Crochetage", cara: "Ag" },
      { key: "preparationPoison", label: "Préparation de Poison", cara: "Int" },
      { key: "lireEcrire", label: "Lire/Écrire", cara: "Int" },
      { key: "navigation", label: "Navigation", cara: "Ag" },
      { key: "braconnage", label: "Braconnage", cara: "Ag" },
      { key: "filature", label: "Filature", cara: "Ag" },
      { key: "escamotage", label: "Escamotage", cara: "Ag" },
      { key: "torture", label: "Torture", cara: "Soc" },
      { key: "ventriloquie", label: "Ventriloquie", cara: "Soc" }
    ];
  }
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["warhammer2e", "sheet", "actor"],
      template: "systems/warhammer2e/templates/actor/character-sheet.html",
      width: 920,
      height: 800,
      tabs: [{ navSelector: ".tabs", contentSelector: ".sheet-body", initial: "main" }]
    });
  }

  getData(options) {
    const data = super.getData(options);
    const sys = this.actor.system;

    // ----- Profil Principal -----
    sys.principal ??= {};
    for (const k of ["base", "talents", "carriere", "avance", "mod", "actuel"]) {
      sys.principal[k] ??= {
        cc: 0, ct: 0, force: 0, endurance: 0,
        agilite: 0, intelligence: 0,
        forceMentale: 0, sociabilite: 0
      };
    }

    const P = sys.principal;
    const sumPrincipal = (s) =>
      (Number(P.base?.[s]) || 0) +
      (Number(P.talents?.[s]) || 0) +
      (Number(P.carriere?.[s]) || 0) +
      (Number(P.avance?.[s]) || 0) +
      (Number(P.mod?.[s]) || 0);

    sys.principal.actuel = {
      cc: sumPrincipal("cc"),
      ct: sumPrincipal("ct"),
      force: sumPrincipal("force"),
      endurance: sumPrincipal("endurance"),
      agilite: sumPrincipal("agilite"),
      intelligence: sumPrincipal("intelligence"),
      forceMentale: sumPrincipal("forceMentale"),
      sociabilite: sumPrincipal("sociabilite")
    };

    // ----- Profil Secondaire -----
    sys.secondaire ??= {};
    for (const k of ["base", "talents", "carriere", "avance", "mod", "actuel"]) {
      sys.secondaire[k] ??= { a: 0, b: 0, bf: 0, be: 0, mag: 0, mvt: 0, pf: 0, pd: 0 };
    }

    const S = sys.secondaire;
    S.base.bf = Math.round((sys.principal.actuel.force || 0) / 10);
    S.base.be = Math.round((sys.principal.actuel.endurance || 0) / 10);

    const sumSecondaire = (s) =>
      (Number(S.base?.[s]) || 0) +
      (Number(S.talents?.[s]) || 0) +
      (Number(S.carriere?.[s]) || 0) +
      (Number(S.avance?.[s]) || 0) +
      (Number(S.mod?.[s]) || 0);

    sys.secondaire.actuel = {
      a: sumSecondaire("a"),
      b: sumSecondaire("b"),
      bf: (S.base.bf || 0) + (S.mod.bf || 0),
      be: (S.base.be || 0) + (S.mod.be || 0),
      mag: sumSecondaire("mag"),
      mvt: sumSecondaire("mvt"),
      pf: sumSecondaire("pf"),
      pd: sumSecondaire("pd")
    };

    // ----- Combat -----
    sys.combat ??= {};
    const mvt = sys.secondaire.actuel.mvt || 0;
    sys.combat.move = mvt * 2;
    sys.combat.charge = mvt * 4;
    sys.combat.course = mvt * 6;
    sys.combat.jump = mvt + 6;

    // ----- Armures -----
    sys.armor ??= {};

    // Helper d'init pour une zone d'armure (light/medium/heavy)
    const initZone = () => ({
      light:  { eq: "NO", name: "", qualite: "Ordinaire", enc: 0 },
      medium: { eq: "NO", name: "", qualite: "Ordinaire", enc: 0 },
      heavy:  { eq: "NO", name: "", qualite: "Ordinaire", enc: 0 }
    });

    // Initialiser structure par zone si besoin
    for (const zone of ["head", "body", "armLeft", "armRight", "legLeft", "legRight"]) {
      const z = sys.armor[zone];
      if (!z || typeof z !== "object" || Array.isArray(z)) {
        sys.armor[zone] = initZone();
      } else {
        // S'assurer que chaque sous-objet existe
        sys.armor[zone].light  ??= { eq: "NO", name: "", qualite: "Ordinaire", enc: 0 };
        sys.armor[zone].medium ??= { eq: "NO", name: "", qualite: "Ordinaire", enc: 0 };
        sys.armor[zone].heavy  ??= { eq: "NO", name: "", qualite: "Ordinaire", enc: 0 };
      }
    }

    // Bonus par zone (numériques)
    sys.armor.headBonus ??= 0;
    sys.armor.bodyBonus ??= 0;
    sys.armor.armLeftBonus ??= 0;
    sys.armor.armRightBonus ??= 0;
    sys.armor.legLeftBonus ??= 0;
    sys.armor.legRightBonus ??= 0;

    // Valeur équipée (PA de la pièce + bonus), séparée de sys.armor.{zone} (qui est un objet)
    sys.armorEquipped ??= {};
    for (const zone of ["head", "body", "armLeft", "armRight", "legLeft", "legRight"]) {
      sys.armorEquipped[zone] = Number(sys.armorEquipped[zone]) || 0;
    }

    // Totaux affichés = PA équipé + BE
    sys.armorTotals = {
      head:    sys.armorEquipped.head    + sys.secondaire.actuel.be,
      body:    sys.armorEquipped.body    + sys.secondaire.actuel.be,
      armLeft: sys.armorEquipped.armLeft + sys.secondaire.actuel.be,
      armRight:sys.armorEquipped.armRight+ sys.secondaire.actuel.be,
      legLeft: sys.armorEquipped.legLeft + sys.secondaire.actuel.be,
      legRight:sys.armorEquipped.legRight+ sys.secondaire.actuel.be
    };

    // ----- Données renvoyées au template -----
  // Ensure spellsOwned map exists for persisting which spells the actor "possesses"
  sys.spellsOwned ??= {};
    
    // ----- Compétences -----
  sys.skills ??= {};
  sys.skills.base ??= {};
  sys.skills.advanced ??= [];

  // Ensure a persistent incremental id counter for stable ids
  sys._nextId ??= Number(sys._nextId) || 1;

    // Définir les caractéristiques par défaut pour chaque compétence de base
    const defaultSkillCaracteristics = {
      soinsAnimaux: 'Int',
      charisme: 'Soc', 
      commandement: 'Soc',
      resistanceAlcool: 'E',
      deguisement: 'Soc',
      conduiteAttelage: 'Ag',
      dissimulation: 'Ag',
      evaluation: 'Int',
      jeu: 'Int',
      commerage: 'Soc',
      marchandage: 'Soc',
      intimidation: 'F', // Par défaut F, mais peut être changé
      survie: 'Int',
      perception: 'Int',
      equitation: 'Ag',
      canotage: 'F',
      escalade: 'F',
      fouille: 'Int',
      deplacementSilencieux: 'Ag',
      natation: 'F'
    };

    // Initialiser les compétences de base avec leurs caractéristiques
    for (const [skillKey, defaultCara] of Object.entries(defaultSkillCaracteristics)) {
      sys.skills.base[skillKey] ??= {};
      sys.skills.base[skillKey].cara ??= defaultCara;
      // Initialiser toutes les valeurs par défaut
      sys.skills.base[skillKey].niveau ??= 0;
      sys.skills.base[skillKey].talents ??= 0;
      sys.skills.base[skillKey].divers ??= 0;
      sys.skills.base[skillKey].avance ??= false;
    }

    // Mapping des caractéristiques pour les compétences
    const caraMapping = {
      INT: sys.principal.actuel.intelligence || 0,
      SOC: sys.principal.actuel.sociabilite || 0,
      AGI: sys.principal.actuel.agilite || 0,
      END: sys.principal.actuel.endurance || 0,
      FOR: sys.principal.actuel.force || 0,
      CC: sys.principal.actuel.cc || 0,
      CT: sys.principal.actuel.ct || 0,
      FM: sys.principal.actuel.forceMentale || 0
    };

    // Calculer les totaux des compétences
    for (const [skillKey, skill] of Object.entries(sys.skills.base)) {
      if (skill && typeof skill === 'object') {
        // Initialiser les valeurs par défaut
        skill.niveau ??= 0;
        skill.talents ??= 0;
        skill.divers ??= 0;
        skill.avance ??= false;
        
        // Pour intimidation, gérer le choix de caractéristique
        let caraValue = 0;
        if (skillKey === 'intimidation') {
          // Si cara est définie, l'utiliser, sinon utiliser F par défaut
          const caraChoice = skill.cara || 'F';
          if (caraChoice === 'Soc') {
            caraValue = caraMapping['Soc'] || 0;
          } else {
            caraValue = caraMapping['F'] || 0;
          }
        } else {
          // Récupérer la valeur de la caractéristique normale
          caraValue = caraMapping[skill.cara] || 0;
        }
        
        // Calculer la base de la caractéristique (half si pas avance, full si avance)
        const caraBase = skill.avance ? caraValue : Math.floor(caraValue / 2);
        
        // Calculer le total : niveau + talents + divers + caractéristique (conditionnelle)
        const newTotal = (Number(skill.niveau) || 0) + 
                        (Number(skill.talents) || 0) + 
                        (Number(skill.divers) || 0) + 
                        caraBase;
        
        // Toujours mettre à jour le total calculé
        skill.total = newTotal;
      }
    }

    // Ensure talents have stable ids
    if (Array.isArray(sys.talents)) {
      for (const t of sys.talents) {
        if (t && (t.id === undefined || t.id === null)) t.id = sys._nextId++;
      }
    } else {
      sys.talents = [];
    }

    // Ensure regles have stable ids
    if (Array.isArray(sys.regles)) {
      for (const r of sys.regles) {
        if (r && (r.id === undefined || r.id === null)) r.id = sys._nextId++;
      }
    } else {
      sys.regles = [];
    }

    // Ensure advanced skills have stable ids
    if (Array.isArray(sys.skills.advanced)) {
      for (const s of sys.skills.advanced) {
        if (s && (s.id === undefined || s.id === null)) s.id = sys._nextId++;
      }
    } else {
      sys.skills.advanced = [];
    }

    data.system = sys;
    data.type = this.actor.type;
    return data;
  }

  /* ---------- Talents (helpers) ---------- */
  // Trouver l'index d'un talent par son id
  _findTalentIndexById(id) {
    const talents = Array.isArray(this.actor.system.talents) ? this.actor.system.talents : [];
    return talents.findIndex(t => String(t.id) === String(id));
  }

  // Ajouter un nouveau talent (retourne Promise)
  _addTalent() {
    const sys = this.actor.system;
    const talents = Array.isArray(sys.talents) ? sys.talents.slice() : [];
    const id = sys._nextId ?? Date.now();
    const nextId = (Number(sys._nextId) || Date.now()) + 1;
    const newTalent = { id, name: "", description: "" };
    talents.push(newTalent);
    return this.actor.update({ "system.talents": talents, "system._nextId": nextId });
  }

  // Supprimer un talent par id (retourne Promise)
  _deleteTalentById(id) {
    const sys = this.actor.system;
    const talents = Array.isArray(sys.talents) ? sys.talents.slice() : [];
    const idx = talents.findIndex(t => String(t.id) === String(id));
    if (idx < 0) return Promise.resolve(false);
    talents.splice(idx, 1);
    return this.actor.update({ "system.talents": talents }).then(() => true);
  }

  /* ---------- Règles (helpers) ---------- */
  // Trouver l'index d'une règle par son id
  _findRegleIndexById(id) {
    const regles = Array.isArray(this.actor.system.regles) ? this.actor.system.regles : [];
    return regles.findIndex(r => String(r.id) === String(id));
  }

  // Ajouter une nouvelle règle (retourne la Promise de update)
  _addRegle() {
    const sys = this.actor.system;
    const regles = Array.isArray(sys.regles) ? sys.regles.slice() : [];
    const id = sys._nextId ?? Date.now();
    const nextId = (Number(sys._nextId) || Date.now()) + 1;
    const newRegle = { id, name: "", description: "" };
    regles.push(newRegle);
    return this.actor.update({ "system.regles": regles, "system._nextId": nextId });
  }

  // Supprimer une règle par id (retourne la Promise de update)
  _deleteRegleById(id) {
    const sys = this.actor.system;
    const regles = Array.isArray(sys.regles) ? sys.regles.slice() : [];
    const idx = regles.findIndex(r => String(r.id) === String(id));
    if (idx < 0) return Promise.resolve(false);
    regles.splice(idx, 1);
    return this.actor.update({ "system.regles": regles }).then(() => true);
  }

  activateListeners(html) {
    super.activateListeners(html);

    // Onglets (API V13+)
    new foundry.applications.ux.Tabs({
      navSelector: ".tabs",
      contentSelector: ".sheet-body",
      initial: "main"
    });

    const zones = ["head","body","armLeft","armRight","legLeft","legRight"];

    // Quand on tape YES/NO dans un champ d'équipement
    html.find(".armor-equip").on("change", ev => {
      const input = ev.currentTarget;
      const zone = input.dataset.zone;
      const pa = Number(input.dataset.pa) || 0;
      const val = (input.value || "").toUpperCase().trim();

      // Mettre tous NO (dans le DOM + déclencher change pour persister)
      html.find(`.armor-equip[data-zone='${zone}']`).each((_, el) => {
        if (el !== input) {
          el.value = "NO";
          $(el).trigger("change");
        }
      });

      // Mettre la ligne cliquée à YES (persistée)
      input.value = (val === "YES") ? "YES" : "NO";
      $(input).trigger("change");

      // Recalcule PA équipé = PA de la ligne + bonus de la zone
      const bonusInput = html.find(`input[name='system.armor.${zone}Bonus']`);
      const bonusValue = (bonusInput.val() || "").toString().replace(/,/g, '.');
      const bonus = Number(bonusValue) || 0;
      const equipped = (input.value === "YES") ? (pa + bonus) : 0;

      this.actor.update({ [`system.armorEquipped.${zone}`]: equipped });
    });

    // Quand un Bonus change, on recalcule la zone si une ligne est "YES"
    html.find(".armor-equip").on("change", ev => {
      const input = ev.currentTarget;
      const zone = input.dataset.zone;
      const pa = Number(input.dataset.pa) || 0;
      const val = (input.value || "").toUpperCase().trim();

      // Mettre tous les autres à NO (sans retrigger change)
      html.find(`.armor-equip[data-zone='${zone}']`).each((_, el) => {
        if (el !== input) el.value = "NO";
      });

      // Forcer la valeur YES/NO sur l’input cliqué
      input.value = (val === "YES") ? "YES" : "NO";

      // Calcul bonus
      const bonusInput = html.find(`input[name='system.armor.${zone}Bonus']`);
      const bonusValue = (bonusInput.val() || "").toString().replace(/,/g, '.');
      const bonus = Number(bonusValue) || 0;
      const equipped = (input.value === "YES") ? (pa + bonus) : 0;

      // Mettre à jour l’acteur (une seule fois)
      this.actor.update({ [`system.armorEquipped.${zone}`]: equipped });
    });

    // Event listeners pour les compétences
    html.find("input[name*='skills.base'][name*='niveau']").on("change", ev => {
      const input = ev.currentTarget;
      const name = input.name;
      const newValue = parseInt(input.value) || 0;
      const updateData = { [name]: newValue };
      this.actor.update(updateData);
    });

    html.find("input[name*='skills.base'][name*='talents'], input[name*='skills.base'][name*='divers']").on("change", ev => {
      const input = ev.currentTarget;
      const name = input.name;
      const newValue = parseInt(input.value) || 0;
      const updateData = { [name]: newValue };
      this.actor.update(updateData);
    });

    html.find("input[name*='skills.base'][name*='avance']").on("change", ev => {
      const checkbox = ev.currentTarget;
      const name = checkbox.name;
      const newValue = checkbox.checked;
      const updateData = { [name]: newValue };
      this.actor.update(updateData);
    });

    html.find("select[name*='skills.base'][name*='cara']").on("change", ev => {
      const select = ev.currentTarget;
      const name = select.name;
      const newValue = select.value;
      const updateData = { [name]: newValue };
      this.actor.update(updateData);
    });

    // Event listeners pour les talents
    html.find(".talent-add").on("click", ev => {
      ev.preventDefault();
      this._addTalent();
    });

    html.find(".talent-delete").on("click", ev => {
      ev.preventDefault();
      const id = ev.currentTarget.dataset.talentId;
      const talents = Array.isArray(this.actor.system.talents) ? this.actor.system.talents : [];
      const idx = talents.findIndex(t => String(t.id) === String(id));
      const talentName = talents[idx]?.name || "ce talent";
      Dialog.confirm({
        title: "Supprimer le talent",
        content: `<p>Êtes-vous sûr de vouloir supprimer <strong>${talentName}</strong> ?</p>`,
        yes: async () => {
          await this._deleteTalentById(id);
        },
        no: () => {},
        defaultYes: false
      });
    });

    // Event listeners pour les règles spéciales
    html.find(".regles-spe-add").on("click", ev => {
      ev.preventDefault();
      this._addRegle();
    });

    html.find(".regle-delete").on("click", ev => {
      ev.preventDefault();
      const id = ev.currentTarget.dataset.regleId;
      const regles = Array.isArray(this.actor.system.regles) ? this.actor.system.regles : [];
      const idx = regles.findIndex(r => String(r.id) === String(id));
      const regleName = regles[idx]?.name || "cette règle";
      Dialog.confirm({
        title: "Supprimer la règle spéciale",
        content: `<p>Êtes-vous sûr de vouloir supprimer <strong>${regleName}</strong> ?</p>`,
        yes: async () => {
          await this._deleteRegleById(id);
        },
        no: () => {},
        defaultYes: false
      });
    });

    // Event listener pour ajouter une compétence avancée via un sélecteur
    html.find(".skill-add").on("click", ev => {
      ev.preventDefault();
      const allSkills = WarhammerActorSheet.advancedSkillsList;
  // Récupérer les clés déjà présentes
  let currentSkills = this.actor.system.skills?.advanced;
  if (!Array.isArray(currentSkills)) currentSkills = [];
  const currentKeys = currentSkills.map(s => s.key);
  // Filtrer les compétences non déjà ajoutées
  const availableSkills = allSkills.filter(s => !currentKeys.includes(s.key));
  // Générer le select HTML
  let options = availableSkills.map(s => `<option value='${s.key}'>${s.label}</option>`).join("");
  const content = `<form><div class='form-group'><label>Choisir une compétence avancée :</label><select id='advanced-skill-select'>${options}</select></div></form>`;
      new Dialog({
        title: "Ajouter une compétence avancée",
        content,
        buttons: {
          add: {
            label: "Ajouter",
            callback: htmlDialog => {
              const selectedKey = htmlDialog.find("#advanced-skill-select").val();
              const skillDef = allSkills.find(s => s.key === selectedKey);
              if (!skillDef) return;
              const sys = this.actor.system;
              let skills = Array.isArray(sys.skills?.advanced) ? sys.skills.advanced.slice() : [];
              // Vérifier qu'on n'ajoute pas un doublon
              if (!skills.some(s => s.key === skillDef.key)) {
                const newSkill = {
                  id: sys._nextId ?? Date.now(),
                  key: skillDef.key,
                  label: skillDef.label,
                  cara: skillDef.cara,
                  niveau: 0,
                  talents: 0,
                  divers: 0,
                  total: 0,
                  avance: false
                };
                const nextId = (Number(sys._nextId) || Date.now()) + 1;
                skills.push(newSkill);
                this.actor.update({ "system.skills.advanced": skills, "system._nextId": nextId });
              }
            }
          },
          cancel: { label: "Annuler" }
        },
        default: "add"
      }).render(true);
    });

  // Event listener spécifique pour la suppression des compétences avancées
    html.find("table.skills-table .skill-delete").on("click", ev => {
      ev.preventDefault();
      ev.stopPropagation();
      const id = ev.currentTarget.dataset.skillId;
      const advancedSkills = this.actor.system.skills?.advanced;
      if (!advancedSkills || !Array.isArray(advancedSkills)) {
        ui.notifications.warn("Aucune compétence avancée trouvée");
        return;
      }
      const skills = advancedSkills.slice();
      const idx = skills.findIndex(s => String(s.id) === String(id));
      if (idx < 0) {
        ui.notifications.warn("Compétence non trouvée");
        return;
      }
      const skillName = skills[idx]?.label || "cette compétence";
      Dialog.confirm({
        title: "Supprimer la compétence",
        content: `<p>Êtes-vous sûr de vouloir supprimer <strong>${skillName}</strong> ?</p>`,
        yes: () => {
          skills.splice(idx, 1);
          this.actor.update({ "system.skills.advanced": skills });
        },
        no: () => {},
        defaultYes: false
      });
    });

    // Event listeners pour les jets de compétences
    html.find(".skill-roll").on("click", ev => {
      ev.preventDefault();
      const button = ev.currentTarget;
      const skillName = button.dataset.skill;
      
      // Vérifier si c'est un index numérique (compétence avancée)
      if (!isNaN(skillName)) {
        this._handleAdvancedSkillRoll(parseInt(skillName));
        return;
      }
      
      // Récupérer les données de la compétence de base
      const skillData = this.actor.system.skills?.base?.[skillName];
      if (!skillData) {
        ui.notifications.warn("Compétence non trouvée");
        return;
      }

      // Calculer le total de la compétence
      const niveau = Number(skillData.niveau) || 0;
      const talents = Number(skillData.talents) || 0;
      const divers = Number(skillData.divers) || 0;
      const avance = skillData.avance || false;
      
      // Récupérer la valeur de caractéristique
      let caracValue = 0;
      if (skillName === 'intimidation') {
        const caraChoice = skillData.cara || 'F';
        if (caraChoice === 'Soc') {
          caracValue = this.actor.system.principal?.actuel?.sociabilite || 0;
        } else {
          caracValue = this.actor.system.principal?.actuel?.force || 0;
        }
      } else {
        // Mapping pour les autres compétences
        const caracMapping = {
          'soinsAnimaux': this.actor.system.principal?.actuel?.intelligence || 0,
          'charisme': this.actor.system.principal?.actuel?.sociabilite || 0,
          'commandement': this.actor.system.principal?.actuel?.sociabilite || 0,
          'resistanceAlcool': this.actor.system.principal?.actuel?.endurance || 0,
          'deguisement': this.actor.system.principal?.actuel?.sociabilite || 0,
          'conduiteAttelage': this.actor.system.principal?.actuel?.agilite || 0,
          'dissimulation': this.actor.system.principal?.actuel?.agilite || 0,
          'evaluation': this.actor.system.principal?.actuel?.intelligence || 0,
          'jeu': this.actor.system.principal?.actuel?.intelligence || 0,
          'commerage': this.actor.system.principal?.actuel?.sociabilite || 0,
          'marchandage': this.actor.system.principal?.actuel?.sociabilite || 0,
          'survie': this.actor.system.principal?.actuel?.intelligence || 0,
          'perception': this.actor.system.principal?.actuel?.intelligence || 0,
          'equitation': this.actor.system.principal?.actuel?.agilite || 0,
          'canotage': this.actor.system.principal?.actuel?.force || 0,
          'escalade': this.actor.system.principal?.actuel?.force || 0,
          'fouille': this.actor.system.principal?.actuel?.intelligence || 0,
          'deplacementSilencieux': this.actor.system.principal?.actuel?.agilite || 0,
          'natation': this.actor.system.principal?.actuel?.force || 0
        };
        caracValue = caracMapping[skillName] || 0;
      }
      
      const caracBase = avance ? caracValue : Math.floor(caracValue / 2);
      const skillTotal = niveau + talents + divers + caracBase;
      
      // Ouvrir la dialog de jet
      this._showSkillRollDialog(skillName, skillTotal);
    });

    // Spells tab interactions
    const spellsSection = html.find('.spells-section');
    if (spellsSection.length) {
      // When clicking a grimoire tab, show the spells list container
      spellsSection.find('.gold-tab[data-cat]').on('click', ev => {
        ev.preventDefault();
        const cat = ev.currentTarget.dataset.cat;
        // If the tab is the Occulte grimoire and a school is selected, show spells for that school
        if (cat === 'occulte') {
          const school = this.actor.system?.spells?.school || '';
          if (school) return this._renderSpellsBySchool(school);
        }
        // If the tab is the Divin grimoire and a divine domain is selected, show spells for that domain
        if (cat === 'divin') {
          const divine = this.actor.system?.spells?.divine || '';
          if (divine) return this._renderSpellsBySchool(divine);
        }
        this._renderSpellsList(cat);
      });

      // When the school select changes, persist the choice and let the sheet re-render
      spellsSection.find('select[name="system.spells.school"]').on('change', async ev => {
        ev.preventDefault();
        const val = ev.currentTarget.value;
        // Persist selection so re-render keeps it
        try {
          await this.actor.update({ 'system.spells.school': val });
        } catch (err) {
          console.error('Unable to persist selected school', err);
        }
        // Immediately render spells for the chosen school so the Occulte tab (if open) shows them
        try {
          this._renderSpellsBySchool(val);
        } catch (err) {
          console.error('Unable to render spells by school', err);
        }
      });

      // Persist and render selection for divine domains (Divin grimoire)
      spellsSection.find('select[name="system.spells.divine"]').on('change', async ev => {
        ev.preventDefault();
        const val = ev.currentTarget.value;
        try {
          await this.actor.update({ 'system.spells.divine': val });
        } catch (err) {
          console.error('Unable to persist selected divine domain', err);
        }
        try {
          this._renderSpellsBySchool(val);
        } catch (err) {
          console.error('Unable to render spells by divine domain', err);
        }
      });

      // When the sheet is activated, render spells from the currently saved school (if any)
      const currentSchool = spellsSection.find('select[name="system.spells.school"]').val();
      if (currentSchool) {
        this._renderSpellsBySchool(currentSchool);
      }
      // Malédiction de Tzeentch button
      spellsSection.find('[data-action="malediction-tzeentch"]').on('click', ev => {
        ev.preventDefault();
        // Appel à la fonction top-level en lui passant l'acteur courant
        _openMaledictionDialog(this.actor);
      });
      // Colère des Dieux button
      spellsSection.find('[data-action="colere-dieux"]').on('click', ev => {
        ev.preventDefault();
        _openColereDialog(this.actor);
      });
    }

  }

  // Méthode pour gérer les jets de compétences avancées
  _handleAdvancedSkillRoll(skillIndex) {
  const skillData = Array.isArray(this.actor.system.skills?.advanced) ? this.actor.system.skills.advanced[skillIndex] : undefined;
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

    // Mapping des caractéristiques
    const caracMapping = {
      "CC": this.actor.system.principal?.actuel?.cc || 0,
      "CT": this.actor.system.principal?.actuel?.ct || 0,
      "F": this.actor.system.principal?.actuel?.force || 0,
      "E": this.actor.system.principal?.actuel?.endurance || 0,
      "Ag": this.actor.system.principal?.actuel?.agilite || 0,
      "Int": this.actor.system.principal?.actuel?.intelligence || 0,
      "FM": this.actor.system.principal?.actuel?.forceMentale || 0,
      "Soc": this.actor.system.principal?.actuel?.sociabilite || 0
    };

    const caracValue = Number(caracMapping[cara]) || 0;
    const caracBase = avance ? caracValue : Math.floor(caracValue / 2);
    const skillTotal = niveau + talents + divers + caracBase;

    // Ouvrir la dialog de jet
    this._showSkillRollDialog(skillName, skillTotal);
  }

  // Méthode pour afficher la dialog de jet de compétence
  _showSkillRollDialog(skillName, skillTotal) {
    const skillDisplayName = this._getSkillDisplayName(skillName);
    
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
            await this._rollSkillTest(skillName, finalTotal, modifier);
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Annuler"
        }
      },
      default: "roll",
      render: (html) => {
        // Mettre à jour le total final quand le modificateur change
        html.find("#skill-modifier").on("input", (ev) => {
          const modifier = parseInt(ev.target.value) || 0;
          const finalTotal = skillTotal + modifier;
          html.find("#final-total").val(finalTotal);
        });
      }
    }).render(true);
  }

  // Obtenir le nom d'affichage de la compétence
  _getSkillDisplayName(skillName) {
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

  // Effectuer le jet de compétence
  async _rollSkillTest(skillName, targetNumber, modifier) {
    const roll = new Roll("1d100");
    await roll.evaluate();
    
    const result = roll.total;
    const success = result <= targetNumber;
    const degrees = Math.floor(Math.abs(targetNumber - result) / 10);
    
    const skillDisplayName = this._getSkillDisplayName(skillName);
    
    // Préparer le message de chat
    let resultText = "";
    if (success) {
      if (degrees === 0) {
        resultText = `<span style="color: green;"><strong>RÉUSSITE</strong></span>`;
      } else {
        resultText = `<span style="color: green;"><strong>RÉUSSITE</strong> avec ${degrees} degré${degrees > 1 ? 's' : ''}</span>`;
      }
    } else {
      if (degrees === 0) {
        resultText = `<span style="color: red;"><strong>ÉCHEC</strong></span>`;
      } else {
        resultText = `<span style="color: red;"><strong>ÉCHEC</strong> avec ${degrees} degré${degrees > 1 ? 's' : ''}</span>`;
      }
    }

    // Afficher le message dans le chat
    const chatData = {
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({actor: this.actor}),
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

    ChatMessage.create(chatData);
  }
}

// Ouvre une dialog pour choisir l'écho, lance 1d100 et affiche le résultat
async function _openMaledictionDialog(actor) {
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
            const text = await _resolveEchoTableResult(sel);
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

// Charge echos.json et renvoie le texte correspondant au choix et au 1d100
async function _resolveEchoTableResult(tableName) {
  const url = `systems/warhammer2e/echos.json`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Impossible de charger ${url}`);
  const data = await resp.json();
  const table = (data.tables || []).find(t => t.name === tableName);
  if (!table) throw new Error('Table non trouvée: ' + tableName);
  const roll = await new Roll('1d100').evaluate({async: true});
  const val = roll.total;
  const result = (table.results || []).find(r => r.range && r.range.length === 2 && val >= r.range[0] && val <= r.range[1]);
  if (!result) return `Jet: ${val} — Aucun résultat trouvé.`;
  return `Jet: ${val} — ${result.text}`;
}

// Ouvre une dialog pour Colère des Dieux, charge colere.json, tire 1d100 et affiche le résultat
async function _openColereDialog(actor) {
  // Le fichier colere.json définit directement une table unique ; on propose juste de tirer
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
            const text = await _resolveColereResult();
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

// Charge colere.json et retourne le texte correspondant au 1d100
async function _resolveColereResult() {
  const url = `systems/warhammer2e/colere.json`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Impossible de charger ${url}`);
  const data = await resp.json();
  const roll = await new Roll('1d100').evaluate({async: true});
  const val = roll.total;
  const result = (data.results || []).find(r => r.range && r.range.length === 2 && val >= r.range[0] && val <= r.range[1]);
  if (!result) return `Jet: ${val} — Aucun résultat trouvé.`;
  return `Jet: ${val} — ${result.text}`;
}

// ===== Item Sheet minimal =====
class WarhammerItemSheet extends ItemSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["warhammer2e", "sheet", "item"],
      template: "systems/warhammer2e/templates/item/item-sheet.html",
      width: 520,
      height: 420
    });
  }
  getData() {
    return super.getData();
  }
}

// ===== Preload templates =====
async function preloadHandlebarsTemplates() {
  return loadTemplates([
    "systems/warhammer2e/templates/actor/character-sheet.html",
    "systems/warhammer2e/templates/item/item-sheet.html",
    "systems/warhammer2e/templates/actor/tabs/tab-main.html",
    "systems/warhammer2e/templates/actor/tabs/tab-bio.html",
    "systems/warhammer2e/templates/actor/tabs/tab-weapons.html",
    "systems/warhammer2e/templates/actor/tabs/tab-armor.html",
    "systems/warhammer2e/templates/actor/tabs/tab-spells.html",
    "systems/warhammer2e/templates/actor/tabs/tab-career.html",
    "systems/warhammer2e/templates/actor/tabs/tab-inventory.html"
  ]);
}

// ===== Init registration =====
Hooks.once("init", function () {
  console.log("Warhammer2e | init");
  CONFIG.Actor.documentClass = WarhammerActor;
  CONFIG.Item.documentClass = WarhammerItem;

  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("warhammer2e", WarhammerActorSheet, { types: ["character", "npc"], makeDefault: true });

  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("warhammer2e", WarhammerItemSheet, { types: ["skill", "talent", "weapon"], makeDefault: true });

  Handlebars.registerHelper("capitalize", function (str) {
    if (typeof str !== "string") return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
  });

  // Comparaison stricte
  Handlebars.registerHelper("eq", (a, b) => a === b);

  // Helper pour calculer le total d'une compétence
  Handlebars.registerHelper("skillTotal", function(skill, caracValue, options) {
    if (!skill || typeof skill !== 'object') return 0;
    
    const niveau = Number(skill.niveau) || 0;
    const talents = Number(skill.talents) || 0;
    const divers = Number(skill.divers) || 0;
    const avance = skill.avance || false;
    const caraVal = Number(caracValue) || 0;
    
    const caraBase = avance ? caraVal : Math.floor(caraVal / 2);
    
    return niveau + talents + divers + caraBase;
  });

  // Helper pour calculer le total d'une compétence avancée (avec caractéristique dynamique)
  Handlebars.registerHelper("advancedSkillTotal", function(skill, actorData, options) {
    if (!skill || typeof skill !== 'object' || !actorData || !actorData.principal) return 0;
    
    const niveau = Number(skill.niveau) || 0;
    const talents = Number(skill.talents) || 0;
    const divers = Number(skill.divers) || 0;
    const avance = skill.avance || false;
    const cara = skill.cara;
    
    if (!cara) return niveau + talents + divers;
    
    // Mapping des caractéristiques
    const caracMapping = {
      "CC": actorData.principal.actuel.cc,
      "CT": actorData.principal.actuel.ct,
      "F": actorData.principal.actuel.force,
      "E": actorData.principal.actuel.endurance,
      "Ag": actorData.principal.actuel.agilite,
      "Int": actorData.principal.actuel.intelligence,
      "FM": actorData.principal.actuel.forceMentale,
      "Soc": actorData.principal.actuel.sociabilite
    };
    
    const caracValue = Number(caracMapping[cara]) || 0;
    const caraBase = avance ? caracValue : Math.floor(caracValue / 2);
    
    return niveau + talents + divers + caraBase;
  });

  // Somme robuste (évite NaN / [object Object])
  Handlebars.registerHelper("sum", function (a, b) {
    const n1 = Number.isFinite(Number(a)) ? Number(a) : 0;
    const n2 = Number.isFinite(Number(b)) ? Number(b) : 0;
    return n1 + n2;
  });

  preloadHandlebarsTemplates();
});

// --- Spells loader / renderer ---
WarhammerActorSheet._spellsCache = null;
WarhammerActorSheet.loadSpells = async function() {
  if (this._spellsCache) return this._spellsCache;
  try {
    const res = await fetch('systems/warhammer2e/spells.json');
    const data = await res.json();

    // Normalize into a flat map of lists keyed by school/domain name
    const normalized = {};

    // Helper: copy an object of arrays into normalized
    const copyMap = (obj) => {
      if (!obj || typeof obj !== 'object') return;
      for (const [k, v] of Object.entries(obj)) {
        if (Array.isArray(v)) normalized[k] = v;
      }
    };

    // 1) If the file already has top-level arrays per key (legacy), copy them
    for (const [k, v] of Object.entries(data)) {
      if (Array.isArray(v) && v.length && typeof v[0] === 'object' && ('id' in v[0] || 'name' in v[0])) {
        normalized[k] = v;
      }
    }

    // 2) Handle new structure: data.ecole may be an object or an array of objects
    if ('ecole' in data) {
      const e = data.ecole;
      if (Array.isArray(e)) {
        for (const part of e) {
          if (part && typeof part === 'object') copyMap(part);
        }
      } else {
        copyMap(e);
      }
    }

    // 3) Handle divin structure: could be object {manann: [...]} OR array of domain objects OR array of spells with domain field
    if ('divin' in data) {
      const d = data.divin;
      if (Array.isArray(d)) {
        // If items have a domain property, group by domain
        if (d.length && d.every(it => it && typeof it === 'object' && 'domain' in it)) {
          for (const s of d) {
            const domain = s.domain || 'unknown';
            normalized[domain] ??= [];
            normalized[domain].push(s);
          }
        } else {
          // Otherwise assume array of objects mapping domain->array
          for (const part of d) {
            if (part && typeof part === 'object') copyMap(part);
          }
        }
      } else {
        copyMap(d);
      }
    }

    // 4) Ensure any remaining top-level arrays are included (fallback)
    for (const [k, v] of Object.entries(data)) {
      if (!(k in normalized) && Array.isArray(v)) normalized[k] = v;
    }

    this._spellsCache = normalized;
    return normalized;
  } catch (err) {
    console.error('Unable to load spells.json', err);
    this._spellsCache = {};
    return this._spellsCache;
  }
};

WarhammerActorSheet.prototype._renderSpellsList = async function(cat) {
  const data = await WarhammerActorSheet.loadSpells();
  const container = this.element.find('.spells-list');
  container.empty().show();
  const rawSpells = data[cat] || [];
  if (!rawSpells.length) {
    container.html('<div>Aucun sort trouvé pour cette catégorie.</div>');
    return;
  }

  // Trier par difficulté (asc) puis par possession (les possédés avant les non-possédés), puis par nom
  const ownedMap = this.actor.system?.spellsOwned || {};
  const spells = rawSpells.slice().sort((a, b) => {
    const da = Number(a.difficulte) || 0;
    const db = Number(b.difficulte) || 0;
    if (da !== db) return da - db;
    const ao = !!ownedMap[a.id];
    const bo = !!ownedMap[b.id];
    if (ao !== bo) return ao ? -1 : 1; // owned first
    return String(a.name || '').localeCompare(String(b.name || ''));
  });

  const html = [];
  for (const s of spells) {
    const owned = !!(this.actor.system?.spellsOwned && this.actor.system.spellsOwned[s.id]);
    html.push(`
      <div class="spell-card" data-spell-id="${s.id}" style="border:1px solid #ccc; border-radius:8px; padding:12px; margin-bottom:12px; background:#f7f5f2;">
        <h3 style="text-align:center; color:#6b4b1a; margin:4px 0 8px">${s.name}</h3>
        <div style="display:flex; align-items:stretch; gap:12px">
          <div style="flex:1">
            <table style="width:100%; border-collapse:collapse; text-align:center;">
              <tr><th>Difficulté</th><th>Temps d\'incantation</th><th>Durée</th><th>Portée</th><th>Cible/Zone</th><th>Soin</th></tr>
              <tr>
                <td style="padding:8px">${s.difficulte ?? ''}</td>
                <td style="padding:8px">${s.temps ?? ''}</td>
                <td style="padding:8px">${s.duree ?? ''}</td>
                <td style="padding:8px">${s.portee ?? ''}</td>
                <td style="padding:8px">${s.cible ?? ''}</td>
                <td style="padding:8px">${s.soin ?? ''}</td>
              </tr>
            </table>
            <div style="display:flex; gap:12px; align-items:flex-start; margin-top:8px">
              <div style="width:120px; text-align:center">
                <div style="font-size:12px; color:#555">Bonus d'Ingrédient</div>
                <div style="font-weight:600; padding:8px 0">${s.ingredient ?? ''}</div>
              </div>
              <div style="flex:1; text-align:center">
                <div style="height:1px; background:#ddd; margin:8px 0"></div>
                <div style="text-align:left;">${s.description ?? ''}</div>
              </div>
              <div style="width:180px; text-align:center">
                <div style="margin-bottom:8px">Attaques<br><div style="background:#fff; padding:6px; border-radius:4px">${s.attaques ?? 'None'}</div></div>
                <div>Dégâts<br><div style="background:#fff; padding:6px; border-radius:4px">${s.degats ?? 'None'}</div></div>
              </div>
            </div>
          </div>
          <div style="width:120px; display:flex; flex-direction:column; gap:8px; align-items:center;">
            <button type="button" class="spell-launch" data-spell-id="${s.id}" style="background:#b7863a; color:#fff; border:none; padding:8px 12px; border-radius:6px;">🎲 Lancer</button>
            <label style="font-size:12px"><input type="checkbox" class="spell-owned" data-spell-id="${s.id}" ${owned? 'checked':''}> Possédé</label>
          </div>
        </div>
      </div>
    `);
  }
  container.html(html.join(''));

  // Event handlers: launch and owned checkbox
  container.find('.spell-launch').on('click', ev => {
    const id = ev.currentTarget.dataset.spellId;
    WarhammerActorSheet.loadSpells().then(spellsData => {
      const spell = (spellsData[cat] || []).find(s => s.id === id);
      if (!spell) return ui.notifications.warn('Sort introuvable');
      // Basic roll vs difficulty
      const roll = new Roll('1d100').roll({async:false});
      const result = roll.total;
      const target = Number(spell.difficulte) || 0;
      const success = result <= target;
      const degrees = Math.floor(Math.abs(target - result) / 10);
      const resultText = success ? `<span style="color:green"><strong>RÉUSSITE</strong>${degrees? ' +' + degrees + ' degré(s)':''}</span>` : `<span style="color:red"><strong>ÉCHEC</strong>${degrees? ' +' + degrees + ' degré(s)':''}</span>`;
      ChatMessage.create({
        user: game.user.id,
        speaker: ChatMessage.getSpeaker({actor: this.actor}),
        content: `<div class="spell-roll"><strong>${spell.name}</strong><div>Cible: ${target}</div><div>Résultat: ${result}</div><div>${resultText}</div></div>`
      });
    });
  });

  container.find('.spell-owned').on('change', async ev => {
    const id = ev.currentTarget.dataset.spellId;
    const checked = !!ev.currentTarget.checked;
    // Persist in actor.system.spellsOwned
    try {
      await this.actor.update({ [`system.spellsOwned.${id}`]: checked });
    } catch (err) {
      console.error('Unable to persist spell owned state', err);
    }
  });
};

WarhammerActorSheet.prototype._renderSpellsBySchool = async function(schoolKey) {
  const data = await WarhammerActorSheet.loadSpells();
  const container = this.element.find('.spells-list');
  container.empty().show();
  if (!schoolKey) {
    container.html('<div>Sélectionnez un domaine pour afficher ses sorts.</div>');
    return;
  }
  const rawSpells = data[schoolKey] || [];
  if (!rawSpells.length) {
    container.html('<div>Aucun sort trouvé pour ce domaine.</div>');
    return;
  }

  // Trier par difficulté (asc) puis par possession (les possédés avant les non-possédés), puis par nom
  const ownedMap = this.actor.system?.spellsOwned || {};
  const spells = rawSpells.slice().sort((a, b) => {
    const da = Number(a.difficulte) || 0;
    const db = Number(b.difficulte) || 0;
    if (da !== db) return da - db;
    const ao = !!ownedMap[a.id];
    const bo = !!ownedMap[b.id];
    if (ao !== bo) return ao ? -1 : 1; // owned first
    return String(a.name || '').localeCompare(String(b.name || ''));
  });

  const html = [];
  for (const s of spells) {
    const owned = !!(this.actor.system?.spellsOwned && this.actor.system.spellsOwned[s.id]);
    html.push(`
      <div class="spell-card" data-spell-id="${s.id}" style="border:1px solid #ccc; border-radius:8px; padding:12px; margin-bottom:12px; background:#f7f5f2;">
        <h3 style="text-align:center; color:#6b4b1a; margin:4px 0 8px">${s.name}</h3>
        <div style="display:flex; align-items:stretch; gap:12px">
          <div style="flex:1">
            <table style="width:100%; border-collapse:collapse; text-align:center;">
              <tr><th>Difficulté</th><th>Temps d\'incantation</th><th>Durée</th><th>Portée</th><th>Cible/Zone</th><th>Soin</th></tr>
              <tr>
                <td style="padding:8px">${s.difficulte ?? ''}</td>
                <td style="padding:8px">${s.temps ?? ''}</td>
                <td style="padding:8px">${s.duree ?? ''}</td>
                <td style="padding:8px">${s.portee ?? ''}</td>
                <td style="padding:8px">${s.cible ?? ''}</td>
                <td style="padding:8px">${s.soin ?? ''}</td>
              </tr>
            </table>
            <div style="display:flex; gap:12px; align-items:flex-start; margin-top:8px">
              <div style="width:120px; text-align:center">
                <div style="font-size:12px; color:#555">Bonus d'Ingrédient</div>
                <div style="font-weight:600; padding:8px 0">${s.ingredient ?? ''}</div>
              </div>
              <div style="flex:1; text-align:center">
                <div style="height:1px; background:#ddd; margin:8px 0"></div>
                <div style="text-align:left;">${s.description ?? ''}</div>
              </div>
              <div style="width:180px; text-align:center">
                <div style="margin-bottom:8px">Attaques<br><div style="background:#fff; padding:6px; border-radius:4px">${s.attaques ?? 'None'}</div></div>
                <div>Dégâts<br><div style="background:#fff; padding:6px; border-radius:4px">${s.degats ?? 'None'}</div></div>
              </div>
            </div>
          </div>
          <div style="width:120px; display:flex; flex-direction:column; gap:8px; align-items:center;">
            <button type="button" class="spell-launch" data-spell-id="${s.id}" style="background:#b7863a; color:#fff; border:none; padding:8px 12px; border-radius:6px;">🎲 Lancer</button>
            <label style="font-size:12px"><input type="checkbox" class="spell-owned" data-spell-id="${s.id}" ${owned? 'checked':''}> Possédé</label>
          </div>
        </div>
      </div>
    `);
  }
  container.html(html.join(''));

  // Wire launch and owned handlers same as list renderer
  container.find('.spell-launch').on('click', ev => {
    const id = ev.currentTarget.dataset.spellId;
    WarhammerActorSheet.loadSpells().then(spellsData => {
      const spell = (spellsData[schoolKey] || []).find(s => s.id === id);
      if (!spell) return ui.notifications.warn('Sort introuvable');
      const roll = new Roll('1d100').roll({async:false});
      const result = roll.total;
      const target = Number(spell.difficulte) || 0;
      const success = result <= target;
      const degrees = Math.floor(Math.abs(target - result) / 10);
      const resultText = success ? `<span style="color:green"><strong>RÉUSSITE</strong>${degrees? ' +' + degrees + ' degré(s)':''}</span>` : `<span style="color:red"><strong>ÉCHEC</strong>${degrees? ' +' + degrees + ' degré(s)':''}</span>`;
      ChatMessage.create({
        user: game.user.id,
        speaker: ChatMessage.getSpeaker({actor: this.actor}),
        content: `<div class="spell-roll"><strong>${spell.name}</strong><div>Cible: ${target}</div><div>Résultat: ${result}</div><div>${resultText}</div></div>`
      });
    });
  });

  container.find('.spell-owned').on('change', async ev => {
    const id = ev.currentTarget.dataset.spellId;
    const checked = !!ev.currentTarget.checked;
    try { await this.actor.update({ [`system.spellsOwned.${id}`]: checked }); } catch (err) { console.error(err); }
  });
};
