-- Bakery Order Management Database Schema

-- Inventory table
CREATE TABLE IF NOT EXISTS inventory (
    item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_name VARCHAR(255) NOT NULL UNIQUE,
    stock_count INTEGER NOT NULL DEFAULT 0,
    unit VARCHAR(50) NOT NULL DEFAULT 'units',
    unit_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Salesmen table
CREATE TABLE IF NOT EXISTS salesmen (
    salesman_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
    order_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    salesman_id UUID NOT NULL REFERENCES salesmen(salesman_id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'delivered', 'paid', 'cancelled')),
    total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Order items table
CREATE TABLE IF NOT EXISTS order_items (
    order_item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES inventory(item_id) ON DELETE RESTRICT,
    item_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10, 2) NOT NULL DEFAULT 0, -- Snapshot of price at time of order
    line_total DECIMAL(10, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Order update requests table
CREATE TABLE IF NOT EXISTS order_update_requests (
    request_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    salesman_id UUID NOT NULL REFERENCES salesmen(salesman_id) ON DELETE CASCADE,
    requested_changes JSONB NOT NULL DEFAULT '[]'::jsonb,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    rejection_reason VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Call logs table
CREATE TABLE IF NOT EXISTS call_logs (
    call_log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    salesman_id UUID NOT NULL REFERENCES salesmen(salesman_id) ON DELETE CASCADE,
    bolna_call_id VARCHAR(255) NOT NULL UNIQUE,
    transcript TEXT,
    summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Call log orders join table
CREATE TABLE IF NOT EXISTS call_log_orders (
    call_log_id UUID NOT NULL REFERENCES call_logs(call_log_id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    PRIMARY KEY (call_log_id, order_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_orders_salesman_id ON orders(salesman_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_item_id ON order_items(item_id);
CREATE INDEX IF NOT EXISTS idx_order_update_requests_order_id ON order_update_requests(order_id);
CREATE INDEX IF NOT EXISTS idx_order_update_requests_salesman_id ON order_update_requests(salesman_id);
CREATE INDEX IF NOT EXISTS idx_order_update_requests_status ON order_update_requests(status);
CREATE INDEX IF NOT EXISTS idx_call_logs_salesman_id ON call_logs(salesman_id);
CREATE INDEX IF NOT EXISTS idx_call_log_orders_order_id ON call_log_orders(order_id);
