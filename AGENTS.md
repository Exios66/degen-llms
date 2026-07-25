# AGENTS.md

## Cursor Cloud specific instructions

This repo ("The Mandalay Bay" / `degen-llms`) is a satirical casino simulator with
Python game logic as the source of truth, plus static browser surfaces. There is **no
backend server and no database** — CLI state persists to disk, web state to
`localStorage`.

### Environment / package manager
- Python is managed with **`uv`** (`uv.lock` is committed). The startup update script
  installs `uv` (to `~/.local/bin`) and runs `uv sync --extra dev`, which creates
  `.venv` and installs `pytest`.
- **Gotcha:** the system Python has no `ensurepip`/`python3-venv`, so plain
  `python3 -m venv` / `pip install -e .` will fail. Use `uv` (it builds its own venv).
- If `uv` isn't on `PATH`, call it as `~/.local/bin/uv` or add `~/.local/bin` to `PATH`.

### Tests
- `uv run pytest` (or `uv run pytest -q`). ~186 tests; `testpaths=["tests"]`.

### Lint
- No dedicated linter is installed or declared. `pyproject.toml` has a `[tool.basedpyright]`
  block, but `basedpyright` is not a dependency, so there is no runnable lint step.

### Run the CLI game (core product)
- Full resort hub: `uv run python -m mandalay_bay` (interactive menu-driven).
- Standalone blackjack: `uv run python -m blackjack`.
- Useful non-interactive flags for scripting/testing:
  - `uv run python -m mandalay_bay --list-saves`
  - `uv run python -m mandalay_bay --slot 1 --new-save --name "Ace" --chips 2500`
  - `uv run python -m blackjack --quick --bots 2 --rounds 2` (auto-bets min; still prompts
    hit/stand + insurance per hand, so pipe input, e.g. `printf 's\ns\nn\n' | ...`).
- Sandbox CLI saves with `MANDALAY_BAY_SAVE_DIR=/tmp/mb_saves` (default is
  `~/.mandalay_bay/saves/`).

### Run the web terminal + pixel RPG surfaces (static)
- No bundler/dev-server command; serve the `docs/` dir with any static server:
  `python3 -m http.server 8000 --directory docs`
  - Web terminal: `http://localhost:8000/`
  - Pixel RPG: `http://localhost:8000/rpg/`
- **ES modules require HTTP** — opening files via `file://` will not work.
- The RPG additionally needs **outbound internet** to `cdn.jsdelivr.net` (Phaser 3.80.1).
  The plain web terminal does not.

### Optional (not needed to run/test the game)
- Quarto docs site (`index.qmd`, `_quarto.yml`) — Quarto is not installed.
- Posit Connect Cloud publishing and Node sprite tooling are dev/deploy-only.
