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

Frontend quality tools have exact direct versions in `tools/package.json`.
Their transitive dependency lockfile could not be generated offline. After a
network-enabled `npm install --prefix tools`, review and commit
`tools/package-lock.json`, then switch both installation commands in the workflow
and Makefile to `npm ci --prefix tools --ignore-scripts --no-audit --no-fund`.
The existing application lockfile at `web/package-lock.json` is retained.
