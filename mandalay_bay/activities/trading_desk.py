"""CLI Trading Floor activity."""
from __future__ import annotations

from mandalay_bay.activities.base import Activity, ActivityInfo
from mandalay_bay.session import PlayerSession
from mandalay_bay.trading_desk import (
    drift_spot,
    entry_cost_chips,
    filter_contracts,
    load_catalog,
    settle_position,
)


class TradingDeskActivity(Activity):
    info = ActivityInfo(
        id="trading_desk",
        name="Mandalay Markets",
        floor="Trading Floor",
        description="Futures and call/put options on NYSE, commodities, and crypto.",
        min_bet=25,
    )

    def run(self, session: PlayerSession, ui) -> None:
        session.record_visit(self.info.id)
        if not self.can_enter(session):
            ui.error(f"Minimum trade is {self.info.min_bet} chips.")
            ui.pause()
            return

        catalog = load_catalog()
        contracts = catalog.get("contracts", [])
        positions: list[dict] = []
        asset_filter = "all"
        instrument_filter = "all"
        cursor = 0
        page_size = int(catalog.get("pageSize", 20))
        session_net = 0
        trades = 0

        while True:
            ui.banner("Trading Floor — Mandalay Markets")
            ui.chip_line(session.wallet.balance)
            ui.dim(
                f"{len(contracts)} contracts · filter {asset_filter}/{instrument_filter} · "
                f"{len(positions)} open"
            )
            choice = ui.menu_choice(
                [
                    "Browse / buy contracts",
                    "Settle / expire positions",
                    "Filter asset class",
                    "Filter instrument",
                    "Next contract page",
                ],
                title="Trading Floor:",
            )
            if choice == 0:
                break
            if choice == 1:
                filtered = filter_contracts(contracts, asset_filter, instrument_filter)
                if not filtered:
                    ui.error("No contracts match filter.")
                    ui.pause()
                    continue
                start = cursor % len(filtered)
                page = [filtered[(start + i) % len(filtered)] for i in range(min(page_size, len(filtered)))]
                for i, c in enumerate(page, 1):
                    strike = f" K{c['strike']}" if c.get("strike") is not None else ""
                    ui.info(
                        f"{i}) {c['instrument'].upper()} {c['symbol']}{strike} {c['expiry']} "
                        f"— {entry_cost_chips(c)} chips · {c['underlying']}"
                    )
                pick = ui.menu_choice([f"Buy #{i}" for i in range(1, len(page) + 1)], title="Select:")
                if pick == 0:
                    continue
                contract = page[pick - 1]
                qty = ui.prompt_int("Quantity", 1, 20, default=1)
                cost = entry_cost_chips(contract, qty)
                if not session.wallet.debit(cost, self.info.id, f"Buy {contract['instrument']} {contract['symbol']}"):
                    ui.error("Insufficient chips.")
                    ui.pause()
                    continue
                positions.append({
                    "contract": contract,
                    "qty": qty,
                    "entryPrice": float(contract.get("ask") or contract["markPrice"]),
                    "cost": cost,
                })
                trades += 1
                ui.success(f"Opened {qty}× {contract['instrument']} {contract['symbol']}.")
                ui.pause()
            elif choice == 2:
                if not positions:
                    ui.error("No open positions.")
                    ui.pause()
                    continue
                for pos in positions:
                    spot = drift_spot(float(pos["contract"]["markPrice"]))
                    result = settle_position(pos, spot)
                    if result["payout"] > 0:
                        session.wallet.credit(result["payout"], self.info.id, result["reason"])
                    session_net += result["pnl"]
                    ui.info(f"{pos['contract']['symbol']}: {result['reason']} ({result['pnl']:+d})")
                positions = []
                ui.pause()
            elif choice == 3:
                opts = ["all", "nyse", "commodities", "crypto"]
                c = ui.menu_choice(opts, title="Asset class:")
                if c:
                    asset_filter = opts[c - 1]
            elif choice == 4:
                opts = ["all", "future", "call", "put"]
                c = ui.menu_choice(opts, title="Instrument:")
                if c:
                    instrument_filter = opts[c - 1]
            elif choice == 5:
                filtered = filter_contracts(contracts, asset_filter, instrument_filter)
                cursor = (cursor + page_size) % max(1, len(filtered))
                ui.dim(f"Page cursor → {cursor}")
                ui.pause()

        if trades:
            session.record_result(self.info.id, session_net, bets=trades)
        ui.pause()
