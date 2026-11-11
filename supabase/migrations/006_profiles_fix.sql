-- ==============================================================================
-- BRAND 360s CRM — Function to Register/Onboard Employee Safely
-- ==============================================================================

-- When an admin provides email, password, full_name, and phone,
-- this procedure checks that the caller is an active admin.
-- If auth user creation is done via Admin API, profiles automatically receives the UUID.

-- Ensure profiles table has proper foreign key constraint to auth.users
ALTER TABLE IF EXISTS public.profiles
  DROP CONSTRAINT IF EXISTS profiles_id_fkey,
  ADD CONSTRAINT profiles_id_fkey 
    FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
  
