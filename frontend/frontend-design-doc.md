Personal Finance Management System
Frontend Pages & UI Specification

Document Type: Frontend Product and UI Specification
Project: Personal Finance Backend — Frontend Application
Scope: Frontend only; no backend implementation
Status: Planning and development specification

1. Project Overview
1.1 Purpose

Build a simple personal finance management application that allows users to visualize and manage their financial activities through a clean, functional interface.

The application serves as the frontend for a Personal Finance Backend project focused on financial data integrity, concurrency, idempotency, recurring transactions, reporting, and other backend engineering concepts.

The frontend should provide a realistic user experience while keeping the UI relatively basic. The main emphasis of the overall project is backend correctness and reliability, not complex frontend design.

1.2 Frontend Objectives

The frontend should allow users to:

View their accounts and account balances.
Create, view, edit, and delete transactions.
Transfer money between accounts.
Manage transaction categories.
Create and manage budgets.
Configure recurring transactions.
View monthly financial summaries.
Import transactions from CSV files.
Search, filter, and sort financial records.
View reports and spending trends.
Manage account settings and authentication interfaces.
Understand the status of financial operations through clear UI feedback.
1.3 Scope Boundaries
Included
Page layouts and navigation.
Forms and user input handling.
Client-side validation.
Mock financial data.
Local UI state management.
Loading, empty, success, and error states.
Confirmation dialogs and notifications.
Charts and tables.
Responsive layouts.
Simulated financial operations.
Frontend handling of duplicate submissions and pending actions.
Excluded
Backend API development.
Database integration.
Server-side authentication and authorization.
Actual financial transactions or money movement.
Background workers and scheduled jobs.
Database locking and transaction management.
Server-side idempotency enforcement.
Persistent audit logging.
Server-side caching and aggregation.
Actual CSV processing by a backend service.

Important: The frontend may simulate these behaviors for demonstration purposes, but it cannot guarantee financial correctness or enforce security independently. Those guarantees must ultimately be implemented and verified by the backend.

2. Target Users and Assumptions
2.1 Target User

A person who wants to track their income, expenses, transfers, budgets, and overall financial activity.

2.2 Initial Assumptions
The application manages one user's personal finances.
The user can have multiple accounts.
Accounts may represent checking, savings, cash, or credit accounts.
Transactions can represent income, expenses, or transfers.
Transactions belong to categories where applicable.
Budgets are organized by category and month.
Recurring transactions describe scheduled financial activity.
The application uses a single default currency initially.
All data is mock data until a backend is connected.
2.3 Design Principles
Clarity over complexity: Financial information should be understandable at a glance.
Consistency: Forms, tables, dialogs, and notifications should behave consistently.
Safe interactions: Destructive actions and transfers require clear feedback.
Predictable state: The interface should communicate whether an operation is pending, completed, or failed.
Backend readiness: Frontend data structures should be designed so that mock data can later be replaced by API responses.
Minimal visual complexity: Use a simple dashboard layout with reusable components rather than a highly animated or elaborate interface.
3. Application Navigation
3.1 Main Navigation Structure

The application should use a sidebar on desktop and a collapsible menu or drawer on smaller screens.

Primary Navigation
Dashboard
Accounts
Transactions
Transfers
Budgets
Recurring Transactions
Reports
Import Transactions
Categories
Settings

The sidebar should also include:

Application logo and name.
Current selected navigation item.
User profile area.
Optional theme toggle.
Logout action when authentication UI is implemented.
3.2 Global Header

The global header should contain:

Current page title.
Optional breadcrumb navigation.
Primary page action, such as Add Transaction.
Notification area for feedback messages.
User profile menu.

The primary action may change according to the active page.

Examples:

Dashboard → Add Transaction
Accounts → Add Account
Transactions → Add Transaction
Budgets → Create Budget
Recurring Transactions → Create Recurring Transaction
Categories → Add Category
3.3 Global Layout

Recommended layout:

Sidebar: approximately 240 px on desktop.
Main content: flexible width.
Content padding: approximately 24 px.
Cards: consistent padding, border radius, and spacing.
Tables: horizontally scrollable on narrow screens.
Forms: single-column layout for basic forms and two-column layout for wider desktop screens when appropriate.
4. Page Inventory
ID	Page	Purpose	Priority
P01	Dashboard	Financial overview	Must have
P02	Accounts List	View all accounts	Must have
P03	Account Details	Inspect an account and its transactions	Must have
P04	Create/Edit Account	Manage account information	Must have
P05	Transactions List	Search and manage transactions	Must have
P06	Transaction Details	Inspect an individual transaction	Should have
P07	Create/Edit Transaction	Record income or expenses	Must have
P08	Transfer Money	Record transfers between accounts	Must have
P09	Budgets List	Overview of budgets	Must have
P10	Create/Edit Budget	Configure spending limits	Must have
P11	Budget Details	Review budget performance	Should have
P12	Recurring Transactions	Manage recurring rules	Must have
P13	Create/Edit Recurring Transaction	Configure recurrence	Must have
P14	Categories	Manage transaction categories	Must have
P15	Monthly Summary	Review monthly finances	Should have
P16	Reports	Analyze income and expenses	Should have
P17	CSV Import	Upload and review transaction imports	Must have
P18	Import History	Review simulated import results	Could have
P19	Settings	Manage UI preferences	Should have
P20	Login/Register	Authentication interface	Could have
P21	Not Found/Error Pages	Handle invalid routes and UI errors	Must have
5. P01 — Dashboard
5.1 Purpose

The dashboard is the application's landing page. It should give users an immediate understanding of their financial position and recent activity.

5.2 Layout
A. Summary Cards

Display four summary cards.

Total Balance

Combined balance across applicable accounts.
Currency-formatted value.
Optional comparison with the previous month.

Monthly Income

Total income for the selected month.
Optional percentage change from the previous month.

Monthly Expenses

Total expenses for the selected month.
Optional comparison with the previous month.

Remaining Budget

Remaining amount across applicable monthly budgets.
Visual indicator for budget usage.

For credit accounts and other accounts with different balance semantics, the combined balance must follow a clearly defined calculation policy. The frontend should not assume that summing all account balances always represents net worth.

B. Income vs. Expenses Chart

Display a chart showing income and expenses over time.

Requirements:

Monthly or weekly view.
Distinct colors for income and expenses.
Tooltip with the selected period's amounts.
Empty state when no transactions exist.
Period selector.
C. Recent Transactions

Display the latest five to ten transactions.

Columns:

Date.
Description.
Category.
Account.
Amount.
Transaction type.

Interactions:

Click a row to view transaction details.
Click View All to navigate to the Transactions page.
Click Add Transaction to open the transaction form.
D. Budget Overview

Display a compact list of current budgets.

Each budget item should include:

Category.
Budget limit.
Amount spent.
Amount remaining.
Progress bar.
Usage percentage.

Visual states:

Normal: within budget.
Warning: approaching the budget limit.
Exceeded: spending is above the budget limit.

Thresholds should be configurable in frontend logic rather than duplicated across components.

E. Spending by Category

Display a donut or bar chart showing spending distribution by category.

Interactions:

Hover to inspect amounts.
Select a category to navigate to filtered transactions.
5.3 Dashboard States

Initial loading

Display skeleton cards and chart placeholders.

No data

Show a welcome message and a clear Add Your First Transaction action.

Partial data

Display available information and empty states for sections without data.

Error

Display an error message and retry action when data loading is simulated or later connected to an API.
5.4 Acceptance Criteria
Summary cards display values derived from the current mock dataset.
The selected reporting period affects applicable summaries and charts.
Recent transactions are consistent with the Transactions page.
Budget progress reflects the mock transaction data and budget limits.
Empty states do not display misleading financial values.
6. P02 — Accounts List
6.1 Purpose

Display all financial accounts managed by the user.

6.2 Page Layout

Header:

Title: Accounts
Description: Manage your financial accounts
Button: Add Account

Summary area:

Total assets, if supported by the account model.
Total liabilities, if supported.
Account count.

Account list:

Account name.
Account type.
Current balance.
Currency.
Account status.
More actions menu.

Example account types:

Checking.
Savings.
Cash.
Credit card.
Other.
6.3 User Interactions
Open account details.
Create a new account.
Edit account information.
Archive or delete an account.
Filter accounts by type.
Sort accounts by name or balance.
6.4 Account Deletion Behavior

When the user selects delete:

Open a confirmation dialog.
Display the account name.
Warn that deleting an account with existing transactions may be restricted.
Require confirmation before simulating deletion.
Show success or failure feedback.

The frontend should not silently delete associated transactions. For the mock implementation, either prohibit deletion of accounts with transactions or support archiving as the safer default.

6.5 Empty State

Title: No accounts yet

Description: Create your first account to start tracking your finances.

Primary action: Add Account

7. P03 — Account Details
7.1 Purpose

Show the details and financial activity of a selected account.

7.2 Page Components

Account summary:

Account name.
Account type.
Current balance.
Currency.
Created date, if available.

Account activity:

Transaction table.
Date filter.
Transaction type filter.
Search input.
Pagination or load-more interaction.

Additional actions:

Edit account.
Record a transaction.
Initiate a transfer.
Archive account.
7.3 Behavior

The transaction list should contain only transactions associated with the selected account.

For a transfer, the interface should make it clear whether the selected account is the source or destination.

If the account does not exist in the mock dataset, display a not-found state with a link back to Accounts.

8. P04 — Create/Edit Account
8.1 Form Fields
Account name — required.
Account type — required.
Currency — required.
Initial balance — required for account creation if supported by the selected model.
Optional description.
Optional color or icon.

Account types should come from a predefined frontend list.

8.2 Validation
Account name cannot be empty.
Currency must be selected.
Initial balance must be a valid monetary value.
Negative initial balances should be allowed only when the account type and model support them.
Trim leading and trailing whitespace from text fields.
8.3 Buttons
Save Account
Cancel

On successful mock submission:

Add or update the account in local state.
Close the form or navigate to account details.
Display a success notification.

On failure:

Preserve entered values.
Display an error message.
9. P05 — Transactions List
9.1 Purpose

Provide a central location for viewing, searching, filtering, sorting, and managing financial transactions.

9.2 Page Layout

Header:

Title: Transactions
Button: Add Transaction
Optional button: Transfer Money

Summary cards:

Total income for the selected period.
Total expenses.
Net cash flow, where the calculation is defined.

Filter toolbar:

Search by description.
Start date.
End date.
Account selector.
Category selector.
Transaction type selector.
Amount range.
Clear filters action.

Transaction table:

Date.
Description.
Type.
Account.
Category.
Amount.
Status, if applicable.
Actions.
9.3 Search and Filtering Behavior

The frontend should support combinations of filters.

Examples:

Expenses in a specific account.
Transactions within a date range.
Transactions belonging to a category.
Transactions above a given amount.
Search for a merchant or description.

Expected behavior:

Filters combine rather than replace each other.
Clearing filters restores the unfiltered dataset.
Sorting should be deterministic.
Empty search results should show a dedicated message.
The active filters should remain visible.

For the mock implementation, filtering may run entirely in memory.

9.4 Transaction Actions

Each row may provide:

View details.
Edit.
Delete.

Deleting a transaction requires a confirmation dialog.

If a transaction is part of a transfer, recurring transaction, or imported batch, the UI should communicate any special handling instead of treating it as an ordinary standalone record.

9.5 Acceptance Criteria
Search works with the other active filters.
Changing a filter updates the visible records and summary values.
Sorting produces predictable results.
The page can distinguish an empty dataset from an empty filtered result.
Deletion updates the displayed data and relevant summaries consistently.
10. P06 — Transaction Details
10.1 Purpose

Display a detailed view of an individual transaction.

10.2 Display Fields
Transaction description.
Amount.
Transaction type.
Date and time, if available.
Account.
Category.
Notes.
Creation date, if available.
Source, such as manual entry, recurring rule, or CSV import, if available.
Transfer or recurring reference, when applicable.
10.3 Actions
Edit transaction.
Delete transaction.
Return to the transaction list.

For transfers, display both source and destination accounts.

For imported transactions, display any available import metadata without exposing sensitive implementation details.

If the transaction ID does not exist, display a not-found state.

11. P07 — Create/Edit Transaction
11.1 Purpose

Allow users to record income and expenses.

11.2 Form Fields
Transaction type — income or expense.
Amount — required.
Description — required.
Account — required.
Category — required when applicable.
Transaction date — required.
Notes — optional.
11.3 Form Behavior

When the user changes the transaction type:

Update the available categories where appropriate.
Keep the account selector visible.
Update the displayed type indicator.

When the user selects an account:

Display the account's currency.
Display the current account balance as contextual information, if useful.

The form should not imply that changing the displayed amount automatically changes a real bank balance. The mock implementation may update local account balances according to the agreed transaction model.

11.4 Validation
Amount must be greater than zero.
Amount must use a valid monetary format.
Description cannot be empty.
Account must be selected.
Category must be selected when required.
Date must be valid.
The currency precision must be respected.

Use integer minor units or a decimal-safe money representation internally. Avoid binary floating-point arithmetic for financial calculations.

11.5 Submission States

Idle: Submit button is enabled.

Submitting: Disable repeated submissions and show progress.

Success: Update mock state and show a success message.

Failure: Keep the entered values and allow retry.

11.6 Important Frontend Limitation

Disabling the submit button prevents many accidental double clicks but does not provide true idempotency. The backend will eventually need to enforce duplicate-request protection.

12. P08 — Transfer Money
12.1 Purpose

Allow a user to record a transfer between two accounts.

Transfers deserve their own page or dialog because they involve two account balances and must be represented consistently.

12.2 Form Fields
Source account — required.
Destination account — required.
Amount — required.
Transfer date — required.
Description or memo — optional.
12.3 Validation Rules
Source and destination accounts must be different.
Amount must be greater than zero.
Both accounts must support the transfer's currency and account rules.
Insufficient funds should be handled according to the application's configured policy.
The transfer must not be submitted when required information is missing.

Cross-currency transfers should be excluded from the initial implementation unless exchange rates, fees, and conversion rules are explicitly defined.

12.4 Confirmation Dialog

Before submission, show:

Source account.
Destination account.
Transfer amount.
Transfer date.
Any applicable warning.

Primary action: Confirm Transfer

Secondary action: Cancel

12.5 UI States

Idle

Form is editable.
Submit action is available when valid.

Submitting

Show progress.
Disable the submit button.
Prevent conflicting repeated actions in the current interface.

Success

Display a transfer confirmation.
Update the relevant mock account balances.
Update transaction history.
Show the transfer in both accounts' activity views, linked by a common transfer reference.

Failure

Display an error.
Preserve the form values.
Do not present a failed operation as completed.

Unknown outcome

If the simulated or future API response does not establish whether the transfer committed, show a pending or outcome-unknown state rather than claiming that it failed.
Provide a way to refresh or reconcile the transfer status once backend integration exists.
12.6 Transfer Data Model

A transfer should be represented as one logical operation associated with:

A unique transfer identifier.
A source account.
A destination account.
An amount.
A date.
A status.

The UI may display linked debit and credit entries, but it should not accidentally count both entries as separate income or expense when calculating overall cash flow.

12.7 Important Edge Case

If the source account is debited but the destination account is not credited, the frontend cannot repair the inconsistency safely. The backend must process the transfer atomically or provide a reliable recovery mechanism.

13. P09 — Budgets List
13.1 Purpose

Display budgets and their spending progress for a selected month.

13.2 Page Components

Header:

Title: Budgets
Month selector.
Button: Create Budget

Summary cards:

Total budgeted.
Total spent.
Remaining budget.

Budget list:

Budget name or category.
Budget limit.
Amount spent.
Amount remaining.
Percentage used.
Progress bar.
Status indicator.
13.3 Budget Status

The UI should distinguish:

Under budget.
Near budget limit.
At budget limit.
Over budget.

The threshold for near-limit warnings should be configurable.

13.4 User Interactions
Create a budget.
Edit a budget.
View budget details.
Delete a budget.
Change the selected month.
13.5 Empty State

Title: No budgets for this month

Description: Create a budget to track spending against your financial goals.

14. P10 — Create/Edit Budget
14.1 Form Fields
Budget name — optional if derived from category.
Category — required.
Budget amount — required.
Period — monthly for the initial implementation.
Start month — required.
Optional end month.
Optional warning threshold.
14.2 Validation
Budget amount must be greater than zero.
Category must exist and be eligible for budgeting.
Start month must be valid.
The selected period must be supported.
Duplicate budgets for the same category and period must be handled consistently.

The UI should either prevent duplicate category budgets for the same month or explicitly support multiple budgets under a documented rule.

14.3 Submission Behavior

On save:

Update local mock state.
Recalculate budget progress.
Refresh dashboard budget summaries.
Display a success notification.
15. P11 — Budget Details
15.1 Purpose

Explain how a budget is being used and which transactions contribute to its spending.

15.2 Components
Budget name and category.
Budget limit.
Total spending.
Remaining amount.
Usage percentage.
Spending trend chart.
Transactions included in the budget.
Month selector.
15.3 Interactions
Edit budget.
View a contributing transaction.
Navigate to all transactions in the budget category.
Change the reporting period.

The same category, date, and transaction inclusion rules must be used consistently across the dashboard, budget details, and reports.

16. P12 — Recurring Transactions
16.1 Purpose

Display recurring transaction rules configured by the user.

A recurring rule describes an intended future transaction. It should not be confused with an actual transaction that has already been recorded.

16.2 Page Components
Rule name or description.
Transaction type.
Amount.
Account.
Category.
Frequency.
Next scheduled date.
Status.

Possible statuses:

Active.
Paused.
Completed.
Cancelled.
16.3 User Interactions
Create a recurring rule.
Edit a rule.
Pause a rule.
Resume a rule.
Cancel a rule.
View associated generated transactions, if any.
16.4 Important Distinction

The frontend can display a future schedule, but it should not claim that a recurring transaction has been executed merely because its scheduled date has arrived.

Actual execution depends on backend jobs and successful transaction processing.

17. P13 — Create/Edit Recurring Transaction
17.1 Form Fields
Description.
Transaction type.
Amount.
Account.
Category, when applicable.
Start date.
End date, optional.
Frequency.
Interval.
Next scheduled date, where appropriate.
Optional notes.
17.2 Initial Supported Frequencies
Daily.
Weekly.
Monthly.
Yearly.

Custom recurrence rules can be added later.

17.3 Validation
Amount must be greater than zero.
Start date must be valid.
End date cannot precede the start date.
Frequency must be supported.
Account and category must be valid.
Next occurrence must follow the defined recurrence rules.

Monthly schedules require explicit rules for dates such as the 29th, 30th, and 31st when a month does not contain the requested day.

17.4 Submission Behavior
Save the rule to mock state.
Display its next scheduled date.
Update the recurring transactions list.
Do not automatically create historical transactions unless the product explicitly supports that behavior.
18. P14 — Categories
18.1 Purpose

Allow users to organize transactions into meaningful groups.

18.2 Default Categories

Example expense categories:

Food & Dining.
Transportation.
Housing.
Utilities.
Shopping.
Healthcare.
Entertainment.
Education.
Travel.
Other Expenses.

Example income categories:

Salary.
Freelance.
Investments.
Gifts.
Other Income.

These categories are initial mock data, not mandatory system categories.

18.3 Category List

Display:

Category name.
Category type.
Color or icon.
Number of associated transactions, if available.
Actions.
18.4 Category Form

Fields:

Name.
Type: income, expense, or both if supported.
Color.
Icon, optional.

Validation:

Name is required.
Names should be unique according to the chosen case-sensitivity rule.
Type must be valid.
18.5 Deletion Behavior

If a category has associated transactions:

Warn the user.
Prefer offering reassignment to another category or an archive option.
Do not silently remove transaction history.

The initial frontend may use a confirmation dialog and a simplified mock restriction.

19. P15 — Monthly Summary
19.1 Purpose

Provide a detailed summary of financial activity for a selected month.

19.2 Components
Month selector.
Total income.
Total expenses.
Net cash flow.
Spending by category.
Income by category.
Comparison with the previous month.
Highest spending categories.
Transaction count.
Daily or weekly activity chart.
19.3 Behavior

Changing the month updates all applicable summary values and visualizations.

If no data exists for a month, display a useful empty state rather than treating missing data as an error.

19.4 Calculation Rules

The project must define:

Which transaction types contribute to income.
Which transaction types contribute to expenses.
How transfers are excluded from income and expense totals.
Whether refunds reduce expenses or count as income.
How dates and time zones affect monthly boundaries.

The same rules should be shared by the dashboard, monthly summary, budgets, and reports.

20. P16 — Reports
20.1 Purpose

Provide visual insights into spending and financial trends.

20.2 Report Types
Income vs. Expenses
Monthly income.
Monthly expenses.
Net cash flow.
Spending by Category
Total spent by category.
Category share of spending.
Selected date range.
Account Activity
Transactions by account.
Account balance history, if supported by available data.
Monthly Trends
Spending and income over several months.
Month-over-month comparison.
Budget Performance
Budgeted amount versus actual spending.
Categories exceeding their budgets.
Historical budget performance.
20.3 Filters
Start date.
End date.
Account.
Category.
Transaction type.
20.4 Export

An optional frontend-only feature may export currently displayed report data as CSV.

Exported data should reflect the active filters and clearly identify the selected reporting period.

20.5 Empty and Error States

When no data exists:

Display an empty chart state.
Explain which filters are active.
Offer a way to clear filters.

When a report cannot be calculated from the available mock data:

Display an explanatory message.
Do not substitute fabricated financial values.
21. P17 — CSV Import
21.1 Purpose

Provide an interface for uploading and reviewing transactions from a CSV file.

The frontend scope includes file selection, column mapping, client-side preview, validation feedback, and simulated import results.

Actual database insertion, duplicate detection across all stored transactions, and import recovery remain backend responsibilities.

21.2 Import Workflow
Step 1: Upload

Components:

File drop area.
File picker.
Supported file format information.
Maximum file size information, defined by project configuration.

Initial supported format:

CSV.

UI behavior:

Accept a CSV file.
Display the selected file name.
Provide a remove or replace action.
Reject unsupported file types with an explanation.
Step 2: Preview

Display:

Total rows detected.
Sample rows.
Column headers.
Basic parsing errors.

The user should be able to inspect the data before proceeding.

Step 3: Column Mapping

Allow mapping CSV columns to:

Date.
Description.
Amount.
Transaction type, if supplied.
Account.
Category.
Optional notes.

If the CSV uses a signed amount, the interface should define how positive and negative values map to income and expenses.

Step 4: Validation

Display:

Valid row count.
Invalid row count.
Rows with missing required values.
Invalid dates.
Invalid amounts.
Potential duplicates detected within the current file.

Allow the user to inspect row-level errors.

Step 5: Review

Display a final summary:

Number of rows to import.
Number of invalid rows.
Number of rows that may be duplicates.
Selected account or account-mapping rules.

Primary action: Import Transactions

Step 6: Result

Show:

Successfully imported rows in the mock simulation.
Skipped rows.
Failed rows.
A downloadable or viewable error report, if implemented.
21.3 Import States
No file selected.
File selected.
Parsing.
Preview ready.
Validation failed.
Ready for review.
Import in progress.
Import completed.
Import partially completed.
Import failed.
Import outcome unknown.
21.4 Duplicate Handling

The UI may flag likely duplicates using the fields available in the file.

However, frontend-only duplicate detection cannot reliably prevent duplicate imports across different files, browser sessions, or simultaneous import requests.

The eventual backend should define its duplicate policy and support safe retry behavior.

21.5 Important Failure Scenario

If an import is interrupted after some rows have been processed, the frontend must not assume that zero rows were imported.

When backend integration exists, the result page should use a server-provided import status and row counts to reconcile the operation.

22. P18 — Import History
22.1 Purpose

Display previously simulated import jobs.

22.2 Table Fields
File name.
Import date.
Total rows.
Successful rows.
Failed rows.
Status.
22.3 Interactions
Open import details.
View failed rows.
Download an error report, if available.
Retry an eligible import, if supported.

In the frontend-only version, history is limited to the lifetime of the chosen mock state unless browser persistence is deliberately added.

23. P19 — Settings
23.1 Purpose

Allow the user to manage basic application preferences.

23.2 Settings Sections
General
Display name.
Default currency.
Preferred date format.
Theme preference.
Display
Light or dark theme.
Number formatting.
Default dashboard reporting period.
Data
Reset mock data.
Restore sample data.
Export mock data, if supported.
Security UI
Password change interface, only if authentication screens are included.
Session information, if available.
23.3 Reset Mock Data

Resetting mock data is destructive.

Before resetting:

Display a confirmation dialog.
Explain what will be removed.
Require an explicit confirmation.
Restore the initial sample dataset.
Notify the user when the reset finishes.

This feature must not be presented as a production data-deletion workflow.

24. P20 — Login and Registration
24.1 Scope

Authentication screens are optional for the initial frontend. They may be added to make the application look complete before backend authentication is implemented.

24.2 Login Page

Fields:

Email.
Password.

Actions:

Log in.
Navigate to registration.
Optional forgot-password link.

Validation:

Required fields.
Basic email format.
Password field must not expose entered characters by default.
24.3 Registration Page

Fields:

Name.
Email.
Password.
Confirm password.

Validation:

Required fields.
Valid email format.
Password and confirmation must match.
Basic password rules should be displayed.
24.4 Frontend Limitations

A mock login can simulate navigation, but it does not authenticate a real user.

The frontend must not treat a client-side flag as secure authorization. Production access control requires backend authentication and authorization.

25. P21 — Not Found and Error Pages
25.1 Not Found Page

Display:

A 404 or not-found heading.
A short explanation.
A button to return to the dashboard.
25.2 General Error Page

Display:

A clear description of the issue.
A retry action when appropriate.
A navigation option to return to a stable page.

Avoid exposing stack traces, internal exception details, or sensitive information.

25.3 Operation-Level Errors

Most transaction errors should be shown inline or through a dialog rather than replacing the entire page.

Examples:

Invalid transaction input.
Unable to save an account.
Transfer status unknown.
Import validation failed.
Unable to load report data.
26. Shared Components

The application should use reusable components to ensure consistent behavior.

26.1 Layout Components
AppLayout
Sidebar
MobileNavigation
Header
PageContainer
Breadcrumbs
26.2 Financial Components
MoneyDisplay
BalanceCard
SummaryCard
TransactionTypeBadge
TransactionTable
AccountSelector
CategorySelector
BudgetProgressBar
DateRangeFilter
FinancialChart
26.3 Form Components
FormField
MoneyInput
DateInput
SearchInput
SelectInput
FormActions
26.4 Feedback Components
Toast
ConfirmDialog
LoadingSkeleton
EmptyState
ErrorState
InlineValidationMessage
PendingOperationIndicator
26.5 Import Components
CsvDropzone
CsvPreviewTable
ColumnMapper
ImportValidationSummary
ImportResultSummary
27. Frontend Data Models

The frontend should use consistent object shapes for mock data.

These models describe the UI's expected data and are not a final backend database schema.

27.1 Account

Fields:

id
name
type
currency
balance
status
createdAt
27.2 Transaction

Fields:

id
description
type
amount
currency
accountId
categoryId
date
notes
source
transferId
recurringRuleId
importId

Optional fields should be absent or null according to one consistent convention.

27.3 Category

Fields:

id
name
type
color
icon
status
27.4 Budget

Fields:

id
name
categoryId
amount
currency
period
startDate
endDate
warningThreshold
27.5 Recurring Transaction

Fields:

id
description
type
amount
currency
accountId
categoryId
frequency
interval
startDate
endDate
nextRunDate
status
27.6 Transfer

Fields:

id
sourceAccountId
destinationAccountId
amount
currency
date
description
status
27.7 Import Job

Fields:

id
fileName
createdAt
totalRows
successfulRows
failedRows
status
28. Frontend State Management
28.1 State Categories
Application State
Mock accounts.
Mock transactions.
Categories.
Budgets.
Recurring rules.
Transfers.
Import history.
Page State
Search query.
Active filters.
Sorting.
Pagination.
Selected reporting period.
Form State
Input values.
Validation errors.
Dirty or untouched fields.
Submission status.
UI State
Open dialogs.
Selected navigation item.
Toast messages.
Expanded menus.
Loading indicators.
28.2 State Management Rules
Use a shared source of truth for financial entities.
Avoid independently maintaining conflicting copies of the same account balance.
Derive summary values from transaction and account data where appropriate.
Keep unrelated UI state local to its page or component.
Use deterministic mock operations.
Reset loading and submission flags on both success and failure.
Avoid stale state when multiple actions affect the same data.
28.3 Mock Data Persistence

Choose one initial strategy.

Option A — In-memory state

Simplest to implement.
Refreshing the page resets changes.
Best for a quick prototype.

Option B — Browser storage

Changes survive refreshes.
Suitable for a more realistic demonstration.
Requires handling corrupted or outdated stored data.
Must not be treated as secure storage for sensitive financial information.

Start with in-memory state unless persistence is required for the demo.

29. UI Reliability: Concurrency and Idempotency

Although the backend owns financial consistency, the frontend should be designed to communicate operation status accurately.

29.1 Duplicate Submission

Scenario: A user clicks Save Transaction several times.

Frontend behavior:

Disable the button while the current request or mock operation is pending.
Show a progress indicator.
Prevent accidental repeated form submissions.
Avoid creating multiple mock records from one intended action.

Backend responsibility:

Enforce idempotency where required.
Protect against retries and duplicate requests.
29.2 Simultaneous Actions

Scenario: Two UI actions attempt to modify the same account.

Frontend behavior:

Show the latest known state.
Prevent obvious conflicting actions within the current page where practical.
Refresh or reconcile data after an operation.
Display an appropriate error if the backend rejects a stale update.

Backend responsibility:

Enforce consistency under concurrent requests.
Detect conflicts where required.
Avoid lost updates and invalid balances.
29.3 Unknown Operation Outcome

Scenario: A request is submitted, but the client does not receive a definitive response.

Frontend behavior:

Do not automatically claim success or failure.
Display an outcome-unknown or pending state.
Avoid blindly submitting a second transfer.
Offer status refresh or reconciliation when supported.

Backend responsibility:

Provide durable operation identifiers or idempotency keys where appropriate.
Support reliable status lookup or reconciliation.
29.4 Stale Financial Data

Scenario: An account balance displayed on the page is no longer current.

Frontend behavior:

Refresh data when appropriate.
Clearly communicate conflicts or rejected changes.
Avoid silently overwriting newer state with stale values.

Backend responsibility:

Enforce data integrity and concurrency controls.
30. Required UI States for Every Data Page

Every page that displays or modifies data should account for the following states.

Loading
Show skeletons or progress indicators.
Avoid showing misleading zero values while data is loading.
Success
Display the expected data.
Show feedback after successful mutations.
Empty
Explain why the page has no data.
Offer a relevant next action.
No Search Results
Explain that the current search or filters returned no results.
Provide a clear-filters action.
Validation Error
Show errors near the affected fields.
Preserve the user's input.
Operation Failure
Explain that the action did not complete when failure is confirmed.
Preserve input when retry is appropriate.
Pending or Unknown Outcome
Avoid claiming completion or failure without sufficient information.
Provide a status refresh path when supported.
Not Found
Handle invalid entity IDs and unavailable records.
31. Financial Display and Calculation Rules
31.1 Monetary Values
Use consistent currency formatting.
Respect currency-specific decimal precision.
Avoid floating-point calculations for financial arithmetic.
Display negative values consistently.
Do not assume every currency uses two decimal places.
31.2 Amount Semantics

Choose one internal representation and use it consistently.

Recommended approach:

Store monetary amounts in integer minor units where the currency supports a fixed minor-unit representation.
Keep transaction type separate from the magnitude of the amount.
Use a consistent sign convention for display and calculations.

For example, an expense may have a positive stored magnitude while its effect on an account balance is negative.

31.3 Account Balance

For a simplified account model:

Current balance = Opening balance + Sum of posted balance changes

Pending transfers, failed transactions, and unposted recurring rules must not be treated as completed balance changes.

31.4 Monthly Cash Flow

Net cash flow = Income - Expenses

Transfers between a user's own accounts should normally be excluded from overall income and expenses.

31.5 Budget Spending

Budget calculations should use a consistent set of eligible transactions, usually expenses assigned to the relevant category during the selected budget period.

Refunds, reversals, and transfers require explicit rules.

32. Responsive Design Requirements
Desktop
Persistent sidebar.
Full summary-card row.
Tables with all primary columns.
Multi-column form layouts where helpful.
Tablet
Collapsible sidebar.
Reduced card columns.
Responsive chart sizes.
Tables may scroll horizontally.
Mobile
Drawer or compact navigation.
Summary cards arranged vertically or in a compact grid.
Forms displayed in one column.
Primary actions easy to reach.
Dialogs fit within the viewport.
Tables may use horizontally scrollable layouts or compact transaction cards.

The interface should not require horizontal scrolling for ordinary form submission or navigation.

33. Accessibility Requirements
Every input has an accessible label.
Form errors are associated with the relevant fields.
Buttons have descriptive labels.
Keyboard navigation works for menus and dialogs.
Dialog focus is managed appropriately.
Charts include text summaries or accessible descriptions.
Status is not communicated by color alone.
Text and interactive elements have sufficient contrast.
Destructive actions are clearly distinguished.
Focus indicators remain visible.
34. Testing Checklist
Navigation
Every sidebar item opens the correct page.
Breadcrumbs and back actions behave predictably.
Invalid routes show a not-found page.
Accounts
Create an account.
Edit an account.
Filter and sort accounts.
Handle accounts with existing transactions.
Transactions
Create income.
Create an expense.
Edit a transaction.
Delete a transaction.
Search and combine filters.
Handle empty results.
Transfers
Reject identical source and destination accounts.
Reject invalid amounts.
Prevent accidental duplicate submissions.
Update both account views consistently in mock state.
Exclude internal transfers from income and expense totals.
Budgets
Create and edit budgets.
Display correct usage percentages.
Handle over-budget conditions.
Handle zero-spending and zero-limit edge cases according to defined rules.
Recurring Transactions
Create and edit a rule.
Pause and resume a rule.
Handle end dates.
Display valid next-run dates.
CSV Import
Upload a valid CSV.
Reject an unsupported file.
Handle missing columns.
Handle malformed dates and amounts.
Display row-level errors.
Show partial-success and failure states.
Reports
Apply date filters.
Change reporting periods.
Handle empty data.
Ensure charts and summaries use consistent calculation rules.
General UI
Test loading, empty, error, and success states.
Test keyboard navigation.
Test responsive layouts.
Verify currency and date formatting.
35. Recommended Implementation Order
Phase 1 — Application Foundation
Set up routing.
Create the global layout.
Build sidebar and header.
Create reusable buttons, inputs, cards, dialogs, and notifications.
Add mock data and shared state.
Phase 2 — Core Financial Pages
Accounts List.
Create/Edit Account.
Transactions List.
Create/Edit Transaction.
Transfer Money.
Phase 3 — Budgeting and Organization
Categories.
Budgets List.
Create/Edit Budget.
Budget Details.
Phase 4 — Dashboard and Insights
Dashboard.
Monthly Summary.
Reports.
Phase 5 — Advanced User Workflows
Recurring Transactions.
CSV Import.
Import History.
Phase 6 — Polish
Settings.
Optional authentication UI.
Error pages.
Responsive design.
Accessibility.
Comprehensive UI-state testing.
36. Definition of Done

The frontend is ready for initial integration when:

All must-have pages exist.
Navigation between pages works.
Mock data supports realistic user workflows.
Forms include validation.
Financial values are formatted consistently.
Transactions and transfers update mock state consistently.
Search, filters, and sorting work as specified.
CSV import supports upload, preview, mapping, and simulated results.
Loading, empty, validation, failure, and pending states are implemented where relevant.
The UI works across desktop, tablet, and mobile layouts.
Reusable components are used consistently.
Backend-specific behavior is clearly separated from frontend simulation.
The application does not present mock authentication, mock idempotency, or mock concurrency controls as production guarantees.
37. Final Scope Summary

The initial frontend should prioritize a clean, functional financial dashboard and reliable CRUD workflows for accounts, transactions, categories, and budgets.

Transfers, recurring transactions, CSV import, and reporting should be included because they expose the most important user-facing workflows for the backend project.

The UI should remain intentionally simple. Its primary job is to make financial operations understandable and testable, while the backend is responsible for the deeper engineering challenges: concurrency control, atomic transfers, idempotency, crash recovery, scheduled processing, aggregation, caching, authentication, authorization, and audit logging.

The result should be a frontend that can run independently with mock data today and later integrate with the real backend without requiring a complete redesign.