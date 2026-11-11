-- ==============================================================================
-- BRAND 360s CRM — Authentication & Profiles Setup (Supabase PostgreSQL)
-- ==============================================================================

-- 1. Create profiles table linked directly to auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'employee')) DEFAULT 'employee',
  is_active BOOLEAN NOT NULL DEFAULT true,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Index for fast role & email lookups
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Helper function: Is the current user an admin?
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin' AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. RLS Policies for Profiles
-- Authenticated users can view their own profile, Admins can view all profiles
DROP POLICY IF EXISTS "Users can view relevant profiles" ON public.profiles;
CREATE POLICY "Users can view relevant profiles"
ON public.profiles FOR SELECT TO authenticated
USING (
  id = auth.uid() OR public.is_admin()
);

-- Users can update only their own profile (name, phone), but CANNOT change their own role or is_active status
DROP POLICY IF EXISTS "Users can update own details" ON public.profiles;
CREATE POLICY "Users can update own details"
ON public.profiles FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (
  id = auth.uid() 
  AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
  AND is_active = (SELECT is_active FROM public.profiles WHERE id = auth.uid())
);

-- Only Admins can insert, update roles, or delete profiles
DROP POLICY IF EXISTS "Admins full management on profiles" ON public.profiles;
CREATE POLICY "Admins full management on profiles"
ON public.profiles FOR ALL TO authenticated
USING (public.is_admin());

-- 4. Automatic Profile Creation Trigger on auth.users Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  first_user BOOLEAN;
  assigned_role TEXT;
  user_name TEXT;
BEGIN
  -- Check if this is the very first user in the system
  SELECT NOT EXISTS (SELECT 1 FROM public.profiles) INTO first_user;
  
  -- The first user automatically becomes 'admin'; all subsequent users default to 'employee'
  IF first_user THEN
    assigned_role := 'admin';
  ELSE
    assigned_role := 'employee';
  END IF;

  user_name := COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1));

  INSERT INTO public.profiles (id, email, full_name, role, is_active)
  VALUES (new.id, new.email, user_name, assigned_role, true)
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger definition
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

