/** Shared leave/settle cleanup for hosted casino screens (web terminal + RPG host). */
import { refundSportsbookOpen, refundSlips, refundTradingPositions } from "./pendingRefunds.js";
import { spinWheel, resolveBet } from "./roulette.js";

function finalizeSlotsSpin(ctx, clearSlotsSpinTimers) {
  const { session, runtime, persist } = ctx;
  const slots = runtime.slots;
  const outcome = slots?.pendingOutcome;
  if (!outcome) return;
  clearSlotsSpinTimers?.();
  slots.spinning = false;
  slots.reelsStopped = 3;
  slots.landedReel = -1;
  slots.lastReels = slots.pendingFinalReels;
  slots.displayReels = slots.pendingFinalReels;
  slots.pendingFinalReels = null;
  slots.pendingOutcome = null;
  slots.spins += 1;
  slots.lastWin = outcome.win > 0;
  slots.winTier = outcome.winTier;
  slots.lastWinAmount = outcome.win;
  if (outcome.win > 0) {
    session.wallet.credit(outcome.win, "slots", outcome.reason);
    slots.sessionNet += outcome.voucher ? outcome.win : outcome.win - outcome.bet;
  } else if (!outcome.voucher) {
    slots.sessionNet -= outcome.bet;
  }
  persist?.();
}

/**
 * Run activity-specific refunds and session stats before forcibly closing a hosted view.
 * @param {object} ctx — terminal or RPG host context
 * @param {string | null | undefined} viewName — current view stack entry
 * @param {{ clearSlotsSpinTimers?: () => void }} helpers
 */
export function teardownHostedView(ctx, viewName, helpers = {}) {
  if (!viewName || viewName.startsWith("__")) return;
  const baseView = viewName.startsWith("horse-racing") ? "horse-racing"
    : viewName.startsWith("dressage") ? "dressage"
      : viewName.startsWith("jumper") ? "jumper"
        : viewName.startsWith("trading-") ? "trading-desk"
          : viewName;
  const { session, runtime, recordActivityResult, clearActivityVisit, persist } = ctx;
  const { clearSlotsSpinTimers } = helpers;

  switch (baseView) {
    case "slots-play": {
      if (runtime.slots?.spinning) finalizeSlotsSpin(ctx, clearSlotsSpinTimers);
      else clearSlotsSpinTimers?.();
      if (runtime.slots?.spins > 0 || runtime.slots?.sessionNet) {
        recordActivityResult?.("slots", runtime.slots.sessionNet, runtime.slots.spins || 1);
      }
      clearActivityVisit?.("slots");
      break;
    }
    case "sportsbook": {
      refundSportsbookOpen(session, runtime.sportsbook, "Sportsbook leave");
      clearActivityVisit?.("sportsbook");
      break;
    }
    case "craps": {
      if (runtime.craps?.lineBet) {
        session.wallet.credit(runtime.craps.lineBet.amount, "craps", "Craps leave — line returned");
        runtime.craps.sessionNet += runtime.craps.lineBet.amount;
        runtime.craps.lineBet = null;
      }
      for (const [id, amt] of Object.entries(runtime.craps?.hardways || {})) {
        session.wallet.credit(amt, "craps", `Craps leave — ${id} returned`);
        runtime.craps.sessionNet += amt;
      }
      if (runtime.craps) runtime.craps.hardways = {};
      if (runtime.craps?.rolls > 0 || runtime.craps?.sessionNet) {
        recordActivityResult?.("craps", runtime.craps.sessionNet, runtime.craps.rolls || 1);
      }
      if (runtime.craps) {
        runtime.craps.table = null;
        runtime.craps.log = [];
      }
      break;
    }
    case "roulette": {
      if (runtime.roulette?.spinTimeoutId) {
        clearTimeout(runtime.roulette.spinTimeoutId);
        runtime.roulette.spinTimeoutId = null;
      }
      if (runtime.roulette?.spinning && runtime.roulette.pendingSpin) {
        const { bet, amount, straightPick } = runtime.roulette.pendingSpin;
        const number = spinWheel();
        const { win, reason } = resolveBet(bet, amount, number, straightPick);
        runtime.roulette.spins += 1;
        runtime.roulette.lastNumber = number;
        runtime.roulette.spinning = false;
        if (win > 0) {
          session.wallet.credit(win, "roulette", reason);
          runtime.roulette.sessionNet += win - amount;
        } else {
          runtime.roulette.sessionNet -= amount;
        }
        runtime.roulette.pendingSpin = null;
      }
      if (runtime.roulette?.spins > 0 || runtime.roulette?.sessionNet) {
        recordActivityResult?.("roulette", runtime.roulette.sessionNet, runtime.roulette.spins || 1);
      }
      clearActivityVisit?.("roulette");
      break;
    }
    case "horse-racing": {
      if (runtime.horseRacing?.pending?.length) {
        refundSlips(session, "horse_racing", runtime.horseRacing.pending, "Racing leave — open tickets returned");
        runtime.horseRacing.pending = [];
      }
      if (runtime.horseRacing?.races > 0 || runtime.horseRacing?.sessionNet) {
        recordActivityResult?.("horse_racing", runtime.horseRacing.sessionNet, runtime.horseRacing.races || 1);
      }
      runtime.horseRacing.cachedResults = null;
      runtime.horseRacing.settleCompleted = false;
      clearActivityVisit?.("horse_racing");
      break;
    }
    case "dressage": {
      if (runtime.dressage?.pending?.length) {
        refundSlips(session, "dressage", runtime.dressage.pending, "Dressage leave — open tickets returned");
        runtime.dressage.pending = [];
      }
      if (runtime.dressage?.events > 0 || runtime.dressage?.sessionNet) {
        recordActivityResult?.("dressage", runtime.dressage.sessionNet, runtime.dressage.events || 1);
      }
      clearActivityVisit?.("dressage");
      break;
    }
    case "jumper": {
      if (runtime.jumper?.pending?.length) {
        refundSlips(session, "jumper", runtime.jumper.pending, "Jumper leave — open tickets returned");
        runtime.jumper.pending = [];
      }
      if (runtime.jumper?.events > 0 || runtime.jumper?.sessionNet) {
        recordActivityResult?.("jumper", runtime.jumper.sessionNet, runtime.jumper.events || 1);
      }
      clearActivityVisit?.("jumper");
      break;
    }
    case "trading-desk": {
      if (runtime.tradingDesk?.positions?.length) {
        refundTradingPositions(
          session,
          "trading_desk",
          runtime.tradingDesk.positions,
          "Trading leave — open positions refunded",
        );
        runtime.tradingDesk.positions = [];
      }
      clearActivityVisit?.("trading_desk");
      break;
    }
    case "lottery": {
      const L = runtime.lottery;
      if (L?.tickets > 0 || L?.sessionNet) {
        recordActivityResult?.("lottery", L.sessionNet, L.tickets || 1);
        L.sessionNet = 0;
        L.tickets = 0;
      }
      break;
    }
    case "arcade-menu": {
      if (runtime.arcade?.plays > 0 || runtime.arcade?.sessionNet) {
        recordActivityResult?.("arcade", runtime.arcade.sessionNet, runtime.arcade.plays || 1);
        runtime.arcade.sessionNet = 0;
        runtime.arcade.plays = 0;
      }
      break;
    }
    default:
      break;
  }
  persist?.();
}
