# PayU Payment Gateway Integration

This document outlines the credentials and environment configuration required for the PayU integration in FutsalGoa.

## 1. Required Credentials
To process live payments through PayU, you need a Merchant Account. Once approved, PayU will provide you with two critical pieces of information:

- **Merchant Key** (e.g. `gtKFFx`) - Identifies your account to PayU.
- **Merchant Salt** (e.g. `eCwWELxi`) - A secret string used to cryptographically sign requests and verify responses. **Do not expose this to the frontend!**

## 2. Environment Variables (.env)
You must set the following variables in your `.env` file for the application to properly communicate with PayU.

```env
# Primary PayU Credentials
PAYU_MERCHANT_KEY=your_production_merchant_key
PAYU_MERCHANT_SALT=your_production_merchant_salt

# Environment Switcher
# Set to 'production' for live transactions. 
# If not set, or set to 'development', it defaults to the PayU Test environment.
PAYU_ENV=production

# (Optional) Override Base URL
# You usually do not need to set this if PAYU_ENV is configured properly.
# PAYU_BASE_URL=https://secure.payu.in
```

## 3. How the Integration Works
1. **Checkout Initialization (`/payment/checkout/[ref]`)**:
   - The application computes a SHA-512 hash using your `PAYU_MERCHANT_SALT` and the booking details (amount, name, email, txnid).
   - An invisible form is generated containing this hash, your `PAYU_MERCHANT_KEY`, and the booking metadata.
   - The user is automatically redirected to PayU via JavaScript form submission (`document.getElementById('payu-form').submit();`).

2. **Payment Processing**:
   - The user enters their payment details on the secure PayU hosted page.

3. **Callback Handling (`/api/payment/callback`)**:
   - PayU sends an HTTP POST request back to your server at `/api/payment/callback` containing the transaction status and a return hash.
   - The server verifies the return hash using your `PAYU_MERCHANT_SALT` to ensure the payload was not tampered with.
   - If the signature is valid and the status is `success`, the booking is marked as `confirmed`, the slot lock is converted to a finalized booking, and the user receives their entry ticket.

## 4. Testing PayU
If you do not have production credentials yet, you can use the default test credentials provided by PayU:
- **Key**: `gtKFFx`
- **Salt**: `eCwWELxi`
- **Environment**: Test (`https://test.payu.in`)

When testing, the mock credit card details can be found in the PayU developer documentation.
