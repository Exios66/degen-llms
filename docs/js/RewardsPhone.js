import { fmtChips } from "./core.js";
import {
  COMP_CATALOG, RewardsTracker, TIERS, tierForWagered,
} from "./rewards.js";

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

  open() {
    this._open = true;
    this._screen = "home";
    this.tracker.syncFromWallet();
    this._phoneEl.hidden = false;
    this._renderScreen();
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
    this._fab.title = "MGM Rewards (P)";
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
    const count = this.tracker.unreadCount();
    badge.textContent = count > 0 ? String(count) : "";
    badge.hidden = count === 0;
  }

  _renderScreen() {
    const lcd = this._lcd;
    if (!lcd) return;
    lcd.innerHTML = "";

    const header = document.createElement("div");
    header.className = "rewards-lcd-header";
    header.textContent = "MGM REWARDS";
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
      default:
        this._renderHome(body);
    }

    const tabs = [
      ["home", "Home"],
      ["card", "Card"],
      ["comps", "Comps"],
      ["inbox", "Inbox"],
      ["offers", "Offers"],
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
    const prog = this.tracker.progressToNextTier();
    body.innerHTML = "";
    body.appendChild(this._line(`Member ${rewards.memberId}`));
    body.appendChild(this._line(`${tier.label} · ${fmtChips(rewards.lifetimeWagered)} wagered`));
    if (prog.next) {
      body.appendChild(this._line(`Next: ${prog.next.label} (${fmtChips(prog.remaining)} to go)`));
      const bar = document.createElement("div");
      bar.className = "rewards-progress";
      bar.innerHTML = `<div class="rewards-progress-fill" style="width:${prog.pct}%"></div>`;
      body.appendChild(bar);
    } else {
      body.appendChild(this._line("Chairman status — you've arrived."));
    }
    body.appendChild(this._line(`${this.tracker.unreadCount()} unread ping(s)`));
  }

  _renderMemberCard(body) {
    const rewards = this.tracker.ensureRewards();
    const tier = tierForWagered(rewards.lifetimeWagered);
    body.innerHTML = "";
    const card = document.createElement("div");
    card.className = "rewards-member-card";
    card.innerHTML = `
      <div class="rewards-tier">${tier.label.toUpperCase()}</div>
      <div class="rewards-member-id">${rewards.memberId}</div>
      <div class="rewards-member-name">${this.session.playerName}</div>
      <div class="rewards-member-wager">${fmtChips(rewards.lifetimeWagered)} lifetime</div>
    `;
    body.appendChild(card);
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

  _renderOffers(body) {
    const rewards = this.tracker.ensureRewards();
    const tier = tierForWagered(rewards.lifetimeWagered);
    body.innerHTML = "";
    const offers = [
      "Pool cabana — 20% off for Pearl+",
      "House of Blues — priority line for Gold+",
      "Spa day — comped upgrade for Platinum+",
      "Foundation Room — Noir members only",
      "Penthouse fantasy package — Chairman",
    ];
    const tierIdx = TIERS.findIndex((t) => t.id === tier.id);
    for (let i = 0; i < offers.length; i++) {
      const locked = i > tierIdx;
      body.appendChild(this._line(locked ? `🔒 ${offers[i]}` : offers[i], locked ? "dim" : ""));
    }
  }

  _line(text, cls = "") {
    const p = document.createElement("p");
    p.className = cls;
    p.textContent = text;
    return p;
  }
}
