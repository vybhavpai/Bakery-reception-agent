# Bakery Order Management — Development Plan
## Development.md

---

## Guiding Principle

Build one vertical slice at a time — one endpoint, one UI piece, one Bolna tool — and validate it end-to-end before moving on. The first Bolna trial call happens at the end of Phase 2, not after everything is built.

---

## Phase 0 — Project Setup (0.5 hrs)

**Goal:** Skeleton running locally with all connections verified.

### Steps
- [ ] `create-react-app` frontend scaffold
- [ ] Express backend scaffold with a `/health` endpoint
- [ ] Supabase project created; connection string in `.env`
- [ ] ngrok running, pointed at Express port
- [ ] Confirm frontend can hit backend `/health`
- [ ] Confirm backend can connect to Supabase

### Done when
- Browser shows `/health` response via ngrok URL

---

## Phase 1 — Database + Seed Data (1 hr)

**Goal:** Schema in Supabase, seed data in place, raw data readable from backend.

### Supabase Tables to Create
- `inventory` — 5 fixed items with stock counts
- `salesmen` — 3 salesmen with names and phone numbers
- `orders` — empty to start
- `order_items` — empty to start (line items for orders)
- `order_update_requests` — empty
- `call_logs` — empty
- `call_log_orders` — empty (join table)

### Steps
- [ ] Create all tables in Supabase dashboard (or via SQL editor)
- [ ] Seed `inventory` with 5 items (Croissants, Sourdough, Banana Bread, Muffins, Baguettes) and stock counts
- [ ] Seed `salesmen` with 3 records including real phone numbers for demo
- [ ] Write `GET /api/inventory` endpoint — returns all items
- [ ] Write `GET /api/salesmen` endpoint — returns all salesmen
- [ ] Confirm both return correct data via curl or Postman

### Done when
- `/api/inventory` and `/api/salesmen` return seeded data

---

## Phase 2 — First Bolna Trial Call (1 hr)

**Goal:** A real phone call happens. Agent reads back inventory. Bolna function call hits your backend.

### Why this early
Validates the entire Bolna → ngrok → Express chain before you've built any UI. Failures here (wrong phone number format, ngrok timeout, Bolna config issues) are easier to debug with minimal moving parts.

### Steps
- [ ] Create Bolna account, generate API key
- [ ] Create agent in Bolna dashboard with a basic prompt:
  ```
  You are a bakery order assistant. The salesman's name is {salesman_name}.
  You can check inventory. Always greet them by name.
  ```
- [ ] Register one Bolna function tool: `get_inventory`
  ```json
  {
    "name": "get_inventory",
    "description": "Check current stock for a bakery item",
    "parameters": {
      "item_name": { "type": "string" }
    },
    "value": {
      "method": "GET",
      "url": "https://your-ngrok-url.ngrok.io/api/inventory?item_name=%(item_name)s"
    }
  }
  ```
- [ ] Write `GET /api/inventory?item_name=` — returns stock for a specific item
- [ ] Write `POST /api/calls/initiate` — calls Bolna API with agent_id + salesman phone + user_data
- [ ] Trigger a call manually via Postman or curl
- [ ] Pick up the call, ask "how many croissants do we have?"
- [ ] Confirm agent reads back the correct count from your DB

### Done when
- Agent correctly answers an inventory question from live DB data over a real phone call

---

## Phase 3 — Order Creation (1.5 hrs)

**Goal:** Agent can place a new order with inventory check. Order appears in DB.

### Steps
- [ ] Write `POST /api/orders` — creates order, deducts inventory atomically
  - Validate each line item against current stock
  - If insufficient, return available quantity in response so agent can communicate it
  - On success, deduct stock, insert order with status `pending`, and insert order_items records
- [ ] Register Bolna tool: `create_order`
  ```json
  {
    "name": "create_order",
    "description": "Place a new order for the salesman after confirming inventory",
    "parameters": {
      "salesman_id": { "type": "string" },
      "order_items": { "type": "array" }
    },
    "value": {
      "method": "POST",
      "url": "https://your-ngrok-url/api/orders"
    }
  }
  ```
- [ ] Update agent prompt to handle order placement flow with partial fulfillment language
- [ ] Test: call agent, place an order for 2 items, one with insufficient stock
- [ ] Confirm order in Supabase, inventory decremented

### Done when
- Agent places an order, partial fulfillment dialogue works, DB reflects correct state

---

## Phase 4 — Admin UI (1.5 hrs)

**Goal:** Admin can see inventory and all orders; can update stock and change order status.

### Components
- [ ] `InventoryPanel` — table of all items with stock count + inline edit field for stock update
  - On save: `PATCH /api/inventory/:item_id`
- [ ] `OrdersTable` — all orders with salesman name, status badge, total amount, date
  - Status action buttons: Confirm / Deliver / Paid / Cancel (context-aware, only valid transitions shown)
  - On action: `PATCH /api/orders/:id/status`
- [ ] Write `PATCH /api/orders/:id/status` — enforces state machine, restores inventory on cancel
- [ ] Basic layout: two-column, Inventory on left, Orders on right

### Done when
- Admin can visually see orders, advance them through statuses, cancel with inventory restore confirmed in DB

---

## Phase 5 — Salesman UI + Call Trigger (1 hr)

**Goal:** Salesman selects their profile, sees their orders, triggers a call.

### Components
- [ ] `SalesmanSelector` — dropdown populated from `/api/salesmen`, stores selection in local state
- [ ] `MyOrders` — filtered order list showing order ID, status, total, date
- [ ] `CallAgentButton` — POST to `/api/calls/initiate` with selected salesman's ID
  - Show loading state while call is being initiated
  - Show success/error toast

### Done when
- Salesman selects profile, sees only their orders, clicks button, phone rings

---

## Phase 6 — Order Update Requests (1.5 hrs)

**Goal:** Agent can raise an update request. Admin can approve or reject. Inventory re-validated on approval.

### Steps
- [ ] Write `POST /api/order-update-requests` — creates request, no inventory change yet
- [ ] Write `PATCH /api/order-update-requests/:id/approve`
  - Re-check inventory for addition deltas
  - If sufficient: apply delta to order_items (add/update/remove items), adjust inventory, mark approved
  - If insufficient: mark rejected with `inventory_insufficient`
- [ ] Write `PATCH /api/order-update-requests/:id/reject` — mark with `admin_rejected`
- [ ] Register Bolna tool: `create_update_request`
- [ ] Update agent prompt: ask for order ID if multiple open orders, state partial-fulfillment caveat
- [ ] Admin UI: `UpdateRequestsPanel` — list of pending requests with approve/reject buttons
- [ ] Salesman UI: `UpdateRequestsList` — shows own requests with status and rejection reason

### Done when
- Agent raises an update request by voice, admin approves/rejects in UI, inventory correctly adjusted

---

## Phase 7 — Real-time Subscriptions + Toasts (1 hr)

**Goal:** Both views update live. Every change shows a toast.

### Supabase Subscriptions to Set Up
- Admin subscribes to: `orders` (new inserts), `order_update_requests` (new inserts)
- Salesman subscribes to: `orders` (status changes for their salesman_id), `order_update_requests` (status changes for their salesman_id)

### Steps
- [ ] Install `@supabase/supabase-js` in frontend
- [ ] Set up Supabase client with anon key
- [ ] Admin: subscribe to `orders` and `order_update_requests` INSERT events → refresh relevant panel + toast
- [ ] Salesman: subscribe to `orders` and `order_update_requests` UPDATE events filtered by `salesman_id` → refresh panel + toast
- [ ] Install and configure a toast library (e.g. `react-hot-toast` — lightweight, no config)
- [ ] Toast on every subscription event using copy from requirements

### Done when
- Open admin and salesman views side by side; action on one side produces a toast on the other within 1-2 seconds

---

## Phase 8 — Bolna Webhook + Call Logs (1 hr)

**Goal:** After a call ends, transcript and summary appear in admin view linked to the relevant orders.

### Steps
- [ ] Write `POST /api/webhook/bolna`
  - Parse `bolna_call_id`, `salesman_phone`, `transcript`, `summary`, `affected_order_ids`
  - Resolve phone → salesman
  - Insert `call_logs` record
  - Insert one row per order into `call_log_orders`
- [ ] Register webhook URL in Bolna agent settings (ngrok URL)
- [ ] Admin `OrdersTable`: expand an order row to show linked call summaries
- [ ] Admin "Call History" tab: flat list of all call logs, salesman name, date, summary preview, expand for full transcript
- [ ] Test: complete a call, verify webhook fires, call log appears in UI

### Done when
- Post-call transcript visible in admin UI within seconds of hanging up

---

## Phase 9 — Polish + Demo Prep (1 hr)

**Goal:** Clean up UI rough edges, prep the demo flow, write the README.

### Steps
- [ ] Consistent status badge colours across both views
- [ ] Empty states for tables (no orders yet, no requests yet)
- [ ] Error handling on all API calls — show toast on failure
- [ ] ngrok URL centralised in one `.env` variable so it's easy to update
- [ ] `README.md` with setup steps, seed instructions, ngrok setup, Bolna config checklist
- [ ] Rehearse the full demo flow end to end at least once:
  1. Admin sets inventory
  2. Salesman triggers call
  3. Agent places order with partial fulfillment
  4. Admin advances order to confirmed
  5. Salesman sees status change + toast
  6. Salesman triggers second call, requests update
  7. Admin approves update request
  8. Salesman sees approval toast
  9. Call log with transcript visible on order card

---

## Phase Summary

| Phase | What you build | Key validation |
|---|---|---|
| 0 | Project skeleton | `/health` returns via ngrok |
| 1 | DB schema + seed data | `/api/inventory` returns seeded items |
| 2 | **First Bolna trial call** | Agent reads inventory from your DB over a real call |
| 3 | Order creation via agent | Order in DB, inventory decremented |
| 4 | Admin UI | Admin can view and manage orders |
| 5 | Salesman UI + call trigger | Salesman triggers call from browser |
| 6 | Update requests | Agent raises request, admin approves/rejects |
| 7 | Real-time + toasts | Live updates across both views |
| 8 | Webhook + call logs | Transcript visible in admin after call |
| 9 | Polish + demo prep | Full flow rehearsed end to end |

---

## Bolna Agent Config Checklist

Track which tools are registered and tested:

- [ ] `get_inventory(item_name)` — Phase 2
- [ ] `create_order(salesman_id, order_items)` — Phase 3
- [ ] `get_orders(salesman_id)` — Phase 3 (read back order list with ID, amount, date)
- [ ] `create_update_request(order_id, changes)` — Phase 6
- [ ] Webhook URL registered — Phase 8
- [ ] `user_data` variables: `salesman_name`, `salesman_id` — Phase 2

---

## Environment Variables

```env
# Backend
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
BOLNA_API_KEY=
BOLNA_AGENT_ID=
NGROK_URL=

# Frontend
REACT_APP_API_BASE_URL=http://localhost:4000
REACT_APP_SUPABASE_URL=
REACT_APP_SUPABASE_ANON_KEY=
```
