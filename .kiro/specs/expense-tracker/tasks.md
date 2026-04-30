# Implementation Plan: Expense Tracker

## Overview

Build a single-page personal expense tracker using HTML, CSS, and Vanilla JavaScript. The app follows a data → render pattern: a single in-memory `transactions[]` array is the source of truth. Every mutation (add, delete, init) persists to `localStorage` and triggers a full re-render of the balance, list, and chart. Chart.js 4.5.0 is loaded via CDN. No build tools or test setup is required.

## Tasks

- [x] 1. Set up project file structure
  - Create `index.html` with the base HTML skeleton: `<head>` with Chart.js 4.5.0 CDN `<script>` tag and link to `style.css`, and `<body>` with placeholder sections for the balance display, input form, transaction list, and chart canvas
  - Create `style.css` as an empty file (to be filled in later tasks)
  - Create `app.js` as an empty module (to be linked from `index.html` with `type="module"` or as a deferred script)
  - _Requirements: 7.2, 8.1_

- [x] 2. Implement the data model and storage service
  - [x] 2.1 Define the `Transaction` object shape and the `storage` module in `app.js`
    - Document the `Transaction` shape (`id`, `name`, `amount`, `category`) as a JSDoc comment
    - Implement `storage.save(transactions)`: serializes the array to JSON and writes to `localStorage` key `"expense-tracker-transactions"`; wraps `setItem` in try/catch to handle `QuotaExceededError` and unavailable `localStorage` gracefully (log warning, do not throw)
    - Implement `storage.load()`: reads and parses from `localStorage`; wraps `JSON.parse` in try/catch and returns `[]` on any error or missing key
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [ ]* 2.2 Write property test for storage round-trip (Property 9)
    - **Property 9: App initializes from localStorage**
    - **Validates: Requirements 2.3, 2.4**
    - Seed arbitrary valid transaction arrays into `localStorage` via `storage.save()`, then call `storage.load()` and assert the result equals the seeded data

- [x] 3. Implement the `validate()` function
  - [x] 3.1 Implement `validate(formData)` in `app.js`
    - Accept `{ name, amount, category }` as raw string values from the form
    - Return `null` if all fields are valid: `name` is non-empty after trim, `amount` parses to a finite number > 0, `category` is one of `"Food"`, `"Transport"`, `"Fun"`
    - Return a `ValidationResult` object with per-field error message strings for any failing fields
    - _Requirements: 1.2, 1.3_

  - [ ]* 3.2 Write property test for validator rejects invalid inputs (Property 1)
    - **Property 1: Validator rejects all invalid inputs**
    - **Validates: Requirements 1.2, 1.3**
    - Generate arbitrary combinations where at least one field is invalid (empty/whitespace name, non-positive or non-numeric amount, invalid category) and assert `validate(formData) !== null`

- [x] 4. Implement the `renderBalance()` sub-renderer
  - [x] 4.1 Implement `renderBalance(transactions)` in `app.js`
    - Compute `sum = transactions.reduce((acc, t) => acc + t.amount, 0)`
    - Format as currency (e.g. `$0.00`) and set the text content of the balance display element
    - When `transactions` is empty, display `$0.00`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ]* 4.2 Write property test for balance equals sum of amounts (Property 7)
    - **Property 7: Balance always equals sum of transaction amounts**
    - **Validates: Requirements 5.2, 5.3, 5.4, 5.5, 4.3**
    - Generate arbitrary arrays of valid transactions (including empty) and assert the displayed balance text equals the arithmetic sum of all `amount` fields

- [x] 5. Implement the `renderList()` sub-renderer
  - [x] 5.1 Implement `renderList(transactions)` in `app.js`
    - Clear the list container and rebuild it from `transactions` in reverse-insertion order (most recent first)
    - Each item is an `<li>` containing the transaction name, amount, category, and a delete `<button>` with a `data-id` attribute set to the transaction's `id`
    - When `transactions` is empty, render a "No transactions yet" placeholder message
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 4.1_

  - [ ]* 5.2 Write property test for reverse-insertion order (Property 4)
    - **Property 4: Transaction list is in reverse-insertion order**
    - **Validates: Requirements 3.3**
    - Generate arbitrary sequences of 1–20 valid transactions and assert rendered list items appear in reverse order of insertion

  - [ ]* 5.3 Write property test for every list item has a delete control (Property 5)
    - **Property 5: Every list item has a delete control**
    - **Validates: Requirements 4.1**
    - Generate arbitrary non-empty transaction arrays and assert every rendered `<li>` contains a `[data-id]` delete button whose value matches the transaction's `id`

- [x] 6. Implement the `renderChart()` sub-renderer
  - [x] 6.1 Implement `renderChart(transactions)` in `app.js`
    - Aggregate `amount` totals by category from the `transactions` array
    - Use the fixed category color map: Food → `#FF6384`, Transport → `#36A2EB`, Fun → `#FFCE56`
    - If `transactions` is empty, destroy any existing Chart.js instance and show a "No data available" placeholder message on the canvas container
    - Otherwise, create or update the Chart.js pie chart instance with the aggregated labels, data, and background colors; include only categories that have at least one transaction
    - If Chart.js fails to load from CDN, display a static "Chart unavailable — please check your connection" fallback message
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ]* 6.2 Write property test for chart data matches category sums (Property 8)
    - **Property 8: Chart data matches category sums**
    - **Validates: Requirements 6.1, 4.4, 6.3, 6.4**
    - Generate arbitrary non-empty transaction arrays and assert chart dataset values match `sum(amount)` grouped by category, and labels match only categories present

- [x] 7. Implement the top-level `render()` function
  - Implement `render()` in `app.js` that calls `renderBalance(transactions)`, `renderList(transactions)`, and `renderChart(transactions)` in sequence
  - _Requirements: 3.4, 4.3, 4.4, 5.3, 5.4, 6.3, 6.4, 8.2, 8.3_

- [x] 8. Implement `handleAdd()` and wire the input form
  - [x] 8.1 Implement `handleAdd(event)` in `app.js`
    - Prevent default form submission
    - Read `name`, `amount`, and `category` values from the form fields
    - Call `validate(formData)`; if invalid, display inline error messages adjacent to the relevant fields and return without creating a transaction
    - If valid: create a new `Transaction` with `id = crypto.randomUUID()`, push it to `transactions[]`, call `storage.save(transactions)`, call `render()`, and reset all form fields to their default empty state
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1_

  - [ ]* 8.2 Write property test for valid transaction add round-trip (Property 2)
    - **Property 2: Valid transaction add round-trip**
    - **Validates: Requirements 1.4, 2.1, 3.1**
    - Generate arbitrary valid `(name, amount, category)` tuples, call `handleAdd()`, and assert the transaction appears in `transactions[]`, in the DOM list, and in `storage.load()`

  - [ ]* 8.3 Write property test for form resets after valid submission (Property 3)
    - **Property 3: Form resets after valid submission**
    - **Validates: Requirements 1.5**
    - Generate arbitrary valid transaction inputs, call `handleAdd()`, and assert all form field values are empty/default afterward

- [x] 9. Implement `handleDelete()` and wire delete controls
  - [x] 9.1 Implement `handleDelete(id)` in `app.js`
    - Filter the transaction with the matching `id` out of `transactions[]`
    - Call `storage.save(transactions)` and `render()`
    - Wire the delete button click event using event delegation on the list container (listen for clicks on elements with `data-id`)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 2.2_

  - [ ]* 9.2 Write property test for delete removes transaction from list and storage (Property 6)
    - **Property 6: Delete removes transaction from list and storage**
    - **Validates: Requirements 4.2, 2.2**
    - Generate arbitrary non-empty transaction arrays, pick a random transaction to delete, call `handleDelete(id)`, and assert the transaction is absent from `transactions[]`, the DOM, and `storage.load()`

- [x] 10. Implement `init()` and bootstrap the app
  - Implement `init()` in `app.js`: call `storage.load()` to populate `transactions[]`, attach the `handleAdd` listener to the form's `submit` event, and call `render()`
  - Register `init` on the `DOMContentLoaded` event
  - _Requirements: 2.3, 2.4, 8.1_

- [x] 11. Checkpoint — Verify core functionality end-to-end
  - Ensure all tests pass, ask the user if questions arise.
  - Open `index.html` in a browser and verify: the form renders, a transaction can be added, the balance updates, the list shows the new item with a delete button, the chart renders, deleting a transaction updates all three regions, and data persists after a page reload

- [x] 12. Style the UI with CSS
  - [x] 12.1 Implement layout and base styles in `style.css`
    - Style the overall page layout (centered container, font, background)
    - Style the Balance_Display to be prominent at the top
    - Style the Input_Form with labeled fields, a submit button, and inline error message styles
    - _Requirements: 1.1, 5.1_

  - [x] 12.2 Style the Transaction_List
    - Style the list container to be scrollable when items overflow the visible area
    - Style each list item to display name, amount, and category clearly, with the delete button visually distinct
    - _Requirements: 3.1, 3.2, 4.1_

  - [x] 12.3 Style the Chart area
    - Style the chart canvas container with appropriate sizing
    - Style the empty-state placeholder messages for the list and chart
    - _Requirements: 6.5_

- [x] 13. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
  - Verify the complete app in Chrome, Firefox, Edge, and Safari; confirm it works when opened as a `file://` URL; confirm data persists across page reloads

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP (they require fast-check via CDN or Node.js + jsdom)
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at logical milestones
- Property tests validate universal correctness properties defined in the design document
- Unit tests and property tests are complementary — both are optional per NFR-1 (no test setup required)
