Perfect ✅ Bikash — below is a **professionally formatted, developer-ready API documentation** for your **Outix Scanner System**, combining all the endpoints you provided into a single, clear, and standard doc (with descriptions, parameters, responses, and flow).

You can directly include this in your **developer portal, README, or Postman reference**.

---

# 🎟️ Outix Scanner API Documentation

**Base URL:** `https://www.outix.co/apis`
**Authentication:** Token-based (`Auth-Token` header required on all protected routes)

---

## 🔐 1. Authentication

### `POST /auth`

Authenticate scanner users and retrieve an authorization token.

#### Request Body

| Parameter  | Type   | Required | Description      |
| ---------- | ------ | -------- | ---------------- |
| `Username` | string | ✅        | Account username |
| `Password` | string | ✅        | Account password |

#### Example

```json
{
  "Username": "Outix@thebend.co",
  "Password": "Scan$9841"
}
```

#### Response

```json
{
  "Auth_Token": "YOUR_AUTH_TOKEN"
}
```

Use the `Auth_Token` in the headers for all subsequent requests:

```
Auth-Token: YOUR_AUTH_TOKEN
```

---

## 🗓️ 2. Events

### `GET /events`

Fetch a list of all active events.

#### Headers

| Header       | Required | Description                 |
| ------------ | -------- | --------------------------- |
| `Auth-Token` | ✅        | Token obtained from `/auth` |

#### Response

Returns an array of event objects with IDs and titles.

---

### `GET /events/:eventid`

Retrieve event details, including ticket statistics.

#### Headers

| Header       | Required | Description                 |
| ------------ | -------- | --------------------------- |
| `Auth-Token` | ✅        | Token obtained from `/auth` |

#### Example Response

```json
{
  "msg": {
    "total": 1200,
    "scanned": 68,
    "tobescanned": 1132,
    "datas": "54655"
  },
  "error": false,
  "status": 200
}
```

---

## 🧾 3. Guestlist

### `GET /guestlist/:eventid`

Get the full guest list for a specific event.

#### Query Parameters (optional)

| Parameter   | Type    | Description               |
| ----------- | ------- | ------------------------- |
| `checkedin` | integer | `1` = Scanned guests only |

#### Example

```
/guestlist/54655
/guestlist/54655?checkedin=1
```

#### Headers

`Auth-Token: YOUR_AUTH_TOKEN`

#### Example Response

```json
{
  "booking_reference": "2219667572",
  "ticket_identifier": "11276388SUBUZUDE",
  "checkedin": "0",
  "ticket_title": "The International Club - Weekend (Sat + Sun)",
  "purchased_by": "Tracy Hill",
  "email": "Hillfish1@gmail.com",
  "mobile": "0427 604 047"
}
```

---

## ✅ 4. Validate QR / Barcode

### `GET /validate/:eventid/:scancode`

Validates a ticket before scanning.

#### Headers

`Auth-Token: YOUR_AUTH_TOKEN`

#### Example Response

```json
{
  "error": false,
  "msg": {
    "message": "The International Club - Weekend (Sat + Sun) 1 Admit(s)",
    "info": {
      "ticket_identifier": "11276388SUBUZUDE",
      "fullname": "Tracy Hill",
      "checkedin": 0,
      "price": "900.00"
    }
  },
  "status": 200
}
```

---

### `GET /validate/:eventid/:scancode?scanmode=ScanOut`

Validate if the ticket is eligible for **Passout** (temporary exit).

#### Response Example

```json
{
  "error": false,
  "msg": {
    "message": "Valid Passout Ticket",
    "info": {
      "ticket_identifier": "12549344ADUMYWYR",
      "ticket_title": "General Admission - Sunday",
      "checkedin": 1,
      "checkedin_date": "2025-10-15 07:04:30",
      "passout": 0,
      "fullname": "Gill Tremelling"
    }
  },
  "status": 200
}
```

---

## 🚀 5. Scan QR / Barcode

### `GET /scan/:eventid/:scancode`

Performs the ticket **check-in** (entry scan).

#### Headers

`Auth-Token: YOUR_AUTH_TOKEN`

#### Success Response

```json
{
  "error": false,
  "msg": { "message": "1 Admit(s) checked In" },
  "status": 200
}
```

#### Failure Response

```json
{
  "error": true,
  "msg": "Already Scanned Ticket, Cannot check in.",
  "status": 404
}
```

---

## 🔁 6. Passout / Passin / Unscan

### **Passout**

`GET /scan/:eventid/:scancode?scanmode=ScanOut`
Marks the guest as **checked-out (exit)**.

### **Passin**

`GET /scan/:eventid/:scancode?scanmode=ScanIn`
Marks the guest as **re-entered** after passout.

### **Unscan**

`GET /scan/:eventid/:scancode?unscan=1`
Reverts a scanned ticket to “not used.”

#### Success Response

```json
{
  "error": false,
  "msg": { "message": "Admit/ticket unchecked. Ticket can be re-scanned." },
  "status": 200
}
```

#### Failure Response

```json
{
  "error": true,
  "msg": "This ticket has not been used yet.",
  "status": 404
}
```

---

## 🧍‍♂️ 7. Registrations

### `GET /registrations`

List all registration-based events.

#### Headers

`Auth-Token: YOUR_AUTH_TOKEN`

---

## ✍️ 8. Waivers

### `GET /listwaivers/:eventid`

Get all waiver references for a registration event.

### `POST /waiver/personal`

Submit a completed waiver for a participant.

#### Body Parameters

| Field               | Type    | Description                         |
| ------------------- | ------- | ----------------------------------- |
| `waiverType`        | string  | Type of waiver (`Entrant` / `Crew`) |
| `waiver_ref`        | string  | Reference from `/listwaivers`       |
| `first_name`        | string  | Participant’s first name            |
| `last_name`         | string  | Participant’s last name             |
| `date_of_birth`     | string  | Format: `YYYY-MM-DD`                |
| `email_address`     | string  | Participant’s email                 |
| `mobile_number`     | string  | Participant’s mobile                |
| `signed_by_parent`  | boolean | If minor, `true`                    |
| `parent_name`       | string  | Parent’s name (if applicable)       |
| `witness_name`      | string  | Witness’s name                      |
| `applicant_name`    | string  | Applicant name                      |
| `witness_address`   | string  | Address                             |
| `applicantSignFile` | file    | Signature file                      |
| `witnessSignFile`   | file    | Signature file                      |

#### Headers

`Auth-Token: YOUR_AUTH_TOKEN`

---

## ⚙️ 9. Typical Flow

| Step | Action                 | Method | Endpoint                                        |
| ---- | ---------------------- | ------ | ----------------------------------------------- |
| 1️⃣  | Authenticate           | POST   | `/auth`                                         |
| 2️⃣  | Fetch Events           | GET    | `/events`                                       |
| 3️⃣  | Get Guestlist          | GET    | `/guestlist/:eventid`                           |
| 4️⃣  | Validate Ticket        | GET    | `/validate/:eventid/:scancode`                  |
| 5️⃣  | Scan Ticket (Check-in) | GET    | `/scan/:eventid/:scancode`                      |
| 6️⃣  | Validate Passout       | GET    | `/validate/:eventid/:scancode?scanmode=ScanOut` |
| 7️⃣  | Passout                | GET    | `/scan/:eventid/:scancode?scanmode=ScanOut`     |
| 8️⃣  | Passin                 | GET    | `/scan/:eventid/:scancode?scanmode=ScanIn`      |
| 9️⃣  | Unscan                 | GET    | `/scan/:eventid/:scancode?unscan=1`             |

---

## 🧠 Example Token Workflow (Node.js)

```js
import fetch from "node-fetch";

const BASE = "https://www.outix.co/apis";

async function login() {
  const res = await fetch(`${BASE}/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      Username: "Outix@thebend.co",
      Password: "Scan$9841"
    })
  });
  const data = await res.json();
  return data.Auth_Token;
}

async function scanTicket(eventId, ticketId, mode = "") {
  const token = await login();
  const url = `${BASE}/scan/${eventId}/${ticketId}${mode ? "?" + mode : ""}`;
  const res = await fetch(url, { headers: { "Auth-Token": token } });
  const data = await res.json();
  console.log(data);
}

scanTicket("54655", "12551112UXY5UZYT"); // check-in
scanTicket("54655", "12551112UXY5UZYT", "unscan=1"); // unscan
```

---


