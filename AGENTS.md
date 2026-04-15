<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Deployment – always ship to Vercel

This project is deployed on Vercel and auto-deploys from the `main` branch.
Whenever you make a change that should be visible in the live app, you MUST:

1. Commit the change on the current feature branch.
2. Push the branch to `origin`.
3. Open a pull request against `main` (via the GitHub MCP tools).
4. Merge the PR into `main` (squash merge is fine) so Vercel rebuilds.
5. Tell the user the change is live once merged.

Do NOT leave changes sitting on a feature branch – the user expects every
accepted change to appear on the Vercel site automatically. If a change is
explicitly experimental or the user asks you not to deploy, skip the merge
step, but otherwise always finish the loop by merging to `main`.
