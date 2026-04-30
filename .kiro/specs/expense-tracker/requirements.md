# Requirements Document

## Introduction

A personal expense tracker web app built with HTML, CSS, and Vanilla JavaScript. The app runs entirely in the browser with no backend server — all data is persisted using the browser's Local Storage API. Users can log expenses by name, amount, and category; view a scrollable transaction list; see a running total balance; and visualize spending distribution via a pie chart. The app must work as a standalone web page or browser extension across all modern browsers.

## Glossary

- **App**: The personal expense tracker web application.
- **Transaction**: A single expense entry consisting of a name, amount, and category.
- **Transaction_List**: The scrollable UI component that displays all recorded transactions.
- **Input_Form**: The UI form component used to enter new transaction data.
- **Balance_Display**: The UI component at the top of the page that shows the total amount spent.
- **Chart**: The pie chart UI component that visualizes spending distribution by category.
- **Category**: A classification label for a transaction. Valid values are: Food, Transport, Fun.
- **Local_Storage**: The browser's built-in `localStorage` API used for client-side data persistence.
- **Validator**: The logic component responsible for checking that all required form fields are filled before submission.

---

## Requirements

### Requirement 1: Add a Transaction

**User Story:** As a user, I want to fill in a form with an expense name, amount, and category, so that I can record a new transaction.

#### Acceptance Criteria

1. THE Input_Form SHALL provide a text field for the item name, a numeric field for the amount, and a dropdown selector for the category (Food, Transport, Fun).
2. WHEN the user submits the Input_Form, THE Validator SHALL verify that the item name field is not empty, the amount field contains a positive numeric value, and a category has been selected.
3. IF the Validator detects that any required field is empty or invalid, THEN THE Input_Form SHALL display an inline error message identifying the missing or invalid field and SHALL NOT add a transaction.
4. WHEN the Input_Form passes validation, THE App SHALL create a new Transaction and add it to the Transaction_List.
5. WHEN a new Transaction is successfully added, THE Input_Form SHALL reset all fields to their default empty state.

---

### Requirement 2: Persist Transactions Across Sessions

**User Story:** As a user, I want my transactions to be saved automatically, so that my data is still available when I reopen the app.

#### Acceptance Criteria

1. WHEN a Transaction is added, THE App SHALL write the updated transaction data to Local_Storage.
2. WHEN a Transaction is deleted, THE App SHALL write the updated transaction data to Local_Storage.
3. WHEN the App initializes, THE App SHALL read all previously stored transactions from Local_Storage and render them in the Transaction_List.
4. IF Local_Storage contains no previously stored data, THEN THE App SHALL initialize with an empty Transaction_List.

---

### Requirement 3: Display the Transaction List

**User Story:** As a user, I want to see a scrollable list of all my recorded expenses, so that I can review what I have spent.

#### Acceptance Criteria

1. THE Transaction_List SHALL display each Transaction's item name, amount, and category.
2. THE Transaction_List SHALL be scrollable when the number of transactions exceeds the visible area.
3. THE Transaction_List SHALL display transactions in the order they were added, with the most recent transaction appearing at the top.
4. WHEN a Transaction is added or deleted, THE Transaction_List SHALL update immediately to reflect the current state.

---

### Requirement 4: Delete a Transaction

**User Story:** As a user, I want to delete a transaction from the list, so that I can remove incorrect or unwanted entries.

#### Acceptance Criteria

1. THE Transaction_List SHALL display a delete control for each Transaction.
2. WHEN the user activates the delete control for a Transaction, THE App SHALL remove that Transaction from the Transaction_List.
3. WHEN a Transaction is deleted, THE Balance_Display SHALL update to reflect the new total.
4. WHEN a Transaction is deleted, THE Chart SHALL update to reflect the new spending distribution.

---

### Requirement 5: Display the Total Balance

**User Story:** As a user, I want to see the total amount I have spent displayed prominently, so that I can track my overall expenditure at a glance.

#### Acceptance Criteria

1. THE Balance_Display SHALL be visible at the top of the App at all times.
2. THE Balance_Display SHALL show the sum of the amounts of all Transactions currently in the Transaction_List.
3. WHEN a Transaction is added, THE Balance_Display SHALL update to reflect the new total without requiring a page reload.
4. WHEN a Transaction is deleted, THE Balance_Display SHALL update to reflect the new total without requiring a page reload.
5. IF the Transaction_List is empty, THEN THE Balance_Display SHALL display a total of 0.

---

### Requirement 6: Visualize Spending by Category

**User Story:** As a user, I want to see a pie chart of my spending broken down by category, so that I can understand where my money is going.

#### Acceptance Criteria

1. THE Chart SHALL display a pie chart showing the proportion of total spending for each Category that has at least one Transaction.
2. THE Chart SHALL assign a distinct, consistent color to each Category (Food, Transport, Fun).
3. WHEN a Transaction is added, THE Chart SHALL update automatically to reflect the new spending distribution.
4. WHEN a Transaction is deleted, THE Chart SHALL update automatically to reflect the new spending distribution.
5. IF the Transaction_List is empty, THEN THE Chart SHALL display a placeholder state indicating that no data is available.

---

### Requirement 7: Browser Compatibility

**User Story:** As a user, I want the app to work in any modern browser, so that I am not restricted to a specific browser or platform.

#### Acceptance Criteria

1. THE App SHALL function correctly in the current stable release of Chrome, Firefox, Edge, and Safari.
2. THE App SHALL operate as a standalone web page loaded from the local file system or a static web server.
3. WHERE the App is packaged as a browser extension, THE App SHALL function correctly within the extension environment without requiring a backend server.

---

### Requirement 8: Performance and Responsiveness

**User Story:** As a user, I want the app to load quickly and respond without noticeable lag, so that using it feels smooth and efficient.

#### Acceptance Criteria

1. THE App SHALL render the initial UI, including all stored transactions, within 1 second of being opened in a modern browser on a standard consumer device.
2. WHEN a Transaction is added or deleted, THE App SHALL update the Transaction_List, Balance_Display, and Chart within 100 milliseconds.
3. THE App SHALL remain responsive to user input while updating the Transaction_List, Balance_Display, and Chart.
