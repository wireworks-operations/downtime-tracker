## 2026-04-09 - [Debouncing Search Input]
**Learning:** Debouncing the search input significantly reduces the number of expensive filtering and DOM re-rendering operations during rapid typing. Using a regular function instead of an arrow function for the debounced wrapper ensures that the 'this' context of the event listener is preserved if needed.
**Action:** Apply debouncing to high-frequency UI events that trigger expensive calculations or DOM updates.
