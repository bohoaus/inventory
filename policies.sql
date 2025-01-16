-- Enable Row Level Security for all tables
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- Create a function to get user role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS VARCHAR AS $$
BEGIN
  RETURN (
    SELECT role FROM users 
    WHERE auth_user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Inventory Policies
CREATE POLICY inventory_admin_policy ON inventory
    FOR ALL
    TO authenticated
    USING (get_user_role() = 'admin');

CREATE POLICY inventory_staff_sales_policy ON inventory
    FOR SELECT
    TO authenticated
    USING (get_user_role() IN ('staff', 'sales'));

-- Orders Policies
CREATE POLICY orders_admin_policy ON orders
    FOR ALL
    TO authenticated
    USING (get_user_role() = 'admin');

CREATE POLICY orders_sales_policy ON orders
    FOR SELECT
    TO authenticated
    USING (get_user_role() = 'sales');

-- Order Items Policies
CREATE POLICY order_items_admin_policy ON order_items
    FOR ALL
    TO authenticated
    USING (get_user_role() = 'admin');

CREATE POLICY order_items_staff_sales_policy ON order_items
    FOR SELECT
    TO authenticated
    USING (get_user_role() IN ('staff', 'sales'));

-- Notes Policies
CREATE POLICY notes_admin_policy ON notes
    FOR ALL
    TO authenticated
    USING (get_user_role() = 'admin');

-- Separate policies for different operations on notes
CREATE POLICY notes_staff_sales_select_policy ON notes
    FOR SELECT
    TO authenticated
    USING (get_user_role() IN ('staff', 'sales'));

CREATE POLICY notes_staff_sales_insert_policy ON notes
    FOR INSERT
    TO authenticated
    WITH CHECK (get_user_role() IN ('staff', 'sales'));

CREATE POLICY notes_staff_sales_update_policy ON notes
    FOR UPDATE
    TO authenticated
    USING (get_user_role() IN ('staff', 'sales'))
    WITH CHECK (get_user_role() IN ('staff', 'sales'));
