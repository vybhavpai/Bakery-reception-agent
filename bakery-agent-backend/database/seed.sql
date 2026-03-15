-- Seed data for Bakery Order Management

-- Seed inventory with 5 items (including unit prices)
INSERT INTO inventory (item_name, stock_count, unit, unit_price) VALUES
    ('Donut', 100, 'boxes', 25.00),
    ('Pav', 50, 'loaves', 15.00),
    ('Bread', 75, 'loaves', 30.00),
    ('Muffins', 120, 'boxes', 40.00),
    ('Cookies', 80, 'boxes', 35.00)
ON CONFLICT (item_name) DO NOTHING;

-- Seed salesmen with 3 records
-- Note: Replace phone numbers with real phone numbers for demo
INSERT INTO salesmen (name, phone) VALUES
    ('Vybhav Pai', '+918970595234'),
    ('Jyotsna Pau', '+919110652212')
ON CONFLICT (phone) DO NOTHING;
