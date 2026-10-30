# Digital Ticket Pass & Cryptographic QR Engine
**Part 15: Customer Frontend Development (React)**
**Document Reference: `docs/frontend-customer/12-digital-ticket.md`**

---

## 1. Digital Ticket Architecture

The confirmed digital ticket (`src/components/booking/DigitalTicketCard.jsx`) replicates the aesthetic of a premium cinema ticket:
- **Perforated Notch Dividers**: Styled circular notches on left/right borders.
- **Booking Reference / PNR**: Prominent monospace PNR code for box office verification.
- **Show Snapshot Data**: Movie poster, title, censor rating, theatre name, auditorium screen, show date, show start time.
- **Assigned Seats**: Clear comma-separated seat labels (e.g. `F12, F13`).
- **Payment Summary**: Total paid in INR.

---

## 2. Cryptographic QR Verification

The ticket embeds an SVG QR code generated with `qrcode.react`:
```jsx
<QRCodeSVG
  value={qrPayload}
  size={150}
  level="M"
  includeMargin={false}
/>
```
- **Payload Format**: `BMS-QR.<base64url(claims)>.<hmac_signature>`.
- **Zero Sensitive Data Exposure**: The QR payload does not encode credit card details, patron passwords, or internal database secrets. It encodes only `{ v, ref, bid, cid, sid, seats, exp }` signed with the server access secret.
- **Print Optimization**: Native `@media print` CSS hides browser chrome, headers, and footer buttons, allowing patrons to print a paper ticket directly from their browser.

