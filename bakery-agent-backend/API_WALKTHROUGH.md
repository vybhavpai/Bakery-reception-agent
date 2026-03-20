# Backend API Walkthrough

Short domain map of the backend APIs in `src/app.ts`.

## Health

- `GET /health` — service health check (`ok` + message).

## Salesman

- `GET /api/salesman` — list all salesmen.
- `GET /api/salesman?phone=...` — fetch a single salesman by phone.

## Inventory

- `GET /api/inventory` — list inventory items.
- `GET /api/inventory?item_id=...` — fetch one inventory item by id.
- `GET /api/inventory?item_name=...` — fetch by item name (single or comma-separated list).
- `GET /api/inventory?item_ids=id1,id2` — bulk fetch by item ids.
- `PATCH /api/inventory/:item_id` — update stock, price, and/or unit.

## Calls / Voice

- `POST /api/calls/initiate` — start a Bolna call for a salesman (`salesman_id` or `salesman_phone`).
- `POST /api/webhook/bolna` — ingest Bolna webhook after calls; create call log and optionally link affected orders.

## Orders

- `GET /api/orders` — list orders with filtering/pagination/sorting.
  - Supports `salesman_id` / `salesman_ids`, `sort_by`, `order`, `page`, `count`.
- `POST /api/orders` — create order with items; validates stock.
- `GET /api/orders/details?order_id=...` — full order payload for modal (salesman, timestamps, priced line items).
- `GET /api/orders/:id` — compact order details (summary + item quantities/units).
- `PATCH /api/orders/:id/status` — move order through valid status transitions.

## Order Update Requests

- `GET /api/order-update-requests` — list all update requests.
- `GET /api/order-update-requests?status=pending` — list only pending update requests.
- `POST /api/order-update-requests` — create one update request (single item delta).
- `PATCH /api/order-update-requests/:id/approve` — approve request (revalidates + applies changes).
- `PATCH /api/order-update-requests/:id/reject` — reject request with reason.
