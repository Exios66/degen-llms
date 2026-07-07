"""Phone dialogue requirement rules — Python mirror of docs/js/phone-rapport.js meetsRequirements."""


def meets_requirements(req: dict | None, ctx: dict) -> bool:
  if not req:
    return True
  if req.get("minRapport") is not None and ctx["rapport"] < req["minRapport"]:
    return False
  if req.get("minTierIdx") is not None and ctx["tierIdx"] < req["minTierIdx"]:
    return False
  if req.get("buzzed") and not ctx.get("isBuzzed"):
    return False
  if req.get("minIntoxLevel") is not None and ctx.get("intox", {}).get("level", 0) < req["minIntoxLevel"]:
    return False
  return True


def test_min_rapport_gate() -> None:
  ctx = {"rapport": 10, "tierIdx": 2, "isBuzzed": False, "intox": {"level": 0}}
  assert meets_requirements({"minRapport": 15}, ctx) is False
  assert meets_requirements({"minRapport": 10}, ctx) is True


def test_noir_tier_gate() -> None:
  ctx = {"rapport": 50, "tierIdx": 3, "isBuzzed": False, "intox": {"level": 0}}
  assert meets_requirements({"minTierIdx": 4}, ctx) is False
  ctx["tierIdx"] = 4
  assert meets_requirements({"minTierIdx": 4}, ctx) is True


def test_intox_hidden_option_requires_buzzed() -> None:
  ctx = {"rapport": 20, "tierIdx": 2, "isBuzzed": False, "intox": {"level": 1}}
  assert meets_requirements({"buzzed": True}, ctx) is False
  ctx["isBuzzed"] = True
  assert meets_requirements({"buzzed": True}, ctx) is True
