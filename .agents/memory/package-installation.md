---
name: Monorepo package installation
description: Package installation behavior for this pnpm workspace.
---

When adding a dependency to an artifact in this pnpm monorepo, target the artifact package rather than the workspace root, then run a workspace install to repair links.

**Why:** The generic package installer targets the root and refuses workspace-root additions, while filtered installs can leave peer-linked packages needing a follow-up workspace install.

**How to apply:** Use the artifact-specific package target for frontend dependencies, verify the package manifest, and run the workspace typechecks afterward.