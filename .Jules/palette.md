## 2026-04-09 - [Visible Focus States]
**Learning:** Suppressing default focus indicators with `outline: none` is a common accessibility barrier in this codebase. Replacing them with `:focus-visible` using brand colors provides a high-impact micro-UX improvement without cluttering the UI for mouse users.
**Action:** Always check for `outline: none` in project-wide CSS and ensure interactive elements have clear focus states.
