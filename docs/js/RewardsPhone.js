import { fmtChips } from "./core.js";
import {
  COMP_CATALOG, RewardsTracker, TIERS, tierForWagered,
} from "./rewards.js";
import {
  getActivityTiming, getTierExperience, RESORT_OFFERS, tierIndex,
} from "./rewards-perks.js";
import { ensureHotel, findReservation, reservationHint, getRoomType } from "./hotel.js";
import {
  advanceDialogue,
  dialWrongNumber,
  easterEggCount,
  formatMessageTime,
  getActiveDialogueChoices,
  getContactDef,
  getRapportSummary,
  getTextOptions,
  getThread,
  listUnlockedContacts,
  markThreadRead,
  onIntoxicationChange,
  phoneUnreadCount,
  resolveCallChoice,
  sendText,
  startCall,
  syncContactIntros,
} from "./phone-contacts.js";
import { isHeightenedIntoxication } from "./intoxication-effects.js";

/**
 * Era-styled flip-phone DOM widget for the MGM Rewards app.
 * Shared by the digital casino (web) and pixel RPG.
 */
export class RewardsPhone {
  /**
   * @param {HTMLElement} mountRoot
   * @param {import("./core.js").PlayerSession} session
   * @param {{ onPersist?: () => void, compact?: boolean }} [options]
   */
  constructor(mountRoot, session, options = {}) {
    this.root = mountRoot;
    this.session = session;
    this.onPersist = options.onPersist ?? (() => {});
    this.compact = options.compact ?? false;
    this.tracker = new RewardsTracker(session, {
      onNotify: (note) => this._showToast(note),
    });
    this._open = false;
    this._screen = "home";
    this._threadContactId = null;
    this._callContactId = null;
    this._callChoicePending = false;
    this._callScript = null;
    this._toastTimer = null;
    this.tracker.ensureRewards();
    this.tracker.syncFromWallet();
    this._renderChrome();
  }

  sync() {
    this.tracker.syncFromWallet();
    this._updateBadge();
    if (this._open) this._renderScreen();
  }

  toggle() {
    if (this._open) this.close();
    else this.open();
  }

  open(screen = "home") {
    this._open = true;
    this._screen = screen;
    if (screen === "home" || screen === "connect" || screen === "inbox" || screen === "card" || screen === "reservation") {
      if (screen !== "thread" && screen !== "call") {
        this._threadContactId = null;
        this._callContactId = null;
        this._callChoicePending = false;
        this._callScript = null;
      }
    }
    this.tracker.syncFromWallet();
    syncContactIntros(this.session);
    onIntoxicationChange(this.session);
    this._phoneEl.hidden = false;
    this._renderScreen();
  }

  openConnect(contactId = null) {
    this._open = true;
    this._callContactId = null;
    this._callChoicePending = false;
    this._callScript = null;
    if (contactId) {
      this._threadContactId = contactId;
      this._screen = "thread";
      markThreadRead(this.session, contactId);
    } else {
      this._threadContactId = null;
      this._screen = "connect";
    }
    this.tracker.syncFromWallet();
    syncContactIntros(this.session);
    onIntoxicationChange(this.session);
    this._phoneEl.hidden = false;
    this._renderScreen();
  }

  openReservation() {
    this.open("reservation");
  }

  close() {
    this._open = false;
    this._phoneEl.hidden = true;
  }

  isOpen() {
    return this._open;
  }

  /** @param {{ title: string, body: string }} note */
  _showToast(note) {
    if (!this._toastEl) return;
    this._toastEl.textContent = `${note.title}: ${note.body}`;
    this._toastEl.hidden = false;
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      this._toastEl.hidden = true;
    }, 4500);
    this._updateBadge();
  }

  _renderChrome() {
    this.root.innerHTML = "";
    this.root.className = "rewards-phone-root" + (this.compact ? " compact" : "");

    this._fab = document.createElement("button");
    this._fab.type = "button";
    this._fab.className = "rewards-phone-fab";
    this._fab.title = "MGM Phone — Rewards & Connect (P)";
    this._fab.innerHTML = "📱<span class=\"rewards-badge\"></span>";
    this._fab.onclick = () => this.toggle();

    this._toastEl = document.createElement("div");
    this._toastEl.className = "rewards-toast";
    this._toastEl.hidden = true;

    this._phoneEl = document.createElement("div");
    this._phoneEl.className = "rewards-phone";
    this._phoneEl.hidden = true;

    const shell = document.createElement("div");
    shell.className = "rewards-phone-shell";
    shell.innerHTML = "<div class=\"rewards-phone-hinge\"></div>";

    this._lcd = document.createElement("div");
    this._lcd.className = "rewards-lcd";
    shell.appendChild(this._lcd);

    this._phoneEl.appendChild(shell);
    this.root.append(this._fab, this._toastEl, this._phoneEl);
    this._updateBadge();
  }

  _updateBadge() {
    const badge = this._fab?.querySelector(".rewards-badge");
    if (!badge) return;
    const count = this.tracker.unreadCount() + phoneUnreadCount(this.session);
    badge.textContent = count > 0 ? String(count) : "";
    badge.hidden = count === 0;
  }

  _renderScreen() {
    const lcd = this._lcd;
    if (!lcd) return;
    lcd.innerHTML = "";

    const header = document.createElement("div");
    header.className = "rewards-lcd-header";
    header.textContent = this._screenHeaderLabel();
    lcd.appendChild(header);

    const body = document.createElement("div");
    body.className = "rewards-lcd-body";
    lcd.appendChild(body);

    const nav = document.createElement("div");
    nav.className = "rewards-lcd-nav";

    switch (this._screen) {
      case "card":
        this._renderMemberCard(body);
        break;
      case "comps":
        this._renderComps(body);
        break;
      case "inbox":
        this._renderInbox(body);
        break;
      case "offers":
        this._renderOffers(body);
        break;
      case "perks":
        this._renderPerks(body);
        break;
      case "reservation":
        this._renderReservation(body);
        break;
      case "connect":
        this._renderConnect(body);
        break;
      case "thread":
        this._renderThread(body);
        break;
      case "call":
        this._renderCall(body);
        break;
      default:
        this._renderHome(body);
    }

    const tabs = [
      ["home", "Home"],
      ["connect", "Connect"],
      ["reservation", "Room"],
      ["inbox", "Inbox"],
      ["card", "Card"],
    ];
    for (const [id, label] of tabs) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "rewards-tab" + (this._screen === id ? " active" : "");
      btn.textContent = label;
      btn.onclick = () => { this._screen = id; this._renderScreen(); };
      nav.appendChild(btn);
    }

    const closeRow = document.createElement("div");
    closeRow.className = "rewards-lcd-close";
    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.textContent = "Close";
    closeBtn.onclick = () => this.close();
    closeRow.appendChild(closeBtn);

    lcd.appendChild(nav);
    lcd.appendChild(closeRow);
  }

  _renderHome(body) {
    const rewards = this.tracker.ensureRewards();
    const tier = tierForWagered(rewards.lifetimeWagered);
    const exp = getTierExperience(tier.id);
    const timing = getActivityTiming(tier.id);
    const prog = this.tracker.progressToNextTier();
    body.innerHTML = "";
    body.className = `rewards-lcd-body rewards-tier-${tier.id}`;
    body.appendChild(this._line(`Member ${rewards.memberId}`));
    body.appendChild(this._line(`${tier.label} · ${fmtChips(rewards.lifetimeWagered)} wagered`));
    body.appendChild(this._line(exp.tagline, "dim"));
    body.appendChild(this._line(`Floor speed: ${Math.round((1 / timing.speedMultiplier) * 100)}% VIP`, "dim"));
    if (prog.next) {
      body.appendChild(this._line(`Next: ${prog.next.label} (${fmtChips(prog.remaining)} to go)`));
      const bar = document.createElement("div");
      bar.className = "rewards-progress";
      bar.innerHTML = `<div class="rewards-progress-fill" style="width:${prog.pct}%"></div>`;
      body.appendChild(bar);
    } else {
      body.appendChild(this._line("Chairman status — you've arrived."));
    }
    body.appendChild(this._line(`${this.tracker.unreadCount() + phoneUnreadCount(this.session)} unread ping(s)`));
    if (easterEggCount(this.session) > 0) {
      body.appendChild(this._line(`${easterEggCount(this.session)} Easter egg(s) found in Connect`, "dim"));
    }
  }

  _screenHeaderLabel() {
    if (this._screen === "connect" || this._screen === "thread" || this._screen === "call") {
      return "MGM CONNECT";
    }
    return "MGM REWARDS";
  }

  _renderConnect(body) {
    syncContactIntros(this.session);
    body.innerHTML = "";
    body.className = "rewards-lcd-body";
    const contacts = listUnlockedContacts(this.session);
    body.appendChild(this._line(`${contacts.length} contact(s)`, "dim"));
    if (!contacts.length) {
      body.appendChild(this._line("Hit the casino floor to meet staff & NPCs."));
      return;
    }
    for (const c of contacts) {
      const thread = getThread(this.session, c.id);
      const unread = (thread?.messages ?? []).filter((m) => m.dir === "in" && !m.read).length;
      const row = document.createElement("button");
      row.type = "button";
      row.className = "rewards-contact-row";
      row.innerHTML = `<span>${c.emoji ?? "📇"} ${c.resolveName(this.session)}</span>${unread ? `<span class="rewards-contact-unread">${unread}</span>` : ""}`;
      row.onclick = () => {
        this._threadContactId = c.id;
        this._screen = "thread";
        markThreadRead(this.session, c.id);
        this.onPersist();
        this._renderScreen();
        this._updateBadge();
      };
      body.appendChild(row);
      body.appendChild(this._line(c.resolveRole(this.session), "dim"));
    }
    const wrongBtn = document.createElement("button");
    wrongBtn.type = "button";
    wrongBtn.textContent = "Dial 555-0199";
    wrongBtn.onclick = () => {
      const r = dialWrongNumber(this.session);
      this._showToast({ title: "Wrong #", body: r.opening });
      this.onPersist();
      this._updateBadge();
    };
    body.appendChild(wrongBtn);
  }

  _renderThread(body) {
    const contactId = this._threadContactId;
    const def = contactId ? getContactDef(this.session, contactId) : null;
    body.innerHTML = "";
    body.className = "rewards-lcd-body";
    if (!def) {
      body.appendChild(this._line("No contact selected."));
      return;
    }
    markThreadRead(this.session, contactId);
    body.appendChild(this._line(`${def.emoji ?? ""} ${def.resolveName(this.session)}`, ""));
    body.appendChild(this._line(def.resolveRole(this.session), "dim"));

    const rapport = getRapportSummary(this.session, contactId);
    body.appendChild(this._line(`Rapport: ${rapport.band.label} (${rapport.rapport})`, "dim rewards-rapport-line"));
    if (isHeightenedIntoxication(this.session)) {
      body.appendChild(this._line("🥴 Hidden lines unlocked — after-hours menu active", "dim rewards-intox-line"));
    }

    const thread = getThread(this.session, contactId);
    const msgs = thread?.messages ?? [];
    const log = document.createElement("div");
    log.className = "rewards-thread-log";
    if (!msgs.length) {
      log.appendChild(this._line("No messages yet.", "dim"));
    }
    for (const msg of msgs.slice(-10)) {
      const row = document.createElement("div");
      row.className = `rewards-msg rewards-msg--${msg.dir}`;
      row.textContent = `${formatMessageTime(msg.timestamp)} ${msg.body}`;
      log.appendChild(row);
    }
    body.appendChild(log);

    const actions = document.createElement("div");
    actions.className = "rewards-thread-actions";

    const activeDialogue = getActiveDialogueChoices(this.session, contactId);
    if (activeDialogue?.choices?.length) {
      body.appendChild(this._line("Reply:", "dim rewards-dialogue-prompt"));
      for (let i = 0; i < activeDialogue.choices.length; i += 1) {
        const choice = activeDialogue.choices[i];
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "rewards-dialogue-choice";
        btn.textContent = `↳ ${choice.label}`;
        const idx = i;
        btn.onclick = () => {
          const r = advanceDialogue(this.session, contactId, idx);
          if (!r.ok) {
            this._showToast({ title: "Message failed", body: r.message ?? "" });
            return;
          }
          this.onPersist();
          this._renderScreen();
          this._updateBadge();
        };
        actions.appendChild(btn);
      }
    } else {
      const callBtn = document.createElement("button");
      callBtn.type = "button";
      callBtn.textContent = "📞 Call";
      callBtn.onclick = () => {
        const r = startCall(this.session, contactId);
        if (!r.ok) {
          this._showToast({ title: "Call failed", body: r.message ?? "" });
          return;
        }
        this._callContactId = contactId;
        this._callScript = r.script;
        this._callChoicePending = false;
        this._screen = "call";
        this.onPersist();
        this._renderScreen();
      };
      actions.appendChild(callBtn);

      const textOpts = getTextOptions(this.session, contactId);
      const optsWrap = document.createElement("div");
      optsWrap.className = "rewards-text-options";
      for (const opt of textOpts) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = [
          opt.custom ? "rewards-text-option rewards-text-option--custom" : "rewards-text-option",
          opt.intoxHidden ? "rewards-text-option--intox" : "",
        ].filter(Boolean).join(" ");
        btn.textContent = `💬 ${opt.label}`;
        btn.onclick = () => {
          const r = sendText(this.session, contactId, opt.key);
          if (!r.ok) {
            this._showToast({ title: "Text failed", body: r.message ?? "" });
            return;
          }
          this.onPersist();
          this._renderScreen();
          this._updateBadge();
        };
        optsWrap.appendChild(btn);
      }
      actions.appendChild(optsWrap);
    }

    body.appendChild(actions);

    const backBtn = document.createElement("button");
    backBtn.type = "button";
    backBtn.textContent = "← Contacts";
    backBtn.onclick = () => {
      this._threadContactId = null;
      this._screen = "connect";
      this._renderScreen();
    };
    body.appendChild(backBtn);
  }

  _renderCall(body) {
    const contactId = this._callContactId;
    const def = contactId ? getContactDef(this.session, contactId) : null;
    const script = this._callScript;
    body.innerHTML = "";
    body.className = "rewards-lcd-body";
    if (!def || !script) {
      body.appendChild(this._line("Call ended."));
      return;
    }
    body.appendChild(this._line(`📞 ${def.resolveName(this.session)}`, ""));
    body.appendChild(this._line(script.opening, ""));
    for (const line of script.lines ?? []) {
      body.appendChild(this._line(line, "dim"));
    }
    if (!this._callChoicePending) {
      body.appendChild(this._line("Choose:", "dim"));
      script.choices.forEach((choice, i) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = choice.label;
        btn.onclick = () => {
          const r = resolveCallChoice(this.session, contactId, i);
          this._callChoicePending = true;
          this.onPersist();
          this._renderCall(body);
          if (r.egg) {
            this._showToast({ title: "Easter egg!", body: "Hidden dialog unlocked." });
          }
        };
        body.appendChild(btn);
      });
    } else {
      const lastIn = [...(getThread(this.session, contactId)?.messages ?? [])].reverse().find((m) => m.dir === "in");
      if (lastIn?.body.startsWith("[Call]")) {
        body.appendChild(this._line(lastIn.body.replace("[Call] ", ""), ""));
      }
    }
    const hangUp = document.createElement("button");
    hangUp.type = "button";
    hangUp.textContent = "Hang up";
    hangUp.onclick = () => {
      this._callContactId = null;
      this._callChoicePending = false;
      this._callScript = null;
      this._threadContactId = contactId;
      this._screen = "thread";
      this.onPersist();
      this._renderScreen();
      this._updateBadge();
    };
    body.appendChild(hangUp);
  }

  _renderMemberCard(body) {
    const rewards = this.tracker.ensureRewards();
    const tier = tierForWagered(rewards.lifetimeWagered);
    const exp = getTierExperience(tier.id);
    body.innerHTML = "";
    body.className = `rewards-lcd-body rewards-tier-${tier.id}`;
    const card = document.createElement("div");
    card.className = `rewards-member-card rewards-member-card--${tier.id}`;
    card.innerHTML = `
      <div class="rewards-tier">${tier.label.toUpperCase()}</div>
      <div class="rewards-member-id">${rewards.memberId}</div>
      <div class="rewards-member-name">${this.session.playerName}</div>
      <div class="rewards-member-wager">${fmtChips(rewards.lifetimeWagered)} lifetime</div>
      <div class="rewards-member-cost">${exp.monthlyAmortizedCost}</div>
    `;
    body.appendChild(card);
    body.appendChild(this._line(exp.pitBossLine, "dim"));
  }

  _renderComps(body) {
    const rewards = this.tracker.ensureRewards();
    body.innerHTML = "";
    if (!rewards.unlockedComps.length) {
      body.appendChild(this._line("No comps yet — keep playing!"));
      return;
    }
    for (const compId of rewards.unlockedComps) {
      const meta = COMP_CATALOG[compId];
      const row = document.createElement("div");
      row.className = "rewards-comp-row";
      const redeemed = rewards.redeemedComps.includes(compId);
      row.appendChild(this._line(meta?.title ?? compId));
      row.appendChild(this._line(meta?.body ?? "", "dim"));
      if (!redeemed) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = "Redeem";
        btn.onclick = () => {
          this.tracker.redeemComp(compId);
          this.onPersist();
          this._renderScreen();
          this._updateBadge();
        };
        row.appendChild(btn);
      } else {
        row.appendChild(this._line("Redeemed ✓", "dim"));
      }
      body.appendChild(row);
    }
  }

  _renderInbox(body) {
    const rewards = this.tracker.ensureRewards();
    body.innerHTML = "";
    if (!rewards.notifications.length) {
      body.appendChild(this._line("No notifications."));
      return;
    }
    for (const note of rewards.notifications.slice(0, 12)) {
      const row = document.createElement("div");
      row.className = "rewards-note" + (note.read ? " read" : "");
      row.appendChild(this._line(note.title, note.read ? "dim" : ""));
      row.appendChild(this._line(note.body, "dim"));
      row.onclick = () => {
        this.tracker.markRead(note.id);
        this.onPersist();
        this._updateBadge();
        row.classList.add("read");
      };
      body.appendChild(row);
    }
    const markAll = document.createElement("button");
    markAll.type = "button";
    markAll.textContent = "Mark all read";
    markAll.onclick = () => {
      this.tracker.markAllRead();
      this.onPersist();
      this._renderScreen();
      this._updateBadge();
    };
    body.appendChild(markAll);
  }

  _renderReservation(body) {
    const hotel = ensureHotel(this.session);
    const room = getRoomType(hotel);
    body.innerHTML = "";
    body.appendChild(this._line(`${room.label}`));
    body.appendChild(this._line(`Conf ${hotel.reservationCode}`, "dim"));
    if (hotel.foundReservation) {
      body.appendChild(this._line(reservationHint(hotel), "dim"));
      body.appendChild(this._line("Head to hotel hallways from the lobby.", "dim"));
    } else {
      body.appendChild(this._line("Tap locate to reveal your tower.", "dim"));
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = "Locate reservation";
      btn.onclick = () => {
        const r = findReservation(this.session);
        this.tracker.pushNotification("Reservation Found", r.message);
        this.onPersist?.();
        this._renderScreen();
      };
      body.appendChild(btn);
    }
  }

  _renderOffers(body) {
    const rewards = this.tracker.ensureRewards();
    const tier = tierForWagered(rewards.lifetimeWagered);
    const tierIdx = tierIndex(tier.id);
    body.innerHTML = "";
    body.className = `rewards-lcd-body rewards-tier-${tier.id}`;
    for (const offer of RESORT_OFFERS) {
      const locked = tierIdx < offer.minTierIndex;
      body.appendChild(this._line(locked ? `🔒 ${offer.title}` : offer.title, locked ? "dim" : ""));
      body.appendChild(this._line(offer.detail, "dim"));
    }
  }

  _renderPerks(body) {
    const rewards = this.tracker.ensureRewards();
    const tier = tierForWagered(rewards.lifetimeWagered);
    const exp = getTierExperience(tier.id);
    const timing = getActivityTiming(tier.id);
    body.innerHTML = "";
    body.className = `rewards-lcd-body rewards-tier-${tier.id}`;
    body.appendChild(this._line(`${exp.label} experience`, ""));
    body.appendChild(this._line(exp.monthlyAmortizedCost, "dim"));
    body.appendChild(this._line(`Animations ${Math.round((1 / timing.speedMultiplier) * 100)}% faster`, "dim"));
    for (const perk of exp.perks) {
      body.appendChild(this._line(`• ${perk}`));
    }
    body.appendChild(this._line("", ""));
    body.appendChild(this._line(exp.pitBossLine, "dim"));
    if (tier.id !== "chairman") {
      const next = TIERS[tierIndex(tier.id) + 1];
      if (next) {
        body.appendChild(this._line(`Rank up to ${next.label} for more absurdity.`, "dim"));
      }
    }
  }

  _line(text, cls = "") {
    const p = document.createElement("p");
    p.className = cls;
    p.textContent = text;
    return p;
  }
}
