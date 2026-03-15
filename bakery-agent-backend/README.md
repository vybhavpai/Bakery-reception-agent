# Bakery Agent Backend

Backend API for the Bakery Order Management system with Bolna voice agent integration.

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   Copy `.env.example` to `.env` and fill in your credentials:
   ```bash
   cp .env.example .env
   ```

   Required variables:
   - `SUPABASE_URL` - Your Supabase project URL
   - `SUPABASE_SERVICE_KEY` - Your Supabase service role key
   - `BOLNA_API_KEY` - Your Bolna API key
   - `BOLNA_AGENT_ID` - Your Bolna agent ID
   - `NGROK_URL` - Your ngrok URL (e.g., `https://abc123.ngrok.io`)
   - `PORT` - Server port (default: 4000)

3. **Set up database:**
   - Go to your Supabase dashboard
   - Open the SQL Editor
   - Run `database/schema.sql` to create all tables
   - Run `database/seed.sql` to seed initial data

4. **Run the server:**
   ```bash
   npm run dev
   ```

   The server will start on `http://localhost:4000`

## API Endpoints

### Phase 0
- `GET /health` - Health check endpoint

### Phase 1
- `GET /api/inventory` - Get all inventory items
- `GET /api/salesmen` - Get all salesmen

### Phase 2
- `GET /api/inventory?item_name=<name>` - Get specific inventory item by name
- `POST /api/calls/initiate` - Initiate a Bolna call
  ```json
  {
    "salesman_id": "uuid" // OR
    "salesman_phone": "+1234567890"
  }
  ```

## Database Schema

See `database/schema.sql` for the complete schema. The database includes:
- `inventory` - Product catalog with stock counts
- `salesmen` - Salesman records with phone numbers
- `orders` - Order records (empty initially)
- `order_update_requests` - Update request records (empty initially)
- `call_logs` - Call transcript logs (empty initially)
- `call_log_orders` - Join table for call logs and orders (empty initially)

## Development

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Run production build
