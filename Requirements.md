# Bakery Order Management — Voice Agent App
## Requirements Document

---

## Overview

A full-stack web app for a bakery manufacturer with two user personas — **Admin** and **Salesman** — backed by a voice AI agent (Bolna) that salesmen can call to manage orders hands-free. No authentication; identity is established by phone number / salesman selection.

---

## Personas

| Persona | Access | Identity |
|---|---|---|
| Admin | Full order and inventory visibility | Fixed single admin view |
| Salesman | Own orders only | Selected from dropdown; each has a registered phone number |

---

## Data Model (Collections)

### `inventory`
Fixed item catalog. No item creation from UI — only stock counts are managed.
- `item_id`
- `item_name` (e.g. Croissants, Sourdough Loaf, Banana Bread, Muffins, Baguettes)
- `stock_count`
- `unit` (e.g. boxes, loaves)

### `salesmen`
- `salesman_id`
- `name`
- `phone` (used by Bolna for outbound calling and inbound identification)

### `orders`
- `order_id`
- `salesman_id`
- `status`: `pending` → `confirmed` → `delivered` → `paid` → `cancelled`
- `total_amount`
- `created_at`
- `updated_at`

### `order_items`
- `order_item_id`
- `order_id` (references `orders`)
- `item_id` (references `inventory`)
- `item_name` (denormalized for easier queries)
- `quantity`
- `unit_price`
- `line_total`
- `created_at`

**Order State Machine:**
```
pending → confirmed → delivered → paid
    ↘          ↘           ↘
              cancelled (restores inventory)
```
- Any order in `pending`, `confirmed`, or `delivered` can be cancelled
- Cancellation always restores all line item quantities back to inventory
- `paid` orders cannot be cancelled

### `order_update_requests`
Raised by the agent when a salesman wants to modify an existing order.
- `request_id`
- `order_id`
- `salesman_id`
- `requested_changes`: `[{ item_id, item_name, delta }]` (positive = add, negative = deduct)
- `status`: `pending` | `approved` | `rejected`
- `rejection_reason`: `"inventory_insufficient"` | `"admin_rejected"`
- `created_at`

**Request Validation at Approval Time:**
- Backend re-checks live inventory at the moment admin clicks Approve
- If inventory no longer covers the requested addition delta → auto-rejected with `inventory_insufficient`
- If admin explicitly clicks Reject → rejected with `admin_rejected`
- Deduction deltas always restore inventory on approval; no stock check needed for those

### `call_logs`
One call can touch multiple orders. One order can appear in multiple call logs (N:N).
- `call_log_id`
- `salesman_id`
- `bolna_call_id`
- `transcript`
- `summary`
- `created_at`

### `call_log_orders` (join table)
- `call_log_id`
- `order_id`

---

## Admin View

### Inventory Management
- View all inventory items with current stock count
- Update stock count for any item (increment / set absolute value)
- Catalog is fixed — no adding or removing items

### Order Management
- View all orders across all salesmen
- Filter by status, salesman, date
- Advance order through statuses: `pending → confirmed → delivered → paid`
- Cancel any order in `pending`, `confirmed`, or `delivered` state
  - Cancellation triggers automatic inventory restoration for all line items

### Order Update Requests
- View all pending update requests with delta details
- Approve → backend re-validates inventory at approval time
  - Sufficient stock: applies delta, adjusts inventory
  - Insufficient stock: auto-rejects with `inventory_insufficient`
- Reject → marked with `admin_rejected`
- Salesman notified via Supabase real-time

### Call Transcripts
- View full transcript and summary for any call log
- Accessible from each order card (all call logs linked to that order)
- Dedicated "Call History" section listing all calls with salesman name, date, summary

---

## Salesman View

- Select salesman from dropdown (pre-seeded list)
- View own orders showing: order ID, status badge, total amount ₹, created date
- View own update requests and their status (including rejection reason)
- Real-time updates via Supabase subscription on order and request status changes
- Toast notification on every real-time event (see table below)
- **"Call Agent" button** — triggers Bolna outbound call to selected salesman's registered phone

---

## Voice Agent Capabilities (Bolna)

### 1. Place a New Order
- Salesman states items and quantities
- Agent calls `check_inventory(item, quantity)` per line item
- Sufficient stock → confirms and calls `create_order(salesman_id, order_items)` where `order_items` is an array of `{ item_id, item_name, quantity, unit_price, line_total }`
- Insufficient stock → *"There are only X units of [item] available, are you okay with that?"* → proceeds or drops based on response
- Zero stock → informs salesman and skips item

### 2. Update an Existing Order (Add or Deduct)
- If salesman has multiple open orders, agent asks for the order ID
- Salesman states item and delta (add N / remove N)
- Agent checks inventory for additions (same partial-fulfillment logic)
- Agent says: *"I've placed an update request for Order #[id]. You'll be notified once it's approved or rejected."*
- Calls `create_update_request(order_id, changes)`

### 3. Check Inventory
- Calls `get_inventory(item_name)` and reads back current stock count and unit

### 4. Look Up Orders
- Calls `get_orders(salesman_id)` and reads each order as:
  *"Order #[id], placed on [date], total ₹[amount], status [status]"*
- Salesman can then reference a specific order ID for updates

### 5. End of Call — Webhook with Affected Orders
- On call end Bolna fires `POST /api/webhook/bolna`
- Payload includes all `affected_order_ids` accumulated during the conversation
- Backend creates one `call_log` and inserts N rows into `call_log_orders`

### 6. Phone-to-Salesman Resolution
- `GET /api/salesman?phone=+91...` resolves caller to salesman record
- Salesman context (`salesman_id`, `name`) injected at call start via Bolna `user_data`

---

## Backend API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/salesmen` | List all salesmen (dropdown) |
| GET | `/api/salesman?phone=` | Resolve phone → salesman (Bolna) |
| GET | `/api/inventory` | List all items with stock |
| PATCH | `/api/inventory/:item_id` | Update stock count (admin) |
| GET | `/api/orders` | All orders (admin) |
| GET | `/api/orders?salesman_id=` | Orders for a salesman |
| POST | `/api/orders` | Create order (agent) — deducts inventory |
| PATCH | `/api/orders/:id/status` | Advance or cancel status (admin) — cancel restores inventory |
| POST | `/api/order-update-requests` | Create update request (agent) |
| PATCH | `/api/order-update-requests/:id/approve` | Approve — re-validates inventory, applies delta |
| PATCH | `/api/order-update-requests/:id/reject` | Reject (admin) |
| GET | `/api/call-logs?order_id=` | Call logs for an order |
| GET | `/api/call-logs` | All call logs (admin call history) |
| POST | `/api/webhook/bolna` | Receive transcript, summary, affected_order_ids |
| POST | `/api/calls/initiate` | Trigger outbound Bolna call |

---

## Real-Time Behaviour (Supabase + Toasts)

| Event | Who sees it | Toast copy |
|---|---|---|
| New order created | Admin | "New order #[id] from [salesman]" |
| Update request raised | Admin | "Update request on Order #[id] from [salesman]" |
| Update request approved | Salesman | "Your update on Order #[id] was approved" |
| Update request rejected | Salesman | "Your update on Order #[id] was rejected: [reason]" |
| Order status changed | Salesman | "Order #[id] is now [status]" |
| Call log created | Admin | "Call summary available for [salesman]" |

---

## Post-Call Flow

1. Call ends → Bolna fires `POST /api/webhook/bolna`
   ```json
   {
     "bolna_call_id": "...",
     "salesman_phone": "+91...",
     "transcript": "...",
     "summary": "...",
     "affected_order_ids": ["order_id_1", "order_id_2"]
   }
   ```
2. Backend resolves phone → salesman
3. Creates one `call_log` record
4. Inserts one row per order into `call_log_orders`
5. Admin order cards show linked call summaries; full transcript expandable

---

## Local Development

- ngrok exposes local Express server for Bolna webhook and function call endpoints
- No deployment required
- Supabase hosted (no local Postgres)
- Bolna agent configured with ngrok URL for all tools and webhook receiver

---

## Out of Scope

- Authentication
- Item catalog management (fixed list)
- Inbound calling (outbound only for demo)
- Payment processing
- Backorder / waitlist
- Production deployment

---

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | React (CRA) |
| Backend | Node.js / Express |
| Database + Real-time | Supabase (Postgres + subscriptions) |
| Voice Agent | Bolna API |
| Local tunnel | ngrok |
| Telephony | Bolna-managed |
