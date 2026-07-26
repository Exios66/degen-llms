// Extracted from app.js — shared by the web terminal and the pixel RPG.
import { ACTIVITIES } from "../core.js";
import { STAKE_TIERS, TIER_ORDER, formatTierLabel, getTier } from "../stakes.js";

export function buildStakesRenderers(ctx) {
  const { el, banner, chipLine, showStatus, menu, pushView, goBack } = ctx;
  const runtime = ctx.runtime;

  function renderStakeTier({ activityId, nextView }) {
    const act = ACTIVITIES[activityId];
    const balance = ctx.session.wallet.balance;
    const options = TIER_ORDER.map((id) => {
      const tier = STAKE_TIERS[id];
      if (balance < tier.minBet) {
        return `${tier.name} — requires ${tier.minBet.toLocaleString()} chips`;
      }
      return formatTierLabel(tier, balance);
    });
    return el("div", { className: "panel" }, [
      banner(`${act?.name ?? "Activity"} — Stake Tier`),
      el("p", { className: "dim", textContent: "Pick a stake tier before sitting down. Salon tiers (401K, No Limit) apply across every machine and table." }),
      chipLine(),
      menu(options, "Choose stake tier:", (choice) => {
        if (choice === 0) { goBack(); return; }
        const tier = getTier(TIER_ORDER[choice - 1]);
        if (balance < tier.minBet) {
          showStatus(`You need at least ${tier.minBet.toLocaleString()} chips for ${tier.name}.`, "error");
          return;
        }
        runtime.stakeTier = tier;
        if (activityId === "slots") runtime.slots.tier = tier;
        if (activityId === "roulette") runtime.roulette.tier = tier;
        if (activityId === "craps") runtime.craps.tier = tier;
        if (activityId === "lottery") runtime.lottery.tier = tier;
        if (activityId === "horse_racing") runtime.horseRacing.tier = tier;
        if (activityId === "dressage") runtime.dressage.tier = tier;
        if (activityId === "jumper") runtime.jumper.tier = tier;
        pushView(nextView);
      }),
    ]);
  }

  return {
    "stake-tier": renderStakeTier,
  };
}
