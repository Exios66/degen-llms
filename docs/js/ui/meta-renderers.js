// Extracted from app.js — shared by the web terminal and the pixel RPG.
import { ACTIVITIES, formatPlayTimeSummary, getCasinoTimeMs } from "../core.js";
import { clearStaffOverride, editableStaffEntries, setStaffOverrides, updateStaffOverride } from "../staff-manifest.js";

export function buildMetaRenderers(ctx) {
  const { el, banner, chipLine, statusBanner, showStatus, menu, pushView, popView, goBack, render, persist } = ctx;
  const runtime = ctx.runtime;

  function renderStaffManifest() {
    const entries = editableStaffEntries(ctx.session);
    const list = el("ul", { className: "menu-list staff-manifest-list" });
    entries.forEach((entry, i) => {
      const roleLabel = entry.category === "dealers"
        ? entry.games.join(", ")
        : entry.role;
      list.appendChild(el("li", {}, [
        el("button", {
          className: "menu-btn",
          innerHTML: [
            `<span class="num">${i + 1})</span> ${entry.name}`,
            entry.customized ? ' <span class="staff-custom-badge">custom</span>' : "",
            `<br><span class="dim" style="padding-left:1.75rem;font-size:0.85rem;">${roleLabel}</span>`,
          ].join(""),
          onclick: () => pushView("staff-manifest-edit", { staffId: entry.id, category: entry.category }),
        }),
      ]));
    });

    return el("div", {}, [
      statusBanner(),
      banner("Staff Manifest"),
      el("p", {
        className: "dim",
        textContent: "Customize dealer and venue staff names, context, and optional phone dialogue for MGM Connect.",
      }),
      el("div", { className: "panel" }, [
        list,
        el("div", { className: "action-bar" }, [
          el("button", {
            className: "btn",
            textContent: "Reset all customizations",
            onclick: () => {
              if (confirm("Restore the default staff manifest for this save?")) {
                setStaffOverrides(ctx.session, null);
                persist();
                showStatus("Restored default staff manifest.");
                render();
              }
            },
          }),
          el("button", { className: "btn", textContent: "Back", onclick: () => goBack() }),
        ]),
      ]),
    ]);
  }

  function renderStaffManifestEdit({ staffId, category }) {
    const entry = editableStaffEntries(ctx.session).find((e) => e.id === staffId && e.category === category);
    if (!entry) {
      return el("div", { className: "panel" }, [
        el("p", { className: "error", textContent: "Staff member not found." }),
        el("button", { className: "btn", textContent: "Back", onclick: () => goBack() }),
      ]);
    }

    const nameInput = el("input", { type: "text", value: entry.name });
    const taglineInput = category === "dealers"
      ? el("input", { type: "text", value: entry.tagline })
      : null;
    const contextInput = el("textarea", {
      className: "staff-context-input",
      rows: "4",
      textContent: entry.context,
    });
    const phoneIntroInput = el("textarea", {
      className: "staff-context-input",
      rows: "2",
      placeholder: "Custom auto-text when this contact unlocks on your phone…",
      textContent: entry.phoneIntro ?? "",
    });
    const phoneTextsInput = el("textarea", {
      className: "staff-context-input",
      rows: "4",
      placeholder: "Custom text options — one per line: Label :: Reply",
      textContent: (entry.phoneTexts ?? []).map((t) => `${t.label} :: ${t.reply}`).join("\n"),
    });

    const fields = [
      el("div", { className: "form-row" }, [el("label", { textContent: "Display name" }), nameInput]),
    ];
    if (taglineInput) {
      fields.push(el("div", { className: "form-row" }, [el("label", { textContent: "Tagline" }), taglineInput]));
    }
    fields.push(el("div", { className: "form-row" }, [el("label", { textContent: "Context / notes" }), contextInput]));
    fields.push(el("div", { className: "form-row" }, [
      el("label", { textContent: "Phone intro (MGM Connect)" }),
      phoneIntroInput,
    ]));
    fields.push(el("div", { className: "form-row" }, [
      el("label", { textContent: "Custom phone texts (Label :: Reply)" }),
      phoneTextsInput,
    ]));

    return el("div", { className: "panel" }, [
      banner(`Edit ${entry.name}`),
      el("p", { className: "dim", textContent: `${entry.id} · ${category === "dealers" ? entry.games.join(", ") : entry.role}` }),
      ...fields,
      el("div", { className: "action-bar" }, [
        el("button", {
          className: "btn primary",
          textContent: "Save",
          onclick: () => {
            const fieldsToSave = { name: nameInput.value.trim() };
            if (taglineInput) fieldsToSave.tagline = taglineInput.value.trim();
            fieldsToSave.context = contextInput.value.trim();
            fieldsToSave.phoneIntro = phoneIntroInput.value.trim();
            const phoneTexts = phoneTextsInput.value
              .split("\n")
              .map((line) => line.trim())
              .filter(Boolean)
              .map((line) => {
                const sep = line.indexOf("::");
                if (sep < 0) return { label: line, reply: "…" };
                return {
                  label: line.slice(0, sep).trim(),
                  reply: line.slice(sep + 2).trim(),
                };
              })
              .filter((t) => t.label);
            fieldsToSave.phoneTexts = phoneTexts.length ? phoneTexts : undefined;
            const hasContent = Object.entries(fieldsToSave).some(([k, v]) => {
              if (k === "phoneTexts") return Array.isArray(v) && v.length > 0;
              return Boolean(v);
            });
            if (!hasContent) {
              clearStaffOverride(ctx.session, category, staffId);
            } else {
              updateStaffOverride(ctx.session, category, staffId, fieldsToSave);
            }
            persist();
            showStatus(`Updated ${entry.name}.`);
            goBack();
          },
        }),
        el("button", {
          className: "btn",
          textContent: "Reset this entry",
          onclick: () => {
            clearStaffOverride(ctx.session, category, staffId);
            persist();
            showStatus(`Reset ${staffId} to defaults.`);
            goBack();
          },
        }),
        el("button", { className: "btn", textContent: "Back", onclick: () => goBack() }),
      ]),
    ]);
  }

  function renderStats() {
    const stats = ctx.session.activityStats;
    const rows = Object.entries(stats).map(([id, s]) => {
      const info = Object.values(ACTIVITIES).find((a) => a.id === id);
      const name = info?.name ?? id;
      return el("div", {
        className: "stat-row",
        textContent: `${name}: ${s.visits} visit(s), ${s.handsOrBets} bet(s), net ${s.netWinnings >= 0 ? "+" : ""}${s.netWinnings.toLocaleString()} chips`,
      });
    });

    return el("div", { className: "panel" }, [
      banner("Player Stats"),
      el("p", { textContent: `Player: ${ctx.session.playerName}` }),
      chipLine(),
      ctx.session.slotId != null
        ? el("p", { className: "dim", textContent: formatPlayTimeSummary(getCasinoTimeMs(ctx.session)) })
        : null,
      el("p", { textContent: `Session net (excl. buy-ins): ${ctx.session.wallet.netSession >= 0 ? "+" : ""}${ctx.session.wallet.netSession.toLocaleString()} chips` }),
      rows.length ? el("div", { className: "stats-grid" }, rows) : el("p", { className: "dim", textContent: "No activity history yet." }),
      el("div", { className: "action-bar" }, [
        el("button", { className: "btn", textContent: "Back", onclick: () => { popView(); render(); } }),
      ]),
    ]);
  }

  return {
    "staff-manifest": renderStaffManifest,
    "staff-manifest-edit": renderStaffManifestEdit,
    stats: renderStats,
  };
}
