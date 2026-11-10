


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "backup";


ALTER SCHEMA "backup" OWNER TO "postgres";


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "hypopg" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "index_advisor" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA "public";






CREATE TYPE "public"."profile_status" AS ENUM (
    'linked',
    'unlinked',
    'pending',
    'blocked',
    'other'
);


ALTER TYPE "public"."profile_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_client_codes"() RETURNS TABLE("user_id" "uuid", "client_code" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select c."userId", c."cliendCode"
    from public."ClientCode" c
   where public.is_super_admin()
      or exists (
           select 1
             from public.admin_users u
             join public.admin_roles r on r.role = u.role
            where u.user_id = auth.uid()
              and u.active
              and ('*' = any (r.menus) or 'users' = any (r.menus))
         );
$$;


ALTER FUNCTION "public"."admin_client_codes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_edit_financials"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select public.is_super_admin()
      or exists (
        select 1 from public.admin_users u
          join public.admin_roles r on r.role = u.role
         where u.user_id = auth.uid() and u.active
           and 'financial_statements' = any (r.menus)
      );
$$;


ALTER FUNCTION "public"."can_edit_financials"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."claim_next_financial_job"() RETURNS TABLE("id" bigint, "symbol" "text", "api_type" "text", "attempts" integer)
    LANGUAGE "plpgsql"
    AS $$
begin
  return query
  update public.symbol_financials t
  set status = 'in_progress', updated_at = now()
  where t.id = (
    select s.id
    from public.symbol_financials s
    where s.status = 'pending'
    order by s.id
    for update skip locked
    limit 1
  )
  returning t.id, t.symbol, t.api_type, t.attempts;
end;
$$;


ALTER FUNCTION "public"."claim_next_financial_job"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."financial_job_totals"() RETURNS TABLE("status" "text", "count" bigint)
    LANGUAGE "sql"
    AS $$
  select status, count(*) from public.symbol_financials group by status;
$$;


ALTER FUNCTION "public"."financial_job_totals"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_consolidated_context"("query_embedding" "public"."vector", "top_n" integer) RETURNS TABLE("symbol" "text", "period_year" integer, "period_end" "date", "quarter" "text", "field_key" "text", "label" "text", "unit" "text", "value" double precision, "description" "text", "source_table" "text")
    LANGUAGE "plpgsql" STABLE
    AS $$
BEGIN
    RETURN QUERY

    -- Income Quarterly
    SELECT 
        iq.symbol,
        iq.period_year,
        iq.period_end,
        iq.quarter,
        iq.field_key,
        iq.label,
        iq.unit,
        iq.value::double precision,
        iq.description,
        'income_quarterly_flattened' as source_table
    FROM income_quarterly_flattened iq
    ORDER BY iq.embedding <=> query_embedding
    LIMIT top_n;

    RETURN QUERY
    -- Income Annually
    SELECT 
        ia.symbol,
        ia.period_year,
        ia.period_end,
        NULL as quarter,
        ia.field_key,
        ia.label,
        ia.unit,
        ia.value::double precision,
        ia.description,
        'income_annually_flattened' as source_table
    FROM income_annually_flattened ia
    ORDER BY ia.embedding <=> query_embedding
    LIMIT top_n;

    RETURN QUERY
    -- Balance Quarterly
    SELECT 
        bq.symbol,
        bq.period_year,
        bq.period_end,
        bq.quarter,
        bq.field_key,
        bq.label,
        bq.unit,
        bq.value::double precision,
        bq.description,
        'balance_quarterly_flattened' as source_table
    FROM balance_quarterly_flattened bq
    ORDER BY bq.embedding <=> query_embedding
    LIMIT top_n;

    RETURN QUERY
    -- Balance Annually
    SELECT 
        ba.symbol,
        ba.period_year,
        ba.period_end,
        NULL as quarter,
        ba.field_key,
        ba.label,
        ba.unit,
        ba.value::double precision,
        ba.description,
        'balance_annually_flattened' as source_table
    FROM balance_annually_flattened ba
    ORDER BY ba.embedding <=> query_embedding
    LIMIT top_n;

    RETURN QUERY
    -- Fundamental
    SELECT 
        f.symbol,
        f.period_year,
        f.period_end,
        NULL as quarter,
        f.field_key,
        f.label,
        f.unit,
        f.value::double precision,
        f.description,
        'fundamental_flattened' as source_table
    FROM fundamental_flattened f
    ORDER BY f.embedding <=> query_embedding
    LIMIT top_n;

END;
$$;


ALTER FUNCTION "public"."get_consolidated_context"("query_embedding" "public"."vector", "top_n" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_access"() RETURNS json
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  r public.admin_users%rowtype;
  m text[];
begin
  if auth.uid() is null then
    return json_build_object('role', null, 'menus', '[]'::json, 'is_super', false);
  end if;
  if public.is_super_admin() then
    return json_build_object('role', 'super', 'menus', '["*"]'::json, 'is_super', true,
                             'email', auth.jwt() ->> 'email');
  end if;
  select * into r from public.admin_users where user_id = auth.uid() and active;
  if not found then
    return json_build_object('role', null, 'menus', '[]'::json, 'is_super', false);
  end if;
  select menus into m from public.admin_roles where role = r.role;
  return json_build_object('role', r.role, 'menus', to_json(coalesce(m, '{}'::text[])), 'is_super', false,
                           'email', r.email, 'full_name', r.full_name);
end;
$$;


ALTER FUNCTION "public"."get_my_access"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', NEW.email)  -- Use username from metadata or fallback to email
  );
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_client_code_taken"("p_code" "text") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1 from public."ClientCode"
    where "cliendCode" = p_code
      and "userId" <> auth.uid()
  );
$$;


ALTER FUNCTION "public"."is_client_code_taken"("p_code" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_iel_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
  select coalesce(
    lower(auth.jwt() ->> 'email') = any (array['iel@admin.com']),
    false
  );
$$;


ALTER FUNCTION "public"."is_iel_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_super_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select coalesce(lower(auth.jwt() ->> 'email') = any (array['tanveer@iel.net.pk']), false)
      or exists (
        select 1 from public.admin_users u
         where u.user_id = auth.uid() and u.active and u.role = 'super'
      );
$$;


ALTER FUNCTION "public"."is_super_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_financial_job_done"("p_id" bigint, "p_payload" "jsonb") RETURNS "void"
    LANGUAGE "sql"
    AS $$
  update public.symbol_financials
  set payload = p_payload,
      status = 'done',
      fetched_at = now(),
      updated_at = now(),
      attempts = attempts + 1,
      error_message = null
  where id = p_id;
$$;


ALTER FUNCTION "public"."mark_financial_job_done"("p_id" bigint, "p_payload" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_financial_job_failed"("p_id" bigint, "p_attempts" integer, "p_message" "text", "p_max_attempts" integer DEFAULT 3) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
begin
  update public.symbol_financials
  set status = case when p_attempts + 1 >= p_max_attempts then 'error' else 'pending' end,
      attempts = p_attempts + 1,
      error_message = left(p_message, 2000),
      updated_at = now()
  where id = p_id;
end;
$$;


ALTER FUNCTION "public"."mark_financial_job_failed"("p_id" bigint, "p_attempts" integer, "p_message" "text", "p_max_attempts" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."match_embedding"("query" "public"."vector", "limit_count" integer DEFAULT 10) RETURNS TABLE("result_id" bigint, "table_name" "text", "symbol" "text", "field_key" "text", "label" "text", "value" "text", "description" "text", "similarity" double precision)
    LANGUAGE "plpgsql"
    AS $$
begin
  return query
  select *
  from (
    select 
      t.id as result_id,
      'income_quarterly_flattened' as table_name,
      t.symbol,
      t.field_key,
      t.label,
      t.value::text,  -- ✅ cast numeric to text
      null as description,
      1 - (t.embedding <=> query) as similarity
    from income_quarterly_flattened t
    where t.embedding is not null

    union all

    select 
      t.id as result_id,
      'income_annually_flattened' as table_name,
      t.symbol,
      t.field_key,
      t.label,
      t.value::text,  -- ✅ cast numeric to text
      null as description,
      1 - (t.embedding <=> query) as similarity
    from income_annually_flattened t
    where t.embedding is not null

    union all

    select 
      t.id as result_id,
      'balance_quarterly_flattened' as table_name,
      t.symbol,
      t.field_key,
      t.label,
      t.value::text,  -- ✅ cast numeric to text
      null as description,
      1 - (t.embedding <=> query) as similarity
    from balance_quarterly_flattened t
    where t.embedding is not null

    union all

    select 
      t.id as result_id,
      'balance_annually_flattened' as table_name,
      t.symbol,
      t.field_key,
      t.label,
      t.value::text,  -- ✅ cast numeric to text
      null as description,
      1 - (t.embedding <=> query) as similarity
    from balance_annually_flattened t
    where t.embedding is not null

    union all

    select 
      t.id as result_id,
      'fundamental_flattened' as table_name,
      t.symbol,
      t.field_key,
      t.label,
      t.value::text,  -- ✅ cast numeric to text
      t.description,
      1 - (t.embedding <=> query) as similarity
    from fundamental_flattened t
    where t.embedding is not null
  ) as all_results
  order by similarity desc
  limit limit_count;
end;
$$;


ALTER FUNCTION "public"."match_embedding"("query" "public"."vector", "limit_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."match_financials"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) RETURNS TABLE("id" bigint, "symbol" "text", "year" "text", "content" "text", "similarity" double precision)
    LANGUAGE "plpgsql"
    AS $$
begin
  return query
  select
    id,
    symbol,
    year,
    content,
    1 - (financial_embeddings.embedding <=> query_embedding) as similarity
  from financial_embeddings
  where 1 - (financial_embeddings.embedding <=> query_embedding) > match_threshold
  order by financial_embeddings.embedding <=> query_embedding
  limit match_count;
end;
$$;


ALTER FUNCTION "public"."match_financials"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mock_get_account"() RETURNS "jsonb"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select jsonb_build_object(
    'cash', coalesce((select cash from mock_accounts where user_id = auth.uid()), 1000000),
    'positions', coalesce((select jsonb_agg(to_jsonb(p) order by p.symbol) from mock_positions p where p.user_id = auth.uid() and p.quantity > 0), '[]'::jsonb),
    'orders', coalesce((select jsonb_agg(to_jsonb(o) order by o.created_at desc) from mock_orders o where o.user_id = auth.uid()), '[]'::jsonb)
  )
$$;


ALTER FUNCTION "public"."mock_get_account"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mock_place_order"("p_symbol" "text", "p_name" "text", "p_side" "text", "p_quantity" integer, "p_price" numeric) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare v_cash numeric; v_position public.mock_positions; v_fee numeric; v_gross numeric;
begin
  if auth.uid() is null then raise exception 'Authentication is required'; end if;
  if p_side not in ('BUY','SELL') or p_quantity < 1 or p_price <= 0 then raise exception 'Invalid order'; end if;
  select cash into v_cash from mock_accounts where user_id = auth.uid() for update;
  if not found then raise exception 'Start a practice account before placing an order'; end if;
  v_gross := p_quantity * p_price; v_fee := greatest(v_gross * .0015, 25);
  select * into v_position from mock_positions where user_id = auth.uid() and symbol = upper(p_symbol) for update;
  if p_side = 'BUY' then
    if v_cash < v_gross + v_fee then raise exception 'Not enough virtual cash'; end if;
    update mock_accounts set cash = cash - v_gross - v_fee, updated_at = now() where user_id = auth.uid();
    insert into mock_positions (user_id,symbol,name,quantity,average_price) values (auth.uid(),upper(p_symbol),p_name,p_quantity,p_price)
    on conflict (user_id,symbol) do update set quantity = mock_positions.quantity + excluded.quantity, average_price = ((mock_positions.quantity * mock_positions.average_price) + (excluded.quantity * excluded.average_price)) / (mock_positions.quantity + excluded.quantity);
  else
    if not found or v_position.quantity < p_quantity then raise exception 'You do not hold that many virtual shares'; end if;
    update mock_accounts set cash = cash + v_gross - v_fee, updated_at = now() where user_id = auth.uid();
    update mock_positions set quantity = quantity - p_quantity where user_id = auth.uid() and symbol = upper(p_symbol);
  end if;
  insert into mock_orders (user_id,symbol,name,side,quantity,price,fee,total) values (auth.uid(),upper(p_symbol),p_name,p_side,p_quantity,p_price,v_fee,case when p_side = 'BUY' then v_gross + v_fee else v_gross - v_fee end);
end $$;


ALTER FUNCTION "public"."mock_place_order"("p_symbol" "text", "p_name" "text", "p_side" "text", "p_quantity" integer, "p_price" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mock_reset_account"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if auth.uid() is null then raise exception 'Authentication is required'; end if;
  update mock_accounts set cash = 1000000, updated_at = now() where user_id = auth.uid();
  delete from mock_positions where user_id = auth.uid();
  delete from mock_orders where user_id = auth.uid();
end $$;


ALTER FUNCTION "public"."mock_reset_account"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."mock_accounts" (
    "user_id" "uuid" NOT NULL,
    "display_name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "cash" numeric(16,2) DEFAULT 1000000 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "mock_accounts_cash_check" CHECK (("cash" >= (0)::numeric))
);


ALTER TABLE "public"."mock_accounts" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mock_start_account"("p_name" "text", "p_email" "text") RETURNS "public"."mock_accounts"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
declare account public.mock_accounts;
begin
  if auth.uid() is null then raise exception 'Authentication is required'; end if;
  if coalesce(trim(p_name), '') = '' or p_email !~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$' then
    raise exception 'A name and valid email are required';
  end if;
  insert into public.mock_accounts (user_id, display_name, email, cash)
  values (auth.uid(), trim(p_name), lower(trim(p_email)), 1000000)
  on conflict (user_id) do update set display_name = excluded.display_name, email = excluded.email, updated_at = now()
  returning * into account;
  return account;
end $_$;


ALTER FUNCTION "public"."mock_start_account"("p_name" "text", "p_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_transactional_email"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'vault', 'pg_temp'
    AS $$BEGIN
  PERFORM net.http_post(
    url := 'https://bfxmfaakufrmzcxhtgfw.supabase.co/functions/v1/send-transactional-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := jsonb_build_object(
      'type', TG_OP,
      'table', TG_TABLE_NAME,
      'schema', TG_TABLE_SCHEMA,
      'record', CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END,
      'old_record', CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END
    )
  );
  RETURN COALESCE(NEW, OLD);
END;$$;


ALTER FUNCTION "public"."notify_transactional_email"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."protect_system_roles"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  if old.is_system then
    raise exception 'System role % cannot be changed or deleted', old.role;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end
$$;


ALTER FUNCTION "public"."protect_system_roles"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."requeue_stale_financial_jobs"("p_minutes" integer DEFAULT 5) RETURNS "void"
    LANGUAGE "sql"
    AS $$
  update public.symbol_financials
  set status = 'pending', updated_at = now()
  where status = 'in_progress'
    and updated_at < now() - (p_minutes || ' minutes')::interval;
$$;


ALTER FUNCTION "public"."requeue_stale_financial_jobs"("p_minutes" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reset_all_financial_jobs"() RETURNS "void"
    LANGUAGE "sql"
    AS $$
  update public.symbol_financials
  set status = 'pending', attempts = 0, error_message = null, updated_at = now();
$$;


ALTER FUNCTION "public"."reset_all_financial_jobs"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  new.updated_at := now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "backup"."finanicial_statements_20261107" (
    "id" "uuid",
    "short_des" "text",
    "pdf" "text",
    "tab" "text",
    "created_at" timestamp with time zone
);


ALTER TABLE "backup"."finanicial_statements_20261107" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ClientCode" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "cliendCode" "text",
    "Password" "bytea",
    "userId" "uuid",
    "needs_password_update" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."ClientCode" OWNER TO "postgres";


ALTER TABLE "public"."ClientCode" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."ClientCode_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."admin_roles" (
    "role" "text" NOT NULL,
    "label" "text" NOT NULL,
    "menus" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "is_system" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "admin_roles_role_check" CHECK (("role" ~ '^[a-z0-9_]{2,32}$'::"text"))
);


ALTER TABLE "public"."admin_roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admin_users" (
    "user_id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "full_name" "text",
    "role" "text" NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."admin_users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."attachedbanks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "bank_name" "text" NOT NULL,
    "iban" "text" NOT NULL,
    "account_title" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."attachedbanks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."balance_annually" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "data" "jsonb" NOT NULL,
    "symbol" "text"
);


ALTER TABLE "public"."balance_annually" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."balance_annually_flattened" (
    "id" bigint NOT NULL,
    "symbol" "text" NOT NULL,
    "period_year" "text" NOT NULL,
    "period_end" timestamp with time zone NOT NULL,
    "field_key" "text",
    "label" "text" NOT NULL,
    "value" numeric,
    "is_heading" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "embedding" "public"."vector"(1536)
);


ALTER TABLE "public"."balance_annually_flattened" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."balance_annually_flattened_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."balance_annually_flattened_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."balance_annually_flattened_id_seq" OWNED BY "public"."balance_annually_flattened"."id";



CREATE TABLE IF NOT EXISTS "public"."balance_quarterly" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "data" "jsonb" NOT NULL,
    "symbol" "text"
);


ALTER TABLE "public"."balance_quarterly" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."balance_quarterly_flattened" (
    "id" bigint NOT NULL,
    "symbol" "text" NOT NULL,
    "period_year" "text" NOT NULL,
    "quarter" "text" NOT NULL,
    "period_end" timestamp with time zone NOT NULL,
    "field_key" "text",
    "label" "text" NOT NULL,
    "value" numeric,
    "is_heading" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "embedding" "public"."vector"(1536)
);


ALTER TABLE "public"."balance_quarterly_flattened" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."balance_quarterly_flattened_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."balance_quarterly_flattened_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."balance_quarterly_flattened_id_seq" OWNED BY "public"."balance_quarterly_flattened"."id";



CREATE TABLE IF NOT EXISTS "public"."bank_list" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text"
);


ALTER TABLE "public"."bank_list" OWNER TO "postgres";


ALTER TABLE "public"."bank_list" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."bank_list_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."banks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."banks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."blogs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "img" "text",
    "desc" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."blogs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."broker_login_attempts" (
    "client_code" "text" NOT NULL,
    "failed_attempts" integer DEFAULT 0 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."broker_login_attempts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."client_holdings_data" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "snapshot_id" "uuid" NOT NULL,
    "client_code" "text" NOT NULL,
    "security" "text",
    "quantity" numeric,
    "total_cost" numeric,
    "cost_per_unit" numeric,
    "current_price" numeric,
    "current_value" numeric,
    "cap_gain_loss" numeric,
    "return_of_investment" numeric,
    "portfolio_weight" numeric,
    "api_grand_total" numeric,
    "api_avg_cost" numeric,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."client_holdings_data" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."client_holdings_latest" (
    "client_code" "text" NOT NULL,
    "security" "text" NOT NULL,
    "quantity" numeric,
    "total_cost" numeric,
    "cost_per_unit" numeric,
    "current_price" numeric,
    "current_value" numeric,
    "cap_gain_loss" numeric,
    "return_of_investment" numeric,
    "portfolio_weight" numeric,
    "api_grand_total" numeric,
    "api_avg_cost" numeric,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."client_holdings_latest" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."client_portfolio_data" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_code" "text" NOT NULL,
    "fetched_at" timestamp with time zone DEFAULT "now"(),
    "cash_unblocked" numeric,
    "cash_blocked" numeric,
    "cash_balance" numeric,
    "limit_withdrawal" numeric,
    "grand_total" numeric,
    "custody_value" numeric,
    "total_profit_loss" numeric,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."client_portfolio_data" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."client_portfolio_latest" (
    "client_code" "text" NOT NULL,
    "snapshot_id" "uuid",
    "cash_unblocked" numeric,
    "cash_blocked" numeric,
    "cash_balance" numeric,
    "limit_withdrawal" numeric,
    "grand_total" numeric,
    "custody_value" numeric,
    "total_profit_loss" numeric,
    "state_hash" "text",
    "fetched_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "changed_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."client_portfolio_latest" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."configuration" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "is_research_enable" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "AOF_Url" "text",
    "min_supported_version" "text"
);


ALTER TABLE "public"."configuration" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contact" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "full_name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "phone" "text",
    "subject" "text" NOT NULL,
    "message" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone,
    "helps" "text"[] DEFAULT '{}'::"text"[]
);


ALTER TABLE "public"."contact" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."devices" (
    "device_id" "text" NOT NULL,
    "fcm_token" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "platform" "text"
);


ALTER TABLE "public"."devices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."economic_calender" (
    "id" bigint NOT NULL,
    "symbol" "text" NOT NULL,
    "date" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."economic_calender" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."economic_calender_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."economic_calender_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."economic_calender_id_seq" OWNED BY "public"."economic_calender"."id";



CREATE TABLE IF NOT EXISTS "public"."financial_years" (
    "id" bigint NOT NULL,
    "label" "text" NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "financial_years_july_june" CHECK (((EXTRACT(month FROM "start_date") = (7)::numeric) AND (EXTRACT(day FROM "start_date") = (1)::numeric) AND ("end_date" = ((("start_date" + '1 year'::interval) - '1 day'::interval))::"date")))
);


ALTER TABLE "public"."financial_years" OWNER TO "postgres";


ALTER TABLE "public"."financial_years" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."financial_years_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."finanicial_statements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "short_des" "text" NOT NULL,
    "pdf" "text",
    "tab" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "financial_year_id" bigint
);


ALTER TABLE "public"."finanicial_statements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."flattenmetrics" (
    "id" bigint NOT NULL,
    "symbol" "text" NOT NULL,
    "period_year" "text",
    "period_start" "date",
    "period_end" "date",
    "metric_key" "text",
    "metric_label" "text",
    "metric_value" "text",
    "unit" "text",
    "description" "text"
);


ALTER TABLE "public"."flattenmetrics" OWNER TO "postgres";


ALTER TABLE "public"."flattenmetrics" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."flattenmetrics_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."fundamental_annually" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "data" "jsonb" NOT NULL,
    "symbol" "text",
    "embedding" "public"."vector"(1536)
);


ALTER TABLE "public"."fundamental_annually" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fundamental_flattened" (
    "id" bigint NOT NULL,
    "symbol" "text" NOT NULL,
    "period_year" "text" NOT NULL,
    "period_end" timestamp with time zone NOT NULL,
    "field_key" "text" NOT NULL,
    "label" "text" NOT NULL,
    "unit" "text",
    "value" numeric,
    "description" "text",
    "latex" "text",
    "is_heading" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "embedding" "public"."vector"(1536)
);


ALTER TABLE "public"."fundamental_flattened" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."fundamental_flattened_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."fundamental_flattened_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."fundamental_flattened_id_seq" OWNED BY "public"."fundamental_flattened"."id";



CREATE TABLE IF NOT EXISTS "public"."iel_info" (
    "email" "text" NOT NULL,
    "phone" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL
);


ALTER TABLE "public"."iel_info" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."iel_timing" (
    "id" bigint NOT NULL,
    "day" "text" NOT NULL,
    "status" boolean DEFAULT true NOT NULL,
    "start_time" time without time zone NOT NULL,
    "end_time" time without time zone NOT NULL,
    "break_start_time" time without time zone,
    "break_end_time" time without time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone
);


ALTER TABLE "public"."iel_timing" OWNER TO "postgres";


ALTER TABLE "public"."iel_timing" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."iel_timing_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."income_annually" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "data" "jsonb" NOT NULL,
    "symbol" "text"
);


ALTER TABLE "public"."income_annually" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."income_annually_flattened" (
    "id" bigint NOT NULL,
    "symbol" "text" NOT NULL,
    "period_year" "text" NOT NULL,
    "period_end" timestamp with time zone NOT NULL,
    "field_key" "text",
    "label" "text" NOT NULL,
    "value" numeric,
    "is_heading" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "embedding" "public"."vector"(1536)
);


ALTER TABLE "public"."income_annually_flattened" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."income_annually_flattened_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."income_annually_flattened_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."income_annually_flattened_id_seq" OWNED BY "public"."income_annually_flattened"."id";



CREATE TABLE IF NOT EXISTS "public"."income_quarterly" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "data" "jsonb" NOT NULL,
    "symbol" "text"
);


ALTER TABLE "public"."income_quarterly" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."income_quarterly_flattened" (
    "id" bigint NOT NULL,
    "symbol" "text" NOT NULL,
    "period_year" "text" NOT NULL,
    "quarter" "text" NOT NULL,
    "period_end" timestamp with time zone NOT NULL,
    "field_key" "text",
    "label" "text" NOT NULL,
    "value" numeric,
    "is_heading" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "embedding" "public"."vector"(1536)
);


ALTER TABLE "public"."income_quarterly_flattened" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."income_quarterly_flattened_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."income_quarterly_flattened_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."income_quarterly_flattened_id_seq" OWNED BY "public"."income_quarterly_flattened"."id";



CREATE TABLE IF NOT EXISTS "public"."market_days" (
    "trade_date" "date" NOT NULL,
    "is_open" boolean NOT NULL,
    "source" "text",
    "detail" "jsonb",
    "forced" boolean DEFAULT false NOT NULL,
    "checked_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."market_days" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."marketing_banner" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "des" "text" NOT NULL,
    "link" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone
);


ALTER TABLE "public"."marketing_banner" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."mock_orders" (
    "id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "symbol" "text" NOT NULL,
    "name" "text" NOT NULL,
    "side" "text" NOT NULL,
    "quantity" integer NOT NULL,
    "price" numeric(14,2) NOT NULL,
    "fee" numeric(14,2) NOT NULL,
    "total" numeric(16,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "mock_orders_fee_check" CHECK (("fee" >= (0)::numeric)),
    CONSTRAINT "mock_orders_price_check" CHECK (("price" > (0)::numeric)),
    CONSTRAINT "mock_orders_quantity_check" CHECK (("quantity" > 0)),
    CONSTRAINT "mock_orders_side_check" CHECK (("side" = ANY (ARRAY['BUY'::"text", 'SELL'::"text"])))
);


ALTER TABLE "public"."mock_orders" OWNER TO "postgres";


ALTER TABLE "public"."mock_orders" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."mock_orders_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."mock_positions" (
    "user_id" "uuid" NOT NULL,
    "symbol" "text" NOT NULL,
    "name" "text" NOT NULL,
    "quantity" integer NOT NULL,
    "average_price" numeric(14,2) NOT NULL,
    CONSTRAINT "mock_positions_average_price_check" CHECK (("average_price" > (0)::numeric)),
    CONSTRAINT "mock_positions_quantity_check" CHECK (("quantity" >= 0))
);


ALTER TABLE "public"."mock_positions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."mock_watchlist" (
    "symbol" "text" NOT NULL,
    "name" "text" NOT NULL,
    "price" numeric(14,2) NOT NULL,
    CONSTRAINT "mock_watchlist_symbol_check" CHECK (("symbol" = "upper"("symbol")))
);


ALTER TABLE "public"."mock_watchlist" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."news" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "short_des" "text" NOT NULL,
    "pdf" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."news" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notification_prefs" (
    "user_id" "uuid" NOT NULL,
    "order_updates" boolean DEFAULT true NOT NULL,
    "price_alerts" boolean DEFAULT true NOT NULL,
    "research" boolean DEFAULT true NOT NULL,
    "corporate_actions" boolean DEFAULT true NOT NULL,
    "marketing" boolean DEFAULT false NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."notification_prefs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" bigint NOT NULL,
    "device_id" "text",
    "title" "text" NOT NULL,
    "body" "text" NOT NULL,
    "status" "text" DEFAULT 'sent'::"text" NOT NULL,
    "data" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "user_id" "uuid",
    "category" "text",
    CONSTRAINT "notifications_category_check" CHECK (("category" = ANY (ARRAY['orderUpdates'::"text", 'priceAlerts'::"text", 'research'::"text", 'corporateActions'::"text", 'marketing'::"text"])))
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


ALTER TABLE "public"."notifications" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."notifications_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text",
    "username" "text" NOT NULL,
    "full_name" "text",
    "avatar_url" "text",
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "account" boolean DEFAULT false,
    "date_of_birth" "text",
    "phone_number" numeric,
    "block" boolean,
    "status" "text",
    "dropdown" "public"."profile_status" DEFAULT 'pending'::"public"."profile_status",
    CONSTRAINT "profiles_username_check" CHECK (("char_length"("username") >= 3))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."psx_sectors" (
    "sector_code" character(4) NOT NULL,
    "sector_name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."psx_sectors" OWNER TO "postgres";


COMMENT ON TABLE "public"."psx_sectors" IS 'PSX sector codes as published in the SECTOR column of dps.psx.com.pk/market-watch. Code 0817 is unused.';



COMMENT ON COLUMN "public"."psx_sectors"."sector_code" IS 'Four-digit PSX sector code, zero-padded (e.g. 0804). Stored as char(4) so the leading zero is never lost.';



CREATE TABLE IF NOT EXISTS "public"."psx_symbols" (
    "symbol" "text" NOT NULL,
    "company_name" "text" NOT NULL,
    "sector" "text",
    "sector_code" character(4),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "psx_symbols_code_format" CHECK ((("sector_code" IS NULL) OR ("sector_code" ~ '^[0-9]{4}$'::"text"))),
    CONSTRAINT "psx_symbols_sector_pair" CHECK (("num_nonnulls"("sector", "sector_code") <> 1)),
    CONSTRAINT "psx_symbols_symbol_format" CHECK (("symbol" ~ '^[A-Z0-9]{2,16}$'::"text"))
);


ALTER TABLE "public"."psx_symbols" OWNER TO "postgres";


COMMENT ON TABLE "public"."psx_symbols" IS 'Every security listed on the Pakistan Stock Exchange, mapped to its sector. Snapshot: 07 Aug 2026. Includes ordinary shares, rights, preference lines, ETFs, REITs, closed-end funds and modarabas; excludes government T-Bills/PIBs.';



COMMENT ON COLUMN "public"."psx_symbols"."symbol" IS 'PSX ticker. Natural primary key — unique and stable across sessions.';



COMMENT ON COLUMN "public"."psx_symbols"."sector" IS 'Sector display name, denormalised from psx_sectors for convenient reads. Null for the 3 securities PSX itself leaves unclassified (AEL, AKDCL, AKZO).';



CREATE OR REPLACE VIEW "public"."psx_symbols_by_sector" WITH ("security_invoker"='on') AS
 SELECT "s"."sector_code",
    "s"."sector_name",
    "count"("y"."symbol") AS "security_count",
    "array_agg"("y"."symbol" ORDER BY "y"."symbol") AS "symbols"
   FROM ("public"."psx_sectors" "s"
     LEFT JOIN "public"."psx_symbols" "y" ON (("y"."sector_code" = "s"."sector_code")))
  GROUP BY "s"."sector_code", "s"."sector_name"
  ORDER BY "s"."sector_code";


ALTER VIEW "public"."psx_symbols_by_sector" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."push_tokens" (
    "token" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "platform" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."push_tokens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."raastids" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "raastiban" "text" NOT NULL,
    "clientcode" "text" NOT NULL,
    "clientname" "text" NOT NULL,
    "folionumber" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."raastids" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."research" (
    "id" integer NOT NULL,
    "sector_name" character varying(255) NOT NULL,
    "pdf_url" "text" NOT NULL,
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "name" "text",
    "short_desc" "text",
    "report_type" "text"
);


ALTER TABLE "public"."research" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."research_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."research_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."research_id_seq" OWNED BY "public"."research"."id";



CREATE TABLE IF NOT EXISTS "public"."research_iel" (
    "id" integer NOT NULL,
    "symbol" character varying(255) NOT NULL,
    "sector_name" character varying(255) NOT NULL,
    "pdf_url" "text" NOT NULL,
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."research_iel" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."research_iel_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."research_iel_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."research_iel_id_seq" OWNED BY "public"."research_iel"."id";



CREATE TABLE IF NOT EXISTS "public"."sector" (
    "id" integer NOT NULL,
    "sector_name" character varying(255) NOT NULL,
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."sector" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."sector_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."sector_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."sector_id_seq" OWNED BY "public"."sector"."id";



CREATE TABLE IF NOT EXISTS "public"."sector_iel" (
    "id" integer NOT NULL,
    "sector_name" character varying(255) NOT NULL,
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."sector_iel" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."sector_iel_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."sector_iel_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."sector_iel_id_seq" OWNED BY "public"."sector_iel"."id";



CREATE TABLE IF NOT EXISTS "public"."stock_movements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "symbol" "text" NOT NULL,
    "percentage_change" numeric,
    "close_price" numeric,
    "timestamp" bigint NOT NULL,
    "direction" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "stock_movements_direction_check" CHECK (("direction" = ANY (ARRAY['top'::"text", 'bottom'::"text"])))
);


ALTER TABLE "public"."stock_movements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stock_volumes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "symbol" "text" NOT NULL,
    "volume" bigint,
    "close_price" numeric,
    "timestamp" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."stock_volumes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stocklogos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "symbol" "text" NOT NULL,
    "img_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."stocklogos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stocks" (
    "id" bigint NOT NULL,
    "symbol" "text" NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."stocks" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."stocks_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."stocks_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."stocks_id_seq" OWNED BY "public"."stocks"."id";



CREATE TABLE IF NOT EXISTS "public"."symbol_financials" (
    "id" bigint NOT NULL,
    "symbol" "text" NOT NULL,
    "sector_code" "text",
    "sector" "text",
    "company_name" "text",
    "api_type" "text" NOT NULL,
    "payload" "jsonb",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "attempts" integer DEFAULT 0 NOT NULL,
    "error_message" "text",
    "fetched_at" timestamp with time zone,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "symbol_financials_api_type_check" CHECK (("api_type" = ANY (ARRAY['income'::"text", 'balance'::"text", 'fundamentals'::"text"]))),
    CONSTRAINT "symbol_financials_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'in_progress'::"text", 'done'::"text", 'error'::"text"])))
);


ALTER TABLE "public"."symbol_financials" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."symbol_financials_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."symbol_financials_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."symbol_financials_id_seq" OWNED BY "public"."symbol_financials"."id";



CREATE TABLE IF NOT EXISTS "public"."symbol_research" (
    "id" bigint NOT NULL,
    "symbol" "text" NOT NULL,
    "case_points" "text"[],
    "key_risk" "text",
    "current_rating" "text",
    "current_rating_date" "text",
    "current_rating_price" numeric,
    "previous_rating" "text",
    "previous_rating_period" "text",
    "previous_rating_price" numeric,
    "document_title" "text",
    "document_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."symbol_research" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."symbol_research_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."symbol_research_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."symbol_research_id_seq" OWNED BY "public"."symbol_research"."id";



CREATE TABLE IF NOT EXISTS "public"."todos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."todos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."trading_auth" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "client_code" "text" NOT NULL,
    "is_authenticate" boolean DEFAULT false,
    "device_id" "text",
    "expire_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."trading_auth" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."watchlist" (
    "id" bigint NOT NULL,
    "userid" "uuid" NOT NULL,
    "symbol" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."watchlist" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."watchlist_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."watchlist_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."watchlist_id_seq" OWNED BY "public"."watchlist"."id";



CREATE SEQUENCE IF NOT EXISTS "public"."widrawrequest_request_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."widrawrequest_request_id_seq" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."widrawrequest" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "clientcode" "text" NOT NULL,
    "iban" "text" NOT NULL,
    "bank_name" "text" NOT NULL,
    "bank_holder_name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "amount" "text",
    "status" "text",
    "request_id" "text" DEFAULT ('req'::"text" || "lpad"(("nextval"('"public"."widrawrequest_request_id_seq"'::"regclass"))::"text", 4, '0'::"text"))
);


ALTER TABLE "public"."widrawrequest" OWNER TO "postgres";


ALTER TABLE ONLY "public"."balance_annually_flattened" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."balance_annually_flattened_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."balance_quarterly_flattened" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."balance_quarterly_flattened_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."economic_calender" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."economic_calender_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."fundamental_flattened" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."fundamental_flattened_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."income_annually_flattened" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."income_annually_flattened_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."income_quarterly_flattened" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."income_quarterly_flattened_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."research" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."research_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."research_iel" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."research_iel_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."sector" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."sector_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."sector_iel" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."sector_iel_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."stocks" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."stocks_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."symbol_financials" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."symbol_financials_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."symbol_research" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."symbol_research_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."watchlist" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."watchlist_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."ClientCode"
    ADD CONSTRAINT "ClientCode_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_roles"
    ADD CONSTRAINT "admin_roles_pkey" PRIMARY KEY ("role");



ALTER TABLE ONLY "public"."admin_users"
    ADD CONSTRAINT "admin_users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."admin_users"
    ADD CONSTRAINT "admin_users_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."attachedbanks"
    ADD CONSTRAINT "attachedbanks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."balance_annually_flattened"
    ADD CONSTRAINT "balance_annually_flattened_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."balance_annually_flattened"
    ADD CONSTRAINT "balance_annually_flattened_symbol_period_end_field_key_key" UNIQUE ("symbol", "period_end", "field_key");



ALTER TABLE ONLY "public"."balance_annually"
    ADD CONSTRAINT "balance_annually_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."balance_annually"
    ADD CONSTRAINT "balance_annually_symbol_key" UNIQUE ("symbol");



ALTER TABLE ONLY "public"."balance_quarterly_flattened"
    ADD CONSTRAINT "balance_quarterly_flattened_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."balance_quarterly_flattened"
    ADD CONSTRAINT "balance_quarterly_flattened_symbol_period_end_field_key_key" UNIQUE ("symbol", "period_end", "field_key");



ALTER TABLE ONLY "public"."balance_quarterly"
    ADD CONSTRAINT "balance_quarterly_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."balance_quarterly"
    ADD CONSTRAINT "balance_quarterly_symbol_key" UNIQUE ("symbol");



ALTER TABLE ONLY "public"."bank_list"
    ADD CONSTRAINT "bank_list_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."banks"
    ADD CONSTRAINT "banks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."blogs"
    ADD CONSTRAINT "blogs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."broker_login_attempts"
    ADD CONSTRAINT "broker_login_attempts_pkey" PRIMARY KEY ("client_code");



ALTER TABLE ONLY "public"."client_holdings_data"
    ADD CONSTRAINT "client_holdings_data_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."client_holdings_latest"
    ADD CONSTRAINT "client_holdings_latest_pkey" PRIMARY KEY ("client_code", "security");



ALTER TABLE ONLY "public"."client_portfolio_data"
    ADD CONSTRAINT "client_portfolio_data_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."client_portfolio_latest"
    ADD CONSTRAINT "client_portfolio_latest_pkey" PRIMARY KEY ("client_code");



ALTER TABLE ONLY "public"."ClientCode"
    ADD CONSTRAINT "clientcode_userid_unique" UNIQUE ("userId");



ALTER TABLE ONLY "public"."configuration"
    ADD CONSTRAINT "configuration_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contact"
    ADD CONSTRAINT "contact_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."devices"
    ADD CONSTRAINT "devices_pkey" PRIMARY KEY ("device_id");



ALTER TABLE ONLY "public"."economic_calender"
    ADD CONSTRAINT "economic_calender_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."economic_calender"
    ADD CONSTRAINT "economic_calender_symbol_key" UNIQUE ("symbol");



ALTER TABLE ONLY "public"."financial_years"
    ADD CONSTRAINT "financial_years_label_key" UNIQUE ("label");



ALTER TABLE ONLY "public"."financial_years"
    ADD CONSTRAINT "financial_years_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."finanicial_statements"
    ADD CONSTRAINT "finanicial_statements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."flattenmetrics"
    ADD CONSTRAINT "flattenmetrics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fundamental_annually"
    ADD CONSTRAINT "fundamental_annually_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fundamental_annually"
    ADD CONSTRAINT "fundamental_annually_symbol_key" UNIQUE ("symbol");



ALTER TABLE ONLY "public"."fundamental_flattened"
    ADD CONSTRAINT "fundamental_flattened_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fundamental_flattened"
    ADD CONSTRAINT "fundamental_flattened_symbol_period_end_field_key_key" UNIQUE ("symbol", "period_end", "field_key");



ALTER TABLE ONLY "public"."iel_info"
    ADD CONSTRAINT "iel_info_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."iel_timing"
    ADD CONSTRAINT "iel_timing_day_key" UNIQUE ("day");



ALTER TABLE ONLY "public"."iel_timing"
    ADD CONSTRAINT "iel_timing_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."income_annually_flattened"
    ADD CONSTRAINT "income_annually_flattened_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."income_annually_flattened"
    ADD CONSTRAINT "income_annually_flattened_symbol_period_end_field_key_key" UNIQUE ("symbol", "period_end", "field_key");



ALTER TABLE ONLY "public"."income_annually"
    ADD CONSTRAINT "income_annually_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."income_annually"
    ADD CONSTRAINT "income_annually_symbol_key" UNIQUE ("symbol");



ALTER TABLE ONLY "public"."income_quarterly_flattened"
    ADD CONSTRAINT "income_quarterly_flattened_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."income_quarterly_flattened"
    ADD CONSTRAINT "income_quarterly_flattened_symbol_period_end_field_key_key" UNIQUE ("symbol", "period_end", "field_key");



ALTER TABLE ONLY "public"."income_quarterly"
    ADD CONSTRAINT "income_quarterly_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."income_quarterly"
    ADD CONSTRAINT "income_quarterly_symbol_key" UNIQUE ("symbol");



ALTER TABLE ONLY "public"."market_days"
    ADD CONSTRAINT "market_days_pkey" PRIMARY KEY ("trade_date");



ALTER TABLE ONLY "public"."marketing_banner"
    ADD CONSTRAINT "marketing_banner_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mock_accounts"
    ADD CONSTRAINT "mock_accounts_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."mock_orders"
    ADD CONSTRAINT "mock_orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mock_positions"
    ADD CONSTRAINT "mock_positions_pkey" PRIMARY KEY ("user_id", "symbol");



ALTER TABLE ONLY "public"."mock_watchlist"
    ADD CONSTRAINT "mock_watchlist_pkey" PRIMARY KEY ("symbol");



ALTER TABLE ONLY "public"."news"
    ADD CONSTRAINT "news_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_prefs"
    ADD CONSTRAINT "notification_prefs_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_username_key" UNIQUE ("username");



ALTER TABLE ONLY "public"."psx_sectors"
    ADD CONSTRAINT "psx_sectors_pkey" PRIMARY KEY ("sector_code");



ALTER TABLE ONLY "public"."psx_sectors"
    ADD CONSTRAINT "psx_sectors_sector_name_key" UNIQUE ("sector_name");



ALTER TABLE ONLY "public"."psx_symbols"
    ADD CONSTRAINT "psx_symbols_pkey" PRIMARY KEY ("symbol");



ALTER TABLE ONLY "public"."push_tokens"
    ADD CONSTRAINT "push_tokens_pkey" PRIMARY KEY ("token");



ALTER TABLE ONLY "public"."raastids"
    ADD CONSTRAINT "raastids_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."research_iel"
    ADD CONSTRAINT "research_iel_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."research"
    ADD CONSTRAINT "research_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sector_iel"
    ADD CONSTRAINT "sector_iel_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sector_iel"
    ADD CONSTRAINT "sector_iel_sector_name_key" UNIQUE ("sector_name");



ALTER TABLE ONLY "public"."sector"
    ADD CONSTRAINT "sector_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sector"
    ADD CONSTRAINT "sector_sector_name_key" UNIQUE ("sector_name");



ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stock_volumes"
    ADD CONSTRAINT "stock_volumes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stocklogos"
    ADD CONSTRAINT "stocklogos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stocks"
    ADD CONSTRAINT "stocks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stocks"
    ADD CONSTRAINT "stocks_symbol_key" UNIQUE ("symbol");



ALTER TABLE ONLY "public"."symbol_financials"
    ADD CONSTRAINT "symbol_financials_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."symbol_financials"
    ADD CONSTRAINT "symbol_financials_symbol_api_type_key" UNIQUE ("symbol", "api_type");



ALTER TABLE ONLY "public"."symbol_research"
    ADD CONSTRAINT "symbol_research_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."todos"
    ADD CONSTRAINT "todos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trading_auth"
    ADD CONSTRAINT "trading_auth_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."watchlist"
    ADD CONSTRAINT "watchlist_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."widrawrequest"
    ADD CONSTRAINT "widrawrequest_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."widrawrequest"
    ADD CONSTRAINT "widrawrequest_request_id_unique" UNIQUE ("request_id");



CREATE INDEX "client_holdings_data_client_time_idx" ON "public"."client_holdings_data" USING "btree" ("client_code", "created_at" DESC);



CREATE INDEX "client_holdings_data_snapshot_idx" ON "public"."client_holdings_data" USING "btree" ("snapshot_id");



CREATE INDEX "client_holdings_latest_client_idx" ON "public"."client_holdings_latest" USING "btree" ("client_code");



CREATE INDEX "finanicial_statements_financial_year_id_idx" ON "public"."finanicial_statements" USING "btree" ("financial_year_id");



CREATE INDEX "idx_balance_annually_flattened_field_key" ON "public"."balance_annually_flattened" USING "btree" ("field_key");



CREATE INDEX "idx_balance_annually_flattened_period_end" ON "public"."balance_annually_flattened" USING "btree" ("period_end" DESC);



CREATE INDEX "idx_balance_annually_flattened_symbol" ON "public"."balance_annually_flattened" USING "btree" ("symbol");



CREATE INDEX "idx_balance_quarterly_flattened_field_key" ON "public"."balance_quarterly_flattened" USING "btree" ("field_key");



CREATE INDEX "idx_balance_quarterly_flattened_period_end" ON "public"."balance_quarterly_flattened" USING "btree" ("period_end" DESC);



CREATE INDEX "idx_balance_quarterly_flattened_symbol" ON "public"."balance_quarterly_flattened" USING "btree" ("symbol");



CREATE INDEX "idx_fundamental_annually_symbol" ON "public"."fundamental_annually" USING "gin" ((("data" -> 'fundamentals'::"text")));



CREATE INDEX "idx_fundamental_flattened_field_key" ON "public"."fundamental_flattened" USING "btree" ("field_key");



CREATE INDEX "idx_fundamental_flattened_period_end" ON "public"."fundamental_flattened" USING "btree" ("period_end" DESC);



CREATE INDEX "idx_fundamental_flattened_symbol" ON "public"."fundamental_flattened" USING "btree" ("symbol");



CREATE INDEX "idx_income_annually_flattened_field_key" ON "public"."income_annually_flattened" USING "btree" ("field_key");



CREATE INDEX "idx_income_annually_flattened_period_end" ON "public"."income_annually_flattened" USING "btree" ("period_end" DESC);



CREATE INDEX "idx_income_annually_flattened_symbol" ON "public"."income_annually_flattened" USING "btree" ("symbol");



CREATE INDEX "idx_income_quarterly_flattened_field_key" ON "public"."income_quarterly_flattened" USING "btree" ("field_key");



CREATE INDEX "idx_income_quarterly_flattened_period_end" ON "public"."income_quarterly_flattened" USING "btree" ("period_end" DESC);



CREATE INDEX "idx_income_quarterly_flattened_symbol" ON "public"."income_quarterly_flattened" USING "btree" ("symbol");



CREATE INDEX "idx_stock_movements_symbol_timestamp" ON "public"."stock_movements" USING "btree" ("symbol", "timestamp");



CREATE INDEX "idx_stock_volumes_symbol_timestamp" ON "public"."stock_volumes" USING "btree" ("symbol", "timestamp");



CREATE INDEX "idx_stocks_symbol" ON "public"."stocks" USING "btree" ("symbol");



CREATE INDEX "idx_symbol_financials_status" ON "public"."symbol_financials" USING "btree" ("status");



CREATE INDEX "notifications_user_id_idx" ON "public"."notifications" USING "btree" ("user_id");



CREATE INDEX "psx_symbols_company_trgm_idx" ON "public"."psx_symbols" USING "btree" ("lower"("company_name") "text_pattern_ops");



CREATE INDEX "psx_symbols_sector_code_idx" ON "public"."psx_symbols" USING "btree" ("sector_code");



CREATE INDEX "psx_symbols_sector_idx" ON "public"."psx_symbols" USING "btree" ("sector");



CREATE INDEX "push_tokens_user_id_idx" ON "public"."push_tokens" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "psx_symbols_set_updated_at" BEFORE UPDATE ON "public"."psx_symbols" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "send_email_on_bank_change" AFTER INSERT OR DELETE ON "public"."attachedbanks" FOR EACH ROW EXECUTE FUNCTION "public"."notify_transactional_email"();



CREATE OR REPLACE TRIGGER "send_email_on_profiles_change" AFTER UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."notify_transactional_email"();



CREATE OR REPLACE TRIGGER "send_email_on_withdrawal_change" AFTER INSERT OR UPDATE ON "public"."widrawrequest" FOR EACH ROW EXECUTE FUNCTION "public"."notify_transactional_email"();



CREATE OR REPLACE TRIGGER "trg_protect_system_roles" BEFORE DELETE OR UPDATE ON "public"."admin_roles" FOR EACH ROW EXECUTE FUNCTION "public"."protect_system_roles"();



ALTER TABLE ONLY "public"."admin_users"
    ADD CONSTRAINT "admin_users_role_fkey" FOREIGN KEY ("role") REFERENCES "public"."admin_roles"("role") ON UPDATE CASCADE;



ALTER TABLE ONLY "public"."admin_users"
    ADD CONSTRAINT "admin_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_holdings_data"
    ADD CONSTRAINT "client_holdings_data_snapshot_id_fkey" FOREIGN KEY ("snapshot_id") REFERENCES "public"."client_portfolio_data"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_portfolio_latest"
    ADD CONSTRAINT "client_portfolio_latest_snapshot_id_fkey" FOREIGN KEY ("snapshot_id") REFERENCES "public"."client_portfolio_data"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."finanicial_statements"
    ADD CONSTRAINT "finanicial_statements_financial_year_id_fkey" FOREIGN KEY ("financial_year_id") REFERENCES "public"."financial_years"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."mock_accounts"
    ADD CONSTRAINT "mock_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."mock_orders"
    ADD CONSTRAINT "mock_orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."mock_positions"
    ADD CONSTRAINT "mock_positions_symbol_fkey" FOREIGN KEY ("symbol") REFERENCES "public"."mock_watchlist"("symbol");



ALTER TABLE ONLY "public"."mock_positions"
    ADD CONSTRAINT "mock_positions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notification_prefs"
    ADD CONSTRAINT "notification_prefs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("device_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."psx_symbols"
    ADD CONSTRAINT "psx_symbols_sector_code_fkey" FOREIGN KEY ("sector_code") REFERENCES "public"."psx_sectors"("sector_code") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."push_tokens"
    ADD CONSTRAINT "push_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_symbol_fkey" FOREIGN KEY ("symbol") REFERENCES "public"."stocks"("symbol") ON UPDATE CASCADE;



ALTER TABLE ONLY "public"."stock_volumes"
    ADD CONSTRAINT "stock_volumes_symbol_fkey" FOREIGN KEY ("symbol") REFERENCES "public"."stocks"("symbol") ON UPDATE CASCADE;



ALTER TABLE ONLY "public"."watchlist"
    ADD CONSTRAINT "watchlist_userid_fkey" FOREIGN KEY ("userid") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE "backup"."finanicial_statements_20261107" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "Allow authenticated access" ON "public"."balance_annually" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow authenticated access" ON "public"."balance_quarterly" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow authenticated access" ON "public"."fundamental_annually" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow authenticated access" ON "public"."income_annually" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow authenticated access" ON "public"."income_quarterly" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow public insert" ON "public"."balance_annually" FOR INSERT WITH CHECK (true);



CREATE POLICY "Allow public insert" ON "public"."balance_quarterly" FOR INSERT WITH CHECK (true);



CREATE POLICY "Allow public insert" ON "public"."fundamental_annually" FOR INSERT WITH CHECK (true);



CREATE POLICY "Allow public insert" ON "public"."income_annually" FOR INSERT WITH CHECK (true);



CREATE POLICY "Allow public insert" ON "public"."income_quarterly" FOR INSERT WITH CHECK (true);



CREATE POLICY "Allow public select" ON "public"."balance_annually" FOR SELECT USING (true);



CREATE POLICY "Allow public select" ON "public"."balance_quarterly" FOR SELECT USING (true);



CREATE POLICY "Allow public select" ON "public"."fundamental_annually" FOR SELECT USING (true);



CREATE POLICY "Allow public select" ON "public"."income_annually" FOR SELECT USING (true);



CREATE POLICY "Allow public select" ON "public"."income_quarterly" FOR SELECT USING (true);



CREATE POLICY "Any one do CRUD here" ON "public"."devices" USING (true) WITH CHECK (true);



CREATE POLICY "AnyOne can get" ON "public"."research" FOR SELECT USING (true);



CREATE POLICY "AnyOne can get" ON "public"."research_iel" FOR SELECT USING (true);



CREATE POLICY "AnyOne can get Sectors" ON "public"."sector_iel" FOR SELECT USING (true);



CREATE POLICY "AnyOne with Authenticated User" ON "public"."attachedbanks" USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Anyone can do it" ON "public"."contact" USING (true) WITH CHECK (true);



CREATE POLICY "Anyone can get" ON "public"."sector" FOR SELECT USING (true);



CREATE POLICY "Anyone can get stock logos" ON "public"."stocklogos" FOR SELECT USING (true);



CREATE POLICY "Authenicated User can do CRUD here" ON "public"."economic_calender" USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenicated User can do Crud here" ON "public"."widrawrequest" USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated User can do CRUD here" ON "public"."iel_info" USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated User can do CRUD here" ON "public"."symbol_research" USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authicated User can do CRUD on watchList" ON "public"."watchlist" USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."ClientCode" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "Enable read access for all users" ON "public"."finanicial_statements" FOR SELECT USING (true);



CREATE POLICY "Enable update for authenticated users - own records only" ON "public"."ClientCode" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "userId")) WITH CHECK (("auth"."uid"() = "userId"));



CREATE POLICY "Public access" ON "public"."todos" USING (true);



CREATE POLICY "Public read access" ON "public"."stocks" FOR SELECT USING (true);



CREATE POLICY "User can Add" ON "public"."research_iel" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "User can Add Sector" ON "public"."sector" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "User can Add Sector" ON "public"."sector_iel" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "User can Delete" ON "public"."research" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "User can Delete" ON "public"."research_iel" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "User can Delete Sector" ON "public"."sector" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "User can Delete Sectors" ON "public"."sector_iel" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "User can Update" ON "public"."research" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "User can Update" ON "public"."research_iel" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "User can Update Sector" ON "public"."sector" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "User can Update Sectors" ON "public"."sector_iel" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "User can Update stock Logo" ON "public"."stocklogos" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "User can add" ON "public"."research" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "User can add stock Logo" ON "public"."stocklogos" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "User can delete stock Logo" ON "public"."stocklogos" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "User can do CRUD here" ON "public"."marketing_banner" USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "User can do CRUD here" ON "public"."notifications" USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "User can do CRUD here" ON "public"."raastids" USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "User can do CRUD here" ON "public"."stock_movements" USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "User can do CRUD here" ON "public"."stock_volumes" USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "User can do crud" ON "public"."configuration" USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "User can do crud here" ON "public"."banks" USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Users can delete their own ClientCode row" ON "public"."ClientCode" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "userId"));



CREATE POLICY "Users can insert their own ClientCode row" ON "public"."ClientCode" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "userId"));



CREATE POLICY "Users can read their own ClientCode row" ON "public"."ClientCode" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "userId"));



CREATE POLICY "Users insert their own notification prefs" ON "public"."notification_prefs" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users manage their own push tokens" ON "public"."push_tokens" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users read their own notification prefs" ON "public"."notification_prefs" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users update their own notification prefs" ON "public"."notification_prefs" FOR UPDATE USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."admin_roles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "admin_roles_read" ON "public"."admin_roles" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "admin_roles_write" ON "public"."admin_roles" TO "authenticated" USING ("public"."is_super_admin"()) WITH CHECK ("public"."is_super_admin"());



ALTER TABLE "public"."admin_users" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "admin_users_read" ON "public"."admin_users" FOR SELECT TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR "public"."is_super_admin"()));



CREATE POLICY "admin_users_write" ON "public"."admin_users" TO "authenticated" USING ("public"."is_super_admin"()) WITH CHECK ("public"."is_super_admin"());



CREATE POLICY "any one can get" ON "public"."blogs" USING (true) WITH CHECK (true);



ALTER TABLE "public"."attachedbanks" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "authenticated read/write" ON "public"."broker_login_attempts" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "authenticated users read watchlist" ON "public"."mock_watchlist" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."balance_annually" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."balance_annually_flattened" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."balance_quarterly" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."balance_quarterly_flattened" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bank_list" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."banks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."blogs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."broker_login_attempts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."client_holdings_data" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."client_holdings_latest" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."client_portfolio_data" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."client_portfolio_latest" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."configuration" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."contact" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."devices" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."economic_calender" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "fin_stmts_role_delete" ON "public"."finanicial_statements" FOR DELETE TO "authenticated" USING ("public"."can_edit_financials"());



CREATE POLICY "fin_stmts_role_insert" ON "public"."finanicial_statements" FOR INSERT TO "authenticated" WITH CHECK ("public"."can_edit_financials"());



CREATE POLICY "fin_stmts_role_update" ON "public"."finanicial_statements" FOR UPDATE TO "authenticated" USING ("public"."can_edit_financials"()) WITH CHECK ("public"."can_edit_financials"());



CREATE POLICY "fin_years_role_insert" ON "public"."financial_years" FOR INSERT TO "authenticated" WITH CHECK ("public"."can_edit_financials"());



ALTER TABLE "public"."financial_years" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "financial_years_insert" ON "public"."financial_years" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_iel_admin"());



CREATE POLICY "financial_years_select" ON "public"."financial_years" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."finanicial_statements" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "finanicial_statements_admin_delete" ON "public"."finanicial_statements" FOR DELETE TO "authenticated" USING ("public"."is_iel_admin"());



CREATE POLICY "finanicial_statements_admin_insert" ON "public"."finanicial_statements" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_iel_admin"());



CREATE POLICY "finanicial_statements_admin_update" ON "public"."finanicial_statements" FOR UPDATE TO "authenticated" USING ("public"."is_iel_admin"()) WITH CHECK ("public"."is_iel_admin"());



ALTER TABLE "public"."flattenmetrics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fundamental_annually" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fundamental_flattened" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."iel_info" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."income_annually" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."income_annually_flattened" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."income_quarterly" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."income_quarterly_flattened" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."market_days" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."marketing_banner" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."mock_orders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."mock_positions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."mock_watchlist" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notification_prefs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "own holdings latest" ON "public"."client_holdings_latest" FOR SELECT TO "authenticated" USING (("client_code" IN ( SELECT "ClientCode"."cliendCode"
   FROM "public"."ClientCode"
  WHERE ("ClientCode"."userId" = "auth"."uid"()))));



CREATE POLICY "own portfolio latest" ON "public"."client_portfolio_latest" FOR SELECT TO "authenticated" USING (("client_code" IN ( SELECT "ClientCode"."cliendCode"
   FROM "public"."ClientCode"
  WHERE ("ClientCode"."userId" = "auth"."uid"()))));



ALTER TABLE "public"."psx_sectors" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "psx_sectors are publicly readable" ON "public"."psx_sectors" FOR SELECT TO "authenticated", "anon" USING (true);



ALTER TABLE "public"."psx_symbols" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "psx_symbols are publicly readable" ON "public"."psx_symbols" FOR SELECT TO "authenticated", "anon" USING (true);



ALTER TABLE "public"."push_tokens" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."raastids" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."research" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."research_iel" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sector" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sector_iel" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stock_movements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stock_volumes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stocklogos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stocks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."symbol_research" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."todos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user can do crud here" ON "public"."bank_list" USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "users read own account" ON "public"."mock_accounts" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "users read own orders" ON "public"."mock_orders" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "users read own positions" ON "public"."mock_positions" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."watchlist" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."widrawrequest" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."client_holdings_latest";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."client_portfolio_latest";









GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "service_role";
























































































































































































































REVOKE ALL ON FUNCTION "public"."admin_client_codes"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_client_codes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_client_codes"() TO "service_role";



GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_edit_financials"() TO "anon";
GRANT ALL ON FUNCTION "public"."can_edit_financials"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_edit_financials"() TO "service_role";



GRANT ALL ON FUNCTION "public"."claim_next_financial_job"() TO "anon";
GRANT ALL ON FUNCTION "public"."claim_next_financial_job"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."claim_next_financial_job"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."financial_job_totals"() TO "anon";
GRANT ALL ON FUNCTION "public"."financial_job_totals"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."financial_job_totals"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_consolidated_context"("query_embedding" "public"."vector", "top_n" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_consolidated_context"("query_embedding" "public"."vector", "top_n" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_consolidated_context"("query_embedding" "public"."vector", "top_n" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_my_access"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_my_access"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_access"() TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "postgres";
GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "anon";
GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "authenticated";
GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_client_code_taken"("p_code" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_client_code_taken"("p_code" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."is_client_code_taken"("p_code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_client_code_taken"("p_code" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_iel_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_iel_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_iel_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_super_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_super_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_super_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "postgres";
GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "anon";
GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "authenticated";
GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "service_role";



GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_financial_job_done"("p_id" bigint, "p_payload" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."mark_financial_job_done"("p_id" bigint, "p_payload" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_financial_job_done"("p_id" bigint, "p_payload" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_financial_job_failed"("p_id" bigint, "p_attempts" integer, "p_message" "text", "p_max_attempts" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."mark_financial_job_failed"("p_id" bigint, "p_attempts" integer, "p_message" "text", "p_max_attempts" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_financial_job_failed"("p_id" bigint, "p_attempts" integer, "p_message" "text", "p_max_attempts" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."match_embedding"("query" "public"."vector", "limit_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."match_embedding"("query" "public"."vector", "limit_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."match_embedding"("query" "public"."vector", "limit_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."match_financials"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."match_financials"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."match_financials"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."mock_get_account"() TO "anon";
GRANT ALL ON FUNCTION "public"."mock_get_account"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."mock_get_account"() TO "service_role";



GRANT ALL ON FUNCTION "public"."mock_place_order"("p_symbol" "text", "p_name" "text", "p_side" "text", "p_quantity" integer, "p_price" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."mock_place_order"("p_symbol" "text", "p_name" "text", "p_side" "text", "p_quantity" integer, "p_price" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."mock_place_order"("p_symbol" "text", "p_name" "text", "p_side" "text", "p_quantity" integer, "p_price" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."mock_reset_account"() TO "anon";
GRANT ALL ON FUNCTION "public"."mock_reset_account"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."mock_reset_account"() TO "service_role";



GRANT ALL ON TABLE "public"."mock_accounts" TO "anon";
GRANT ALL ON TABLE "public"."mock_accounts" TO "authenticated";
GRANT ALL ON TABLE "public"."mock_accounts" TO "service_role";



GRANT ALL ON FUNCTION "public"."mock_start_account"("p_name" "text", "p_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."mock_start_account"("p_name" "text", "p_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mock_start_account"("p_name" "text", "p_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_transactional_email"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_transactional_email"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_transactional_email"() TO "service_role";



GRANT ALL ON FUNCTION "public"."protect_system_roles"() TO "anon";
GRANT ALL ON FUNCTION "public"."protect_system_roles"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."protect_system_roles"() TO "service_role";



GRANT ALL ON FUNCTION "public"."requeue_stale_financial_jobs"("p_minutes" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."requeue_stale_financial_jobs"("p_minutes" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."requeue_stale_financial_jobs"("p_minutes" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."reset_all_financial_jobs"() TO "anon";
GRANT ALL ON FUNCTION "public"."reset_all_financial_jobs"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."reset_all_financial_jobs"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "anon";
GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "anon";
GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "service_role";












GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "service_role";





















GRANT ALL ON TABLE "public"."ClientCode" TO "anon";
GRANT ALL ON TABLE "public"."ClientCode" TO "authenticated";
GRANT ALL ON TABLE "public"."ClientCode" TO "service_role";



GRANT ALL ON SEQUENCE "public"."ClientCode_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."ClientCode_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."ClientCode_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."admin_roles" TO "anon";
GRANT ALL ON TABLE "public"."admin_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_roles" TO "service_role";



GRANT ALL ON TABLE "public"."admin_users" TO "anon";
GRANT ALL ON TABLE "public"."admin_users" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_users" TO "service_role";



GRANT ALL ON TABLE "public"."attachedbanks" TO "anon";
GRANT ALL ON TABLE "public"."attachedbanks" TO "authenticated";
GRANT ALL ON TABLE "public"."attachedbanks" TO "service_role";



GRANT ALL ON TABLE "public"."balance_annually" TO "anon";
GRANT ALL ON TABLE "public"."balance_annually" TO "authenticated";
GRANT ALL ON TABLE "public"."balance_annually" TO "service_role";



GRANT ALL ON TABLE "public"."balance_annually_flattened" TO "anon";
GRANT ALL ON TABLE "public"."balance_annually_flattened" TO "authenticated";
GRANT ALL ON TABLE "public"."balance_annually_flattened" TO "service_role";



GRANT ALL ON SEQUENCE "public"."balance_annually_flattened_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."balance_annually_flattened_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."balance_annually_flattened_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."balance_quarterly" TO "anon";
GRANT ALL ON TABLE "public"."balance_quarterly" TO "authenticated";
GRANT ALL ON TABLE "public"."balance_quarterly" TO "service_role";



GRANT ALL ON TABLE "public"."balance_quarterly_flattened" TO "anon";
GRANT ALL ON TABLE "public"."balance_quarterly_flattened" TO "authenticated";
GRANT ALL ON TABLE "public"."balance_quarterly_flattened" TO "service_role";



GRANT ALL ON SEQUENCE "public"."balance_quarterly_flattened_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."balance_quarterly_flattened_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."balance_quarterly_flattened_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."bank_list" TO "anon";
GRANT ALL ON TABLE "public"."bank_list" TO "authenticated";
GRANT ALL ON TABLE "public"."bank_list" TO "service_role";



GRANT ALL ON SEQUENCE "public"."bank_list_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."bank_list_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."bank_list_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."banks" TO "anon";
GRANT ALL ON TABLE "public"."banks" TO "authenticated";
GRANT ALL ON TABLE "public"."banks" TO "service_role";



GRANT ALL ON TABLE "public"."blogs" TO "anon";
GRANT ALL ON TABLE "public"."blogs" TO "authenticated";
GRANT ALL ON TABLE "public"."blogs" TO "service_role";



GRANT ALL ON TABLE "public"."broker_login_attempts" TO "anon";
GRANT ALL ON TABLE "public"."broker_login_attempts" TO "authenticated";
GRANT ALL ON TABLE "public"."broker_login_attempts" TO "service_role";



GRANT ALL ON TABLE "public"."client_holdings_data" TO "anon";
GRANT ALL ON TABLE "public"."client_holdings_data" TO "authenticated";
GRANT ALL ON TABLE "public"."client_holdings_data" TO "service_role";



GRANT ALL ON TABLE "public"."client_holdings_latest" TO "anon";
GRANT ALL ON TABLE "public"."client_holdings_latest" TO "authenticated";
GRANT ALL ON TABLE "public"."client_holdings_latest" TO "service_role";



GRANT ALL ON TABLE "public"."client_portfolio_data" TO "anon";
GRANT ALL ON TABLE "public"."client_portfolio_data" TO "authenticated";
GRANT ALL ON TABLE "public"."client_portfolio_data" TO "service_role";



GRANT ALL ON TABLE "public"."client_portfolio_latest" TO "anon";
GRANT ALL ON TABLE "public"."client_portfolio_latest" TO "authenticated";
GRANT ALL ON TABLE "public"."client_portfolio_latest" TO "service_role";



GRANT ALL ON TABLE "public"."configuration" TO "anon";
GRANT ALL ON TABLE "public"."configuration" TO "authenticated";
GRANT ALL ON TABLE "public"."configuration" TO "service_role";



GRANT ALL ON TABLE "public"."contact" TO "anon";
GRANT ALL ON TABLE "public"."contact" TO "authenticated";
GRANT ALL ON TABLE "public"."contact" TO "service_role";



GRANT ALL ON TABLE "public"."devices" TO "anon";
GRANT ALL ON TABLE "public"."devices" TO "authenticated";
GRANT ALL ON TABLE "public"."devices" TO "service_role";



GRANT ALL ON TABLE "public"."economic_calender" TO "anon";
GRANT ALL ON TABLE "public"."economic_calender" TO "authenticated";
GRANT ALL ON TABLE "public"."economic_calender" TO "service_role";



GRANT ALL ON SEQUENCE "public"."economic_calender_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."economic_calender_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."economic_calender_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."financial_years" TO "anon";
GRANT ALL ON TABLE "public"."financial_years" TO "authenticated";
GRANT ALL ON TABLE "public"."financial_years" TO "service_role";



GRANT ALL ON SEQUENCE "public"."financial_years_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."financial_years_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."financial_years_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."finanicial_statements" TO "anon";
GRANT ALL ON TABLE "public"."finanicial_statements" TO "authenticated";
GRANT ALL ON TABLE "public"."finanicial_statements" TO "service_role";



GRANT ALL ON TABLE "public"."flattenmetrics" TO "anon";
GRANT ALL ON TABLE "public"."flattenmetrics" TO "authenticated";
GRANT ALL ON TABLE "public"."flattenmetrics" TO "service_role";



GRANT ALL ON SEQUENCE "public"."flattenmetrics_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."flattenmetrics_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."flattenmetrics_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."fundamental_annually" TO "anon";
GRANT ALL ON TABLE "public"."fundamental_annually" TO "authenticated";
GRANT ALL ON TABLE "public"."fundamental_annually" TO "service_role";



GRANT ALL ON TABLE "public"."fundamental_flattened" TO "anon";
GRANT ALL ON TABLE "public"."fundamental_flattened" TO "authenticated";
GRANT ALL ON TABLE "public"."fundamental_flattened" TO "service_role";



GRANT ALL ON SEQUENCE "public"."fundamental_flattened_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."fundamental_flattened_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."fundamental_flattened_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."iel_info" TO "anon";
GRANT ALL ON TABLE "public"."iel_info" TO "authenticated";
GRANT ALL ON TABLE "public"."iel_info" TO "service_role";



GRANT ALL ON TABLE "public"."iel_timing" TO "anon";
GRANT ALL ON TABLE "public"."iel_timing" TO "authenticated";
GRANT ALL ON TABLE "public"."iel_timing" TO "service_role";



GRANT ALL ON SEQUENCE "public"."iel_timing_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."iel_timing_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."iel_timing_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."income_annually" TO "anon";
GRANT ALL ON TABLE "public"."income_annually" TO "authenticated";
GRANT ALL ON TABLE "public"."income_annually" TO "service_role";



GRANT ALL ON TABLE "public"."income_annually_flattened" TO "anon";
GRANT ALL ON TABLE "public"."income_annually_flattened" TO "authenticated";
GRANT ALL ON TABLE "public"."income_annually_flattened" TO "service_role";



GRANT ALL ON SEQUENCE "public"."income_annually_flattened_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."income_annually_flattened_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."income_annually_flattened_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."income_quarterly" TO "anon";
GRANT ALL ON TABLE "public"."income_quarterly" TO "authenticated";
GRANT ALL ON TABLE "public"."income_quarterly" TO "service_role";



GRANT ALL ON TABLE "public"."income_quarterly_flattened" TO "anon";
GRANT ALL ON TABLE "public"."income_quarterly_flattened" TO "authenticated";
GRANT ALL ON TABLE "public"."income_quarterly_flattened" TO "service_role";



GRANT ALL ON SEQUENCE "public"."income_quarterly_flattened_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."income_quarterly_flattened_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."income_quarterly_flattened_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."market_days" TO "anon";
GRANT ALL ON TABLE "public"."market_days" TO "authenticated";
GRANT ALL ON TABLE "public"."market_days" TO "service_role";



GRANT ALL ON TABLE "public"."marketing_banner" TO "anon";
GRANT ALL ON TABLE "public"."marketing_banner" TO "authenticated";
GRANT ALL ON TABLE "public"."marketing_banner" TO "service_role";



GRANT ALL ON TABLE "public"."mock_orders" TO "anon";
GRANT ALL ON TABLE "public"."mock_orders" TO "authenticated";
GRANT ALL ON TABLE "public"."mock_orders" TO "service_role";



GRANT ALL ON SEQUENCE "public"."mock_orders_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."mock_orders_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."mock_orders_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."mock_positions" TO "anon";
GRANT ALL ON TABLE "public"."mock_positions" TO "authenticated";
GRANT ALL ON TABLE "public"."mock_positions" TO "service_role";



GRANT ALL ON TABLE "public"."mock_watchlist" TO "anon";
GRANT ALL ON TABLE "public"."mock_watchlist" TO "authenticated";
GRANT ALL ON TABLE "public"."mock_watchlist" TO "service_role";



GRANT ALL ON TABLE "public"."news" TO "anon";
GRANT ALL ON TABLE "public"."news" TO "authenticated";
GRANT ALL ON TABLE "public"."news" TO "service_role";



GRANT ALL ON TABLE "public"."notification_prefs" TO "anon";
GRANT ALL ON TABLE "public"."notification_prefs" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_prefs" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON SEQUENCE "public"."notifications_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."notifications_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."notifications_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."psx_sectors" TO "anon";
GRANT ALL ON TABLE "public"."psx_sectors" TO "authenticated";
GRANT ALL ON TABLE "public"."psx_sectors" TO "service_role";



GRANT ALL ON TABLE "public"."psx_symbols" TO "anon";
GRANT ALL ON TABLE "public"."psx_symbols" TO "authenticated";
GRANT ALL ON TABLE "public"."psx_symbols" TO "service_role";



GRANT ALL ON TABLE "public"."psx_symbols_by_sector" TO "anon";
GRANT ALL ON TABLE "public"."psx_symbols_by_sector" TO "authenticated";
GRANT ALL ON TABLE "public"."psx_symbols_by_sector" TO "service_role";



GRANT ALL ON TABLE "public"."push_tokens" TO "anon";
GRANT ALL ON TABLE "public"."push_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."push_tokens" TO "service_role";



GRANT ALL ON TABLE "public"."raastids" TO "anon";
GRANT ALL ON TABLE "public"."raastids" TO "authenticated";
GRANT ALL ON TABLE "public"."raastids" TO "service_role";



GRANT ALL ON TABLE "public"."research" TO "anon";
GRANT ALL ON TABLE "public"."research" TO "authenticated";
GRANT ALL ON TABLE "public"."research" TO "service_role";



GRANT ALL ON SEQUENCE "public"."research_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."research_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."research_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."research_iel" TO "anon";
GRANT ALL ON TABLE "public"."research_iel" TO "authenticated";
GRANT ALL ON TABLE "public"."research_iel" TO "service_role";



GRANT ALL ON SEQUENCE "public"."research_iel_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."research_iel_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."research_iel_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."sector" TO "anon";
GRANT ALL ON TABLE "public"."sector" TO "authenticated";
GRANT ALL ON TABLE "public"."sector" TO "service_role";



GRANT ALL ON SEQUENCE "public"."sector_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."sector_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."sector_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."sector_iel" TO "anon";
GRANT ALL ON TABLE "public"."sector_iel" TO "authenticated";
GRANT ALL ON TABLE "public"."sector_iel" TO "service_role";



GRANT ALL ON SEQUENCE "public"."sector_iel_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."sector_iel_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."sector_iel_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."stock_movements" TO "anon";
GRANT ALL ON TABLE "public"."stock_movements" TO "authenticated";
GRANT ALL ON TABLE "public"."stock_movements" TO "service_role";



GRANT ALL ON TABLE "public"."stock_volumes" TO "anon";
GRANT ALL ON TABLE "public"."stock_volumes" TO "authenticated";
GRANT ALL ON TABLE "public"."stock_volumes" TO "service_role";



GRANT ALL ON TABLE "public"."stocklogos" TO "anon";
GRANT ALL ON TABLE "public"."stocklogos" TO "authenticated";
GRANT ALL ON TABLE "public"."stocklogos" TO "service_role";



GRANT ALL ON TABLE "public"."stocks" TO "anon";
GRANT ALL ON TABLE "public"."stocks" TO "authenticated";
GRANT ALL ON TABLE "public"."stocks" TO "service_role";



GRANT ALL ON SEQUENCE "public"."stocks_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."stocks_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."stocks_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."symbol_financials" TO "anon";
GRANT ALL ON TABLE "public"."symbol_financials" TO "authenticated";
GRANT ALL ON TABLE "public"."symbol_financials" TO "service_role";



GRANT ALL ON SEQUENCE "public"."symbol_financials_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."symbol_financials_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."symbol_financials_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."symbol_research" TO "anon";
GRANT ALL ON TABLE "public"."symbol_research" TO "authenticated";
GRANT ALL ON TABLE "public"."symbol_research" TO "service_role";



GRANT ALL ON SEQUENCE "public"."symbol_research_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."symbol_research_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."symbol_research_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."todos" TO "anon";
GRANT ALL ON TABLE "public"."todos" TO "authenticated";
GRANT ALL ON TABLE "public"."todos" TO "service_role";



GRANT ALL ON TABLE "public"."trading_auth" TO "anon";
GRANT ALL ON TABLE "public"."trading_auth" TO "authenticated";
GRANT ALL ON TABLE "public"."trading_auth" TO "service_role";



GRANT ALL ON TABLE "public"."watchlist" TO "anon";
GRANT ALL ON TABLE "public"."watchlist" TO "authenticated";
GRANT ALL ON TABLE "public"."watchlist" TO "service_role";



GRANT ALL ON SEQUENCE "public"."watchlist_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."watchlist_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."watchlist_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."widrawrequest_request_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."widrawrequest_request_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."widrawrequest_request_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."widrawrequest" TO "anon";
GRANT ALL ON TABLE "public"."widrawrequest" TO "authenticated";
GRANT ALL ON TABLE "public"."widrawrequest" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































