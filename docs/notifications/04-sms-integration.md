# Part 12 — SMS Gateway Integration & Indian Telecom DLT Compliance

## 1. Overview

The SMS subsystem (`SmsProviderAdapter`) delivers critical time-sensitive alerts directly to customer mobile handsets. In ticketing applications, SMS is reserved for:
- Phone number verification (OTP).
- Immediate booking confirmation receipts.
- Sudden show cancellations or emergency schedule revisions.
- Large refund payouts.

---

## 2. Indian Telecom Regulatory Authority (TRAI) DLT Compliance

Under Indian telecommunications law (TRAI TCCCPR regulations), all commercial Application-to-Person (A2P) SMS traffic must route through registered Distributed Ledger Technology (DLT) portals (e.g. Jio, Airtel, Vodafone Idea, BSNL).

### Mandatory DLT Requirements

1. **Principal Entity (PE) Registration**:
   - The platform entity must be registered with a verified corporate PAN and Certificate of Incorporation.
   - Assigned a 19-digit Principal Entity ID (e.g. `1101554433221100998`).
2. **Sender ID / Header Registration**:
   - Transactional / Service Implicit 6-character alpha header: `BMSIND` or `BMSMOV`.
3. **Approved Content Templates**:
   - Every message structure must have an approved Content Template ID (e.g. `1207161822334455667`).
   - Dynamic placeholders are denoted by `{#var#}` on telecom registries and mapped from `{{variable}}` by the adapter:
     > *"BookMyShow: Ticket confirmed for {#var#} at {#var#} on {#var#} {#var#}. Seats: {#var#}. Ref: {#var#}. Details: {#var#}"*

---

## 3. Supported SMS Providers

| Provider | Configuration Key | Route Type | Features |
| :--- | :--- | :--- | :--- |
| **Fast2SMS** | `SMS_PROVIDER=fast2sms` | DLT Route | Direct Indian telecom routing with DLT template ID injection and operator delivery receipts. |
| **Twilio** | `SMS_PROVIDER=twilio` | Global A2P | International SMS delivery for non-Indian phone numbers and roaming patrons. |
| **Mock** | `SMS_PROVIDER=mock` | Log Sink | Zero-cost development and testing adapter. Masked phone logging without network calls. |

---

## 4. Message Length & GSM Part Calculation

Standard GSM 03.38 SMS messages are capped at **160 7-bit characters**. Messages exceeding 160 characters are split into concatenated segments using User Data Headers (UDH), reducing per-segment capacity to **153 characters**:

$$\text{Parts} = \begin{cases} 0 & \text{if length} = 0 \\ 1 & \text{if length} \le 160 \\ \lceil \text{length} / 153 \rceil & \text{if length} > 160 \end{cases}$$

`SmsProviderAdapter.calculateSmsParts(text)` accurately monitors message length to prevent accidental double-billing by telecom operators.

---

## 5. Privacy & Data Masking (DPDP Act)

In accordance with India's Digital Personal Data Protection (DPDP) Act and international privacy laws, phone numbers are masked in all application logs and operational dashboards:
- E.164: `+919876543210`
- Masked Output: `+9198****3210`

