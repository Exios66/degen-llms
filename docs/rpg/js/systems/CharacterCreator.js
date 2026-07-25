import {
  ARCHETYPES,
  SKIN_TONES,
  HAIR_COLORS,
  OUTFIT_COLORS,
  defaultAppearance,
  normalizeAppearance,
  resolvePalette,
} from "./CharacterAppearance.js";
import { drawCharacterToCanvas } from "./TextureFactory.js";

/**
 * Character creator / wardrobe UI with live sprite preview.
 */
export function renderCharacterCreator(root, { session, onComplete, onBack, title = "Customize Your Guest" }) {
  root.innerHTML = "";
  const rpg = session.ensureRpgState();
  const state = {
    archetype: rpg.archetype || rpg.playerSprite || "weekend_warrior",
    appearance: { ...normalizeAppearance(rpg) },
  };

  const panel = document.createElement("div");
  panel.className = "title-panel title-panel--enter title-panel--visible character-creator";

  const h1 = document.createElement("h1");
  h1.textContent = title;
  panel.appendChild(h1);

  const layout = document.createElement("div");
  layout.className = "character-creator__layout";

  const previewCol = document.createElement("div");
  previewCol.className = "character-creator__preview-col";
  const previewFrame = document.createElement("div");
  previewFrame.className = "character-creator__preview-frame";
  const previewCanvas = document.createElement("canvas");
  previewCanvas.className = "character-creator__preview";
  previewCanvas.setAttribute("aria-label", "Character preview");
  previewFrame.appendChild(previewCanvas);
  const previewHint = document.createElement("p");
  previewHint.className = "dim character-creator__preview-hint";
  previewHint.textContent = "Live outfit preview";
  previewCol.append(previewFrame, previewHint);

  const optionsCol = document.createElement("div");
  optionsCol.className = "character-creator__options";

  const archetypeSection = document.createElement("div");
  archetypeSection.className = "character-creator__section";
  archetypeSection.innerHTML = `<h2 class="character-creator__label">Guest type</h2>`;
  const archetypeRow = document.createElement("div");
  archetypeRow.className = "character-creator__archetypes";
  for (const a of ARCHETYPES) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "archetype-btn character-creator__archetype";
    btn.dataset.archetype = a.id;
    btn.innerHTML = `<strong>${a.name}</strong><br><span class="dim">${a.perk}</span>`;
    btn.onclick = () => {
      state.archetype = a.id;
      const defaults = defaultAppearance(a.id);
      state.appearance = { ...defaults };
      refresh();
    };
    archetypeRow.appendChild(btn);
  }
  archetypeSection.appendChild(archetypeRow);
  optionsCol.appendChild(archetypeSection);

  optionsCol.appendChild(makeSwatchSection("Skin tone", SKIN_TONES, "skin", (id) => {
    state.appearance.skin = id;
    refresh();
  }));

  optionsCol.appendChild(makeSwatchSection("Hair color", HAIR_COLORS, "hair", (id) => {
    state.appearance.hair = id;
    refresh();
  }));

  optionsCol.appendChild(makeSwatchSection("Outfit", OUTFIT_COLORS, "outfit", (id) => {
    state.appearance.outfit = id;
    refresh();
  }));

  layout.append(previewCol, optionsCol);
  panel.appendChild(layout);

  const actions = document.createElement("div");
  actions.className = "character-creator__actions";
  const confirmBtn = document.createElement("button");
  confirmBtn.type = "button";
  confirmBtn.className = "character-creator__confirm";
  confirmBtn.textContent = "Save & enter resort →";
  confirmBtn.onclick = () => {
    rpg.archetype = state.archetype;
    rpg.playerSprite = state.archetype;
    rpg.appearance = { ...state.appearance };
    if (state.archetype === "local") rpg.flags.hint_north_wall = true;
    onComplete?.(session);
  };
  const backBtn = document.createElement("button");
  backBtn.type = "button";
  backBtn.textContent = "Back";
  backBtn.onclick = () => onBack?.();
  actions.append(confirmBtn, backBtn);
  panel.appendChild(actions);
  root.appendChild(panel);

  function refresh() {
    const palette = resolvePalette(state.appearance);
    drawCharacterToCanvas(previewCanvas, palette, "down", 0, 4);
    for (const btn of archetypeRow.querySelectorAll(".character-creator__archetype")) {
      btn.classList.toggle("character-creator__archetype--active", btn.dataset.archetype === state.archetype);
    }
    for (const swatch of panel.querySelectorAll(".character-creator__swatch")) {
      const group = swatch.dataset.group;
      const id = swatch.dataset.id;
      swatch.classList.toggle("character-creator__swatch--active", state.appearance[group] === id);
    }
  }

  refresh();
}

function makeSwatchSection(label, options, group, onPick) {
  const section = document.createElement("div");
  section.className = "character-creator__section";
  const h2 = document.createElement("h2");
  h2.className = "character-creator__label";
  h2.textContent = label;
  section.appendChild(h2);
  const row = document.createElement("div");
  row.className = "character-creator__swatches";
  for (const opt of options) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "character-creator__swatch";
    btn.dataset.group = group;
    btn.dataset.id = opt.id;
    btn.title = opt.label;
    btn.setAttribute("aria-label", opt.label);
    if (group === "skin") {
      btn.style.background = `#${opt.mid.toString(16).padStart(6, "0")}`;
    } else if (group === "hair") {
      btn.style.background = `#${opt.color.toString(16).padStart(6, "0")}`;
    } else {
      btn.style.background = `#${opt.body.toString(16).padStart(6, "0")}`;
    }
    btn.onclick = () => onPick(opt.id);
    row.appendChild(btn);
  }
  section.appendChild(row);
  return section;
}
