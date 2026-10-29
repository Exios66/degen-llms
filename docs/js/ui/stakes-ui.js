// Extracted from app.js — shared by the web terminal and the pixel RPG.
import { ACTIVITIES } from "../core.js";
import { STAKE_TIERS, TIER_ORDER, formatTierLabel, getTier } from "../stakes.js";
import { SALON_STAKE_TIER_ORDER } from "../salon-exclusives.js";
import { getActivityBranding } from "../strip-destinations.js";

function applyTierToRuntime(runtime, activityId, tier) {
  runtime.stakeTier = tier;
  if (activityId === "slots") runtime.slots.tier = tier;
  if (activityId === "roulette") runtime.roulette.tier = tier;
  if (activityId === "craps") runtime.craps.tier = tier;
  if (activityId === "lottery") runtime.lottery.tier = tier;
  if (activityId === "horse_racing") runtime.horseRacing.tier = tier;
  if (activityId === "dressage") runtime.dressage.tier = tier;
  if (activityId === "jumper") runtime.jumper.tier = tier;
}

export function buildStakesRenderers(ctx) {
  const { el, banner, chipLine, showStatus, menu, pushView, goBack } = ctx;
  const runtime = ctx.runtime;

  function renderStakeTier({ activityId, nextView, salonExclusive = false } = {}) {
    const act = ACTIVITIES[activityId];
    const balance = ctx.session.wallet.balance;
    const tierIds = salonExclusive ? SALON_STAKE_TIER_ORDER : TIER_ORDER;

    const options = tierIds.map((id) => {
      const tier = STAKE_TIERS[id];
      if (balance < tier.minBet) {
        return `${tier.name} — requires ${tier.minBet.toLocaleString()} chips`;
      }
      return formatTierLabel(tier, balance);
    });
    const brand = getActivityBranding(ctx.session, activityId, act?.name ?? "Activity");
    return el("div", { className: "panel" }, [
      banner(`${brand.name} — Stake Tier`),
      el("p", {
        className: "dim",
        textContent: salonExclusive
          ? "Salon exclusives — High Limit, 401K Contribution, or No Limit only."
          : "Pick a stake tier before sitting down. Salon tiers (401K, No Limit) apply across every machine and table.",
      }),
      chipLine(),
      menu(options, "Choose stake tier:", (choice) => {
        if (choice === 0) { goBack(); return; }
        const tier = getTier(tierIds[choice - 1]);
        if (balance < tier.minBet) {
          showStatus(`You need at least ${tier.minBet.toLocaleString()} chips for ${tier.name}.`, "error");
          return;
        }
        applyTierToRuntime(runtime, activityId, tier);
        pushView(nextView);
      }),
    ]);
  }

  return {
    "stake-tier": renderStakeTier,
  };
}
