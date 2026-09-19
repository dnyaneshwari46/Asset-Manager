---
name: Interview integrity and personalization
description: Durable rules for preventing tab switching and personalizing interview prompts without weakening question ownership.
---

The interview should begin with a consistent self-introduction prompt, then use personalized resume wording for later project or behavioral questions. Personalized wording must be sent alongside a question ID that the server validates for the session's role and difficulty.

**Why:** A consistent opening gives every candidate the same opportunity to introduce themselves, while later resume context makes the interview relevant. Browser focus events can fire during legitimate permission and screen-sharing interactions, while document visibility directly indicates that the candidate left the interview tab. Keeping the database question ID authoritative prevents resume-specific wording from bypassing question ownership checks.

**How to apply:** Use `visibilitychange` rather than a generic `blur` handler for tab enforcement. Build resume-aware prompt text at the interview boundary, pass it as optional wording for evaluation, and keep answer persistence keyed to the validated question record.