-- Sample Inventory Data
INSERT INTO inventory (
    code_colour,
    item_name,
    item_group,
    item_location,
    receive_qty,
    stock_qty,
    item_status,
    item_category,
    pack_size,
    item_cargo,
    mfg_date,
    release_date,
    created_at
) VALUES 
    -- First add the items that will be referenced in order_items
    ('BOHO-001', 'BOHO MAXI DRESS', 'BOHO', 'A1', 100, 100, 'NEW RELEASE', 'DRESS', '{"S":20,"M":40,"L":40}', 'SEA', '2024-01-15', '2024-03-01', NOW()),
    ('PRIM-001', 'CLASSIC BLOUSE', 'PRIMROSE', 'B1', 120, 120, 'NEW RELEASE', 'TOP', '{"S":40,"M":40,"L":40}', 'SEA', '2024-01-10', '2024-03-01', NOW()),
    
    -- Then add the rest of the items
    ('BOHO-D001', 'SUMMER MAXI DRESS', 'BOHO', 'A1', 100, 100, 'NEW RELEASE', 'DRESS', '{"S":20,"M":40,"L":40}', 'SEA', '2024-01-15', '2024-03-01', NOW()),
    ('BOHO-T001', 'BOHEMIAN TUNIC TOP', 'BOHO', 'A2', 80, 80, 'NEW RELEASE', 'TOP', '{"S":30,"M":30,"L":20}', 'AIR', '2024-01-20', '2024-03-05', NOW());

-- Sample Orders (after inventory is populated)
INSERT INTO orders (order_type, status, customer_name)
VALUES 
    ('retail', 'processing', 'John Doe'),
    ('wholesale', 'completed', 'Fashion Store Inc'),
    ('odm', 'processing', 'Custom Apparel Ltd');

-- Sample Order Items (after both inventory and orders are populated)
INSERT INTO order_items (order_id, item_name, order_qty, total_pieces)
VALUES 
    ((SELECT id FROM orders LIMIT 1), 'BOHO-001', 2, 4),
    ((SELECT id FROM orders LIMIT 1 OFFSET 1), 'PRIM-001', 5, 5);

-- Sample Notes
INSERT INTO notes (user_email, note_board)
VALUES 
    ('ad@ad.com', 'Important meeting tomorrow at 10 AM');
