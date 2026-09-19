---
name: Interview integrity and personalization
description: Durable rules for preventing tab switching and personalizing interview prompts without weakening question ownership.
---

The interview should end when the active document becomes hidden, and personalized resume wording must be sent alongside a question ID that the server validates for the session's role and difficulty.

**Why:** Browser focus events can fire during legitimate permission and screen-sharing interactions, while document visibility directly indicates that the candidate left the interview tab. Keeping the database question ID authoritative prevents resume-specific wording from bypassing question ownership checks.

**How to apply:** Use `visibilitychange` rather than a generic `blur` handler for tab enforcement. Build resume-aware prompt text at the interview boundary, pass it as optional wording for evaluation, and keep answer persistence keyed to the validated question record.