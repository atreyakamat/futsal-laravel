--
-- PostgreSQL database dump
--

\restrict psQ7ny1GyMhDoimcSQhWeGb0YgQvYejYXCXu1TUzVv5069QBA2iIRcaWbByY6gg

-- Dumped from database version 16.14
-- Dumped by pg_dump version 16.14

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

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO postgres;

--
-- Name: admin_credentials; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.admin_credentials (
    id integer NOT NULL,
    admin_id integer NOT NULL,
    admin_type text NOT NULL,
    credential_token text NOT NULL,
    is_used boolean DEFAULT false NOT NULL,
    used_at timestamp(3) without time zone,
    expires_at timestamp(3) without time zone NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.admin_credentials OWNER TO postgres;

--
-- Name: admin_credentials_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.admin_credentials_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.admin_credentials_id_seq OWNER TO postgres;

--
-- Name: admin_credentials_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.admin_credentials_id_seq OWNED BY public.admin_credentials.id;


--
-- Name: admin_free_bookings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.admin_free_bookings (
    id integer NOT NULL,
    arena_admin_id integer NOT NULL,
    arena_id integer NOT NULL,
    booking_date text NOT NULL,
    time_slot text NOT NULL,
    number_of_rounds integer DEFAULT 1,
    status text DEFAULT 'pending'::text NOT NULL,
    approved_by integer,
    rejection_reason text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.admin_free_bookings OWNER TO postgres;

--
-- Name: admin_free_bookings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.admin_free_bookings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.admin_free_bookings_id_seq OWNER TO postgres;

--
-- Name: admin_free_bookings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.admin_free_bookings_id_seq OWNED BY public.admin_free_bookings.id;


--
-- Name: admin_slot_blocks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.admin_slot_blocks (
    id integer NOT NULL,
    super_admin_id integer,
    arena_id integer NOT NULL,
    booking_date text NOT NULL,
    time_slot text NOT NULL,
    number_of_rounds integer DEFAULT 1,
    reason text,
    status text DEFAULT 'confirmed'::text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.admin_slot_blocks OWNER TO postgres;

--
-- Name: admin_slot_blocks_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.admin_slot_blocks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.admin_slot_blocks_id_seq OWNER TO postgres;

--
-- Name: admin_slot_blocks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.admin_slot_blocks_id_seq OWNED BY public.admin_slot_blocks.id;


--
-- Name: approval_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.approval_requests (
    id integer NOT NULL,
    booking_id integer,
    status text DEFAULT 'pending'::text NOT NULL,
    notes text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    request_type text DEFAULT 'slot_template_update'::text NOT NULL,
    arena_id integer,
    requested_by integer,
    payload_json text,
    decision_by integer,
    decision_reason text,
    decision_at timestamp(3) without time zone,
    applied_at timestamp(3) without time zone
);


ALTER TABLE public.approval_requests OWNER TO postgres;

--
-- Name: approval_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.approval_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.approval_requests_id_seq OWNER TO postgres;

--
-- Name: approval_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.approval_requests_id_seq OWNED BY public.approval_requests.id;


--
-- Name: arena_admins; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.arena_admins (
    id integer NOT NULL,
    arena_id integer NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    phone text,
    is_active boolean DEFAULT true NOT NULL,
    created_by integer NOT NULL,
    last_login timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    first_name text,
    last_name text
);


ALTER TABLE public.arena_admins OWNER TO postgres;

--
-- Name: arena_admins_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.arena_admins_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.arena_admins_id_seq OWNER TO postgres;

--
-- Name: arena_admins_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.arena_admins_id_seq OWNED BY public.arena_admins.id;


--
-- Name: arena_managers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.arena_managers (
    id integer NOT NULL,
    user_id integer NOT NULL,
    arena_id integer NOT NULL,
    role text DEFAULT 'manager'::text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.arena_managers OWNER TO postgres;

--
-- Name: arena_managers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.arena_managers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.arena_managers_id_seq OWNER TO postgres;

--
-- Name: arena_managers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.arena_managers_id_seq OWNED BY public.arena_managers.id;


--
-- Name: arenas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.arenas (
    id integer NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    address text,
    contact_email text,
    contact_phone text,
    logo_url text,
    cover_image text,
    description text,
    status text DEFAULT 'active'::text NOT NULL,
    bot_enabled boolean DEFAULT false NOT NULL,
    gmaps_link text,
    created_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.arenas OWNER TO postgres;

--
-- Name: arenas_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.arenas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.arenas_id_seq OWNER TO postgres;

--
-- Name: arenas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.arenas_id_seq OWNED BY public.arenas.id;


--
-- Name: bookings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bookings (
    id integer NOT NULL,
    ticket_number text NOT NULL,
    booking_ref text NOT NULL,
    arena_id integer NOT NULL,
    user_id integer NOT NULL,
    booking_date text NOT NULL,
    time_slot text NOT NULL,
    customer_name text NOT NULL,
    customer_mobile text NOT NULL,
    customer_email text,
    amount numeric(10,2) NOT NULL,
    payment_status text DEFAULT 'pending'::text NOT NULL,
    payment_method text,
    notes text,
    checked_in boolean DEFAULT false NOT NULL,
    checked_in_at timestamp(3) without time zone,
    checked_in_by integer,
    is_free_booking boolean DEFAULT false NOT NULL,
    payu_mihpayid text,
    created_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    cancellation_reason text,
    cancellation_requested boolean DEFAULT false NOT NULL,
    refund_amount numeric(10,2),
    refund_status character varying(50) DEFAULT 'NONE'::character varying,
    refund_reviewed_at timestamp without time zone,
    refund_reviewed_by integer,
    refund_reason text,
    refund_processed_at timestamp without time zone,
    verification_method character varying(50) DEFAULT 'qr'::character varying
);


ALTER TABLE public.bookings OWNER TO postgres;

--
-- Name: bookings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.bookings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.bookings_id_seq OWNER TO postgres;

--
-- Name: bookings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.bookings_id_seq OWNED BY public.bookings.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id integer NOT NULL,
    user_id integer NOT NULL,
    role text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    request_type text,
    arena_id integer,
    status text,
    approver_id integer,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notifications_id_seq OWNER TO postgres;

--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- Name: otp_attempts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.otp_attempts (
    id integer NOT NULL,
    identifier text NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    locked_until timestamp(3) without time zone,
    last_attempt timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.otp_attempts OWNER TO postgres;

--
-- Name: otp_attempts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.otp_attempts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.otp_attempts_id_seq OWNER TO postgres;

--
-- Name: otp_attempts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.otp_attempts_id_seq OWNED BY public.otp_attempts.id;


--
-- Name: payment_audit_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payment_audit_logs (
    id integer NOT NULL,
    booking_ref text NOT NULL,
    status text NOT NULL,
    amount numeric(10,2) NOT NULL,
    mihpayid text,
    payload text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.payment_audit_logs OWNER TO postgres;

--
-- Name: payment_audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.payment_audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.payment_audit_logs_id_seq OWNER TO postgres;

--
-- Name: payment_audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.payment_audit_logs_id_seq OWNED BY public.payment_audit_logs.id;


--
-- Name: payment_callbacks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payment_callbacks (
    id integer NOT NULL,
    booking_ref text NOT NULL,
    gateway_id text NOT NULL,
    status text NOT NULL,
    raw_payload jsonb NOT NULL,
    received_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.payment_callbacks OWNER TO postgres;

--
-- Name: payment_callbacks_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.payment_callbacks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.payment_callbacks_id_seq OWNER TO postgres;

--
-- Name: payment_callbacks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.payment_callbacks_id_seq OWNED BY public.payment_callbacks.id;


--
-- Name: pricings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pricings (
    id integer NOT NULL,
    arena_id integer NOT NULL,
    time_slot text NOT NULL,
    price numeric(10,2) NOT NULL,
    created_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.pricings OWNER TO postgres;

--
-- Name: pricings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.pricings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.pricings_id_seq OWNER TO postgres;

--
-- Name: pricings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.pricings_id_seq OWNED BY public.pricings.id;


--
-- Name: reports; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.reports (
    id integer NOT NULL,
    arena_id integer NOT NULL,
    report_type text NOT NULL,
    date_range_start text NOT NULL,
    date_range_end text NOT NULL,
    total_bookings integer DEFAULT 0,
    total_revenue numeric(10,2) DEFAULT 0,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    average_duration numeric(5,2) DEFAULT 0,
    created_by integer,
    peak_hours text DEFAULT '[]'::text,
    report_data text,
    total_visitors integer DEFAULT 0
);


ALTER TABLE public.reports OWNER TO postgres;

--
-- Name: reports_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.reports_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.reports_id_seq OWNER TO postgres;

--
-- Name: reports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.reports_id_seq OWNED BY public.reports.id;


--
-- Name: revoked_sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.revoked_sessions (
    id integer NOT NULL,
    session_id text NOT NULL,
    revoked_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.revoked_sessions OWNER TO postgres;

--
-- Name: revoked_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.revoked_sessions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.revoked_sessions_id_seq OWNER TO postgres;

--
-- Name: revoked_sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.revoked_sessions_id_seq OWNED BY public.revoked_sessions.id;


--
-- Name: security_staff; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.security_staff (
    id integer NOT NULL,
    arena_id integer NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    phone text,
    permissions text[] DEFAULT ARRAY[]::text[],
    is_active boolean DEFAULT true NOT NULL,
    created_by integer NOT NULL,
    last_login timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    first_name text,
    last_name text
);


ALTER TABLE public.security_staff OWNER TO postgres;

--
-- Name: security_staff_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.security_staff_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.security_staff_id_seq OWNER TO postgres;

--
-- Name: security_staff_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.security_staff_id_seq OWNED BY public.security_staff.id;


--
-- Name: settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.settings (
    id integer NOT NULL,
    key text NOT NULL,
    value text,
    created_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.settings OWNER TO postgres;

--
-- Name: settings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.settings_id_seq OWNER TO postgres;

--
-- Name: settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.settings_id_seq OWNED BY public.settings.id;


--
-- Name: slot_approval_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.slot_approval_requests (
    id integer NOT NULL,
    arena_id integer NOT NULL,
    requested_by integer NOT NULL,
    request_type text DEFAULT 'block_slot'::text NOT NULL,
    booking_date text NOT NULL,
    time_slot text NOT NULL,
    reason text,
    status text DEFAULT 'pending'::text NOT NULL,
    approved_by integer,
    approved_at timestamp(3) without time zone,
    rejection_reason text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.slot_approval_requests OWNER TO postgres;

--
-- Name: slot_approval_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.slot_approval_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.slot_approval_requests_id_seq OWNER TO postgres;

--
-- Name: slot_approval_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.slot_approval_requests_id_seq OWNED BY public.slot_approval_requests.id;


--
-- Name: slot_locks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.slot_locks (
    id integer NOT NULL,
    arena_id integer NOT NULL,
    booking_date text NOT NULL,
    time_slot text NOT NULL,
    session_id text NOT NULL,
    locked_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    expires_at timestamp(3) without time zone NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.slot_locks OWNER TO postgres;

--
-- Name: slot_locks_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.slot_locks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.slot_locks_id_seq OWNER TO postgres;

--
-- Name: slot_locks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.slot_locks_id_seq OWNED BY public.slot_locks.id;


--
-- Name: slot_timings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.slot_timings (
    id integer NOT NULL,
    arena_id integer NOT NULL,
    time_slot text NOT NULL,
    start_time text NOT NULL,
    end_time text NOT NULL,
    day_of_week integer,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.slot_timings OWNER TO postgres;

--
-- Name: slot_timings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.slot_timings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.slot_timings_id_seq OWNER TO postgres;

--
-- Name: slot_timings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.slot_timings_id_seq OWNED BY public.slot_timings.id;


--
-- Name: super_admins; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.super_admins (
    id integer NOT NULL,
    user_id integer NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    permissions text[] DEFAULT ARRAY[]::text[],
    is_active boolean DEFAULT true NOT NULL,
    last_login timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    first_name text,
    last_name text
);


ALTER TABLE public.super_admins OWNER TO postgres;

--
-- Name: super_admins_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.super_admins_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.super_admins_id_seq OWNER TO postgres;

--
-- Name: super_admins_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.super_admins_id_seq OWNED BY public.super_admins.id;


--
-- Name: system_audit_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.system_audit_logs (
    id integer NOT NULL,
    super_admin_id integer,
    action text NOT NULL,
    entity_type text,
    entity_id integer,
    changes text,
    ip_address text,
    user_agent text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    approved_by integer,
    arena_id integer,
    field_changed text,
    new_value text,
    old_value text,
    reason text,
    requested_by integer
);


ALTER TABLE public.system_audit_logs OWNER TO postgres;

--
-- Name: system_audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.system_audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.system_audit_logs_id_seq OWNER TO postgres;

--
-- Name: system_audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.system_audit_logs_id_seq OWNED BY public.system_audit_logs.id;


--
-- Name: user_otps; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_otps (
    id integer NOT NULL,
    identifier text NOT NULL,
    otp text NOT NULL,
    expires_at timestamp(3) without time zone NOT NULL,
    created_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.user_otps OWNER TO postgres;

--
-- Name: user_otps_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_otps_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_otps_id_seq OWNER TO postgres;

--
-- Name: user_otps_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_otps_id_seq OWNED BY public.user_otps.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    email_verified_at timestamp(3) without time zone,
    password text,
    role text DEFAULT 'customer'::text NOT NULL,
    remember_token text,
    customer_mobile text,
    created_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: admin_credentials id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_credentials ALTER COLUMN id SET DEFAULT nextval('public.admin_credentials_id_seq'::regclass);


--
-- Name: admin_free_bookings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_free_bookings ALTER COLUMN id SET DEFAULT nextval('public.admin_free_bookings_id_seq'::regclass);


--
-- Name: admin_slot_blocks id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_slot_blocks ALTER COLUMN id SET DEFAULT nextval('public.admin_slot_blocks_id_seq'::regclass);


--
-- Name: approval_requests id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approval_requests ALTER COLUMN id SET DEFAULT nextval('public.approval_requests_id_seq'::regclass);


--
-- Name: arena_admins id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.arena_admins ALTER COLUMN id SET DEFAULT nextval('public.arena_admins_id_seq'::regclass);


--
-- Name: arena_managers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.arena_managers ALTER COLUMN id SET DEFAULT nextval('public.arena_managers_id_seq'::regclass);


--
-- Name: arenas id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.arenas ALTER COLUMN id SET DEFAULT nextval('public.arenas_id_seq'::regclass);


--
-- Name: bookings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bookings ALTER COLUMN id SET DEFAULT nextval('public.bookings_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- Name: otp_attempts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.otp_attempts ALTER COLUMN id SET DEFAULT nextval('public.otp_attempts_id_seq'::regclass);


--
-- Name: payment_audit_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_audit_logs ALTER COLUMN id SET DEFAULT nextval('public.payment_audit_logs_id_seq'::regclass);


--
-- Name: payment_callbacks id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_callbacks ALTER COLUMN id SET DEFAULT nextval('public.payment_callbacks_id_seq'::regclass);


--
-- Name: pricings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pricings ALTER COLUMN id SET DEFAULT nextval('public.pricings_id_seq'::regclass);


--
-- Name: reports id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reports ALTER COLUMN id SET DEFAULT nextval('public.reports_id_seq'::regclass);


--
-- Name: revoked_sessions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.revoked_sessions ALTER COLUMN id SET DEFAULT nextval('public.revoked_sessions_id_seq'::regclass);


--
-- Name: security_staff id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.security_staff ALTER COLUMN id SET DEFAULT nextval('public.security_staff_id_seq'::regclass);


--
-- Name: settings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.settings ALTER COLUMN id SET DEFAULT nextval('public.settings_id_seq'::regclass);


--
-- Name: slot_approval_requests id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.slot_approval_requests ALTER COLUMN id SET DEFAULT nextval('public.slot_approval_requests_id_seq'::regclass);


--
-- Name: slot_locks id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.slot_locks ALTER COLUMN id SET DEFAULT nextval('public.slot_locks_id_seq'::regclass);


--
-- Name: slot_timings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.slot_timings ALTER COLUMN id SET DEFAULT nextval('public.slot_timings_id_seq'::regclass);


--
-- Name: super_admins id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.super_admins ALTER COLUMN id SET DEFAULT nextval('public.super_admins_id_seq'::regclass);


--
-- Name: system_audit_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_audit_logs ALTER COLUMN id SET DEFAULT nextval('public.system_audit_logs_id_seq'::regclass);


--
-- Name: user_otps id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_otps ALTER COLUMN id SET DEFAULT nextval('public.user_otps_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
8038e058-5013-41ba-a257-7bb5704356e1	0f64b658133e2d1ee6da60b2514738733426d7782cacb1abb389fe344429573e	2026-07-29 08:53:34.7413+00	20260523000000_init	\N	\N	2026-07-29 08:53:34.265731+00	1
1a02fffa-10b0-43e8-bcba-27b3a852ac87	45da2667722ed485ca8a84f557d89d80487a86d50447efb5f096ce21be38cf6b	2026-07-29 08:53:36.096934+00	20260612132900_add_missing_models	\N	\N	2026-07-29 08:53:34.74652+00	1
4c05b387-3992-4f42-aff4-620fb326a86f	451b282126dd642e4cc1a3581a7fd1773e806edda9870d837fa62eaff903d22a	2026-07-29 08:53:36.122932+00	20260612134153_update_admin_names	\N	\N	2026-07-29 08:53:36.101376+00	1
8043a529-0a0e-4c56-a8d4-9eefbc7fff5a	07f5ee34ef072337f0de4c5546ecb4f28744e10a3deb5e05dd275e92637737fb	2026-07-29 08:53:36.201471+00	20260612134719_restore_approval_requests	\N	\N	2026-07-29 08:53:36.127154+00	1
fdaa52c1-e05b-4960-8f55-a43dc699fb2e	ebe9d06baec649efd825414feeb3d8a9443a8306c7b2c316820941e1d3190089	2026-07-29 08:53:36.250924+00	20260612134823_add_otp_attempts	\N	\N	2026-07-29 08:53:36.206155+00	1
31257b50-6e1a-4a28-ae26-4960e27b9fc6	920a6b968eaa5b369c922da9624670f76c85d49272d4da92b216f3aaff3748b2	2026-07-29 08:53:36.653178+00	20260710131325_add_cancellation_fields	\N	\N	2026-07-29 08:53:36.255343+00	1
\.


--
-- Data for Name: admin_credentials; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.admin_credentials (id, admin_id, admin_type, credential_token, is_used, used_at, expires_at, created_at) FROM stdin;
1	19	arena_admin	slo3jc4hA1!	f	\N	2026-07-31 04:34:39.614	2026-07-30 04:34:39.616
2	20	security	xdz30u62S1!	f	\N	2026-07-31 04:34:39.736	2026-07-30 04:34:39.737
3	21	arena_admin	ko116banA1!	f	\N	2026-07-31 04:36:48.374	2026-07-30 04:36:48.375
4	22	security	7chnozgjS1!	f	\N	2026-07-31 04:36:48.514	2026-07-30 04:36:48.515
5	23	arena_admin	wb4jssloA1!	f	\N	2026-07-31 04:38:49.686	2026-07-30 04:38:49.687
6	24	security	6txeqnyjS1!	f	\N	2026-07-31 04:38:49.836	2026-07-30 04:38:49.836
7	28	arena_admin	ft3bwacjA1!	f	\N	2026-07-31 04:55:21.657	2026-07-30 04:55:21.658
8	29	security	2laopfm6S1!	f	\N	2026-07-31 04:55:21.777	2026-07-30 04:55:21.777
9	30	arena_admin	dlfzidtaA1!	f	\N	2026-07-31 04:55:41.19	2026-07-30 04:55:41.191
10	31	security	sob1w1nhS1!	f	\N	2026-07-31 04:55:41.314	2026-07-30 04:55:41.314
11	32	arena_admin	ke84byd6A1!	f	\N	2026-07-31 04:56:46.978	2026-07-30 04:56:46.978
12	33	security	97dfudo5S1!	f	\N	2026-07-31 04:56:47.126	2026-07-30 04:56:47.127
\.


--
-- Data for Name: admin_free_bookings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.admin_free_bookings (id, arena_admin_id, arena_id, booking_date, time_slot, number_of_rounds, status, approved_by, rejection_reason, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: admin_slot_blocks; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.admin_slot_blocks (id, super_admin_id, arena_id, booking_date, time_slot, number_of_rounds, reason, status, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: approval_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.approval_requests (id, booking_id, status, notes, created_at, updated_at, request_type, arena_id, requested_by, payload_json, decision_by, decision_reason, decision_at, applied_at) FROM stdin;
1	\N	pending	Seasonal rebranding for monsoon tournament	2026-07-30 04:34:40.107	2026-07-30 04:34:40.107	IMAGE_UPDATE	19	19	{"cover_image":"https://images.futsal.local/arena-new.jpg"}	\N	\N	\N	\N
2	\N	pending	Routine pitch cleaning	2026-07-30 04:34:40.16	2026-07-30 04:34:40.16	FREE_BOOKING_REQUEST	19	19	{"bookingDate":"2026-07-30","slots":["09:00-10:00"],"customerName":"Pitch Cleaning"}	\N	\N	\N	\N
3	\N	pending	Seasonal rebranding for monsoon tournament	2026-07-30 04:36:49.875	2026-07-30 04:36:49.875	IMAGE_UPDATE	20	21	{"cover_image":"https://images.futsal.local/arena-new.jpg"}	\N	\N	\N	\N
4	\N	pending	Routine pitch cleaning	2026-07-30 04:36:49.939	2026-07-30 04:36:49.939	FREE_BOOKING_REQUEST	20	21	{"bookingDate":"2026-07-30","slots":["09:00-10:00"],"customerName":"Pitch Cleaning"}	\N	\N	\N	\N
5	\N	pending	Seasonal rebranding for monsoon tournament	2026-07-30 04:55:23.315	2026-07-30 04:55:23.315	IMAGE_UPDATE	24	28	{"cover_image":"https://images.futsal.local/arena-new.jpg"}	\N	\N	\N	\N
6	\N	pending	Routine pitch cleaning	2026-07-30 04:55:23.356	2026-07-30 04:55:23.356	FREE_BOOKING_REQUEST	24	28	{"bookingDate":"2026-07-30","slots":["09:00-10:00"],"customerName":"Pitch Cleaning"}	\N	\N	\N	\N
7	\N	pending	Team practice - request approval	2026-07-30 04:55:41.622	2026-07-30 04:55:41.622	FREE_BOOKING_REQUEST	25	30	{"bookingDate":"2026-07-30","slots":["11:00-12:00"],"customerName":"Free Booking Request","customerMobile":"N/A"}	\N	\N	\N	\N
8	\N	pending	Team practice - request approval	2026-07-30 04:56:47.486	2026-07-30 04:56:47.486	FREE_BOOKING_REQUEST	26	32	{"bookingDate":"2026-07-30","slots":["11:00-12:00"],"customerName":"Free Booking Request","customerMobile":"N/A"}	\N	\N	\N	\N
\.


--
-- Data for Name: arena_admins; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.arena_admins (id, arena_id, email, password_hash, phone, is_active, created_by, last_login, created_at, updated_at, first_name, last_name) FROM stdin;
19	19	admin_1785386079480@futsal.local	$2a$10$Xe4AC2OWYX196fqn15nk1uZr4I6cMA4fxGrq2sBZjkfGezNqG6yFW	\N	t	1	2026-07-30 04:34:40.075	2026-07-30 04:34:39.607	2026-07-30 04:34:39.607	Audit	Arena
21	20	admin_1785386203481@futsal.local	$2a$10$Z9TzOJVsbykT1UMFCjy2g.vzuznA7anL9SkUQRqj5hp2H83tijXqa	\N	t	1	2026-07-30 04:36:49.798	2026-07-30 04:36:48.368	2026-07-30 04:36:48.368	Audit	Arena
23	21	admin_1785386329329@test.local	$2a$10$PdFcpI7qy5jk.eDgP7U4fOV4NCntZUJH7ueKZxyuGkThB/3N68Hh6	\N	t	1	\N	2026-07-30 04:38:49.681	2026-07-30 04:38:49.681	Test	Arena
28	24	admin_1785387321593@futsal.local	$2a$10$cW6XxagF52sLBpD/8h5EJOTlOGGmUKAue8qJNgXWA9HpdDNda1Njm	\N	t	1	2026-07-30 04:55:23.286	2026-07-30 04:55:21.651	2026-07-30 04:55:21.651	Audit	Arena
30	25	admin_1785387340972@test.local	$2a$10$e5puPZPCTZPjZsBnGrDNFuK.YkaWXhRr3AeWUrBYdIjKjwce8rU/y	\N	t	1	2026-07-30 04:55:41.572	2026-07-30 04:55:41.185	2026-07-30 04:55:41.185	Test	Arena
32	26	admin_1785387406433@test.local	$2a$10$9NjsfNWxetyEl0v3bUcI0eO5g4fRIOkdVeIUgo5xzt5tSk5rAABmG	\N	t	1	2026-07-30 04:56:47.462	2026-07-30 04:56:46.973	2026-07-30 04:56:46.973	Test	Arena
1	1	arena@test.com	$2a$12$9n2V6dyOrac1lxrvJR3mN.gkE66jXQCX5Lt43Ppf9s5ZR0pVaDWHW	\N	t	2	\N	2026-07-29 08:53:39.756	2026-07-30 08:50:52.609	Arena	Admin
\.


--
-- Data for Name: arena_managers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.arena_managers (id, user_id, arena_id, role, created_at, updated_at) FROM stdin;
1	19	19	arena_admin	2026-07-30 04:34:39.598	2026-07-30 04:34:39.598
2	20	19	security	2026-07-30 04:34:39.723	2026-07-30 04:34:39.723
3	21	20	arena_admin	2026-07-30 04:36:48.363	2026-07-30 04:36:48.363
4	22	20	security	2026-07-30 04:36:48.496	2026-07-30 04:36:48.496
5	23	21	arena_admin	2026-07-30 04:38:49.673	2026-07-30 04:38:49.673
6	24	21	security	2026-07-30 04:38:49.824	2026-07-30 04:38:49.824
7	28	24	arena_admin	2026-07-30 04:55:21.644	2026-07-30 04:55:21.644
8	29	24	security	2026-07-30 04:55:21.766	2026-07-30 04:55:21.766
9	30	25	arena_admin	2026-07-30 04:55:41.18	2026-07-30 04:55:41.18
10	31	25	security	2026-07-30 04:55:41.306	2026-07-30 04:55:41.306
11	32	26	arena_admin	2026-07-30 04:56:46.968	2026-07-30 04:56:46.968
12	33	26	security	2026-07-30 04:56:47.116	2026-07-30 04:56:47.116
\.


--
-- Data for Name: arenas; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.arenas (id, name, slug, address, contact_email, contact_phone, logo_url, cover_image, description, status, bot_enabled, gmaps_link, created_at, updated_at) FROM stdin;
19	Audit Arena 1785386079886	audit-arena-1785386079886	Vasco Da Gama, Goa	audit@arena.local	\N	\N	\N	Updated description with premium branding	active	f	\N	2026-07-30 04:34:39.403	2026-07-30 04:34:39.473
20	Audit Arena 1785386208239	audit-arena-1785386208239	Vasco Da Gama, Goa	audit@arena.local	\N	\N	\N	Updated description with premium branding	active	f	\N	2026-07-30 04:36:48.165	2026-07-30 04:36:48.225
21	Test Arena 1785386329275	test-arena-1785386329275	\N	\N	\N	\N	\N	Test arena for E2E workflow	active	f	\N	2026-07-30 04:38:49.497	2026-07-30 04:38:49.497
24	Audit Arena 1785387322075	audit-arena-1785387322075	Vasco Da Gama, Goa	audit@arena.local	\N	\N	\N	Updated description with premium branding	active	f	\N	2026-07-30 04:55:21.467	2026-07-30 04:55:21.518
25	Test Arena 1785387340910	test-arena-1785387340910	\N	\N	\N	\N	\N	Test arena for E2E workflow	active	f	\N	2026-07-30 04:55:41.019	2026-07-30 04:55:41.019
26	Test Arena 1785387406376	test-arena-1785387406376	\N	\N	\N	\N	\N	Test arena for E2E workflow	active	f	\N	2026-07-30 04:56:46.805	2026-07-30 04:56:46.805
1	AIEM Assagao	aiem-assagao	Agnel Technical Educational Complex Assagao, Bardez – Goa 403507	\N	\N	\N	\N	AIEM Assagao Premium Futsal Turf	active	f	\N	2026-07-29 08:53:36.867	2026-07-29 08:53:36.867
\.


--
-- Data for Name: bookings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.bookings (id, ticket_number, booking_ref, arena_id, user_id, booking_date, time_slot, customer_name, customer_mobile, customer_email, amount, payment_status, payment_method, notes, checked_in, checked_in_at, checked_in_by, is_free_booking, payu_mihpayid, created_at, updated_at, cancellation_reason, cancellation_requested, refund_amount, refund_status, refund_reviewed_at, refund_reviewed_by, refund_reason, refund_processed_at, verification_method) FROM stdin;
1	AF-0001	AF-BOOK-0001	1	2	2026-07-30	18:00-19:00	League Night	+10000000001	bookings@anglefutsal.test	5000.00	confirmed	online	Seeded demo booking for Angle Futsal	f	\N	\N	f	\N	2026-07-29 08:53:39.768	2026-07-29 08:53:39.768	\N	f	\N	NONE	\N	\N	\N	\N	qr
2	AF-0002	AF-BOOK-0002	1	2	2026-07-31	19:00-20:00	Corporate Match	+10000000002	corporate@anglefutsal.test	6500.00	failed	online	Second seeded booking for the demo dashboard	f	\N	\N	f	\N	2026-07-29 08:53:39.768	2026-07-30 03:37:08.362	\N	f	\N	NONE	\N	\N	\N	\N	qr
19	TKT-260730-9859	REF-3893C7DD	21	25	2026-07-30	10:00-11:00	System Block (Super Admin)	0000000000	system@agnelarena.com	0.00	confirmed	free	\N	f	\N	\N	t	\N	2026-07-30 04:38:49.993	2026-07-30 04:38:49.993	\N	f	\N	NONE	\N	\N	\N	\N	qr
22	TKT-260730-AB35	REF-41097B35	25	25	2026-07-30	10:00-11:00	System Block (Super Admin)	0000000000	system@agnelarena.com	0.00	confirmed	free	\N	f	\N	\N	t	\N	2026-07-30 04:55:41.443	2026-07-30 04:55:41.443	\N	f	\N	NONE	\N	\N	\N	\N	qr
23	TKT-260730-C2BE	REF-E4F123D8	26	25	2026-07-30	10:00-11:00	System Block (Super Admin)	0000000000	system@agnelarena.com	0.00	confirmed	free	\N	f	\N	\N	t	\N	2026-07-30 04:56:47.329	2026-07-30 04:56:47.329	\N	f	\N	NONE	\N	\N	\N	\N	qr
26	TKT-260730-4303	REF-D6689442	1	36	2026-07-31	11:00-12:00	Phase4 AuditTest	919876543210	auditphase4@test.com	1003.00	failed	online	\N	f	\N	\N	f	\N	2026-07-30 07:46:39.425	2026-07-30 07:46:39.664	\N	f	\N	NONE	\N	\N	\N	\N	qr
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notifications (id, user_id, role, title, message, request_type, arena_id, status, approver_id, is_read, created_at) FROM stdin;
1	1	super_admin	New Approval Request	A new IMAGE_UPDATE request has been created.	IMAGE_UPDATE	19	pending	\N	f	2026-07-30 04:34:40.121
2	1	super_admin	New Approval Request	A new FREE_BOOKING_REQUEST request has been created.	FREE_BOOKING_REQUEST	19	pending	\N	f	2026-07-30 04:34:40.17
3	1	super_admin	New Approval Request	A new IMAGE_UPDATE request has been created.	IMAGE_UPDATE	20	pending	\N	f	2026-07-30 04:36:49.89
4	1	super_admin	New Approval Request	A new FREE_BOOKING_REQUEST request has been created.	FREE_BOOKING_REQUEST	20	pending	\N	f	2026-07-30 04:36:49.95
5	1	super_admin	New Approval Request	A new IMAGE_UPDATE request has been created.	IMAGE_UPDATE	24	pending	\N	f	2026-07-30 04:55:23.327
6	1	super_admin	New Approval Request	A new FREE_BOOKING_REQUEST request has been created.	FREE_BOOKING_REQUEST	24	pending	\N	f	2026-07-30 04:55:23.361
7	1	super_admin	New Approval Request	A new FREE_BOOKING_REQUEST request has been created.	FREE_BOOKING_REQUEST	25	pending	\N	f	2026-07-30 04:55:41.634
8	1	super_admin	New Approval Request	A new FREE_BOOKING_REQUEST request has been created.	FREE_BOOKING_REQUEST	26	pending	\N	f	2026-07-30 04:56:47.495
\.


--
-- Data for Name: otp_attempts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.otp_attempts (id, identifier, attempts, locked_until, last_attempt) FROM stdin;
1	919876543210	1	\N	2026-07-30 07:55:11.993
\.


--
-- Data for Name: payment_audit_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payment_audit_logs (id, booking_ref, status, amount, mihpayid, payload, created_at) FROM stdin;
\.


--
-- Data for Name: payment_callbacks; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payment_callbacks (id, booking_ref, gateway_id, status, raw_payload, received_at) FROM stdin;
\.


--
-- Data for Name: pricings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.pricings (id, arena_id, time_slot, price, created_at, updated_at) FROM stdin;
1	1	06:00-07:00	1003.00	2026-07-29 08:53:36.875	2026-07-30 08:50:49.331
2	1	07:00-08:00	1003.00	2026-07-29 08:53:36.881	2026-07-30 08:50:49.339
3	1	08:00-09:00	1003.00	2026-07-29 08:53:36.885	2026-07-30 08:50:49.345
4	1	09:00-10:00	1003.00	2026-07-29 08:53:36.889	2026-07-30 08:50:49.351
5	1	10:00-11:00	1003.00	2026-07-29 08:53:36.893	2026-07-30 08:50:49.357
6	1	11:00-12:00	1003.00	2026-07-29 08:53:36.898	2026-07-30 08:50:49.362
7	1	12:00-13:00	1003.00	2026-07-29 08:53:36.902	2026-07-30 08:50:49.368
8	1	13:00-14:00	1003.00	2026-07-29 08:53:36.906	2026-07-30 08:50:49.373
9	1	14:00-15:00	1003.00	2026-07-29 08:53:36.91	2026-07-30 08:50:49.378
10	1	15:00-16:00	1003.00	2026-07-29 08:53:36.914	2026-07-30 08:50:49.386
11	1	16:00-17:00	1003.00	2026-07-29 08:53:36.918	2026-07-30 08:50:49.391
12	1	17:00-18:00	1003.00	2026-07-29 08:53:36.922	2026-07-30 08:50:49.396
13	1	18:00-19:00	1416.00	2026-07-29 08:53:36.926	2026-07-30 08:50:49.4
14	1	19:00-20:00	1416.00	2026-07-29 08:53:36.93	2026-07-30 08:50:49.405
15	1	20:00-21:00	1416.00	2026-07-29 08:53:36.934	2026-07-30 08:50:49.412
16	1	21:00-22:00	1416.00	2026-07-29 08:53:36.938	2026-07-30 08:50:49.416
17	1	22:00-23:00	1416.00	2026-07-29 08:53:36.942	2026-07-30 08:50:49.422
18	1	23:00-00:00	1416.00	2026-07-29 08:53:36.946	2026-07-30 08:50:49.426
\.


--
-- Data for Name: reports; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.reports (id, arena_id, report_type, date_range_start, date_range_end, total_bookings, total_revenue, created_at, average_duration, created_by, peak_hours, report_data, total_visitors) FROM stdin;
\.


--
-- Data for Name: revoked_sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.revoked_sessions (id, session_id, revoked_at) FROM stdin;
\.


--
-- Data for Name: security_staff; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.security_staff (id, arena_id, email, password_hash, phone, permissions, is_active, created_by, last_login, created_at, updated_at, first_name, last_name) FROM stdin;
20	19	sec_1785386080128@futsal.local	$2a$10$NAvvXNLtO3EvRECcESqBYepYNlnKtw1CDE6xABTmrSeklphl1ZepC	\N	{check_in,check_out}	t	1	\N	2026-07-30 04:34:39.727	2026-07-30 04:34:39.727	Gate	Security
22	20	sec_1785386208467@futsal.local	$2a$10$Oc3LI4zyJ6jI0JA64tHF4eMHLjEGxxMb4/EljeaQaPc/ArJIfBduG	\N	{check_in,check_out}	t	1	\N	2026-07-30 04:36:48.506	2026-07-30 04:36:48.506	Gate	Security
24	21	security_1785386329482@test.local	$2a$10$tXVpk1cj3L5dRnn8dIwdsugliHtoCCv5g9HRWFwPNh8oAUDwJCBt.	\N	{check_in,check_out}	t	1	\N	2026-07-30 04:38:49.83	2026-07-30 04:38:49.83	Test	Security
29	24	sec_1785387322302@futsal.local	$2a$10$TgnneOuIiiD3bJMT2skcSesbSHy08ly.8yBk8SoUggRfVdNDrJdI6	\N	{check_in,check_out}	t	1	\N	2026-07-30 04:55:21.77	2026-07-30 04:55:21.77	Gate	Security
31	25	security_1785387341100@test.local	$2a$10$qzpVaEpKsEoJtaZnGuS3j.QM4zfW8Jw3C9cLK6pDI6xyFsD4IXM4e	\N	{check_in,check_out}	t	1	\N	2026-07-30 04:55:41.31	2026-07-30 04:55:41.31	Test	Security
33	26	security_1785387406571@test.local	$2a$10$sGBq8synDN8NDu1bncX6ruX/NgfMb7kNkgjXVSNN.eZ806eJPklo6	\N	{check_in,check_out}	t	1	\N	2026-07-30 04:56:47.121	2026-07-30 04:56:47.121	Test	Security
1	1	security@test.com	$2a$12$9n2V6dyOrac1lxrvJR3mN.gkE66jXQCX5Lt43Ppf9s5ZR0pVaDWHW	\N	{}	t	2	\N	2026-07-29 08:53:39.762	2026-07-30 08:50:52.616	Security	Guard
\.


--
-- Data for Name: settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.settings (id, key, value, created_at, updated_at) FROM stdin;
1	site.name	FutsalGoa	2026-07-29 08:53:39.314	2026-07-29 08:53:39.314
2	site.description	Premium Futsal Booking Platform for Goa	2026-07-29 08:53:39.314	2026-07-29 08:53:39.314
\.


--
-- Data for Name: slot_approval_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.slot_approval_requests (id, arena_id, requested_by, request_type, booking_date, time_slot, reason, status, approved_by, approved_at, rejection_reason, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: slot_locks; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.slot_locks (id, arena_id, booking_date, time_slot, session_id, locked_at, expires_at, created_at) FROM stdin;
1	20	2026-07-30	21:00-22:00	8cd326eb-0f92-4d93-b902-a6f40f191497	2026-07-30 04:36:48.634	2026-07-30 04:46:48.633	2026-07-30 04:36:48.634
2	24	2026-07-30	21:00-22:00	4a9b8280-5225-4b92-9ce3-16e1517e4651	2026-07-30 04:55:21.894	2026-07-30 05:05:21.893	2026-07-30 04:55:21.894
\.


--
-- Data for Name: slot_timings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.slot_timings (id, arena_id, time_slot, start_time, end_time, day_of_week, created_at, updated_at) FROM stdin;
1	1	06:00-07:00	06:00	07:00	\N	2026-07-29 08:53:36.95	2026-07-29 08:53:36.95
2	1	07:00-08:00	07:00	08:00	\N	2026-07-29 08:53:36.955	2026-07-29 08:53:36.955
3	1	08:00-09:00	08:00	09:00	\N	2026-07-29 08:53:36.959	2026-07-29 08:53:36.959
4	1	09:00-10:00	09:00	10:00	\N	2026-07-29 08:53:36.963	2026-07-29 08:53:36.963
5	1	10:00-11:00	10:00	11:00	\N	2026-07-29 08:53:36.967	2026-07-29 08:53:36.967
6	1	11:00-12:00	11:00	12:00	\N	2026-07-29 08:53:36.972	2026-07-29 08:53:36.972
7	1	12:00-13:00	12:00	13:00	\N	2026-07-29 08:53:36.977	2026-07-29 08:53:36.977
8	1	13:00-14:00	13:00	14:00	\N	2026-07-29 08:53:36.981	2026-07-29 08:53:36.981
9	1	14:00-15:00	14:00	15:00	\N	2026-07-29 08:53:36.985	2026-07-29 08:53:36.985
10	1	15:00-16:00	15:00	16:00	\N	2026-07-29 08:53:36.989	2026-07-29 08:53:36.989
11	1	16:00-17:00	16:00	17:00	\N	2026-07-29 08:53:36.994	2026-07-29 08:53:36.994
12	1	17:00-18:00	17:00	18:00	\N	2026-07-29 08:53:36.998	2026-07-29 08:53:36.998
13	1	18:00-19:00	18:00	19:00	\N	2026-07-29 08:53:37.001	2026-07-29 08:53:37.001
14	1	19:00-20:00	19:00	20:00	\N	2026-07-29 08:53:37.005	2026-07-29 08:53:37.005
15	1	20:00-21:00	20:00	21:00	\N	2026-07-29 08:53:37.009	2026-07-29 08:53:37.009
16	1	21:00-22:00	21:00	22:00	\N	2026-07-29 08:53:37.013	2026-07-29 08:53:37.013
17	1	22:00-23:00	22:00	23:00	\N	2026-07-29 08:53:37.017	2026-07-29 08:53:37.017
18	1	23:00-00:00	23:00	00:00	\N	2026-07-29 08:53:37.021	2026-07-29 08:53:37.021
19	1	06:00-07:00	06:00	07:00	\N	2026-07-29 08:53:39.314	2026-07-29 08:53:39.314
20	1	07:00-08:00	07:00	08:00	\N	2026-07-29 08:53:39.314	2026-07-29 08:53:39.314
21	1	08:00-09:00	08:00	09:00	\N	2026-07-29 08:53:39.314	2026-07-29 08:53:39.314
22	1	09:00-10:00	09:00	10:00	\N	2026-07-29 08:53:39.314	2026-07-29 08:53:39.314
23	1	10:00-11:00	10:00	11:00	\N	2026-07-29 08:53:39.314	2026-07-29 08:53:39.314
24	1	11:00-12:00	11:00	12:00	\N	2026-07-29 08:53:39.314	2026-07-29 08:53:39.314
25	1	12:00-13:00	12:00	13:00	\N	2026-07-29 08:53:39.314	2026-07-29 08:53:39.314
26	1	13:00-14:00	13:00	14:00	\N	2026-07-29 08:53:39.314	2026-07-29 08:53:39.314
27	1	14:00-15:00	14:00	15:00	\N	2026-07-29 08:53:39.314	2026-07-29 08:53:39.314
28	1	15:00-16:00	15:00	16:00	\N	2026-07-29 08:53:39.314	2026-07-29 08:53:39.314
29	1	16:00-17:00	16:00	17:00	\N	2026-07-29 08:53:39.314	2026-07-29 08:53:39.314
30	1	17:00-18:00	17:00	18:00	\N	2026-07-29 08:53:39.314	2026-07-29 08:53:39.314
31	1	18:00-19:00	18:00	19:00	\N	2026-07-29 08:53:39.314	2026-07-29 08:53:39.314
32	1	19:00-20:00	19:00	20:00	\N	2026-07-29 08:53:39.314	2026-07-29 08:53:39.314
33	1	20:00-21:00	20:00	21:00	\N	2026-07-29 08:53:39.314	2026-07-29 08:53:39.314
34	1	21:00-22:00	21:00	22:00	\N	2026-07-29 08:53:39.314	2026-07-29 08:53:39.314
35	1	22:00-23:00	22:00	23:00	\N	2026-07-29 08:53:39.314	2026-07-29 08:53:39.314
36	1	23:00-00:00	23:00	00:00	\N	2026-07-29 08:53:39.314	2026-07-29 08:53:39.314
37	1	06:00-07:00	06:00	07:00	\N	2026-07-29 08:54:48.751	2026-07-29 08:54:48.751
38	1	07:00-08:00	07:00	08:00	\N	2026-07-29 08:54:48.756	2026-07-29 08:54:48.756
39	1	08:00-09:00	08:00	09:00	\N	2026-07-29 08:54:48.76	2026-07-29 08:54:48.76
40	1	09:00-10:00	09:00	10:00	\N	2026-07-29 08:54:48.764	2026-07-29 08:54:48.764
41	1	10:00-11:00	10:00	11:00	\N	2026-07-29 08:54:48.767	2026-07-29 08:54:48.767
42	1	11:00-12:00	11:00	12:00	\N	2026-07-29 08:54:48.771	2026-07-29 08:54:48.771
43	1	12:00-13:00	12:00	13:00	\N	2026-07-29 08:54:48.774	2026-07-29 08:54:48.774
44	1	13:00-14:00	13:00	14:00	\N	2026-07-29 08:54:48.778	2026-07-29 08:54:48.778
45	1	14:00-15:00	14:00	15:00	\N	2026-07-29 08:54:48.782	2026-07-29 08:54:48.782
46	1	15:00-16:00	15:00	16:00	\N	2026-07-29 08:54:48.785	2026-07-29 08:54:48.785
47	1	16:00-17:00	16:00	17:00	\N	2026-07-29 08:54:48.789	2026-07-29 08:54:48.789
48	1	17:00-18:00	17:00	18:00	\N	2026-07-29 08:54:48.792	2026-07-29 08:54:48.792
49	1	18:00-19:00	18:00	19:00	\N	2026-07-29 08:54:48.795	2026-07-29 08:54:48.795
50	1	19:00-20:00	19:00	20:00	\N	2026-07-29 08:54:48.799	2026-07-29 08:54:48.799
51	1	20:00-21:00	20:00	21:00	\N	2026-07-29 08:54:48.802	2026-07-29 08:54:48.802
52	1	21:00-22:00	21:00	22:00	\N	2026-07-29 08:54:48.806	2026-07-29 08:54:48.806
53	1	22:00-23:00	22:00	23:00	\N	2026-07-29 08:54:48.809	2026-07-29 08:54:48.809
54	1	23:00-00:00	23:00	00:00	\N	2026-07-29 08:54:48.813	2026-07-29 08:54:48.813
55	1	06:00-07:00	06:00	07:00	\N	2026-07-29 08:54:51.222	2026-07-29 08:54:51.222
56	1	07:00-08:00	07:00	08:00	\N	2026-07-29 08:54:51.222	2026-07-29 08:54:51.222
57	1	08:00-09:00	08:00	09:00	\N	2026-07-29 08:54:51.222	2026-07-29 08:54:51.222
58	1	09:00-10:00	09:00	10:00	\N	2026-07-29 08:54:51.222	2026-07-29 08:54:51.222
59	1	10:00-11:00	10:00	11:00	\N	2026-07-29 08:54:51.222	2026-07-29 08:54:51.222
60	1	11:00-12:00	11:00	12:00	\N	2026-07-29 08:54:51.222	2026-07-29 08:54:51.222
61	1	12:00-13:00	12:00	13:00	\N	2026-07-29 08:54:51.222	2026-07-29 08:54:51.222
62	1	13:00-14:00	13:00	14:00	\N	2026-07-29 08:54:51.222	2026-07-29 08:54:51.222
63	1	14:00-15:00	14:00	15:00	\N	2026-07-29 08:54:51.222	2026-07-29 08:54:51.222
64	1	15:00-16:00	15:00	16:00	\N	2026-07-29 08:54:51.222	2026-07-29 08:54:51.222
65	1	16:00-17:00	16:00	17:00	\N	2026-07-29 08:54:51.222	2026-07-29 08:54:51.222
66	1	17:00-18:00	17:00	18:00	\N	2026-07-29 08:54:51.222	2026-07-29 08:54:51.222
67	1	18:00-19:00	18:00	19:00	\N	2026-07-29 08:54:51.222	2026-07-29 08:54:51.222
68	1	19:00-20:00	19:00	20:00	\N	2026-07-29 08:54:51.222	2026-07-29 08:54:51.222
69	1	20:00-21:00	20:00	21:00	\N	2026-07-29 08:54:51.222	2026-07-29 08:54:51.222
70	1	21:00-22:00	21:00	22:00	\N	2026-07-29 08:54:51.222	2026-07-29 08:54:51.222
71	1	22:00-23:00	22:00	23:00	\N	2026-07-29 08:54:51.222	2026-07-29 08:54:51.222
72	1	23:00-00:00	23:00	00:00	\N	2026-07-29 08:54:51.222	2026-07-29 08:54:51.222
73	1	06:00-07:00	06:00	07:00	\N	2026-07-29 08:55:31.244	2026-07-29 08:55:31.244
74	1	07:00-08:00	07:00	08:00	\N	2026-07-29 08:55:31.248	2026-07-29 08:55:31.248
75	1	08:00-09:00	08:00	09:00	\N	2026-07-29 08:55:31.252	2026-07-29 08:55:31.252
76	1	09:00-10:00	09:00	10:00	\N	2026-07-29 08:55:31.256	2026-07-29 08:55:31.256
77	1	10:00-11:00	10:00	11:00	\N	2026-07-29 08:55:31.26	2026-07-29 08:55:31.26
78	1	11:00-12:00	11:00	12:00	\N	2026-07-29 08:55:31.264	2026-07-29 08:55:31.264
79	1	12:00-13:00	12:00	13:00	\N	2026-07-29 08:55:31.267	2026-07-29 08:55:31.267
80	1	13:00-14:00	13:00	14:00	\N	2026-07-29 08:55:31.271	2026-07-29 08:55:31.271
81	1	14:00-15:00	14:00	15:00	\N	2026-07-29 08:55:31.275	2026-07-29 08:55:31.275
82	1	15:00-16:00	15:00	16:00	\N	2026-07-29 08:55:31.279	2026-07-29 08:55:31.279
83	1	16:00-17:00	16:00	17:00	\N	2026-07-29 08:55:31.283	2026-07-29 08:55:31.283
84	1	17:00-18:00	17:00	18:00	\N	2026-07-29 08:55:31.287	2026-07-29 08:55:31.287
85	1	18:00-19:00	18:00	19:00	\N	2026-07-29 08:55:31.291	2026-07-29 08:55:31.291
86	1	19:00-20:00	19:00	20:00	\N	2026-07-29 08:55:31.295	2026-07-29 08:55:31.295
87	1	20:00-21:00	20:00	21:00	\N	2026-07-29 08:55:31.299	2026-07-29 08:55:31.299
88	1	21:00-22:00	21:00	22:00	\N	2026-07-29 08:55:31.303	2026-07-29 08:55:31.303
89	1	22:00-23:00	22:00	23:00	\N	2026-07-29 08:55:31.307	2026-07-29 08:55:31.307
90	1	23:00-00:00	23:00	00:00	\N	2026-07-29 08:55:31.312	2026-07-29 08:55:31.312
91	1	06:00-07:00	06:00	07:00	\N	2026-07-29 08:55:33.781	2026-07-29 08:55:33.781
92	1	07:00-08:00	07:00	08:00	\N	2026-07-29 08:55:33.781	2026-07-29 08:55:33.781
93	1	08:00-09:00	08:00	09:00	\N	2026-07-29 08:55:33.781	2026-07-29 08:55:33.781
94	1	09:00-10:00	09:00	10:00	\N	2026-07-29 08:55:33.781	2026-07-29 08:55:33.781
95	1	10:00-11:00	10:00	11:00	\N	2026-07-29 08:55:33.781	2026-07-29 08:55:33.781
96	1	11:00-12:00	11:00	12:00	\N	2026-07-29 08:55:33.781	2026-07-29 08:55:33.781
97	1	12:00-13:00	12:00	13:00	\N	2026-07-29 08:55:33.781	2026-07-29 08:55:33.781
98	1	13:00-14:00	13:00	14:00	\N	2026-07-29 08:55:33.781	2026-07-29 08:55:33.781
99	1	14:00-15:00	14:00	15:00	\N	2026-07-29 08:55:33.781	2026-07-29 08:55:33.781
100	1	15:00-16:00	15:00	16:00	\N	2026-07-29 08:55:33.781	2026-07-29 08:55:33.781
101	1	16:00-17:00	16:00	17:00	\N	2026-07-29 08:55:33.781	2026-07-29 08:55:33.781
102	1	17:00-18:00	17:00	18:00	\N	2026-07-29 08:55:33.781	2026-07-29 08:55:33.781
103	1	18:00-19:00	18:00	19:00	\N	2026-07-29 08:55:33.781	2026-07-29 08:55:33.781
104	1	19:00-20:00	19:00	20:00	\N	2026-07-29 08:55:33.781	2026-07-29 08:55:33.781
105	1	20:00-21:00	20:00	21:00	\N	2026-07-29 08:55:33.781	2026-07-29 08:55:33.781
106	1	21:00-22:00	21:00	22:00	\N	2026-07-29 08:55:33.781	2026-07-29 08:55:33.781
107	1	22:00-23:00	22:00	23:00	\N	2026-07-29 08:55:33.781	2026-07-29 08:55:33.781
108	1	23:00-00:00	23:00	00:00	\N	2026-07-29 08:55:33.781	2026-07-29 08:55:33.781
109	1	06:00-07:00	06:00	07:00	\N	2026-07-29 08:55:40.15	2026-07-29 08:55:40.15
110	1	07:00-08:00	07:00	08:00	\N	2026-07-29 08:55:40.153	2026-07-29 08:55:40.153
111	1	08:00-09:00	08:00	09:00	\N	2026-07-29 08:55:40.156	2026-07-29 08:55:40.156
112	1	09:00-10:00	09:00	10:00	\N	2026-07-29 08:55:40.158	2026-07-29 08:55:40.158
113	1	10:00-11:00	10:00	11:00	\N	2026-07-29 08:55:40.161	2026-07-29 08:55:40.161
114	1	11:00-12:00	11:00	12:00	\N	2026-07-29 08:55:40.163	2026-07-29 08:55:40.163
115	1	12:00-13:00	12:00	13:00	\N	2026-07-29 08:55:40.166	2026-07-29 08:55:40.166
116	1	13:00-14:00	13:00	14:00	\N	2026-07-29 08:55:40.168	2026-07-29 08:55:40.168
117	1	14:00-15:00	14:00	15:00	\N	2026-07-29 08:55:40.171	2026-07-29 08:55:40.171
118	1	15:00-16:00	15:00	16:00	\N	2026-07-29 08:55:40.173	2026-07-29 08:55:40.173
119	1	16:00-17:00	16:00	17:00	\N	2026-07-29 08:55:40.176	2026-07-29 08:55:40.176
120	1	17:00-18:00	17:00	18:00	\N	2026-07-29 08:55:40.178	2026-07-29 08:55:40.178
121	1	18:00-19:00	18:00	19:00	\N	2026-07-29 08:55:40.18	2026-07-29 08:55:40.18
122	1	19:00-20:00	19:00	20:00	\N	2026-07-29 08:55:40.183	2026-07-29 08:55:40.183
123	1	20:00-21:00	20:00	21:00	\N	2026-07-29 08:55:40.186	2026-07-29 08:55:40.186
124	1	21:00-22:00	21:00	22:00	\N	2026-07-29 08:55:40.188	2026-07-29 08:55:40.188
125	1	22:00-23:00	22:00	23:00	\N	2026-07-29 08:55:40.19	2026-07-29 08:55:40.19
126	1	23:00-00:00	23:00	00:00	\N	2026-07-29 08:55:40.193	2026-07-29 08:55:40.193
127	1	06:00-07:00	06:00	07:00	\N	2026-07-29 08:55:42.374	2026-07-29 08:55:42.374
128	1	07:00-08:00	07:00	08:00	\N	2026-07-29 08:55:42.374	2026-07-29 08:55:42.374
129	1	08:00-09:00	08:00	09:00	\N	2026-07-29 08:55:42.374	2026-07-29 08:55:42.374
130	1	09:00-10:00	09:00	10:00	\N	2026-07-29 08:55:42.374	2026-07-29 08:55:42.374
131	1	10:00-11:00	10:00	11:00	\N	2026-07-29 08:55:42.374	2026-07-29 08:55:42.374
132	1	11:00-12:00	11:00	12:00	\N	2026-07-29 08:55:42.374	2026-07-29 08:55:42.374
133	1	12:00-13:00	12:00	13:00	\N	2026-07-29 08:55:42.374	2026-07-29 08:55:42.374
134	1	13:00-14:00	13:00	14:00	\N	2026-07-29 08:55:42.374	2026-07-29 08:55:42.374
135	1	14:00-15:00	14:00	15:00	\N	2026-07-29 08:55:42.374	2026-07-29 08:55:42.374
136	1	15:00-16:00	15:00	16:00	\N	2026-07-29 08:55:42.374	2026-07-29 08:55:42.374
137	1	16:00-17:00	16:00	17:00	\N	2026-07-29 08:55:42.374	2026-07-29 08:55:42.374
138	1	17:00-18:00	17:00	18:00	\N	2026-07-29 08:55:42.374	2026-07-29 08:55:42.374
139	1	18:00-19:00	18:00	19:00	\N	2026-07-29 08:55:42.374	2026-07-29 08:55:42.374
140	1	19:00-20:00	19:00	20:00	\N	2026-07-29 08:55:42.374	2026-07-29 08:55:42.374
141	1	20:00-21:00	20:00	21:00	\N	2026-07-29 08:55:42.374	2026-07-29 08:55:42.374
142	1	21:00-22:00	21:00	22:00	\N	2026-07-29 08:55:42.374	2026-07-29 08:55:42.374
143	1	22:00-23:00	22:00	23:00	\N	2026-07-29 08:55:42.374	2026-07-29 08:55:42.374
144	1	23:00-00:00	23:00	00:00	\N	2026-07-29 08:55:42.374	2026-07-29 08:55:42.374
145	1	06:00-07:00	06:00	07:00	\N	2026-07-29 11:00:51.352	2026-07-29 11:00:51.352
146	1	07:00-08:00	07:00	08:00	\N	2026-07-29 11:00:51.359	2026-07-29 11:00:51.359
147	1	08:00-09:00	08:00	09:00	\N	2026-07-29 11:00:51.362	2026-07-29 11:00:51.362
148	1	09:00-10:00	09:00	10:00	\N	2026-07-29 11:00:51.366	2026-07-29 11:00:51.366
149	1	10:00-11:00	10:00	11:00	\N	2026-07-29 11:00:51.37	2026-07-29 11:00:51.37
150	1	11:00-12:00	11:00	12:00	\N	2026-07-29 11:00:51.373	2026-07-29 11:00:51.373
151	1	12:00-13:00	12:00	13:00	\N	2026-07-29 11:00:51.377	2026-07-29 11:00:51.377
152	1	13:00-14:00	13:00	14:00	\N	2026-07-29 11:00:51.381	2026-07-29 11:00:51.381
153	1	14:00-15:00	14:00	15:00	\N	2026-07-29 11:00:51.384	2026-07-29 11:00:51.384
154	1	15:00-16:00	15:00	16:00	\N	2026-07-29 11:00:51.388	2026-07-29 11:00:51.388
155	1	16:00-17:00	16:00	17:00	\N	2026-07-29 11:00:51.392	2026-07-29 11:00:51.392
156	1	17:00-18:00	17:00	18:00	\N	2026-07-29 11:00:51.395	2026-07-29 11:00:51.395
157	1	18:00-19:00	18:00	19:00	\N	2026-07-29 11:00:51.399	2026-07-29 11:00:51.399
158	1	19:00-20:00	19:00	20:00	\N	2026-07-29 11:00:51.402	2026-07-29 11:00:51.402
159	1	20:00-21:00	20:00	21:00	\N	2026-07-29 11:00:51.406	2026-07-29 11:00:51.406
160	1	21:00-22:00	21:00	22:00	\N	2026-07-29 11:00:51.409	2026-07-29 11:00:51.409
161	1	22:00-23:00	22:00	23:00	\N	2026-07-29 11:00:51.412	2026-07-29 11:00:51.412
162	1	23:00-00:00	23:00	00:00	\N	2026-07-29 11:00:51.416	2026-07-29 11:00:51.416
163	1	06:00-07:00	06:00	07:00	\N	2026-07-29 11:00:53.722	2026-07-29 11:00:53.722
164	1	07:00-08:00	07:00	08:00	\N	2026-07-29 11:00:53.722	2026-07-29 11:00:53.722
165	1	08:00-09:00	08:00	09:00	\N	2026-07-29 11:00:53.722	2026-07-29 11:00:53.722
166	1	09:00-10:00	09:00	10:00	\N	2026-07-29 11:00:53.722	2026-07-29 11:00:53.722
167	1	10:00-11:00	10:00	11:00	\N	2026-07-29 11:00:53.722	2026-07-29 11:00:53.722
168	1	11:00-12:00	11:00	12:00	\N	2026-07-29 11:00:53.722	2026-07-29 11:00:53.722
169	1	12:00-13:00	12:00	13:00	\N	2026-07-29 11:00:53.722	2026-07-29 11:00:53.722
170	1	13:00-14:00	13:00	14:00	\N	2026-07-29 11:00:53.722	2026-07-29 11:00:53.722
171	1	14:00-15:00	14:00	15:00	\N	2026-07-29 11:00:53.722	2026-07-29 11:00:53.722
172	1	15:00-16:00	15:00	16:00	\N	2026-07-29 11:00:53.722	2026-07-29 11:00:53.722
173	1	16:00-17:00	16:00	17:00	\N	2026-07-29 11:00:53.722	2026-07-29 11:00:53.722
174	1	17:00-18:00	17:00	18:00	\N	2026-07-29 11:00:53.722	2026-07-29 11:00:53.722
175	1	18:00-19:00	18:00	19:00	\N	2026-07-29 11:00:53.722	2026-07-29 11:00:53.722
176	1	19:00-20:00	19:00	20:00	\N	2026-07-29 11:00:53.722	2026-07-29 11:00:53.722
177	1	20:00-21:00	20:00	21:00	\N	2026-07-29 11:00:53.722	2026-07-29 11:00:53.722
178	1	21:00-22:00	21:00	22:00	\N	2026-07-29 11:00:53.722	2026-07-29 11:00:53.722
179	1	22:00-23:00	22:00	23:00	\N	2026-07-29 11:00:53.722	2026-07-29 11:00:53.722
180	1	23:00-00:00	23:00	00:00	\N	2026-07-29 11:00:53.722	2026-07-29 11:00:53.722
181	1	06:00-07:00	06:00	07:00	\N	2026-07-30 03:37:21.082	2026-07-30 03:37:21.082
182	1	07:00-08:00	07:00	08:00	\N	2026-07-30 03:37:21.087	2026-07-30 03:37:21.087
183	1	08:00-09:00	08:00	09:00	\N	2026-07-30 03:37:21.09	2026-07-30 03:37:21.09
184	1	09:00-10:00	09:00	10:00	\N	2026-07-30 03:37:21.092	2026-07-30 03:37:21.092
185	1	10:00-11:00	10:00	11:00	\N	2026-07-30 03:37:21.094	2026-07-30 03:37:21.094
186	1	11:00-12:00	11:00	12:00	\N	2026-07-30 03:37:21.097	2026-07-30 03:37:21.097
187	1	12:00-13:00	12:00	13:00	\N	2026-07-30 03:37:21.099	2026-07-30 03:37:21.099
188	1	13:00-14:00	13:00	14:00	\N	2026-07-30 03:37:21.102	2026-07-30 03:37:21.102
189	1	14:00-15:00	14:00	15:00	\N	2026-07-30 03:37:21.104	2026-07-30 03:37:21.104
190	1	15:00-16:00	15:00	16:00	\N	2026-07-30 03:37:21.106	2026-07-30 03:37:21.106
191	1	16:00-17:00	16:00	17:00	\N	2026-07-30 03:37:21.108	2026-07-30 03:37:21.108
192	1	17:00-18:00	17:00	18:00	\N	2026-07-30 03:37:21.111	2026-07-30 03:37:21.111
193	1	18:00-19:00	18:00	19:00	\N	2026-07-30 03:37:21.114	2026-07-30 03:37:21.114
194	1	19:00-20:00	19:00	20:00	\N	2026-07-30 03:37:21.116	2026-07-30 03:37:21.116
195	1	20:00-21:00	20:00	21:00	\N	2026-07-30 03:37:21.118	2026-07-30 03:37:21.118
196	1	21:00-22:00	21:00	22:00	\N	2026-07-30 03:37:21.121	2026-07-30 03:37:21.121
197	1	22:00-23:00	22:00	23:00	\N	2026-07-30 03:37:21.124	2026-07-30 03:37:21.124
198	1	23:00-00:00	23:00	00:00	\N	2026-07-30 03:37:21.127	2026-07-30 03:37:21.127
199	1	06:00-07:00	06:00	07:00	\N	2026-07-30 03:37:24.821	2026-07-30 03:37:24.821
200	1	07:00-08:00	07:00	08:00	\N	2026-07-30 03:37:24.821	2026-07-30 03:37:24.821
201	1	08:00-09:00	08:00	09:00	\N	2026-07-30 03:37:24.821	2026-07-30 03:37:24.821
202	1	09:00-10:00	09:00	10:00	\N	2026-07-30 03:37:24.821	2026-07-30 03:37:24.821
203	1	10:00-11:00	10:00	11:00	\N	2026-07-30 03:37:24.821	2026-07-30 03:37:24.821
204	1	11:00-12:00	11:00	12:00	\N	2026-07-30 03:37:24.821	2026-07-30 03:37:24.821
205	1	12:00-13:00	12:00	13:00	\N	2026-07-30 03:37:24.821	2026-07-30 03:37:24.821
206	1	13:00-14:00	13:00	14:00	\N	2026-07-30 03:37:24.821	2026-07-30 03:37:24.821
207	1	14:00-15:00	14:00	15:00	\N	2026-07-30 03:37:24.821	2026-07-30 03:37:24.821
208	1	15:00-16:00	15:00	16:00	\N	2026-07-30 03:37:24.821	2026-07-30 03:37:24.821
209	1	16:00-17:00	16:00	17:00	\N	2026-07-30 03:37:24.821	2026-07-30 03:37:24.821
210	1	17:00-18:00	17:00	18:00	\N	2026-07-30 03:37:24.821	2026-07-30 03:37:24.821
211	1	18:00-19:00	18:00	19:00	\N	2026-07-30 03:37:24.821	2026-07-30 03:37:24.821
212	1	19:00-20:00	19:00	20:00	\N	2026-07-30 03:37:24.821	2026-07-30 03:37:24.821
213	1	20:00-21:00	20:00	21:00	\N	2026-07-30 03:37:24.821	2026-07-30 03:37:24.821
214	1	21:00-22:00	21:00	22:00	\N	2026-07-30 03:37:24.821	2026-07-30 03:37:24.821
215	1	22:00-23:00	22:00	23:00	\N	2026-07-30 03:37:24.821	2026-07-30 03:37:24.821
216	1	23:00-00:00	23:00	00:00	\N	2026-07-30 03:37:24.821	2026-07-30 03:37:24.821
217	1	06:00-07:00	06:00	07:00	\N	2026-07-30 03:37:32.529	2026-07-30 03:37:32.529
218	1	07:00-08:00	07:00	08:00	\N	2026-07-30 03:37:32.534	2026-07-30 03:37:32.534
219	1	08:00-09:00	08:00	09:00	\N	2026-07-30 03:37:32.537	2026-07-30 03:37:32.537
220	1	09:00-10:00	09:00	10:00	\N	2026-07-30 03:37:32.539	2026-07-30 03:37:32.539
221	1	10:00-11:00	10:00	11:00	\N	2026-07-30 03:37:32.542	2026-07-30 03:37:32.542
222	1	11:00-12:00	11:00	12:00	\N	2026-07-30 03:37:32.544	2026-07-30 03:37:32.544
223	1	12:00-13:00	12:00	13:00	\N	2026-07-30 03:37:32.546	2026-07-30 03:37:32.546
224	1	13:00-14:00	13:00	14:00	\N	2026-07-30 03:37:32.549	2026-07-30 03:37:32.549
225	1	14:00-15:00	14:00	15:00	\N	2026-07-30 03:37:32.551	2026-07-30 03:37:32.551
226	1	15:00-16:00	15:00	16:00	\N	2026-07-30 03:37:32.553	2026-07-30 03:37:32.553
227	1	16:00-17:00	16:00	17:00	\N	2026-07-30 03:37:32.555	2026-07-30 03:37:32.555
228	1	17:00-18:00	17:00	18:00	\N	2026-07-30 03:37:32.558	2026-07-30 03:37:32.558
229	1	18:00-19:00	18:00	19:00	\N	2026-07-30 03:37:32.56	2026-07-30 03:37:32.56
230	1	19:00-20:00	19:00	20:00	\N	2026-07-30 03:37:32.562	2026-07-30 03:37:32.562
231	1	20:00-21:00	20:00	21:00	\N	2026-07-30 03:37:32.568	2026-07-30 03:37:32.568
232	1	21:00-22:00	21:00	22:00	\N	2026-07-30 03:37:32.571	2026-07-30 03:37:32.571
233	1	22:00-23:00	22:00	23:00	\N	2026-07-30 03:37:32.573	2026-07-30 03:37:32.573
234	1	23:00-00:00	23:00	00:00	\N	2026-07-30 03:37:32.576	2026-07-30 03:37:32.576
235	1	06:00-07:00	06:00	07:00	\N	2026-07-30 03:37:36.364	2026-07-30 03:37:36.364
236	1	07:00-08:00	07:00	08:00	\N	2026-07-30 03:37:36.364	2026-07-30 03:37:36.364
237	1	08:00-09:00	08:00	09:00	\N	2026-07-30 03:37:36.364	2026-07-30 03:37:36.364
238	1	09:00-10:00	09:00	10:00	\N	2026-07-30 03:37:36.364	2026-07-30 03:37:36.364
239	1	10:00-11:00	10:00	11:00	\N	2026-07-30 03:37:36.364	2026-07-30 03:37:36.364
240	1	11:00-12:00	11:00	12:00	\N	2026-07-30 03:37:36.364	2026-07-30 03:37:36.364
241	1	12:00-13:00	12:00	13:00	\N	2026-07-30 03:37:36.364	2026-07-30 03:37:36.364
242	1	13:00-14:00	13:00	14:00	\N	2026-07-30 03:37:36.364	2026-07-30 03:37:36.364
243	1	14:00-15:00	14:00	15:00	\N	2026-07-30 03:37:36.364	2026-07-30 03:37:36.364
244	1	15:00-16:00	15:00	16:00	\N	2026-07-30 03:37:36.364	2026-07-30 03:37:36.364
245	1	16:00-17:00	16:00	17:00	\N	2026-07-30 03:37:36.364	2026-07-30 03:37:36.364
246	1	17:00-18:00	17:00	18:00	\N	2026-07-30 03:37:36.364	2026-07-30 03:37:36.364
247	1	18:00-19:00	18:00	19:00	\N	2026-07-30 03:37:36.364	2026-07-30 03:37:36.364
248	1	19:00-20:00	19:00	20:00	\N	2026-07-30 03:37:36.364	2026-07-30 03:37:36.364
249	1	20:00-21:00	20:00	21:00	\N	2026-07-30 03:37:36.364	2026-07-30 03:37:36.364
250	1	21:00-22:00	21:00	22:00	\N	2026-07-30 03:37:36.364	2026-07-30 03:37:36.364
251	1	22:00-23:00	22:00	23:00	\N	2026-07-30 03:37:36.364	2026-07-30 03:37:36.364
252	1	23:00-00:00	23:00	00:00	\N	2026-07-30 03:37:36.364	2026-07-30 03:37:36.364
253	1	06:00-07:00	06:00	07:00	\N	2026-07-30 03:52:02.651	2026-07-30 03:52:02.651
254	1	07:00-08:00	07:00	08:00	\N	2026-07-30 03:52:02.718	2026-07-30 03:52:02.718
255	1	08:00-09:00	08:00	09:00	\N	2026-07-30 03:52:02.739	2026-07-30 03:52:02.739
256	1	09:00-10:00	09:00	10:00	\N	2026-07-30 03:52:02.755	2026-07-30 03:52:02.755
257	1	10:00-11:00	10:00	11:00	\N	2026-07-30 03:52:02.774	2026-07-30 03:52:02.774
258	1	11:00-12:00	11:00	12:00	\N	2026-07-30 03:52:02.792	2026-07-30 03:52:02.792
259	1	12:00-13:00	12:00	13:00	\N	2026-07-30 03:52:02.814	2026-07-30 03:52:02.814
260	1	13:00-14:00	13:00	14:00	\N	2026-07-30 03:52:02.843	2026-07-30 03:52:02.843
261	1	14:00-15:00	14:00	15:00	\N	2026-07-30 03:52:02.864	2026-07-30 03:52:02.864
262	1	15:00-16:00	15:00	16:00	\N	2026-07-30 03:52:02.889	2026-07-30 03:52:02.889
263	1	16:00-17:00	16:00	17:00	\N	2026-07-30 03:52:02.917	2026-07-30 03:52:02.917
264	1	17:00-18:00	17:00	18:00	\N	2026-07-30 03:52:02.95	2026-07-30 03:52:02.95
265	1	18:00-19:00	18:00	19:00	\N	2026-07-30 03:52:02.977	2026-07-30 03:52:02.977
266	1	19:00-20:00	19:00	20:00	\N	2026-07-30 03:52:03.003	2026-07-30 03:52:03.003
267	1	20:00-21:00	20:00	21:00	\N	2026-07-30 03:52:03.023	2026-07-30 03:52:03.023
268	1	21:00-22:00	21:00	22:00	\N	2026-07-30 03:52:03.037	2026-07-30 03:52:03.037
269	1	22:00-23:00	22:00	23:00	\N	2026-07-30 03:52:03.052	2026-07-30 03:52:03.052
270	1	23:00-00:00	23:00	00:00	\N	2026-07-30 03:52:03.063	2026-07-30 03:52:03.063
271	1	06:00-07:00	06:00	07:00	\N	2026-07-30 03:52:13.408	2026-07-30 03:52:13.408
272	1	07:00-08:00	07:00	08:00	\N	2026-07-30 03:52:13.408	2026-07-30 03:52:13.408
273	1	08:00-09:00	08:00	09:00	\N	2026-07-30 03:52:13.408	2026-07-30 03:52:13.408
274	1	09:00-10:00	09:00	10:00	\N	2026-07-30 03:52:13.408	2026-07-30 03:52:13.408
275	1	10:00-11:00	10:00	11:00	\N	2026-07-30 03:52:13.408	2026-07-30 03:52:13.408
276	1	11:00-12:00	11:00	12:00	\N	2026-07-30 03:52:13.408	2026-07-30 03:52:13.408
277	1	12:00-13:00	12:00	13:00	\N	2026-07-30 03:52:13.408	2026-07-30 03:52:13.408
278	1	13:00-14:00	13:00	14:00	\N	2026-07-30 03:52:13.408	2026-07-30 03:52:13.408
279	1	14:00-15:00	14:00	15:00	\N	2026-07-30 03:52:13.408	2026-07-30 03:52:13.408
280	1	15:00-16:00	15:00	16:00	\N	2026-07-30 03:52:13.408	2026-07-30 03:52:13.408
281	1	16:00-17:00	16:00	17:00	\N	2026-07-30 03:52:13.408	2026-07-30 03:52:13.408
282	1	17:00-18:00	17:00	18:00	\N	2026-07-30 03:52:13.408	2026-07-30 03:52:13.408
283	1	18:00-19:00	18:00	19:00	\N	2026-07-30 03:52:13.408	2026-07-30 03:52:13.408
284	1	19:00-20:00	19:00	20:00	\N	2026-07-30 03:52:13.408	2026-07-30 03:52:13.408
285	1	20:00-21:00	20:00	21:00	\N	2026-07-30 03:52:13.408	2026-07-30 03:52:13.408
286	1	21:00-22:00	21:00	22:00	\N	2026-07-30 03:52:13.408	2026-07-30 03:52:13.408
287	1	22:00-23:00	22:00	23:00	\N	2026-07-30 03:52:13.408	2026-07-30 03:52:13.408
288	1	23:00-00:00	23:00	00:00	\N	2026-07-30 03:52:13.408	2026-07-30 03:52:13.408
289	1	06:00-07:00	06:00	07:00	\N	2026-07-30 03:53:38.463	2026-07-30 03:53:38.463
290	1	07:00-08:00	07:00	08:00	\N	2026-07-30 03:53:38.512	2026-07-30 03:53:38.512
291	1	08:00-09:00	08:00	09:00	\N	2026-07-30 03:53:38.546	2026-07-30 03:53:38.546
292	1	09:00-10:00	09:00	10:00	\N	2026-07-30 03:53:38.573	2026-07-30 03:53:38.573
293	1	10:00-11:00	10:00	11:00	\N	2026-07-30 03:53:38.613	2026-07-30 03:53:38.613
294	1	11:00-12:00	11:00	12:00	\N	2026-07-30 03:53:38.638	2026-07-30 03:53:38.638
295	1	12:00-13:00	12:00	13:00	\N	2026-07-30 03:53:38.662	2026-07-30 03:53:38.662
296	1	13:00-14:00	13:00	14:00	\N	2026-07-30 03:53:38.683	2026-07-30 03:53:38.683
297	1	14:00-15:00	14:00	15:00	\N	2026-07-30 03:53:38.71	2026-07-30 03:53:38.71
298	1	15:00-16:00	15:00	16:00	\N	2026-07-30 03:53:38.733	2026-07-30 03:53:38.733
299	1	16:00-17:00	16:00	17:00	\N	2026-07-30 03:53:38.779	2026-07-30 03:53:38.779
300	1	17:00-18:00	17:00	18:00	\N	2026-07-30 03:53:38.824	2026-07-30 03:53:38.824
301	1	18:00-19:00	18:00	19:00	\N	2026-07-30 03:53:38.844	2026-07-30 03:53:38.844
302	1	19:00-20:00	19:00	20:00	\N	2026-07-30 03:53:38.862	2026-07-30 03:53:38.862
303	1	20:00-21:00	20:00	21:00	\N	2026-07-30 03:53:38.887	2026-07-30 03:53:38.887
304	1	21:00-22:00	21:00	22:00	\N	2026-07-30 03:53:38.906	2026-07-30 03:53:38.906
305	1	22:00-23:00	22:00	23:00	\N	2026-07-30 03:53:38.922	2026-07-30 03:53:38.922
306	1	23:00-00:00	23:00	00:00	\N	2026-07-30 03:53:38.942	2026-07-30 03:53:38.942
307	1	06:00-07:00	06:00	07:00	\N	2026-07-30 03:53:53.096	2026-07-30 03:53:53.096
308	1	07:00-08:00	07:00	08:00	\N	2026-07-30 03:53:53.096	2026-07-30 03:53:53.096
309	1	08:00-09:00	08:00	09:00	\N	2026-07-30 03:53:53.096	2026-07-30 03:53:53.096
310	1	09:00-10:00	09:00	10:00	\N	2026-07-30 03:53:53.096	2026-07-30 03:53:53.096
311	1	10:00-11:00	10:00	11:00	\N	2026-07-30 03:53:53.096	2026-07-30 03:53:53.096
312	1	11:00-12:00	11:00	12:00	\N	2026-07-30 03:53:53.096	2026-07-30 03:53:53.096
313	1	12:00-13:00	12:00	13:00	\N	2026-07-30 03:53:53.096	2026-07-30 03:53:53.096
314	1	13:00-14:00	13:00	14:00	\N	2026-07-30 03:53:53.096	2026-07-30 03:53:53.096
315	1	14:00-15:00	14:00	15:00	\N	2026-07-30 03:53:53.096	2026-07-30 03:53:53.096
316	1	15:00-16:00	15:00	16:00	\N	2026-07-30 03:53:53.096	2026-07-30 03:53:53.096
317	1	16:00-17:00	16:00	17:00	\N	2026-07-30 03:53:53.096	2026-07-30 03:53:53.096
318	1	17:00-18:00	17:00	18:00	\N	2026-07-30 03:53:53.096	2026-07-30 03:53:53.096
319	1	18:00-19:00	18:00	19:00	\N	2026-07-30 03:53:53.096	2026-07-30 03:53:53.096
320	1	19:00-20:00	19:00	20:00	\N	2026-07-30 03:53:53.096	2026-07-30 03:53:53.096
321	1	20:00-21:00	20:00	21:00	\N	2026-07-30 03:53:53.096	2026-07-30 03:53:53.096
322	1	21:00-22:00	21:00	22:00	\N	2026-07-30 03:53:53.096	2026-07-30 03:53:53.096
323	1	22:00-23:00	22:00	23:00	\N	2026-07-30 03:53:53.096	2026-07-30 03:53:53.096
324	1	23:00-00:00	23:00	00:00	\N	2026-07-30 03:53:53.096	2026-07-30 03:53:53.096
325	19	21:00-22:00	21:00	22:00	4	2026-07-30 04:34:39.774	2026-07-30 04:34:39.774
326	20	21:00-22:00	21:00	22:00	4	2026-07-30 04:36:48.549	2026-07-30 04:36:48.549
327	21	10:00-11:00	10:00	11:00	4	2026-07-30 04:38:49.861	2026-07-30 04:38:49.861
328	21	11:00-12:00	11:00	12:00	4	2026-07-30 04:38:49.896	2026-07-30 04:38:49.896
329	21	12:00-13:00	12:00	13:00	4	2026-07-30 04:38:49.92	2026-07-30 04:38:49.92
330	1	06:00-07:00	06:00	07:00	\N	2026-07-30 04:54:41.201	2026-07-30 04:54:41.201
331	1	07:00-08:00	07:00	08:00	\N	2026-07-30 04:54:41.208	2026-07-30 04:54:41.208
332	1	08:00-09:00	08:00	09:00	\N	2026-07-30 04:54:41.211	2026-07-30 04:54:41.211
333	1	09:00-10:00	09:00	10:00	\N	2026-07-30 04:54:41.215	2026-07-30 04:54:41.215
334	1	10:00-11:00	10:00	11:00	\N	2026-07-30 04:54:41.219	2026-07-30 04:54:41.219
335	1	11:00-12:00	11:00	12:00	\N	2026-07-30 04:54:41.222	2026-07-30 04:54:41.222
336	1	12:00-13:00	12:00	13:00	\N	2026-07-30 04:54:41.226	2026-07-30 04:54:41.226
337	1	13:00-14:00	13:00	14:00	\N	2026-07-30 04:54:41.229	2026-07-30 04:54:41.229
338	1	14:00-15:00	14:00	15:00	\N	2026-07-30 04:54:41.233	2026-07-30 04:54:41.233
339	1	15:00-16:00	15:00	16:00	\N	2026-07-30 04:54:41.237	2026-07-30 04:54:41.237
340	1	16:00-17:00	16:00	17:00	\N	2026-07-30 04:54:41.241	2026-07-30 04:54:41.241
341	1	17:00-18:00	17:00	18:00	\N	2026-07-30 04:54:41.245	2026-07-30 04:54:41.245
342	1	18:00-19:00	18:00	19:00	\N	2026-07-30 04:54:41.249	2026-07-30 04:54:41.249
343	1	19:00-20:00	19:00	20:00	\N	2026-07-30 04:54:41.254	2026-07-30 04:54:41.254
344	1	20:00-21:00	20:00	21:00	\N	2026-07-30 04:54:41.258	2026-07-30 04:54:41.258
345	1	21:00-22:00	21:00	22:00	\N	2026-07-30 04:54:41.262	2026-07-30 04:54:41.262
346	1	22:00-23:00	22:00	23:00	\N	2026-07-30 04:54:41.266	2026-07-30 04:54:41.266
347	1	23:00-00:00	23:00	00:00	\N	2026-07-30 04:54:41.27	2026-07-30 04:54:41.27
348	1	06:00-07:00	06:00	07:00	\N	2026-07-30 04:54:48.634	2026-07-30 04:54:48.634
349	1	07:00-08:00	07:00	08:00	\N	2026-07-30 04:54:48.634	2026-07-30 04:54:48.634
350	1	08:00-09:00	08:00	09:00	\N	2026-07-30 04:54:48.634	2026-07-30 04:54:48.634
351	1	09:00-10:00	09:00	10:00	\N	2026-07-30 04:54:48.634	2026-07-30 04:54:48.634
352	1	10:00-11:00	10:00	11:00	\N	2026-07-30 04:54:48.634	2026-07-30 04:54:48.634
353	1	11:00-12:00	11:00	12:00	\N	2026-07-30 04:54:48.634	2026-07-30 04:54:48.634
354	1	12:00-13:00	12:00	13:00	\N	2026-07-30 04:54:48.634	2026-07-30 04:54:48.634
355	1	13:00-14:00	13:00	14:00	\N	2026-07-30 04:54:48.634	2026-07-30 04:54:48.634
356	1	14:00-15:00	14:00	15:00	\N	2026-07-30 04:54:48.634	2026-07-30 04:54:48.634
357	1	15:00-16:00	15:00	16:00	\N	2026-07-30 04:54:48.634	2026-07-30 04:54:48.634
358	1	16:00-17:00	16:00	17:00	\N	2026-07-30 04:54:48.634	2026-07-30 04:54:48.634
359	1	17:00-18:00	17:00	18:00	\N	2026-07-30 04:54:48.634	2026-07-30 04:54:48.634
360	1	18:00-19:00	18:00	19:00	\N	2026-07-30 04:54:48.634	2026-07-30 04:54:48.634
361	1	19:00-20:00	19:00	20:00	\N	2026-07-30 04:54:48.634	2026-07-30 04:54:48.634
362	1	20:00-21:00	20:00	21:00	\N	2026-07-30 04:54:48.634	2026-07-30 04:54:48.634
363	1	21:00-22:00	21:00	22:00	\N	2026-07-30 04:54:48.634	2026-07-30 04:54:48.634
364	1	22:00-23:00	22:00	23:00	\N	2026-07-30 04:54:48.634	2026-07-30 04:54:48.634
365	1	23:00-00:00	23:00	00:00	\N	2026-07-30 04:54:48.634	2026-07-30 04:54:48.634
366	24	21:00-22:00	21:00	22:00	4	2026-07-30 04:55:21.804	2026-07-30 04:55:21.804
367	25	10:00-11:00	10:00	11:00	4	2026-07-30 04:55:41.343	2026-07-30 04:55:41.343
368	25	11:00-12:00	11:00	12:00	4	2026-07-30 04:55:41.368	2026-07-30 04:55:41.368
369	25	12:00-13:00	12:00	13:00	4	2026-07-30 04:55:41.384	2026-07-30 04:55:41.384
370	26	10:00-11:00	10:00	11:00	4	2026-07-30 04:56:47.165	2026-07-30 04:56:47.165
371	26	11:00-12:00	11:00	12:00	4	2026-07-30 04:56:47.209	2026-07-30 04:56:47.209
372	26	12:00-13:00	12:00	13:00	4	2026-07-30 04:56:47.238	2026-07-30 04:56:47.238
373	1	06:00-07:00	06:00	07:00	\N	2026-07-30 07:38:32.11	2026-07-30 07:38:32.11
374	1	07:00-08:00	07:00	08:00	\N	2026-07-30 07:38:32.117	2026-07-30 07:38:32.117
375	1	08:00-09:00	08:00	09:00	\N	2026-07-30 07:38:32.121	2026-07-30 07:38:32.121
376	1	09:00-10:00	09:00	10:00	\N	2026-07-30 07:38:32.125	2026-07-30 07:38:32.125
377	1	10:00-11:00	10:00	11:00	\N	2026-07-30 07:38:32.13	2026-07-30 07:38:32.13
378	1	11:00-12:00	11:00	12:00	\N	2026-07-30 07:38:32.134	2026-07-30 07:38:32.134
379	1	12:00-13:00	12:00	13:00	\N	2026-07-30 07:38:32.138	2026-07-30 07:38:32.138
380	1	13:00-14:00	13:00	14:00	\N	2026-07-30 07:38:32.142	2026-07-30 07:38:32.142
381	1	14:00-15:00	14:00	15:00	\N	2026-07-30 07:38:32.147	2026-07-30 07:38:32.147
382	1	15:00-16:00	15:00	16:00	\N	2026-07-30 07:38:32.153	2026-07-30 07:38:32.153
383	1	16:00-17:00	16:00	17:00	\N	2026-07-30 07:38:32.16	2026-07-30 07:38:32.16
384	1	17:00-18:00	17:00	18:00	\N	2026-07-30 07:38:32.165	2026-07-30 07:38:32.165
385	1	18:00-19:00	18:00	19:00	\N	2026-07-30 07:38:32.17	2026-07-30 07:38:32.17
386	1	19:00-20:00	19:00	20:00	\N	2026-07-30 07:38:32.175	2026-07-30 07:38:32.175
387	1	20:00-21:00	20:00	21:00	\N	2026-07-30 07:38:32.18	2026-07-30 07:38:32.18
388	1	21:00-22:00	21:00	22:00	\N	2026-07-30 07:38:32.184	2026-07-30 07:38:32.184
389	1	22:00-23:00	22:00	23:00	\N	2026-07-30 07:38:32.189	2026-07-30 07:38:32.189
390	1	23:00-00:00	23:00	00:00	\N	2026-07-30 07:38:32.193	2026-07-30 07:38:32.193
391	1	06:00-07:00	06:00	07:00	\N	2026-07-30 07:38:34.911	2026-07-30 07:38:34.911
392	1	07:00-08:00	07:00	08:00	\N	2026-07-30 07:38:34.911	2026-07-30 07:38:34.911
393	1	08:00-09:00	08:00	09:00	\N	2026-07-30 07:38:34.911	2026-07-30 07:38:34.911
394	1	09:00-10:00	09:00	10:00	\N	2026-07-30 07:38:34.911	2026-07-30 07:38:34.911
395	1	10:00-11:00	10:00	11:00	\N	2026-07-30 07:38:34.911	2026-07-30 07:38:34.911
396	1	11:00-12:00	11:00	12:00	\N	2026-07-30 07:38:34.911	2026-07-30 07:38:34.911
397	1	12:00-13:00	12:00	13:00	\N	2026-07-30 07:38:34.911	2026-07-30 07:38:34.911
398	1	13:00-14:00	13:00	14:00	\N	2026-07-30 07:38:34.911	2026-07-30 07:38:34.911
399	1	14:00-15:00	14:00	15:00	\N	2026-07-30 07:38:34.911	2026-07-30 07:38:34.911
400	1	15:00-16:00	15:00	16:00	\N	2026-07-30 07:38:34.911	2026-07-30 07:38:34.911
401	1	16:00-17:00	16:00	17:00	\N	2026-07-30 07:38:34.911	2026-07-30 07:38:34.911
402	1	17:00-18:00	17:00	18:00	\N	2026-07-30 07:38:34.911	2026-07-30 07:38:34.911
403	1	18:00-19:00	18:00	19:00	\N	2026-07-30 07:38:34.911	2026-07-30 07:38:34.911
404	1	19:00-20:00	19:00	20:00	\N	2026-07-30 07:38:34.911	2026-07-30 07:38:34.911
405	1	20:00-21:00	20:00	21:00	\N	2026-07-30 07:38:34.911	2026-07-30 07:38:34.911
406	1	21:00-22:00	21:00	22:00	\N	2026-07-30 07:38:34.911	2026-07-30 07:38:34.911
407	1	22:00-23:00	22:00	23:00	\N	2026-07-30 07:38:34.911	2026-07-30 07:38:34.911
408	1	23:00-00:00	23:00	00:00	\N	2026-07-30 07:38:34.911	2026-07-30 07:38:34.911
409	1	06:00-07:00	06:00	07:00	\N	2026-07-30 08:45:17.593	2026-07-30 08:45:17.593
410	1	07:00-08:00	07:00	08:00	\N	2026-07-30 08:45:17.599	2026-07-30 08:45:17.599
411	1	08:00-09:00	08:00	09:00	\N	2026-07-30 08:45:17.603	2026-07-30 08:45:17.603
412	1	09:00-10:00	09:00	10:00	\N	2026-07-30 08:45:17.606	2026-07-30 08:45:17.606
413	1	10:00-11:00	10:00	11:00	\N	2026-07-30 08:45:17.608	2026-07-30 08:45:17.608
414	1	11:00-12:00	11:00	12:00	\N	2026-07-30 08:45:17.61	2026-07-30 08:45:17.61
415	1	12:00-13:00	12:00	13:00	\N	2026-07-30 08:45:17.613	2026-07-30 08:45:17.613
416	1	13:00-14:00	13:00	14:00	\N	2026-07-30 08:45:17.615	2026-07-30 08:45:17.615
417	1	14:00-15:00	14:00	15:00	\N	2026-07-30 08:45:17.618	2026-07-30 08:45:17.618
418	1	15:00-16:00	15:00	16:00	\N	2026-07-30 08:45:17.621	2026-07-30 08:45:17.621
419	1	16:00-17:00	16:00	17:00	\N	2026-07-30 08:45:17.624	2026-07-30 08:45:17.624
420	1	17:00-18:00	17:00	18:00	\N	2026-07-30 08:45:17.626	2026-07-30 08:45:17.626
421	1	18:00-19:00	18:00	19:00	\N	2026-07-30 08:45:17.629	2026-07-30 08:45:17.629
422	1	19:00-20:00	19:00	20:00	\N	2026-07-30 08:45:17.631	2026-07-30 08:45:17.631
423	1	20:00-21:00	20:00	21:00	\N	2026-07-30 08:45:17.634	2026-07-30 08:45:17.634
424	1	21:00-22:00	21:00	22:00	\N	2026-07-30 08:45:17.636	2026-07-30 08:45:17.636
425	1	22:00-23:00	22:00	23:00	\N	2026-07-30 08:45:17.638	2026-07-30 08:45:17.638
426	1	23:00-00:00	23:00	00:00	\N	2026-07-30 08:45:17.641	2026-07-30 08:45:17.641
427	1	06:00-07:00	06:00	07:00	\N	2026-07-30 08:45:20.165	2026-07-30 08:45:20.165
428	1	07:00-08:00	07:00	08:00	\N	2026-07-30 08:45:20.165	2026-07-30 08:45:20.165
429	1	08:00-09:00	08:00	09:00	\N	2026-07-30 08:45:20.165	2026-07-30 08:45:20.165
430	1	09:00-10:00	09:00	10:00	\N	2026-07-30 08:45:20.165	2026-07-30 08:45:20.165
431	1	10:00-11:00	10:00	11:00	\N	2026-07-30 08:45:20.165	2026-07-30 08:45:20.165
432	1	11:00-12:00	11:00	12:00	\N	2026-07-30 08:45:20.165	2026-07-30 08:45:20.165
433	1	12:00-13:00	12:00	13:00	\N	2026-07-30 08:45:20.165	2026-07-30 08:45:20.165
434	1	13:00-14:00	13:00	14:00	\N	2026-07-30 08:45:20.165	2026-07-30 08:45:20.165
435	1	14:00-15:00	14:00	15:00	\N	2026-07-30 08:45:20.165	2026-07-30 08:45:20.165
436	1	15:00-16:00	15:00	16:00	\N	2026-07-30 08:45:20.165	2026-07-30 08:45:20.165
437	1	16:00-17:00	16:00	17:00	\N	2026-07-30 08:45:20.165	2026-07-30 08:45:20.165
438	1	17:00-18:00	17:00	18:00	\N	2026-07-30 08:45:20.165	2026-07-30 08:45:20.165
439	1	18:00-19:00	18:00	19:00	\N	2026-07-30 08:45:20.165	2026-07-30 08:45:20.165
440	1	19:00-20:00	19:00	20:00	\N	2026-07-30 08:45:20.165	2026-07-30 08:45:20.165
441	1	20:00-21:00	20:00	21:00	\N	2026-07-30 08:45:20.165	2026-07-30 08:45:20.165
442	1	21:00-22:00	21:00	22:00	\N	2026-07-30 08:45:20.165	2026-07-30 08:45:20.165
443	1	22:00-23:00	22:00	23:00	\N	2026-07-30 08:45:20.165	2026-07-30 08:45:20.165
444	1	23:00-00:00	23:00	00:00	\N	2026-07-30 08:45:20.165	2026-07-30 08:45:20.165
445	1	06:00-07:00	06:00	07:00	\N	2026-07-30 08:50:49.43	2026-07-30 08:50:49.43
446	1	07:00-08:00	07:00	08:00	\N	2026-07-30 08:50:49.436	2026-07-30 08:50:49.436
447	1	08:00-09:00	08:00	09:00	\N	2026-07-30 08:50:49.44	2026-07-30 08:50:49.44
448	1	09:00-10:00	09:00	10:00	\N	2026-07-30 08:50:49.444	2026-07-30 08:50:49.444
449	1	10:00-11:00	10:00	11:00	\N	2026-07-30 08:50:49.447	2026-07-30 08:50:49.447
450	1	11:00-12:00	11:00	12:00	\N	2026-07-30 08:50:49.451	2026-07-30 08:50:49.451
451	1	12:00-13:00	12:00	13:00	\N	2026-07-30 08:50:49.455	2026-07-30 08:50:49.455
452	1	13:00-14:00	13:00	14:00	\N	2026-07-30 08:50:49.46	2026-07-30 08:50:49.46
453	1	14:00-15:00	14:00	15:00	\N	2026-07-30 08:50:49.466	2026-07-30 08:50:49.466
454	1	15:00-16:00	15:00	16:00	\N	2026-07-30 08:50:49.471	2026-07-30 08:50:49.471
455	1	16:00-17:00	16:00	17:00	\N	2026-07-30 08:50:49.475	2026-07-30 08:50:49.475
456	1	17:00-18:00	17:00	18:00	\N	2026-07-30 08:50:49.479	2026-07-30 08:50:49.479
457	1	18:00-19:00	18:00	19:00	\N	2026-07-30 08:50:49.483	2026-07-30 08:50:49.483
458	1	19:00-20:00	19:00	20:00	\N	2026-07-30 08:50:49.486	2026-07-30 08:50:49.486
459	1	20:00-21:00	20:00	21:00	\N	2026-07-30 08:50:49.491	2026-07-30 08:50:49.491
460	1	21:00-22:00	21:00	22:00	\N	2026-07-30 08:50:49.495	2026-07-30 08:50:49.495
461	1	22:00-23:00	22:00	23:00	\N	2026-07-30 08:50:49.498	2026-07-30 08:50:49.498
462	1	23:00-00:00	23:00	00:00	\N	2026-07-30 08:50:49.502	2026-07-30 08:50:49.502
463	1	06:00-07:00	06:00	07:00	\N	2026-07-30 08:50:52.142	2026-07-30 08:50:52.142
464	1	07:00-08:00	07:00	08:00	\N	2026-07-30 08:50:52.142	2026-07-30 08:50:52.142
465	1	08:00-09:00	08:00	09:00	\N	2026-07-30 08:50:52.142	2026-07-30 08:50:52.142
466	1	09:00-10:00	09:00	10:00	\N	2026-07-30 08:50:52.142	2026-07-30 08:50:52.142
467	1	10:00-11:00	10:00	11:00	\N	2026-07-30 08:50:52.142	2026-07-30 08:50:52.142
468	1	11:00-12:00	11:00	12:00	\N	2026-07-30 08:50:52.142	2026-07-30 08:50:52.142
469	1	12:00-13:00	12:00	13:00	\N	2026-07-30 08:50:52.142	2026-07-30 08:50:52.142
470	1	13:00-14:00	13:00	14:00	\N	2026-07-30 08:50:52.142	2026-07-30 08:50:52.142
471	1	14:00-15:00	14:00	15:00	\N	2026-07-30 08:50:52.142	2026-07-30 08:50:52.142
472	1	15:00-16:00	15:00	16:00	\N	2026-07-30 08:50:52.142	2026-07-30 08:50:52.142
473	1	16:00-17:00	16:00	17:00	\N	2026-07-30 08:50:52.142	2026-07-30 08:50:52.142
474	1	17:00-18:00	17:00	18:00	\N	2026-07-30 08:50:52.142	2026-07-30 08:50:52.142
475	1	18:00-19:00	18:00	19:00	\N	2026-07-30 08:50:52.142	2026-07-30 08:50:52.142
476	1	19:00-20:00	19:00	20:00	\N	2026-07-30 08:50:52.142	2026-07-30 08:50:52.142
477	1	20:00-21:00	20:00	21:00	\N	2026-07-30 08:50:52.142	2026-07-30 08:50:52.142
478	1	21:00-22:00	21:00	22:00	\N	2026-07-30 08:50:52.142	2026-07-30 08:50:52.142
479	1	22:00-23:00	22:00	23:00	\N	2026-07-30 08:50:52.142	2026-07-30 08:50:52.142
480	1	23:00-00:00	23:00	00:00	\N	2026-07-30 08:50:52.142	2026-07-30 08:50:52.142
\.


--
-- Data for Name: super_admins; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.super_admins (id, user_id, email, password_hash, permissions, is_active, last_login, created_at, updated_at, first_name, last_name) FROM stdin;
1	2	superadmin@agnelarenagoa.com	$2a$12$9n2V6dyOrac1lxrvJR3mN.gkE66jXQCX5Lt43Ppf9s5ZR0pVaDWHW	{}	t	2026-07-30 04:56:46.772	2026-07-29 08:53:39.75	2026-07-30 08:50:52.603	Super	Admin
\.


--
-- Data for Name: system_audit_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.system_audit_logs (id, super_admin_id, action, entity_type, entity_id, changes, ip_address, user_agent, created_at, approved_by, arena_id, field_changed, new_value, old_value, reason, requested_by) FROM stdin;
1	1	CREATE_ARENA	arena	19	{"name":"Audit Arena 1785386079886","slug":"audit-arena-1785386079886"}	::ffff:172.20.0.1	unknown	2026-07-30 04:34:39.427	\N	\N	\N	\N	\N	\N	\N
2	1	UPDATE_ARENA	arena	19	{"address":"Vasco Da Gama, Goa","description":"Updated description with premium branding","contact_email":"audit@arena.local"}	::ffff:172.20.0.1	unknown	2026-07-30 04:34:39.483	\N	\N	\N	\N	\N	\N	\N
3	1	CREATE_ARENA_ADMIN	arena_admin	19	{"email":"admin_1785386079480@futsal.local","arena_id":19}	::ffff:172.20.0.1	unknown	2026-07-30 04:34:39.627	\N	\N	\N	\N	\N	\N	\N
4	1	CREATE_SECURITY_STAFF	security_staff	20	{"email":"sec_1785386080128@futsal.local","arena_id":19}	::ffff:172.20.0.1	unknown	2026-07-30 04:34:39.742	\N	\N	\N	\N	\N	\N	\N
5	1	CREATE_ARENA	arena	20	{"name":"Audit Arena 1785386208239","slug":"audit-arena-1785386208239"}	::ffff:172.20.0.1	unknown	2026-07-30 04:36:48.175	\N	\N	\N	\N	\N	\N	\N
6	1	UPDATE_ARENA	arena	20	{"address":"Vasco Da Gama, Goa","description":"Updated description with premium branding","contact_email":"audit@arena.local"}	::ffff:172.20.0.1	unknown	2026-07-30 04:36:48.233	\N	\N	\N	\N	\N	\N	\N
7	1	CREATE_ARENA_ADMIN	arena_admin	21	{"email":"admin_1785386203481@futsal.local","arena_id":20}	::ffff:172.20.0.1	unknown	2026-07-30 04:36:48.381	\N	\N	\N	\N	\N	\N	\N
8	1	CREATE_SECURITY_STAFF	security_staff	22	{"email":"sec_1785386208467@futsal.local","arena_id":20}	::ffff:172.20.0.1	unknown	2026-07-30 04:36:48.521	\N	\N	\N	\N	\N	\N	\N
9	1	CREATE_ARENA	arena	21	{"name":"Test Arena 1785386329275","slug":"test-arena-1785386329275"}	::ffff:172.20.0.1	unknown	2026-07-30 04:38:49.505	\N	\N	\N	\N	\N	\N	\N
10	1	CREATE_ARENA_ADMIN	arena_admin	23	{"email":"admin_1785386329329@test.local","arena_id":21}	::ffff:172.20.0.1	unknown	2026-07-30 04:38:49.693	\N	\N	\N	\N	\N	\N	\N
11	1	CREATE_SECURITY_STAFF	security_staff	24	{"email":"security_1785386329482@test.local","arena_id":21}	::ffff:172.20.0.1	unknown	2026-07-30 04:38:49.841	\N	\N	\N	\N	\N	\N	\N
12	1	DIRECT_SLOT_BLOCK	booking	\N	{"arena_id":21,"date":"2026-07-30","slot":"10:00-11:00","reason":"Maintenance block"}	::ffff:172.20.0.1	unknown	2026-07-30 04:38:50.022	\N	\N	\N	\N	\N	\N	\N
13	1	CREATE_ARENA	arena	24	{"name":"Audit Arena 1785387322075","slug":"audit-arena-1785387322075"}	::ffff:172.20.0.1	unknown	2026-07-30 04:55:21.475	\N	\N	\N	\N	\N	\N	\N
14	1	UPDATE_ARENA	arena	24	{"address":"Vasco Da Gama, Goa","description":"Updated description with premium branding","contact_email":"audit@arena.local"}	::ffff:172.20.0.1	unknown	2026-07-30 04:55:21.526	\N	\N	\N	\N	\N	\N	\N
15	1	CREATE_ARENA_ADMIN	arena_admin	28	{"email":"admin_1785387321593@futsal.local","arena_id":24}	::ffff:172.20.0.1	unknown	2026-07-30 04:55:21.666	\N	\N	\N	\N	\N	\N	\N
16	1	CREATE_SECURITY_STAFF	security_staff	29	{"email":"sec_1785387322302@futsal.local","arena_id":24}	::ffff:172.20.0.1	unknown	2026-07-30 04:55:21.782	\N	\N	\N	\N	\N	\N	\N
17	1	CREATE_ARENA	arena	25	{"name":"Test Arena 1785387340910","slug":"test-arena-1785387340910"}	::ffff:172.20.0.1	unknown	2026-07-30 04:55:41.025	\N	\N	\N	\N	\N	\N	\N
18	1	CREATE_ARENA_ADMIN	arena_admin	30	{"email":"admin_1785387340972@test.local","arena_id":25}	::ffff:172.20.0.1	unknown	2026-07-30 04:55:41.197	\N	\N	\N	\N	\N	\N	\N
19	1	CREATE_SECURITY_STAFF	security_staff	31	{"email":"security_1785387341100@test.local","arena_id":25}	::ffff:172.20.0.1	unknown	2026-07-30 04:55:41.319	\N	\N	\N	\N	\N	\N	\N
20	1	DIRECT_SLOT_BLOCK	booking	\N	{"arena_id":25,"date":"2026-07-30","slot":"10:00-11:00","reason":"Maintenance block"}	::ffff:172.20.0.1	unknown	2026-07-30 04:55:41.463	\N	\N	\N	\N	\N	\N	\N
21	1	CREATE_ARENA	arena	26	{"name":"Test Arena 1785387406376","slug":"test-arena-1785387406376"}	::ffff:172.20.0.1	unknown	2026-07-30 04:56:46.811	\N	\N	\N	\N	\N	\N	\N
22	1	CREATE_ARENA_ADMIN	arena_admin	32	{"email":"admin_1785387406433@test.local","arena_id":26}	::ffff:172.20.0.1	unknown	2026-07-30 04:56:46.985	\N	\N	\N	\N	\N	\N	\N
23	1	CREATE_SECURITY_STAFF	security_staff	33	{"email":"security_1785387406571@test.local","arena_id":26}	::ffff:172.20.0.1	unknown	2026-07-30 04:56:47.133	\N	\N	\N	\N	\N	\N	\N
24	1	DIRECT_SLOT_BLOCK	booking	\N	{"arena_id":26,"date":"2026-07-30","slot":"10:00-11:00","reason":"Maintenance block"}	::ffff:172.20.0.1	unknown	2026-07-30 04:56:47.342	\N	\N	\N	\N	\N	\N	\N
\.


--
-- Data for Name: user_otps; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_otps (id, identifier, otp, expires_at, created_at, updated_at) FROM stdin;
1	919876543210	$2a$10$V0MWGR6QwVIxB.SfdBaTIe2z0wZIJsKkpTv1qWA2KyMLY.Ie3k7tq	2026-07-30 08:05:12.108	2026-07-30 04:36:48.754	2026-07-30 07:55:12.108
5	919012345678	$2a$10$Wy1esd4AbqOo3xr./9O.QOJ7jNwioKti1mrcDjT1zfMusRKfMoqcC	2026-07-30 09:06:59.741	2026-07-30 08:49:59.382	2026-07-30 08:56:59.741
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, name, email, email_verified_at, password, role, remember_token, customer_mobile, created_at, updated_at) FROM stdin;
1	System Admin	admin@futsalgoa.com	\N	\N	super_admin	\N	+919999999999	2026-07-29 08:53:39.314	2026-07-29 08:53:39.314
19	Audit Arena Manager	admin_1785386079480@futsal.local	\N	$2a$10$Xe4AC2OWYX196fqn15nk1uZr4I6cMA4fxGrq2sBZjkfGezNqG6yFW	arena_admin	\N	\N	2026-07-30 04:34:39.593	2026-07-30 04:34:39.593
20	Gate Security	sec_1785386080128@futsal.local	\N	$2a$10$NAvvXNLtO3EvRECcESqBYepYNlnKtw1CDE6xABTmrSeklphl1ZepC	security	\N	\N	2026-07-30 04:34:39.718	2026-07-30 04:34:39.718
21	Audit Arena Manager	admin_1785386203481@futsal.local	\N	$2a$10$Z9TzOJVsbykT1UMFCjy2g.vzuznA7anL9SkUQRqj5hp2H83tijXqa	arena_admin	\N	\N	2026-07-30 04:36:48.357	2026-07-30 04:36:48.357
22	Gate Security	sec_1785386208467@futsal.local	\N	$2a$10$Oc3LI4zyJ6jI0JA64tHF4eMHLjEGxxMb4/EljeaQaPc/ArJIfBduG	security	\N	\N	2026-07-30 04:36:48.489	2026-07-30 04:36:48.489
23	Test Arena Admin	admin_1785386329329@test.local	\N	$2a$10$PdFcpI7qy5jk.eDgP7U4fOV4NCntZUJH7ueKZxyuGkThB/3N68Hh6	arena_admin	\N	\N	2026-07-30 04:38:49.666	2026-07-30 04:38:49.666
24	Test Security Staff	security_1785386329482@test.local	\N	$2a$10$tXVpk1cj3L5dRnn8dIwdsugliHtoCCv5g9HRWFwPNh8oAUDwJCBt.	security	\N	\N	2026-07-30 04:38:49.819	2026-07-30 04:38:49.819
25	System Block (Super Admin)	system@agnelarena.com	\N	\N	player	\N	0000000000	2026-07-30 04:38:49.993	2026-07-30 04:38:49.993
28	Audit Arena Manager	admin_1785387321593@futsal.local	\N	$2a$10$cW6XxagF52sLBpD/8h5EJOTlOGGmUKAue8qJNgXWA9HpdDNda1Njm	arena_admin	\N	\N	2026-07-30 04:55:21.638	2026-07-30 04:55:21.638
29	Gate Security	sec_1785387322302@futsal.local	\N	$2a$10$TgnneOuIiiD3bJMT2skcSesbSHy08ly.8yBk8SoUggRfVdNDrJdI6	security	\N	\N	2026-07-30 04:55:21.761	2026-07-30 04:55:21.761
30	Test Arena Admin	admin_1785387340972@test.local	\N	$2a$10$e5puPZPCTZPjZsBnGrDNFuK.YkaWXhRr3AeWUrBYdIjKjwce8rU/y	arena_admin	\N	\N	2026-07-30 04:55:41.175	2026-07-30 04:55:41.175
31	Test Security Staff	security_1785387341100@test.local	\N	$2a$10$qzpVaEpKsEoJtaZnGuS3j.QM4zfW8Jw3C9cLK6pDI6xyFsD4IXM4e	security	\N	\N	2026-07-30 04:55:41.3	2026-07-30 04:55:41.3
32	Test Arena Admin	admin_1785387406433@test.local	\N	$2a$10$9NjsfNWxetyEl0v3bUcI0eO5g4fRIOkdVeIUgo5xzt5tSk5rAABmG	arena_admin	\N	\N	2026-07-30 04:56:46.963	2026-07-30 04:56:46.963
33	Test Security Staff	security_1785387406571@test.local	\N	$2a$10$sGBq8synDN8NDu1bncX6ruX/NgfMb7kNkgjXVSNN.eZ806eJPklo6	security	\N	\N	2026-07-30 04:56:47.11	2026-07-30 04:56:47.11
36	Phase4 AuditTest	auditphase4@test.com	\N	\N	player	\N	919876543210	2026-07-30 07:46:39.425	2026-07-30 07:46:39.425
2	Super Admin	superadmin@agnelarenagoa.com	\N	$2a$12$9n2V6dyOrac1lxrvJR3mN.gkE66jXQCX5Lt43Ppf9s5ZR0pVaDWHW	super_admin	\N	+919999999999	2026-07-29 08:53:39.744	2026-07-30 08:50:52.584
\.


--
-- Name: admin_credentials_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.admin_credentials_id_seq', 12, true);


--
-- Name: admin_free_bookings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.admin_free_bookings_id_seq', 1, false);


--
-- Name: admin_slot_blocks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.admin_slot_blocks_id_seq', 1, false);


--
-- Name: approval_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.approval_requests_id_seq', 8, true);


--
-- Name: arena_admins_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.arena_admins_id_seq', 13, true);


--
-- Name: arena_managers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.arena_managers_id_seq', 12, true);


--
-- Name: arenas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.arenas_id_seq', 32, true);


--
-- Name: bookings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.bookings_id_seq', 30, true);


--
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.notifications_id_seq', 8, true);


--
-- Name: otp_attempts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.otp_attempts_id_seq', 1, true);


--
-- Name: payment_audit_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.payment_audit_logs_id_seq', 1, false);


--
-- Name: payment_callbacks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.payment_callbacks_id_seq', 1, false);


--
-- Name: pricings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.pricings_id_seq', 468, true);


--
-- Name: reports_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.reports_id_seq', 1, false);


--
-- Name: revoked_sessions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.revoked_sessions_id_seq', 1, false);


--
-- Name: security_staff_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.security_staff_id_seq', 13, true);


--
-- Name: settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.settings_id_seq', 26, true);


--
-- Name: slot_approval_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.slot_approval_requests_id_seq', 1, false);


--
-- Name: slot_locks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.slot_locks_id_seq', 2, true);


--
-- Name: slot_timings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.slot_timings_id_seq', 480, true);


--
-- Name: super_admins_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.super_admins_id_seq', 13, true);


--
-- Name: system_audit_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.system_audit_logs_id_seq', 24, true);


--
-- Name: user_otps_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.user_otps_id_seq', 6, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 40, true);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: admin_credentials admin_credentials_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_credentials
    ADD CONSTRAINT admin_credentials_pkey PRIMARY KEY (id);


--
-- Name: admin_free_bookings admin_free_bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_free_bookings
    ADD CONSTRAINT admin_free_bookings_pkey PRIMARY KEY (id);


--
-- Name: admin_slot_blocks admin_slot_blocks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_slot_blocks
    ADD CONSTRAINT admin_slot_blocks_pkey PRIMARY KEY (id);


--
-- Name: approval_requests approval_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approval_requests
    ADD CONSTRAINT approval_requests_pkey PRIMARY KEY (id);


--
-- Name: arena_admins arena_admins_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.arena_admins
    ADD CONSTRAINT arena_admins_pkey PRIMARY KEY (id);


--
-- Name: arena_managers arena_managers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.arena_managers
    ADD CONSTRAINT arena_managers_pkey PRIMARY KEY (id);


--
-- Name: arenas arenas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.arenas
    ADD CONSTRAINT arenas_pkey PRIMARY KEY (id);


--
-- Name: arenas arenas_slug_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.arenas
    ADD CONSTRAINT arenas_slug_key UNIQUE (slug);


--
-- Name: bookings bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_pkey PRIMARY KEY (id);


--
-- Name: bookings bookings_ticket_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_ticket_number_key UNIQUE (ticket_number);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: otp_attempts otp_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.otp_attempts
    ADD CONSTRAINT otp_attempts_pkey PRIMARY KEY (id);


--
-- Name: payment_audit_logs payment_audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_audit_logs
    ADD CONSTRAINT payment_audit_logs_pkey PRIMARY KEY (id);


--
-- Name: payment_callbacks payment_callbacks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_callbacks
    ADD CONSTRAINT payment_callbacks_pkey PRIMARY KEY (id);


--
-- Name: pricings pricings_arena_id_time_slot_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pricings
    ADD CONSTRAINT pricings_arena_id_time_slot_key UNIQUE (arena_id, time_slot);


--
-- Name: pricings pricings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pricings
    ADD CONSTRAINT pricings_pkey PRIMARY KEY (id);


--
-- Name: reports reports_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_pkey PRIMARY KEY (id);


--
-- Name: revoked_sessions revoked_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.revoked_sessions
    ADD CONSTRAINT revoked_sessions_pkey PRIMARY KEY (id);


--
-- Name: security_staff security_staff_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.security_staff
    ADD CONSTRAINT security_staff_pkey PRIMARY KEY (id);


--
-- Name: settings settings_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_key_key UNIQUE (key);


--
-- Name: settings settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (id);


--
-- Name: slot_approval_requests slot_approval_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.slot_approval_requests
    ADD CONSTRAINT slot_approval_requests_pkey PRIMARY KEY (id);


--
-- Name: slot_locks slot_locks_arena_id_booking_date_time_slot_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.slot_locks
    ADD CONSTRAINT slot_locks_arena_id_booking_date_time_slot_key UNIQUE (arena_id, booking_date, time_slot);


--
-- Name: slot_locks slot_locks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.slot_locks
    ADD CONSTRAINT slot_locks_pkey PRIMARY KEY (id);


--
-- Name: slot_timings slot_timings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.slot_timings
    ADD CONSTRAINT slot_timings_pkey PRIMARY KEY (id);


--
-- Name: super_admins super_admins_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.super_admins
    ADD CONSTRAINT super_admins_pkey PRIMARY KEY (id);


--
-- Name: system_audit_logs system_audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_audit_logs
    ADD CONSTRAINT system_audit_logs_pkey PRIMARY KEY (id);


--
-- Name: user_otps user_otps_identifier_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_otps
    ADD CONSTRAINT user_otps_identifier_key UNIQUE (identifier);


--
-- Name: user_otps user_otps_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_otps
    ADD CONSTRAINT user_otps_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: admin_credentials_admin_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX admin_credentials_admin_id_idx ON public.admin_credentials USING btree (admin_id);


--
-- Name: admin_credentials_credential_token_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX admin_credentials_credential_token_key ON public.admin_credentials USING btree (credential_token);


--
-- Name: admin_credentials_expires_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX admin_credentials_expires_at_idx ON public.admin_credentials USING btree (expires_at);


--
-- Name: admin_credentials_is_used_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX admin_credentials_is_used_idx ON public.admin_credentials USING btree (is_used);


--
-- Name: admin_free_bookings_arena_admin_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX admin_free_bookings_arena_admin_id_idx ON public.admin_free_bookings USING btree (arena_admin_id);


--
-- Name: admin_free_bookings_arena_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX admin_free_bookings_arena_id_idx ON public.admin_free_bookings USING btree (arena_id);


--
-- Name: admin_free_bookings_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX admin_free_bookings_status_idx ON public.admin_free_bookings USING btree (status);


--
-- Name: admin_slot_blocks_arena_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX admin_slot_blocks_arena_id_idx ON public.admin_slot_blocks USING btree (arena_id);


--
-- Name: admin_slot_blocks_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX admin_slot_blocks_status_idx ON public.admin_slot_blocks USING btree (status);


--
-- Name: admin_slot_blocks_super_admin_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX admin_slot_blocks_super_admin_id_idx ON public.admin_slot_blocks USING btree (super_admin_id);


--
-- Name: approval_requests_arena_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX approval_requests_arena_id_idx ON public.approval_requests USING btree (arena_id);


--
-- Name: approval_requests_requested_by_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX approval_requests_requested_by_idx ON public.approval_requests USING btree (requested_by);


--
-- Name: approval_requests_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX approval_requests_status_idx ON public.approval_requests USING btree (status);


--
-- Name: arena_admins_arena_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX arena_admins_arena_id_idx ON public.arena_admins USING btree (arena_id);


--
-- Name: arena_admins_email_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX arena_admins_email_idx ON public.arena_admins USING btree (email);


--
-- Name: arena_admins_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX arena_admins_email_key ON public.arena_admins USING btree (email);


--
-- Name: arena_admins_is_active_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX arena_admins_is_active_idx ON public.arena_admins USING btree (is_active);


--
-- Name: arena_managers_arena_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX arena_managers_arena_id_idx ON public.arena_managers USING btree (arena_id);


--
-- Name: arena_managers_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX arena_managers_user_id_idx ON public.arena_managers USING btree (user_id);


--
-- Name: arena_managers_user_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX arena_managers_user_id_key ON public.arena_managers USING btree (user_id);


--
-- Name: arenas_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX arenas_status_idx ON public.arenas USING btree (status);


--
-- Name: bookings_active_slot_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX bookings_active_slot_idx ON public.bookings USING btree (arena_id, booking_date, time_slot) WHERE (payment_status = ANY (ARRAY['pending'::text, 'confirmed'::text]));


--
-- Name: bookings_arena_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX bookings_arena_id_idx ON public.bookings USING btree (arena_id);


--
-- Name: bookings_booking_ref_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX bookings_booking_ref_idx ON public.bookings USING btree (booking_ref);


--
-- Name: bookings_payment_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX bookings_payment_status_idx ON public.bookings USING btree (payment_status);


--
-- Name: bookings_ticket_number_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX bookings_ticket_number_idx ON public.bookings USING btree (ticket_number);


--
-- Name: bookings_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX bookings_user_id_idx ON public.bookings USING btree (user_id);


--
-- Name: notifications_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX notifications_created_at_idx ON public.notifications USING btree (created_at);


--
-- Name: notifications_is_read_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX notifications_is_read_idx ON public.notifications USING btree (is_read);


--
-- Name: notifications_role_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX notifications_role_idx ON public.notifications USING btree (role);


--
-- Name: notifications_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX notifications_user_id_idx ON public.notifications USING btree (user_id);


--
-- Name: otp_attempts_identifier_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX otp_attempts_identifier_key ON public.otp_attempts USING btree (identifier);


--
-- Name: payment_audit_logs_booking_ref_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX payment_audit_logs_booking_ref_idx ON public.payment_audit_logs USING btree (booking_ref);


--
-- Name: payment_callbacks_booking_ref_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX payment_callbacks_booking_ref_idx ON public.payment_callbacks USING btree (booking_ref);


--
-- Name: payment_callbacks_gateway_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX payment_callbacks_gateway_id_idx ON public.payment_callbacks USING btree (gateway_id);


--
-- Name: payment_callbacks_gateway_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX payment_callbacks_gateway_id_key ON public.payment_callbacks USING btree (gateway_id);


--
-- Name: pricings_arena_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX pricings_arena_id_idx ON public.pricings USING btree (arena_id);


--
-- Name: reports_arena_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX reports_arena_id_idx ON public.reports USING btree (arena_id);


--
-- Name: reports_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX reports_created_at_idx ON public.reports USING btree (created_at);


--
-- Name: reports_report_type_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX reports_report_type_idx ON public.reports USING btree (report_type);


--
-- Name: revoked_sessions_session_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX revoked_sessions_session_id_key ON public.revoked_sessions USING btree (session_id);


--
-- Name: security_staff_arena_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX security_staff_arena_id_idx ON public.security_staff USING btree (arena_id);


--
-- Name: security_staff_email_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX security_staff_email_idx ON public.security_staff USING btree (email);


--
-- Name: security_staff_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX security_staff_email_key ON public.security_staff USING btree (email);


--
-- Name: security_staff_is_active_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX security_staff_is_active_idx ON public.security_staff USING btree (is_active);


--
-- Name: slot_approval_requests_arena_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX slot_approval_requests_arena_id_idx ON public.slot_approval_requests USING btree (arena_id);


--
-- Name: slot_approval_requests_requested_by_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX slot_approval_requests_requested_by_idx ON public.slot_approval_requests USING btree (requested_by);


--
-- Name: slot_approval_requests_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX slot_approval_requests_status_idx ON public.slot_approval_requests USING btree (status);


--
-- Name: slot_locks_arena_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX slot_locks_arena_id_idx ON public.slot_locks USING btree (arena_id);


--
-- Name: slot_locks_expires_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX slot_locks_expires_at_idx ON public.slot_locks USING btree (expires_at);


--
-- Name: slot_locks_session_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX slot_locks_session_id_idx ON public.slot_locks USING btree (session_id);


--
-- Name: slot_timings_arena_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX slot_timings_arena_id_idx ON public.slot_timings USING btree (arena_id);


--
-- Name: slot_timings_arena_id_time_slot_day_of_week_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX slot_timings_arena_id_time_slot_day_of_week_key ON public.slot_timings USING btree (arena_id, time_slot, day_of_week);


--
-- Name: super_admins_email_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX super_admins_email_idx ON public.super_admins USING btree (email);


--
-- Name: super_admins_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX super_admins_email_key ON public.super_admins USING btree (email);


--
-- Name: super_admins_is_active_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX super_admins_is_active_idx ON public.super_admins USING btree (is_active);


--
-- Name: super_admins_user_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX super_admins_user_id_key ON public.super_admins USING btree (user_id);


--
-- Name: system_audit_logs_action_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX system_audit_logs_action_idx ON public.system_audit_logs USING btree (action);


--
-- Name: system_audit_logs_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX system_audit_logs_created_at_idx ON public.system_audit_logs USING btree (created_at);


--
-- Name: system_audit_logs_super_admin_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX system_audit_logs_super_admin_id_idx ON public.system_audit_logs USING btree (super_admin_id);


--
-- Name: user_otps_identifier_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX user_otps_identifier_idx ON public.user_otps USING btree (identifier);


--
-- Name: users_email_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX users_email_idx ON public.users USING btree (email);


--
-- Name: users_role_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX users_role_idx ON public.users USING btree (role);


--
-- PostgreSQL database dump complete
--

\unrestrict psQ7ny1GyMhDoimcSQhWeGb0YgQvYejYXCXu1TUzVv5069QBA2iIRcaWbByY6gg

