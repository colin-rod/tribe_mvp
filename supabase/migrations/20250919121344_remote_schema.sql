drop extension if exists "pg_net";

drop policy "Service role can update delivery jobs" on "public"."delivery_jobs";

revoke delete on table "public"."ai_prompts" from "anon";

revoke insert on table "public"."ai_prompts" from "anon";

revoke references on table "public"."ai_prompts" from "anon";

revoke select on table "public"."ai_prompts" from "anon";

revoke trigger on table "public"."ai_prompts" from "anon";

revoke truncate on table "public"."ai_prompts" from "anon";

revoke update on table "public"."ai_prompts" from "anon";

revoke delete on table "public"."ai_prompts" from "authenticated";

revoke insert on table "public"."ai_prompts" from "authenticated";

revoke references on table "public"."ai_prompts" from "authenticated";

revoke select on table "public"."ai_prompts" from "authenticated";

revoke trigger on table "public"."ai_prompts" from "authenticated";

revoke truncate on table "public"."ai_prompts" from "authenticated";

revoke update on table "public"."ai_prompts" from "authenticated";

revoke delete on table "public"."ai_prompts" from "service_role";

revoke insert on table "public"."ai_prompts" from "service_role";

revoke references on table "public"."ai_prompts" from "service_role";

revoke select on table "public"."ai_prompts" from "service_role";

revoke trigger on table "public"."ai_prompts" from "service_role";

revoke truncate on table "public"."ai_prompts" from "service_role";

revoke update on table "public"."ai_prompts" from "service_role";

revoke delete on table "public"."children" from "anon";

revoke insert on table "public"."children" from "anon";

revoke references on table "public"."children" from "anon";

revoke select on table "public"."children" from "anon";

revoke trigger on table "public"."children" from "anon";

revoke truncate on table "public"."children" from "anon";

revoke update on table "public"."children" from "anon";

revoke delete on table "public"."children" from "authenticated";

revoke insert on table "public"."children" from "authenticated";

revoke references on table "public"."children" from "authenticated";

revoke select on table "public"."children" from "authenticated";

revoke trigger on table "public"."children" from "authenticated";

revoke truncate on table "public"."children" from "authenticated";

revoke update on table "public"."children" from "authenticated";

revoke delete on table "public"."children" from "service_role";

revoke insert on table "public"."children" from "service_role";

revoke references on table "public"."children" from "service_role";

revoke select on table "public"."children" from "service_role";

revoke trigger on table "public"."children" from "service_role";

revoke truncate on table "public"."children" from "service_role";

revoke update on table "public"."children" from "service_role";

revoke delete on table "public"."delivery_jobs" from "anon";

revoke insert on table "public"."delivery_jobs" from "anon";

revoke references on table "public"."delivery_jobs" from "anon";

revoke select on table "public"."delivery_jobs" from "anon";

revoke trigger on table "public"."delivery_jobs" from "anon";

revoke truncate on table "public"."delivery_jobs" from "anon";

revoke update on table "public"."delivery_jobs" from "anon";

revoke delete on table "public"."delivery_jobs" from "authenticated";

revoke insert on table "public"."delivery_jobs" from "authenticated";

revoke references on table "public"."delivery_jobs" from "authenticated";

revoke select on table "public"."delivery_jobs" from "authenticated";

revoke trigger on table "public"."delivery_jobs" from "authenticated";

revoke truncate on table "public"."delivery_jobs" from "authenticated";

revoke update on table "public"."delivery_jobs" from "authenticated";

revoke delete on table "public"."delivery_jobs" from "service_role";

revoke insert on table "public"."delivery_jobs" from "service_role";

revoke references on table "public"."delivery_jobs" from "service_role";

revoke select on table "public"."delivery_jobs" from "service_role";

revoke trigger on table "public"."delivery_jobs" from "service_role";

revoke truncate on table "public"."delivery_jobs" from "service_role";

revoke update on table "public"."delivery_jobs" from "service_role";

revoke delete on table "public"."profiles" from "anon";

revoke insert on table "public"."profiles" from "anon";

revoke references on table "public"."profiles" from "anon";

revoke select on table "public"."profiles" from "anon";

revoke trigger on table "public"."profiles" from "anon";

revoke truncate on table "public"."profiles" from "anon";

revoke update on table "public"."profiles" from "anon";

revoke delete on table "public"."profiles" from "authenticated";

revoke insert on table "public"."profiles" from "authenticated";

revoke references on table "public"."profiles" from "authenticated";

revoke select on table "public"."profiles" from "authenticated";

revoke trigger on table "public"."profiles" from "authenticated";

revoke truncate on table "public"."profiles" from "authenticated";

revoke update on table "public"."profiles" from "authenticated";

revoke delete on table "public"."profiles" from "service_role";

revoke insert on table "public"."profiles" from "service_role";

revoke references on table "public"."profiles" from "service_role";

revoke select on table "public"."profiles" from "service_role";

revoke trigger on table "public"."profiles" from "service_role";

revoke truncate on table "public"."profiles" from "service_role";

revoke update on table "public"."profiles" from "service_role";

revoke delete on table "public"."recipient_groups" from "anon";

revoke insert on table "public"."recipient_groups" from "anon";

revoke references on table "public"."recipient_groups" from "anon";

revoke select on table "public"."recipient_groups" from "anon";

revoke trigger on table "public"."recipient_groups" from "anon";

revoke truncate on table "public"."recipient_groups" from "anon";

revoke update on table "public"."recipient_groups" from "anon";

revoke delete on table "public"."recipient_groups" from "authenticated";

revoke insert on table "public"."recipient_groups" from "authenticated";

revoke references on table "public"."recipient_groups" from "authenticated";

revoke select on table "public"."recipient_groups" from "authenticated";

revoke trigger on table "public"."recipient_groups" from "authenticated";

revoke truncate on table "public"."recipient_groups" from "authenticated";

revoke update on table "public"."recipient_groups" from "authenticated";

revoke delete on table "public"."recipient_groups" from "service_role";

revoke insert on table "public"."recipient_groups" from "service_role";

revoke references on table "public"."recipient_groups" from "service_role";

revoke select on table "public"."recipient_groups" from "service_role";

revoke trigger on table "public"."recipient_groups" from "service_role";

revoke truncate on table "public"."recipient_groups" from "service_role";

revoke update on table "public"."recipient_groups" from "service_role";

revoke delete on table "public"."recipients" from "anon";

revoke insert on table "public"."recipients" from "anon";

revoke references on table "public"."recipients" from "anon";

revoke select on table "public"."recipients" from "anon";

revoke trigger on table "public"."recipients" from "anon";

revoke truncate on table "public"."recipients" from "anon";

revoke update on table "public"."recipients" from "anon";

revoke delete on table "public"."recipients" from "authenticated";

revoke insert on table "public"."recipients" from "authenticated";

revoke references on table "public"."recipients" from "authenticated";

revoke select on table "public"."recipients" from "authenticated";

revoke trigger on table "public"."recipients" from "authenticated";

revoke truncate on table "public"."recipients" from "authenticated";

revoke update on table "public"."recipients" from "authenticated";

revoke delete on table "public"."recipients" from "service_role";

revoke insert on table "public"."recipients" from "service_role";

revoke references on table "public"."recipients" from "service_role";

revoke select on table "public"."recipients" from "service_role";

revoke trigger on table "public"."recipients" from "service_role";

revoke truncate on table "public"."recipients" from "service_role";

revoke update on table "public"."recipients" from "service_role";

revoke delete on table "public"."responses" from "anon";

revoke insert on table "public"."responses" from "anon";

revoke references on table "public"."responses" from "anon";

revoke select on table "public"."responses" from "anon";

revoke trigger on table "public"."responses" from "anon";

revoke truncate on table "public"."responses" from "anon";

revoke update on table "public"."responses" from "anon";

revoke delete on table "public"."responses" from "authenticated";

revoke insert on table "public"."responses" from "authenticated";

revoke references on table "public"."responses" from "authenticated";

revoke select on table "public"."responses" from "authenticated";

revoke trigger on table "public"."responses" from "authenticated";

revoke truncate on table "public"."responses" from "authenticated";

revoke update on table "public"."responses" from "authenticated";

revoke delete on table "public"."responses" from "service_role";

revoke insert on table "public"."responses" from "service_role";

revoke references on table "public"."responses" from "service_role";

revoke select on table "public"."responses" from "service_role";

revoke trigger on table "public"."responses" from "service_role";

revoke truncate on table "public"."responses" from "service_role";

revoke update on table "public"."responses" from "service_role";

revoke delete on table "public"."updates" from "anon";

revoke insert on table "public"."updates" from "anon";

revoke references on table "public"."updates" from "anon";

revoke select on table "public"."updates" from "anon";

revoke trigger on table "public"."updates" from "anon";

revoke truncate on table "public"."updates" from "anon";

revoke update on table "public"."updates" from "anon";

revoke delete on table "public"."updates" from "authenticated";

revoke insert on table "public"."updates" from "authenticated";

revoke references on table "public"."updates" from "authenticated";

revoke select on table "public"."updates" from "authenticated";

revoke trigger on table "public"."updates" from "authenticated";

revoke truncate on table "public"."updates" from "authenticated";

revoke update on table "public"."updates" from "authenticated";

revoke delete on table "public"."updates" from "service_role";

revoke insert on table "public"."updates" from "service_role";

revoke references on table "public"."updates" from "service_role";

revoke select on table "public"."updates" from "service_role";

revoke trigger on table "public"."updates" from "service_role";

revoke truncate on table "public"."updates" from "service_role";

revoke update on table "public"."updates" from "service_role";

drop index if exists "public"."idx_delivery_jobs_external_id";

alter table "public"."ai_prompts" alter column "id" set default extensions.uuid_generate_v4();

alter table "public"."children" alter column "id" set default extensions.uuid_generate_v4();

alter table "public"."delivery_jobs" alter column "id" set default extensions.uuid_generate_v4();

alter table "public"."recipient_groups" alter column "id" set default extensions.uuid_generate_v4();

alter table "public"."recipients" alter column "id" set default extensions.uuid_generate_v4();

alter table "public"."recipients" alter column "preference_token" set default encode(extensions.gen_random_bytes(32), 'base64'::text);

alter table "public"."responses" alter column "id" set default extensions.uuid_generate_v4();

alter table "public"."updates" alter column "id" set default extensions.uuid_generate_v4();

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.create_default_groups_for_user(user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Log that the function is being called
  RAISE NOTICE 'Creating default groups for user: %', user_id;

  -- Insert default recipient groups
  INSERT INTO public.recipient_groups (parent_id, name, default_frequency, default_channels, is_default_group)
  VALUES
    (user_id, 'Close Family', 'daily_digest', ARRAY['email']::VARCHAR[], true),
    (user_id, 'Extended Family', 'weekly_digest', ARRAY['email']::VARCHAR[], false),
    (user_id, 'Friends', 'weekly_digest', ARRAY['email']::VARCHAR[], false)
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Successfully created default groups for user: %', user_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error creating default groups: %', SQLERRM;
    -- Don't re-raise the error so user creation doesn't fail
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_recipient_by_token(token text)
 RETURNS TABLE(recipient_data json)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT row_to_json(recipients.*)
  FROM recipients
  WHERE preference_token = token AND is_active = true;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RAISE NOTICE 'Handle new user called for: %', new.email;

  -- Insert profile for new user
  INSERT INTO public.profiles (id, email, name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    updated_at = NOW();

  -- Create default recipient groups
  PERFORM public.create_default_groups_for_user(new.id);

  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error in handle_new_user: %', SQLERRM;
    -- Return new anyway so user creation doesn't fail completely
    RETURN new;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;


