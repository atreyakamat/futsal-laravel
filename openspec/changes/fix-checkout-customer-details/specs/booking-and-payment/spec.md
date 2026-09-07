## ADDED Requirements

### Requirement: Customer name is never fabricated from the login identifier
When a customer account is created, the system SHALL NOT store a name that was mechanically derived from the login identifier (such as the local part of an email address, or a generic placeholder like "Player") as if it were the customer's real name. Anywhere a stored name would be shown or pre-filled — including a pre-existing account whose name was fabricated this way before this requirement took effect — the system SHALL treat a fabricated or blank name as absent and prompt the customer for their real name instead of displaying it.

#### Scenario: First-time customer logs in via email OTP
- **WHEN** a customer completes email OTP login for the first time (no existing account)
- **THEN** their account is created with no name, and the checkout name field is shown blank rather than pre-filled with the local part of their email

#### Scenario: First-time customer logs in via mobile OTP
- **WHEN** a customer completes mobile OTP login for the first time (no existing account)
- **THEN** their account is created with no name, and the checkout name field is shown blank rather than pre-filled with "Player"

#### Scenario: Pre-existing account still carries a fabricated name
- **WHEN** a customer account created before this requirement took effect still has its name equal to the local part of its email or the placeholder "Player"
- **THEN** that name is treated as absent wherever it would be shown or pre-filled, the same as a blank name

### Requirement: Customer contact details are collected exactly once per booking
The system SHALL collect a customer's name, mobile, and email for a booking at a single point in the checkout flow. It SHALL NOT offer a separate details-entry step earlier in the flow (e.g. immediately after slot selection, before checkout) whose input is then discarded or silently overwritten by checkout.

#### Scenario: Logged-in customer selects slots and proceeds to checkout
- **WHEN** a logged-in customer selects slots and proceeds toward payment
- **THEN** they are taken directly to the checkout page's details form, with no intermediate customer-details step

### Requirement: Checkout persists corrected customer details to the account
When a customer submits checkout with a name, mobile, or email value that differs from what is currently stored on their account, the system SHALL save the corrected value to their account as part of processing that submission — subject to the existing rule that the field verified via OTP at login cannot be changed. A correction made at checkout SHALL be reflected the next time the customer's details are shown or pre-filled.

#### Scenario: Customer corrects their name at checkout
- **WHEN** a customer submits checkout with a name different from the one stored on their account
- **THEN** the account's stored name is updated to the submitted value

#### Scenario: Customer's next booking reflects the correction
- **WHEN** the same customer starts checkout for a later booking
- **THEN** the name field is pre-filled with the previously corrected name, not the original fabricated or blank value

#### Scenario: Customer attempts to change their OTP-verified field via checkout
- **WHEN** a customer submits checkout with a different value for the field (email or mobile) that was verified via OTP at login
- **THEN** that field is not updated on the account, consistent with the existing OTP-verified-field rule
