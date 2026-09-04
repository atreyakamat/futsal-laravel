## ADDED Requirements

### Requirement: Customer details are captured only after login
The arena page's slot picker SHALL NOT ask for the customer's name, mobile, or email while the visitor is not logged in. Once slots are selected, an unauthenticated visitor is routed to log in before any contact-detail fields appear; a logged-in customer sees them pre-filled from their account, same as at checkout today.

#### Scenario: Not-logged-in visitor selects slots
- **WHEN** a visitor who is not logged in selects one or more slots on the arena page
- **THEN** no name/mobile/email fields are shown on that page; they are only asked for once the visitor has logged in

#### Scenario: Logged-in customer selects slots
- **WHEN** a logged-in customer selects one or more slots on the arena page
- **THEN** their contact details section appears, pre-filled from their account

### Requirement: The contact field verified by login is locked at checkout
At checkout, whichever contact field was used to verify the customer's identity at login SHALL be read-only; the other field stays editable. A customer who logged in via email OTP cannot edit their email; a customer who logged in via mobile/WhatsApp OTP cannot edit their mobile number.

#### Scenario: Logged in via email OTP
- **WHEN** a customer authenticated using an email-delivered OTP
- **THEN** the email field at checkout is locked, and the mobile field stays editable

#### Scenario: Logged in via mobile/WhatsApp OTP
- **WHEN** a customer authenticated using a mobile/WhatsApp-delivered OTP
- **THEN** the mobile field at checkout is locked, and the email field stays editable

### Requirement: GST details can optionally be captured at checkout
Checkout SHALL ask the customer whether they have a GST number and, separately, whether the invoice should show a company name. Both are optional; answering "yes" to either reveals a field to capture the value (GSTIN, or company name respectively). Provided values are stored on the booking and used as the buyer's GSTIN/company name on the tax invoice.

#### Scenario: Customer has a GSTIN
- **WHEN** a customer answers "yes" to having a GST number and provides a GSTIN
- **THEN** the booking stores that GSTIN and the tax invoice issued for it shows it as the buyer's GSTIN

#### Scenario: Customer wants a company name on the invoice
- **WHEN** a customer answers "yes" to showing a company name and provides one
- **THEN** the booking stores that company name and the tax invoice shows it as the buyer's name instead of (or alongside) the customer's personal name

#### Scenario: Customer declines both
- **WHEN** a customer answers "no" to both questions
- **THEN** checkout proceeds normally with no GSTIN or company name captured, exactly as it does today

### Requirement: Bookings are only offered within an admin-configured forward window
A super admin SHALL be able to set how many days ahead (inclusive of today) bookings can be made, editable at any time. Slot availability and booking creation both enforce this window; dates beyond it are not offered.

#### Scenario: Window set to 15 days
- **WHEN** the booking window is configured as 15 days and today is day 0
- **THEN** dates from today through day 14 are bookable, and day 15 onward show as outside the window

#### Scenario: Super admin changes the window
- **WHEN** a super admin updates the configured number of days
- **THEN** the new limit takes effect immediately for subsequent availability checks and booking attempts, without requiring a deployment
