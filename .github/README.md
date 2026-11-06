# GitHub configuration

The `CI` workflow runs on every pull request, pushes to `main` / `master`, and manually.
It uses read-only repository permissions and does not need repository secrets.
Do not change the PR trigger to `pull_request_target`: checks run contributor code.

After the first successful workflow run, create a branch ruleset for the default
branch under **Settings → Rules → Rulesets**:

- Require a pull request before merging.
- Require status checks: `Go checks`, `Web checks`, `Browser tests`, `Docker builds`.
- Block force pushes and branch deletion.

These are server-side settings; adding workflow files alone does not enable them.
The names above must match actual check names from the first run.

Successful runs upload backend binaries and web assets. Browser failures include
Playwright traces and service logs. The Docker job verifies development images;
`web/Dockerfile` runs Vite and is not a production web server.

No production deploy is configured: a deployment destination, credentials and
release/rollback requirements must be chosen first.

Frontend quality tools and their transitive dependencies are pinned in
`tools/package-lock.json`. Both the workflow and Makefile install them with
`npm ci`. Dependabot proposes weekly dependency and Actions updates.
