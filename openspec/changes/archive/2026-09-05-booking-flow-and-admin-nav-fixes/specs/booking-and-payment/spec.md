## ADDED Requirements

### Requirement: Selected slots survive the login redirect
When an unauthenticated visitor selects slots and is redirected to log in, the system SHALL continue to reflect those slots as selected once the visitor returns to the arena page after logging in, without requiring them to reselect.

#### Scenario: Guest selects a slot, logs in, and returns
- **WHEN** a not-logged-in visitor selects one or more slots (held server-side against their session) and is redirected to log in
- **THEN** after a successful login the visitor is returned to the same arena/date and the previously selected slots are still shown as selected, with the total price reflecting them

#### Scenario: A held slot expires before login completes
- **WHEN** a visitor's slot hold lapses (e.g. the hold's time limit passes) before they finish logging in
- **THEN** that slot is shown as available (or booked/blocked, if taken by someone else in the meantime) rather than incorrectly still selected

### Requirement: An OTP-verified contact field cannot be edited
Wherever a logged-in customer can edit their own contact details — at checkout and on the account profile page — the specific field (email or mobile) that was used to complete OTP verification at login SHALL be read-only; the other field remains editable. This SHALL be enforced both in the UI and by the server accepting the update.

#### Scenario: Customer logged in via mobile OTP edits their profile
- **WHEN** a customer who logged in using mobile OTP opens checkout or their profile page
- **THEN** the mobile number field is shown read-only (with a "verified" indicator) and the email field remains editable

#### Scenario: Customer logged in via email OTP edits their profile
- **WHEN** a customer who logged in using email OTP opens checkout or their profile page
- **THEN** the email field is shown read-only (with a "verified" indicator) and the mobile field remains editable

#### Scenario: Direct API call attempts to change the verified field
- **WHEN** a request to update the profile changes the value of the field that matches the customer's login-verification channel
- **THEN** the server rejects the update rather than relying solely on the UI being read-only
