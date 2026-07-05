# GitHub Pages sync logs

The file `gh-pages-sync.log` records every **Deploy GitHub Pages** workflow run:

- **push** — when `docs/` or the deploy workflow changes on `main`
- **schedule** — hourly check (`0 * * * *` UTC)
- **workflow_dispatch** — manual run from the Actions tab

Each line is pipe-delimited:

```
TIMESTAMP | trigger=… | main=SHA | gh-pages=SHA | status=… | synced=yes|no | changed=N | docs_files=N | url=…
```

- `status=up_to_date` — gh-pages already matched main; no publish
- `status=synced` — docs were copied from main to the `gh-pages` branch

The live site reads from the **`gh-pages`** branch (`/docs` folder):  
https://exios66.github.io/degen-llms/
