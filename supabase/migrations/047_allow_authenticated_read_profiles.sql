-- Migration: 047_allow_authenticated_read_profiles.sql
-- Description: Allow all authenticated users in the CRM to read employee profiles (names, emails, roles).
-- This ensures that when an employee views clients or services assigned to other colleagues/salespersons,
-- the joined profile name (e.g., "CEO") resolves correctly instead of evaluating to NULL due to restrictive RLS.

-- 1. Ensure profiles SELECT policy allows authenticated users to read profiles
DROP POLICY IF EXISTS "Public profiles are viewable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Users can view relevant profiles" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are readable by authenticated users" ON public.profiles;

CREATE POLICY "Profiles are readable by authenticated users"
ON public.profiles FOR SELECT TO authenticated
USING (true);

-- Note: UPDATE, INSERT, and DELETE policies remain strictly protected:
-- Only admins can insert or delete profiles, and employees can only update their own profile name/phone.
