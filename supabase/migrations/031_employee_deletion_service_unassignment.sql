-- Migration: 031_employee_deletion_service_unassignment.sql
-- Description: Atomic Employee Deletion with Automatic Service Unassignment & Dependency Checks

CREATE OR REPLACE FUNCTION public.delete_employee_safely(
  p_employee_id UUID,
  p_actor_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor_role TEXT;
  v_employee RECORD;
  v_assigned_services_count INTEGER := 0;
  v_assigned_clients_count INTEGER := 0;
  v_assigned_followups_count INTEGER := 0;
  v_unassigned_services JSONB := '[]'::jsonb;
BEGIN
  -- 1. Authorization Check: Actor must be an active admin
  SELECT role INTO v_actor_role
  FROM public.profiles
  WHERE id = p_actor_id AND is_active = true;

  IF v_actor_role IS NULL OR v_actor_role <> 'admin' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Unauthorized: Only administrators can delete employee accounts.'
    );
  END IF;

  -- 2. Prevent self-deletion
  IF p_employee_id = p_actor_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'You cannot delete your own admin account.'
    );
  END IF;

  -- 3. Fetch employee profile
  SELECT id, full_name, email, role INTO v_employee
  FROM public.profiles
  WHERE id = p_employee_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Employee record not found.'
    );
  END IF;

  -- 4. Check if employee is assigned as salesperson for clients
  SELECT COUNT(*) INTO v_assigned_clients_count
  FROM public.clients
  WHERE assigned_salesperson = p_employee_id;

  IF v_assigned_clients_count > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Cannot delete employee: they are assigned to %s client(s) as salesperson. Please reassign those clients first.', v_assigned_clients_count),
      'assigned_clients_count', v_assigned_clients_count
    );
  END IF;

  -- 5. Check if employee has pending follow-ups
  SELECT COUNT(*) INTO v_assigned_followups_count
  FROM public.follow_ups
  WHERE assigned_to = p_employee_id AND status = 'Pending';

  IF v_assigned_followups_count > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Cannot delete employee: they have %s pending follow-up(s). Please reassign them first.', v_assigned_followups_count),
      'assigned_followups_count', v_assigned_followups_count
    );
  END IF;

  -- 6. Collect all client services assigned to this employee
  SELECT COUNT(*), COALESCE(jsonb_agg(jsonb_build_object(
    'service_id', cs.id,
    'client_id', cs.client_id,
    'service_name', cs.service_name
  )), '[]'::jsonb)
  INTO v_assigned_services_count, v_unassigned_services
  FROM public.client_services cs
  WHERE cs.assigned_employee_id = p_employee_id;

  -- 7. Automatically set assigned_employee_id to NULL on those services
  IF v_assigned_services_count > 0 THEN
    UPDATE public.client_services
    SET assigned_employee_id = NULL,
        updated_at = NOW()
    WHERE assigned_employee_id = p_employee_id;
  END IF;

  -- 8. Delete the employee profile
  DELETE FROM public.profiles
  WHERE id = p_employee_id;

  -- 9. Insert permanent audit log record
  INSERT INTO public.audit_logs (
    actor_id,
    action,
    entity_type,
    entity_id,
    entity_name,
    details
  ) VALUES (
    p_actor_id,
    'DELETE',
    'employee',
    p_employee_id::text,
    v_employee.full_name,
    jsonb_build_object(
      'email', v_employee.email,
      'role', v_employee.role,
      'unassigned_services_count', v_assigned_services_count,
      'unassigned_services', v_unassigned_services
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'unassigned_services_count', v_assigned_services_count,
    'employee_name', v_employee.full_name
  );
END;
$$;
