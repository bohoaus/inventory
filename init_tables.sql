-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create inventory table
CREATE TABLE inventory (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    code_colour VARCHAR UNIQUE NOT NULL,
    item_name VARCHAR,
    item_group VARCHAR,
    item_location VARCHAR,
    receive_qty FLOAT,
    stock_qty FLOAT,
    release_date TIMESTAMPTZ,
    item_aging INTEGER,
    item_status VARCHAR,
    item_category VARCHAR,
    pack_unit INTEGER,
    pack_size JSONB,
    repeat_item JSONB,
    mfg_date TIMESTAMPTZ,
    item_cargo VARCHAR,
    est_date TIMESTAMPTZ,
    arrive_date TIMESTAMPTZ,
    delay_date TIMESTAMPTZ,
    odm_ppo VARCHAR,
    odm_customer VARCHAR,
    item_note TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create order table
CREATE TABLE orders (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    order_type VARCHAR,
    status VARCHAR,
    customer_name VARCHAR,
    agent_state VARCHAR,
    dispatched_state VARCHAR,
    dispatched_carrier VARCHAR,
    dispatched_box VARCHAR,
    total_items INTEGER,
    removed_items INTEGER,
    invoice_no VARCHAR,
    tracking_no VARCHAR,
    order_note TEXT,
    cancelled_at TIMESTAMPTZ,
    dispatched_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create order_items table
CREATE TABLE order_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    order_id UUID REFERENCES orders(id),
    item_name VARCHAR REFERENCES inventory(code_colour),
    order_qty FLOAT,
    total_pieces INTEGER,
    order_item_status VARCHAR,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create users table
CREATE TABLE users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    auth_user_id UUID REFERENCES auth.users(id),
    email VARCHAR UNIQUE NOT NULL,
    role VARCHAR CHECK (role IN ('admin', 'sales', 'staff')),
    username VARCHAR,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create notes table
CREATE TABLE notes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_email VARCHAR REFERENCES users(email),
    note_board TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create profiles table with role
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'user',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id);

CREATE POLICY "Enable insert for authenticated users only"
ON public.profiles
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Create trigger for updating timestamps
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE PROCEDURE handle_updated_at();

-- Create trigger to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, role)
    VALUES (new.id, new.email, 'user');
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Insert an admin user (replace with your admin user's ID and email)
INSERT INTO public.profiles (id, email, role)
VALUES 
    ('your-admin-user-id', 'your-admin-email@example.com', 'admin')
ON CONFLICT (id) DO UPDATE 
SET role = 'admin';

-- Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to read their own data
CREATE POLICY "Users can read own data"
ON public.users
FOR SELECT
USING (auth.uid() = auth_user_id);

-- Create policy to allow admins to read all data
CREATE POLICY "Admins can read all data"
ON public.users
FOR ALL
USING (
    auth.uid() IN (
        SELECT auth_user_id FROM public.users WHERE role = 'admin'
    )
);
