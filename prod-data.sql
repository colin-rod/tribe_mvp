SET session_replication_role = replica;

--
-- PostgreSQL database dump
--

\restrict OfUYblhjCVikV3lUD64dbKrCQCpVw7I85FNBiWdeO8tvfd43KNfHiatWa2IjvE0

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: instances; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: mfa_amr_claims; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."mfa_amr_claims" ("session_id", "created_at", "updated_at", "authentication_method", "id") VALUES
	('9e845bcb-b8db-4e15-9eaa-5d5aee7b8d1f', '2025-09-19 05:00:59.623271+00', '2025-09-19 05:00:59.623271+00', 'email/signup', '9976c616-42f2-40cc-9279-c1395d6e3961');


--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."users" ("instance_id", "id", "aud", "role", "email", "encrypted_password", "email_confirmed_at", "invited_at", "confirmation_token", "confirmation_sent_at", "recovery_token", "recovery_sent_at", "email_change_token_new", "email_change", "email_change_sent_at", "last_sign_in_at", "raw_app_meta_data", "raw_user_meta_data", "is_super_admin", "created_at", "updated_at", "phone", "phone_confirmed_at", "phone_change", "phone_change_token", "phone_change_sent_at", "email_change_token_current", "email_change_confirm_status", "banned_until", "reauthentication_token", "reauthentication_sent_at", "is_sso_user", "deleted_at", "is_anonymous") VALUES
	('00000000-0000-0000-0000-000000000000', '5becc0fb-8a49-4e11-8b88-c1cd94d8b073', 'authenticated', 'authenticated', 'test@colinrodrigues.com', '$2a$10$lsO53v8yZdCzfruzjw//2u1rCzYuUHSj6mnMfDzq6gWCeg8KihCZ6', '2025-09-16 13:06:24.4316+00', NULL, '', NULL, '', NULL, '', '', NULL, NULL, '{"provider": "email", "providers": ["email"]}', '{"email_verified": true}', NULL, '2025-09-16 13:06:24.418111+00', '2025-09-16 13:06:24.432706+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', '550e8400-e29b-41d4-a716-446655440001', 'authenticated', 'authenticated', 'colin@colinrodrigues.com', '$2a$10$abcdefghijklmnopqrstuvwxyz', '2025-09-16 13:20:11.884044+00', NULL, '', NULL, '', NULL, '', '', NULL, NULL, '{"provider": "email", "providers": ["email"]}', '{"name": "Colin Rodrigues"}', false, '2025-09-16 13:20:11.884044+00', '2025-09-16 13:20:11.884044+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', '550e8400-e29b-41d4-a716-446655440002', 'authenticated', 'authenticated', 'jane@example.com', '$2a$10$abcdefghijklmnopqrstuvwxyz', '2025-09-16 13:20:11.884044+00', NULL, '', NULL, '', NULL, '', '', NULL, NULL, '{"provider": "email", "providers": ["email"]}', '{"name": "Jane Smith"}', false, '2025-09-16 13:20:11.884044+00', '2025-09-16 13:20:11.884044+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', 'c658d0c4-037a-46ce-b671-1b0fb6990765', 'authenticated', 'authenticated', 'colin.rods+1@gmail.com', '$2a$10$GffU5wyPA8CFxPUT6NJsM.dGCA7baRX/1A6ZKdOqbiSSHnzF6vm9u', '2025-09-18 08:56:12.710522+00', NULL, '', '2025-09-18 08:55:10.048146+00', '', NULL, '', '', NULL, '2025-09-18 08:56:25.610031+00', '{"provider": "email", "providers": ["email"]}', '{"sub": "c658d0c4-037a-46ce-b671-1b0fb6990765", "email": "colin.rods+1@gmail.com", "email_verified": true, "phone_verified": false}', NULL, '2025-09-18 08:55:10.026047+00', '2025-09-18 20:15:00.481219+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', 'cfbe351e-f624-4fa5-a1b5-be583bf48b1a', 'authenticated', 'authenticated', 'colin.rods@gmail.com', '$2a$10$Je2sn8Q/fcFFvtldQmDluevO6CNDGOazr9nLEgLgNwVV/WHVcAN96', '2025-09-16 19:53:25.508552+00', NULL, '', '2025-09-16 19:53:04.413522+00', '', NULL, '', '', NULL, '2025-09-17 07:50:26.624771+00', '{"provider": "email", "providers": ["email"]}', '{"sub": "cfbe351e-f624-4fa5-a1b5-be583bf48b1a", "email": "colin.rods@gmail.com", "email_verified": true, "phone_verified": false}', NULL, '2025-09-16 19:53:04.398229+00', '2025-09-18 08:53:55.786196+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', '37b62424-5ddb-4b71-9981-6d2000ec7d86', 'authenticated', 'authenticated', 'colin.rods+2@gmail.com', '$2a$10$/klsRAYVMKZlRA6npady9OK3r1lzSiERhHqp/m1WNzDhqC4fb/Rb6', '2025-09-18 20:57:28.550878+00', NULL, '', '2025-09-18 20:56:31.836605+00', '', NULL, '', '', NULL, '2025-09-18 20:57:30.867979+00', '{"provider": "email", "providers": ["email"]}', '{"sub": "37b62424-5ddb-4b71-9981-6d2000ec7d86", "email": "colin.rods+2@gmail.com", "email_verified": true, "phone_verified": false}', NULL, '2025-09-18 20:56:31.824364+00', '2025-09-19 04:44:59.714195+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', '74098093-d07c-4801-823f-54987c40e3cf', 'authenticated', 'authenticated', 'colin.rods+3@gmail.com', '$2a$10$r7oHn4MbLPzSNMWxkqNtmuDqV5zz2J3OxiQ/4eG4yJtjEMKVTEWvy', '2025-09-19 05:00:57.596625+00', NULL, '', '2025-09-19 05:00:26.721343+00', '', NULL, '', '', NULL, '2025-09-19 05:00:59.620816+00', '{"provider": "email", "providers": ["email"]}', '{"sub": "74098093-d07c-4801-823f-54987c40e3cf", "email": "colin.rods+3@gmail.com", "email_verified": true, "phone_verified": false}', NULL, '2025-09-19 05:00:26.709231+00', '2025-09-19 10:41:41.37141+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false);


--
-- Data for Name: mfa_factors; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: mfa_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_clients; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: one_time_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."profiles" ("id", "email", "name", "notification_preferences", "onboarding_completed", "onboarding_step", "onboarding_skipped", "created_at", "updated_at") VALUES
	('5becc0fb-8a49-4e11-8b88-c1cd94d8b073', 'test@colinrodrigues.com', 'test', '{"quiet_hours": {"end": "07:00", "start": "22:00"}, "prompt_frequency": "every_3_days", "enabled_prompt_types": ["milestone", "activity", "fun"], "response_notifications": "immediate"}', false, 0, false, '2025-09-16 13:06:24.417771+00', '2025-09-16 13:06:24.417771+00'),
	('550e8400-e29b-41d4-a716-446655440001', 'colin@colinrodrigues.com', 'Colin Rodrigues', '{"quiet_hours": {"end": "07:00", "start": "22:00"}, "prompt_frequency": "every_3_days", "enabled_prompt_types": ["milestone", "activity", "fun"], "response_notifications": "immediate"}', false, 0, false, '2025-09-16 13:20:11.884044+00', '2025-09-16 13:20:11.884044+00'),
	('550e8400-e29b-41d4-a716-446655440002', 'jane@example.com', 'Jane Smith', '{"quiet_hours": {"end": "07:00", "start": "22:00"}, "prompt_frequency": "every_3_days", "enabled_prompt_types": ["milestone", "activity", "fun"], "response_notifications": "immediate"}', false, 0, false, '2025-09-16 13:20:11.884044+00', '2025-09-16 13:20:11.884044+00'),
	('cfbe351e-f624-4fa5-a1b5-be583bf48b1a', 'colin.rods@gmail.com', 'colin.rods', '{"quiet_hours": {"end": "07:00", "start": "22:00"}, "prompt_frequency": "every_3_days", "enabled_prompt_types": ["milestone", "activity", "fun"], "response_notifications": "immediate"}', false, 0, false, '2025-09-16 19:53:04.397875+00', '2025-09-16 19:53:04.397875+00'),
	('c658d0c4-037a-46ce-b671-1b0fb6990765', 'colin.rods+1@gmail.com', 'colin.rods+1', '{"quiet_hours": {"end": "07:00", "start": "22:00"}, "prompt_frequency": "every_3_days", "enabled_prompt_types": ["milestone", "activity", "fun"], "response_notifications": "immediate"}', false, 0, false, '2025-09-18 08:55:10.025679+00', '2025-09-18 08:55:10.025679+00'),
	('74098093-d07c-4801-823f-54987c40e3cf', 'colin.rods+3@gmail.com', 'colin.rods+3', '{"quiet_hours": {"end": "07:00", "start": "22:00"}, "prompt_frequency": "every_3_days", "enabled_prompt_types": ["milestone", "activity", "fun"], "response_notifications": "immediate"}', true, 6, false, '2025-09-19 05:00:26.708889+00', '2025-09-19 06:28:52.179412+00'),
	('37b62424-5ddb-4b71-9981-6d2000ec7d86', 'colin.rods+2@gmail.com', 'colin.rods+2', '{"quiet_hours": {"end": "07:00", "start": "22:00"}, "prompt_frequency": "every_3_days", "enabled_prompt_types": ["milestone", "activity", "fun"], "response_notifications": "immediate"}', true, 6, false, '2025-09-18 20:56:31.823989+00', '2025-09-19 04:59:48.779564+00');


--
-- Data for Name: children; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."children" ("id", "parent_id", "name", "birth_date", "profile_photo_url", "created_at", "updated_at") VALUES
	('550e8400-e29b-41d4-a716-446655441001', '550e8400-e29b-41d4-a716-446655440001', 'Emma Rodrigues', '2023-03-15', 'https://example.com/photos/emma.jpg', '2025-09-16 13:20:11.884044+00', '2025-09-16 13:20:11.884044+00'),
	('550e8400-e29b-41d4-a716-446655441002', '550e8400-e29b-41d4-a716-446655440001', 'Liam Rodrigues', '2021-08-22', 'https://example.com/photos/liam.jpg', '2025-09-16 13:20:11.884044+00', '2025-09-16 13:20:11.884044+00'),
	('550e8400-e29b-41d4-a716-446655441003', '550e8400-e29b-41d4-a716-446655440002', 'Oliver Smith', '2023-01-10', NULL, '2025-09-16 13:20:11.884044+00', '2025-09-16 13:20:11.884044+00'),
	('d920a214-5891-44ba-ac82-122e39fb3f4c', 'cfbe351e-f624-4fa5-a1b5-be583bf48b1a', 'CM', '2012-09-01', NULL, '2025-09-17 08:05:20.518767+00', '2025-09-17 09:01:47.999691+00'),
	('c75fd8f3-bab0-45ec-a636-d821c7ccb5ae', 'cfbe351e-f624-4fa5-a1b5-be583bf48b1a', 'TRE', '2025-09-08', NULL, '2025-09-17 09:03:58.449885+00', '2025-09-17 09:05:23.945549+00'),
	('3ed2fc5b-7152-440f-94d3-aac38f91a65f', 'cfbe351e-f624-4fa5-a1b5-be583bf48b1a', 'TY', '2025-01-15', NULL, '2025-09-17 09:22:07.65905+00', '2025-09-17 09:22:39.571227+00'),
	('88417807-dff4-4bee-9bd3-e62fbfee3a8b', 'c658d0c4-037a-46ce-b671-1b0fb6990765', 'Kid A', '2025-09-02', 'https://advbcfkisejskhskrmqw.supabase.co/storage/v1/object/sign/media/c658d0c4-037a-46ce-b671-1b0fb6990765/children/88417807-dff4-4bee-9bd3-e62fbfee3a8b/profile.jpg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9hZjE3YzAwMi02NjM1LTRhNjItODgzOC1kZjMxNmExODBhZGYiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJtZWRpYS9jNjU4ZDBjNC0wMzdhLTQ2Y2UtYjY3MS0xYjBmYjY5OTA3NjUvY2hpbGRyZW4vODg0MTc4MDctZGZmNC00YmVlLTliZDMtZTYyZmJmZWUzYThiL3Byb2ZpbGUuanBnIiwiaWF0IjoxNzU4MjE5OTI0LCJleHAiOjE3NTg4MjQ3MjR9.ib4WHAQSzYI2KXwfrfwCN0QmFQQL8gJe6NQH1THkJ3A', '2025-09-18 18:25:23.849192+00', '2025-09-18 18:25:24.446728+00');


--
-- Data for Name: ai_prompts; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."ai_prompts" ("id", "parent_id", "child_id", "prompt_type", "prompt_text", "prompt_data", "status", "sent_at", "acted_on_at", "created_at") VALUES
	('550e8400-e29b-41d4-a716-446655447001', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655441001', 'milestone', 'Emma is approaching her first birthday! Have you noticed any new words, walking improvements, or favorite activities lately?', '{"milestone": "first_birthday", "child_age_months": 9, "expected_developments": ["walking", "first_words", "object_permanence"]}', 'pending', NULL, NULL, '2025-09-16 13:20:11.884044+00'),
	('550e8400-e29b-41d4-a716-446655447002', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655441002', 'activity', 'It''s been a while since you shared updates about Liam! How is his reading progress? Any new favorite books?', '{"suggested_topics": ["reading", "school", "sibling_interaction"], "last_update_days_ago": 5}', 'sent', NULL, NULL, '2025-09-16 13:20:11.884044+00');


--
-- Data for Name: recipient_groups; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."recipient_groups" ("id", "parent_id", "name", "default_frequency", "default_channels", "is_default_group", "created_at", "updated_at") VALUES
	('12e95685-1abf-418a-a3d6-9dff00c415f6', '5becc0fb-8a49-4e11-8b88-c1cd94d8b073', 'Close Family', 'daily_digest', '{email}', true, '2025-09-16 13:06:24.417771+00', '2025-09-16 13:06:24.417771+00'),
	('351bf24b-cd9a-422c-9dd0-5a43c60ca18b', '5becc0fb-8a49-4e11-8b88-c1cd94d8b073', 'Extended Family', 'weekly_digest', '{email}', false, '2025-09-16 13:06:24.417771+00', '2025-09-16 13:06:24.417771+00'),
	('a33bd1f6-f085-4c41-b408-cf544d8f8068', '5becc0fb-8a49-4e11-8b88-c1cd94d8b073', 'Friends', 'weekly_digest', '{email}', false, '2025-09-16 13:06:24.417771+00', '2025-09-16 13:06:24.417771+00'),
	('62d85fc9-4b4b-4607-b204-5efc6643764f', '550e8400-e29b-41d4-a716-446655440001', 'Close Family', 'daily_digest', '{email}', true, '2025-09-16 13:20:11.884044+00', '2025-09-16 13:20:11.884044+00'),
	('893d4b35-4936-4570-a46e-d2cec1665c45', '550e8400-e29b-41d4-a716-446655440001', 'Extended Family', 'weekly_digest', '{email}', false, '2025-09-16 13:20:11.884044+00', '2025-09-16 13:20:11.884044+00'),
	('f409a25f-5cfd-48ec-9ab0-2937b4b27931', '550e8400-e29b-41d4-a716-446655440001', 'Friends', 'weekly_digest', '{email}', false, '2025-09-16 13:20:11.884044+00', '2025-09-16 13:20:11.884044+00'),
	('f8e3e0c0-0a24-4f59-94f4-508f9b392a0a', '550e8400-e29b-41d4-a716-446655440002', 'Close Family', 'daily_digest', '{email}', true, '2025-09-16 13:20:11.884044+00', '2025-09-16 13:20:11.884044+00'),
	('1422a9cf-9d94-449f-a1c2-2d8cb3a6eab5', '550e8400-e29b-41d4-a716-446655440002', 'Extended Family', 'weekly_digest', '{email}', false, '2025-09-16 13:20:11.884044+00', '2025-09-16 13:20:11.884044+00'),
	('5b2efc1e-43aa-4dd2-af62-7849814cbc6f', '550e8400-e29b-41d4-a716-446655440002', 'Friends', 'weekly_digest', '{email}', false, '2025-09-16 13:20:11.884044+00', '2025-09-16 13:20:11.884044+00'),
	('550e8400-e29b-41d4-a716-446655442001', '550e8400-e29b-41d4-a716-446655440001', 'Daily Updates', 'every_update', '{email,sms}', false, '2025-09-16 13:20:11.884044+00', '2025-09-16 13:20:11.884044+00'),
	('550e8400-e29b-41d4-a716-446655442002', '550e8400-e29b-41d4-a716-446655440001', 'Milestone Only', 'milestones_only', '{email}', false, '2025-09-16 13:20:11.884044+00', '2025-09-16 13:20:11.884044+00'),
	('c07a6e12-b3c7-4078-a0eb-100da0d2c326', 'cfbe351e-f624-4fa5-a1b5-be583bf48b1a', 'Close Family', 'daily_digest', '{email}', true, '2025-09-16 19:53:04.397875+00', '2025-09-16 19:53:04.397875+00'),
	('3f72be01-7886-46df-b852-5d63b26fb26a', 'cfbe351e-f624-4fa5-a1b5-be583bf48b1a', 'Extended Family', 'weekly_digest', '{email}', false, '2025-09-16 19:53:04.397875+00', '2025-09-16 19:53:04.397875+00'),
	('cb16af9f-8986-433f-9632-5218e945ae4e', 'cfbe351e-f624-4fa5-a1b5-be583bf48b1a', 'Friends', 'weekly_digest', '{email}', false, '2025-09-16 19:53:04.397875+00', '2025-09-16 19:53:04.397875+00'),
	('3fc6e5dd-62a4-458c-a8f0-1597444ce706', 'c658d0c4-037a-46ce-b671-1b0fb6990765', 'Close Family', 'daily_digest', '{email}', true, '2025-09-18 08:55:10.025679+00', '2025-09-18 08:55:10.025679+00'),
	('33a981d5-538a-40dd-aed7-6e122da11403', 'c658d0c4-037a-46ce-b671-1b0fb6990765', 'Extended Family', 'weekly_digest', '{email}', false, '2025-09-18 08:55:10.025679+00', '2025-09-18 08:55:10.025679+00'),
	('a9c82195-726c-4129-8762-54d5cddf0624', 'c658d0c4-037a-46ce-b671-1b0fb6990765', 'Test group', 'milestones_only', '{email,sms,whatsapp}', false, '2025-09-18 09:03:14.523322+00', '2025-09-18 09:03:14.523322+00'),
	('c9778220-bf8d-4bfb-9986-1703a990c286', 'c658d0c4-037a-46ce-b671-1b0fb6990765', 'Test Group 2', 'every_update', '{email,whatsapp}', false, '2025-09-18 09:21:08.133832+00', '2025-09-18 09:21:08.133832+00'),
	('43d1d59f-bf0a-4671-a937-ce384dbe9922', 'c658d0c4-037a-46ce-b671-1b0fb6990765', 'Friends', 'daily_digest', '{email,sms}', false, '2025-09-18 08:55:10.025679+00', '2025-09-18 10:06:07.659054+00'),
	('c3acf140-a81f-4351-a54c-ffe4f4403918', '37b62424-5ddb-4b71-9981-6d2000ec7d86', 'Close Family', 'daily_digest', '{email}', true, '2025-09-18 20:56:31.823989+00', '2025-09-18 20:56:31.823989+00'),
	('9c8bb179-ffb5-45bd-aa04-a9c85bd21722', '37b62424-5ddb-4b71-9981-6d2000ec7d86', 'Extended Family', 'weekly_digest', '{email}', false, '2025-09-18 20:56:31.823989+00', '2025-09-18 20:56:31.823989+00'),
	('6f4aceef-3103-4c4e-84c5-515ccc254135', '37b62424-5ddb-4b71-9981-6d2000ec7d86', 'Friends', 'weekly_digest', '{email}', false, '2025-09-18 20:56:31.823989+00', '2025-09-18 20:56:31.823989+00'),
	('4cc561c6-a618-41ca-9303-890d1217286a', '74098093-d07c-4801-823f-54987c40e3cf', 'Close Family', 'daily_digest', '{email}', true, '2025-09-19 05:00:26.708889+00', '2025-09-19 05:00:26.708889+00'),
	('6f9ed0f8-443b-4064-9943-77c7ef0f46ac', '74098093-d07c-4801-823f-54987c40e3cf', 'Extended Family', 'weekly_digest', '{email}', false, '2025-09-19 05:00:26.708889+00', '2025-09-19 05:00:26.708889+00'),
	('a9ad3899-1a34-4547-8b36-96d86063bb35', '74098093-d07c-4801-823f-54987c40e3cf', 'Friends', 'weekly_digest', '{email}', false, '2025-09-19 05:00:26.708889+00', '2025-09-19 05:00:26.708889+00');


--
-- Data for Name: recipients; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."recipients" ("id", "parent_id", "email", "phone", "name", "relationship", "group_id", "frequency", "preferred_channels", "content_types", "overrides_group_default", "preference_token", "is_active", "created_at", "updated_at") VALUES
	('550e8400-e29b-41d4-a716-446655443001', '550e8400-e29b-41d4-a716-446655440001', 'grandma.mary@email.com', '+1234567890', 'Grandma Mary', 'grandparent', '550e8400-e29b-41d4-a716-446655442001', 'daily_digest', '{email}', '{photos,text}', false, 'token_grandma_mary_001', true, '2025-09-16 13:20:11.884044+00', '2025-09-16 13:20:11.884044+00'),
	('550e8400-e29b-41d4-a716-446655443002', '550e8400-e29b-41d4-a716-446655440001', 'grandpa.john@email.com', '+1234567891', 'Grandpa John', 'grandparent', '550e8400-e29b-41d4-a716-446655442001', 'daily_digest', '{email,sms}', '{photos,text}', false, 'token_grandpa_john_002', true, '2025-09-16 13:20:11.884044+00', '2025-09-16 13:20:11.884044+00'),
	('550e8400-e29b-41d4-a716-446655443003', '550e8400-e29b-41d4-a716-446655440001', 'sarah.rodriguez@email.com', '+1234567892', 'Sarah Rodriguez', 'sibling', NULL, 'weekly_digest', '{email}', '{photos,text}', false, 'token_sarah_rodriguez_003', true, '2025-09-16 13:20:11.884044+00', '2025-09-16 13:20:11.884044+00'),
	('550e8400-e29b-41d4-a716-446655443004', '550e8400-e29b-41d4-a716-446655440001', 'best.friend@email.com', NULL, 'Best Friend Amy', 'friend', '550e8400-e29b-41d4-a716-446655442002', 'milestones_only', '{email}', '{photos,text}', false, 'token_best_friend_amy_004', true, '2025-09-16 13:20:11.884044+00', '2025-09-16 13:20:11.884044+00'),
	('550e8400-e29b-41d4-a716-446655443005', '550e8400-e29b-41d4-a716-446655440001', 'colleague@work.com', NULL, 'Work Colleague Mike', 'colleague', NULL, 'weekly_digest', '{email}', '{photos,text}', false, 'token_work_colleague_005', true, '2025-09-16 13:20:11.884044+00', '2025-09-16 13:20:11.884044+00'),
	('550e8400-e29b-41d4-a716-446655443006', '550e8400-e29b-41d4-a716-446655440002', 'jane.mom@email.com', NULL, 'Mom', 'parent', NULL, 'every_update', '{email,sms}', '{photos,text}', false, 'token_jane_mom_006', true, '2025-09-16 13:20:11.884044+00', '2025-09-16 13:20:11.884044+00'),
	('7a1b7f77-4317-43aa-a952-619986c20b28', 'c658d0c4-037a-46ce-b671-1b0fb6990765', 'colin.rods@gmail.com', NULL, 'TD', 'friend', '43d1d59f-bf0a-4671-a937-ce384dbe9922', 'every_update', '{email}', '{photos}', true, '19f34b41-1dc7-4c1a-aab8-799789f948e5-mfp7v62o', true, '2025-09-18 09:36:51.215185+00', '2025-09-18 10:02:03.050701+00');


--
-- Data for Name: updates; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."updates" ("id", "parent_id", "child_id", "content", "media_urls", "milestone_type", "ai_analysis", "suggested_recipients", "confirmed_recipients", "distribution_status", "created_at", "updated_at", "scheduled_for", "sent_at") VALUES
	('550e8400-e29b-41d4-a716-446655444001', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655441001', 'Emma took her first steps today! So excited to share this milestone with everyone. She walked from the couch to her toy box - about 8 steps!', NULL, 'first_steps', '{"excitement_level": "high", "suggested_sharing": "immediate", "milestone_detected": true}', NULL, '{550e8400-e29b-41d4-a716-446655443001,550e8400-e29b-41d4-a716-446655443002,550e8400-e29b-41d4-a716-446655443003}', 'sent', '2025-09-16 13:20:11.884044+00', '2025-09-16 13:20:11.884044+00', NULL, NULL),
	('550e8400-e29b-41d4-a716-446655444002', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655441002', 'Liam is getting so good at reading! He read his entire bedtime story to Emma tonight. Such a proud big brother moment.', NULL, NULL, '{"activity_type": "reading", "sharing_priority": "medium", "sibling_interaction": true}', NULL, '{550e8400-e29b-41d4-a716-446655443001,550e8400-e29b-41d4-a716-446655443003}', 'sent', '2025-09-16 13:20:11.884044+00', '2025-09-16 13:20:11.884044+00', NULL, NULL),
	('550e8400-e29b-41d4-a716-446655444003', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655441001', 'Emma is experimenting with solid foods. Today she tried mashed sweet potato - messy but she loved it!', NULL, NULL, '{"enjoyment": "positive", "mess_level": "high", "activity_type": "feeding"}', NULL, '{550e8400-e29b-41d4-a716-446655443001,550e8400-e29b-41d4-a716-446655443002}', 'draft', '2025-09-16 13:20:11.884044+00', '2025-09-16 13:20:11.884044+00', NULL, NULL),
	('550e8400-e29b-41d4-a716-446655444004', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655441002', 'Liam built the most amazing castle out of blocks today. Engineering in the making!', NULL, NULL, '{"activity_type": "creative_play", "skill_development": "engineering", "sharing_suggestion": "friends_and_family"}', '{550e8400-e29b-41d4-a716-446655443001,550e8400-e29b-41d4-a716-446655443002,550e8400-e29b-41d4-a716-446655443003,550e8400-e29b-41d4-a716-446655443005}', NULL, 'draft', '2025-09-16 13:20:11.884044+00', '2025-09-16 13:20:11.884044+00', NULL, NULL),
	('06f9573f-8f6d-4f1a-90e2-9e13a37df7c5', 'c658d0c4-037a-46ce-b671-1b0fb6990765', '88417807-dff4-4bee-9bd3-e62fbfee3a8b', 'big news. first step. lost dog.', '{}', NULL, '{"keywords": ["first step", "lost dog", "big news"], "media_urls": ["https://advbcfkisejskhskrmqw.supabase.co/storage/v1/object/sign/media/c658d0c4-037a-46ce-b671-1b0fb6990765/updates/06f9573f-8f6d-4f1a-90e2-9e13a37df7c5/1.jpg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9hZjE3YzAwMi02NjM1LTRhNjItODgzOC1kZjMxNmExODBhZGYiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJtZWRpYS9jNjU4ZDBjNC0wMzdhLTQ2Y2UtYjY3MS0xYjBmYjY5OTA3NjUvdXBkYXRlcy8wNmY5NTczZi04ZjZkLTRmMWEtOTBlMi05ZTEzYTM3ZGY3YzUvMS5qcGciLCJpYXQiOjE3NTgyMjA5MDAsImV4cCI6MTc2MDgxMjkwMH0.tUBpYE2EnnqkUjgfwea32r5w9r7VHUiOl_gKjU-aqDc", "https://advbcfkisejskhskrmqw.supabase.co/storage/v1/object/sign/media/c658d0c4-037a-46ce-b671-1b0fb6990765/updates/06f9573f-8f6d-4f1a-90e2-9e13a37df7c5/2.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9hZjE3YzAwMi02NjM1LTRhNjItODgzOC1kZjMxNmExODBhZGYiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJtZWRpYS9jNjU4ZDBjNC0wMzdhLTQ2Y2UtYjY3MS0xYjBmYjY5OTA3NjUvdXBkYXRlcy8wNmY5NTczZi04ZjZkLTRmMWEtOTBlMi05ZTEzYTM3ZGY3YzUvMi5wbmciLCJpYXQiOjE3NTgyMjA5MDAsImV4cCI6MTc2MDgxMjkwMH0.3TO0z33pCF08bNajmBPNKOMgL-Wu282xhDeLSUfFrew", "https://advbcfkisejskhskrmqw.supabase.co/storage/v1/object/sign/media/c658d0c4-037a-46ce-b671-1b0fb6990765/updates/06f9573f-8f6d-4f1a-90e2-9e13a37df7c5/3.jpg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9hZjE3YzAwMi02NjM1LTRhNjItODgzOC1kZjMxNmExODBhZGYiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJtZWRpYS9jNjU4ZDBjNC0wMzdhLTQ2Y2UtYjY3MS0xYjBmYjY5OTA3NjUvdXBkYXRlcy8wNmY5NTczZi04ZjZkLTRmMWEtOTBlMi05ZTEzYTM3ZGY3YzUvMy5qcGciLCJpYXQiOjE3NTgyMjA5MDAsImV4cCI6MTc2MDgxMjkwMH0._-4G01_iTrS3a6d3g_AkIRF7cDjiSwjB6-krA5yoDro"], "emotional_tone": "excited", "confidence_score": 0.9, "importance_level": 5, "suggested_recipients": [], "suggested_recipient_types": ["friends"]}', '{7a1b7f77-4317-43aa-a952-619986c20b28}', '{7a1b7f77-4317-43aa-a952-619986c20b28}', 'draft', '2025-09-18 18:41:39.629349+00', '2025-09-18 18:41:40.981113+00', NULL, NULL),
	('07fda0cc-bf1f-4d12-9695-21cd1aaf52c6', 'c658d0c4-037a-46ce-b671-1b0fb6990765', '88417807-dff4-4bee-9bd3-e62fbfee3a8b', 'big news. first step. lost dog.', '{}', NULL, '{"keywords": ["first step", "lost dog", "big news"], "media_urls": ["https://advbcfkisejskhskrmqw.supabase.co/storage/v1/object/sign/media/c658d0c4-037a-46ce-b671-1b0fb6990765/updates/07fda0cc-bf1f-4d12-9695-21cd1aaf52c6/1.jpg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9hZjE3YzAwMi02NjM1LTRhNjItODgzOC1kZjMxNmExODBhZGYiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJtZWRpYS9jNjU4ZDBjNC0wMzdhLTQ2Y2UtYjY3MS0xYjBmYjY5OTA3NjUvdXBkYXRlcy8wN2ZkYTBjYy1iZjFmLTRkMTItOTY5NS0yMWNkMWFhZjUyYzYvMS5qcGciLCJpYXQiOjE3NTgyMjA5NTQsImV4cCI6MTc2MDgxMjk1NH0.WH7GcsIlpGSQmK7xW7sVeVA8GiE5l5mvs-eucOpcyBY", "https://advbcfkisejskhskrmqw.supabase.co/storage/v1/object/sign/media/c658d0c4-037a-46ce-b671-1b0fb6990765/updates/07fda0cc-bf1f-4d12-9695-21cd1aaf52c6/2.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9hZjE3YzAwMi02NjM1LTRhNjItODgzOC1kZjMxNmExODBhZGYiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJtZWRpYS9jNjU4ZDBjNC0wMzdhLTQ2Y2UtYjY3MS0xYjBmYjY5OTA3NjUvdXBkYXRlcy8wN2ZkYTBjYy1iZjFmLTRkMTItOTY5NS0yMWNkMWFhZjUyYzYvMi5wbmciLCJpYXQiOjE3NTgyMjA5NTQsImV4cCI6MTc2MDgxMjk1NH0.XMUFm_o8fgC7G78HtVIsImLhlyBmyf9Nm69lg9ho6HI", "https://advbcfkisejskhskrmqw.supabase.co/storage/v1/object/sign/media/c658d0c4-037a-46ce-b671-1b0fb6990765/updates/07fda0cc-bf1f-4d12-9695-21cd1aaf52c6/3.jpg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9hZjE3YzAwMi02NjM1LTRhNjItODgzOC1kZjMxNmExODBhZGYiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJtZWRpYS9jNjU4ZDBjNC0wMzdhLTQ2Y2UtYjY3MS0xYjBmYjY5OTA3NjUvdXBkYXRlcy8wN2ZkYTBjYy1iZjFmLTRkMTItOTY5NS0yMWNkMWFhZjUyYzYvMy5qcGciLCJpYXQiOjE3NTgyMjA5NTUsImV4cCI6MTc2MDgxMjk1NX0.QIP-2Yf_lRbmOQdRveZLQmHGgI-6ksDFBZ-ALgLxF5I"], "emotional_tone": "excited", "confidence_score": 0.9, "importance_level": 5, "suggested_recipients": [], "suggested_recipient_types": ["friends"]}', '{7a1b7f77-4317-43aa-a952-619986c20b28}', '{7a1b7f77-4317-43aa-a952-619986c20b28}', 'draft', '2025-09-18 18:42:33.875118+00', '2025-09-18 18:42:35.275454+00', NULL, NULL),
	('4b16b84e-cba4-4d50-9f86-7f3a2cfc8be4', 'c658d0c4-037a-46ce-b671-1b0fb6990765', '88417807-dff4-4bee-9bd3-e62fbfee3a8b', 'flew a dromne and threw up', '{}', NULL, '{"keywords": ["drone", "threw up", "funny"], "media_urls": ["https://advbcfkisejskhskrmqw.supabase.co/storage/v1/object/sign/media/c658d0c4-037a-46ce-b671-1b0fb6990765/updates/4b16b84e-cba4-4d50-9f86-7f3a2cfc8be4/1.jpg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9hZjE3YzAwMi02NjM1LTRhNjItODgzOC1kZjMxNmExODBhZGYiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJtZWRpYS9jNjU4ZDBjNC0wMzdhLTQ2Y2UtYjY3MS0xYjBmYjY5OTA3NjUvdXBkYXRlcy80YjE2Yjg0ZS1jYmE0LTRkNTAtOWY4Ni03ZjNhMmNmYzhiZTQvMS5qcGciLCJpYXQiOjE3NTgyMjE4MTMsImV4cCI6MTc2MDgxMzgxM30.T3IdXGiVaK-hiwt5JIPlNGT9lmuT2Y_Cl0D2B-hdNys"], "emotional_tone": "funny", "confidence_score": 0.9, "importance_level": 2, "suggested_recipients": [], "suggested_recipient_types": ["friends"]}', '{7a1b7f77-4317-43aa-a952-619986c20b28}', '{7a1b7f77-4317-43aa-a952-619986c20b28}', 'draft', '2025-09-18 18:56:52.250638+00', '2025-09-18 18:56:53.563707+00', NULL, NULL),
	('4e717d28-52d2-4e09-b742-0bd3e4c390f4', 'c658d0c4-037a-46ce-b671-1b0fb6990765', '88417807-dff4-4bee-9bd3-e62fbfee3a8b', 'flew a dromne and threw up', '{}', NULL, '{"keywords": ["drone", "threw up", "funny"], "media_urls": ["https://advbcfkisejskhskrmqw.supabase.co/storage/v1/object/sign/media/c658d0c4-037a-46ce-b671-1b0fb6990765/updates/4e717d28-52d2-4e09-b742-0bd3e4c390f4/1.jpg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9hZjE3YzAwMi02NjM1LTRhNjItODgzOC1kZjMxNmExODBhZGYiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJtZWRpYS9jNjU4ZDBjNC0wMzdhLTQ2Y2UtYjY3MS0xYjBmYjY5OTA3NjUvdXBkYXRlcy80ZTcxN2QyOC01MmQyLTRlMDktYjc0Mi0wYmQzZTRjMzkwZjQvMS5qcGciLCJpYXQiOjE3NTgyMjE4MjEsImV4cCI6MTc2MDgxMzgyMX0.g-UNaGw8-SJ9Hjs_bsxDU_d2SrCTYN_VwL_gwPi3afw"], "emotional_tone": "funny", "confidence_score": 0.9, "importance_level": 2, "suggested_recipients": [], "suggested_recipient_types": ["friends"]}', '{7a1b7f77-4317-43aa-a952-619986c20b28}', '{7a1b7f77-4317-43aa-a952-619986c20b28}', 'draft', '2025-09-18 18:57:00.481163+00', '2025-09-18 18:57:01.776531+00', NULL, NULL),
	('e57e4f04-5b04-4cc4-9194-35a2c7502362', 'c658d0c4-037a-46ce-b671-1b0fb6990765', '88417807-dff4-4bee-9bd3-e62fbfee3a8b', 'Learned to swim', '{https://advbcfkisejskhskrmqw.supabase.co/storage/v1/object/sign/media/c658d0c4-037a-46ce-b671-1b0fb6990765/updates/e57e4f04-5b04-4cc4-9194-35a2c7502362/1.jpg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9hZjE3YzAwMi02NjM1LTRhNjItODgzOC1kZjMxNmExODBhZGYiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJtZWRpYS9jNjU4ZDBjNC0wMzdhLTQ2Y2UtYjY3MS0xYjBmYjY5OTA3NjUvdXBkYXRlcy9lNTdlNGYwNC01YjA0LTRjYzQtOTE5NC0zNWEyYzc1MDIzNjIvMS5qcGciLCJpYXQiOjE3NTgyMjI4NzMsImV4cCI6MTc2MDgxNDg3M30.63EWj6HfqqjZAW-NR6Mv3ZWpwEW9L3gV_vh7cIj6Q9M}', 'first_steps', '{"keywords": ["swimming", "milestone", "first_steps"], "emotional_tone": "milestone", "confidence_score": 0.9, "importance_level": 10, "suggested_recipients": [], "suggested_recipient_types": ["grandparent", "close_family"]}', '{7a1b7f77-4317-43aa-a952-619986c20b28}', '{7a1b7f77-4317-43aa-a952-619986c20b28}', 'draft', '2025-09-18 19:14:32.14563+00', '2025-09-18 19:14:33.48959+00', NULL, NULL),
	('421c157f-f4b6-435c-9317-36fa20a22270', 'c658d0c4-037a-46ce-b671-1b0fb6990765', '88417807-dff4-4bee-9bd3-e62fbfee3a8b', 'Learned to swim', '{https://advbcfkisejskhskrmqw.supabase.co/storage/v1/object/sign/media/c658d0c4-037a-46ce-b671-1b0fb6990765/updates/421c157f-f4b6-435c-9317-36fa20a22270/1.jpg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9hZjE3YzAwMi02NjM1LTRhNjItODgzOC1kZjMxNmExODBhZGYiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJtZWRpYS9jNjU4ZDBjNC0wMzdhLTQ2Y2UtYjY3MS0xYjBmYjY5OTA3NjUvdXBkYXRlcy80MjFjMTU3Zi1mNGI2LTQzNWMtOTMxNy0zNmZhMjBhMjIyNzAvMS5qcGciLCJpYXQiOjE3NTgyMjI4NzgsImV4cCI6MTc2MDgxNDg3OH0.ZqpF8W8OsKQxbozaVTpmKHt8EMf9ZFWCJdYEEyirsOI}', 'first_steps', '{"keywords": ["swimming", "milestone", "first_steps"], "emotional_tone": "milestone", "confidence_score": 0.9, "importance_level": 10, "suggested_recipients": [], "suggested_recipient_types": ["grandparent", "close_family"]}', '{7a1b7f77-4317-43aa-a952-619986c20b28}', '{7a1b7f77-4317-43aa-a952-619986c20b28}', 'draft', '2025-09-18 19:14:37.891057+00', '2025-09-18 19:14:38.742216+00', NULL, NULL);


--
-- Data for Name: delivery_jobs; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."delivery_jobs" ("id", "update_id", "recipient_id", "channel", "status", "external_id", "error_message", "queued_at", "sent_at", "delivered_at") VALUES
	('550e8400-e29b-41d4-a716-446655445001', '550e8400-e29b-41d4-a716-446655444001', '550e8400-e29b-41d4-a716-446655443001', 'email', 'delivered', NULL, NULL, '2025-09-16 13:20:11.884044+00', '2025-09-16 11:20:11.884044+00', NULL),
	('550e8400-e29b-41d4-a716-446655445002', '550e8400-e29b-41d4-a716-446655444001', '550e8400-e29b-41d4-a716-446655443002', 'email', 'delivered', NULL, NULL, '2025-09-16 13:20:11.884044+00', '2025-09-16 11:20:11.884044+00', NULL),
	('550e8400-e29b-41d4-a716-446655445003', '550e8400-e29b-41d4-a716-446655444001', '550e8400-e29b-41d4-a716-446655443002', 'sms', 'sent', NULL, NULL, '2025-09-16 13:20:11.884044+00', '2025-09-16 11:20:11.884044+00', NULL);


--
-- Data for Name: responses; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."responses" ("id", "update_id", "recipient_id", "channel", "external_id", "content", "media_urls", "parent_notified", "received_at") VALUES
	('550e8400-e29b-41d4-a716-446655446001', '550e8400-e29b-41d4-a716-446655444001', '550e8400-e29b-41d4-a716-446655443001', 'email', NULL, 'Oh my goodness! I can''t believe she''s walking already! Give her a big hug from Grandma! ❤️', NULL, true, '2025-09-16 13:20:11.884044+00'),
	('550e8400-e29b-41d4-a716-446655446002', '550e8400-e29b-41d4-a716-446655444001', '550e8400-e29b-41d4-a716-446655443002', 'sms', NULL, 'That''s my girl! Can''t wait to see her walk to me next visit 👴👶', NULL, false, '2025-09-16 13:20:11.884044+00');


--
-- Data for Name: buckets_analytics; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: prefixes; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

INSERT INTO "storage"."prefixes" ("bucket_id", "name", "created_at", "updated_at") VALUES
	('media', 'cfbe351e-f624-4fa5-a1b5-be583bf48b1a', '2025-09-17 07:51:21.480095+00', '2025-09-17 07:51:21.480095+00'),
	('media', 'cfbe351e-f624-4fa5-a1b5-be583bf48b1a/children', '2025-09-17 07:51:21.480095+00', '2025-09-17 07:51:21.480095+00'),
	('media', 'cfbe351e-f624-4fa5-a1b5-be583bf48b1a/children/0725554e-7d2f-4d97-ae6f-1ca694474ecd', '2025-09-17 07:51:21.480095+00', '2025-09-17 07:51:21.480095+00'),
	('media', 'cfbe351e-f624-4fa5-a1b5-be583bf48b1a/children/d920a214-5891-44ba-ac82-122e39fb3f4c', '2025-09-17 08:05:20.930476+00', '2025-09-17 08:05:20.930476+00'),
	('media', 'cfbe351e-f624-4fa5-a1b5-be583bf48b1a/children/c75fd8f3-bab0-45ec-a636-d821c7ccb5ae', '2025-09-17 09:03:59.003083+00', '2025-09-17 09:03:59.003083+00'),
	('media', 'c658d0c4-037a-46ce-b671-1b0fb6990765', '2025-09-18 18:25:24.217686+00', '2025-09-18 18:25:24.217686+00'),
	('media', 'c658d0c4-037a-46ce-b671-1b0fb6990765/children', '2025-09-18 18:25:24.217686+00', '2025-09-18 18:25:24.217686+00'),
	('media', 'c658d0c4-037a-46ce-b671-1b0fb6990765/children/88417807-dff4-4bee-9bd3-e62fbfee3a8b', '2025-09-18 18:25:24.217686+00', '2025-09-18 18:25:24.217686+00'),
	('media', 'c658d0c4-037a-46ce-b671-1b0fb6990765/updates', '2025-09-18 18:41:40.387041+00', '2025-09-18 18:41:40.387041+00'),
	('media', 'c658d0c4-037a-46ce-b671-1b0fb6990765/updates/06f9573f-8f6d-4f1a-90e2-9e13a37df7c5', '2025-09-18 18:41:40.387041+00', '2025-09-18 18:41:40.387041+00'),
	('media', 'c658d0c4-037a-46ce-b671-1b0fb6990765/updates/07fda0cc-bf1f-4d12-9695-21cd1aaf52c6', '2025-09-18 18:42:34.468187+00', '2025-09-18 18:42:34.468187+00'),
	('media', 'c658d0c4-037a-46ce-b671-1b0fb6990765/updates/4b16b84e-cba4-4d50-9f86-7f3a2cfc8be4', '2025-09-18 18:56:53.130957+00', '2025-09-18 18:56:53.130957+00'),
	('media', 'c658d0c4-037a-46ce-b671-1b0fb6990765/updates/4e717d28-52d2-4e09-b742-0bd3e4c390f4', '2025-09-18 18:57:01.329492+00', '2025-09-18 18:57:01.329492+00'),
	('media', 'c658d0c4-037a-46ce-b671-1b0fb6990765/updates/e57e4f04-5b04-4cc4-9194-35a2c7502362', '2025-09-18 19:14:33.074412+00', '2025-09-18 19:14:33.074412+00'),
	('media', 'c658d0c4-037a-46ce-b671-1b0fb6990765/updates/421c157f-f4b6-435c-9317-36fa20a22270', '2025-09-18 19:14:38.450255+00', '2025-09-18 19:14:38.450255+00');


--
-- Data for Name: s3_multipart_uploads; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: s3_multipart_uploads_parts; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: auth; Owner: supabase_auth_admin
--

SELECT pg_catalog.setval('"auth"."refresh_tokens_id_seq"', 24, true);


--
-- PostgreSQL database dump complete
--

\unrestrict OfUYblhjCVikV3lUD64dbKrCQCpVw7I85FNBiWdeO8tvfd43KNfHiatWa2IjvE0

RESET ALL;
