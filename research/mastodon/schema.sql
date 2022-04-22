--
-- PostgreSQL database dump
--

-- Dumped from database version 14.2 (Ubuntu 14.2-1.pgdg20.04+1+b1)
-- Dumped by pg_dump version 14.2 (Ubuntu 14.2-1.pgdg20.04+1+b1)

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
-- Name: timestamp_id(text); Type: FUNCTION; Schema: public; Owner: nchiang
--

CREATE FUNCTION public.timestamp_id(table_name text) RETURNS bigint
    LANGUAGE plpgsql
    AS $$
  DECLARE
    time_part bigint;
    sequence_base bigint;
    tail bigint;
  BEGIN
    time_part := (
      -- Get the time in milliseconds
      ((date_part('epoch', now()) * 1000))::bigint
      -- And shift it over two bytes
      << 16);

    sequence_base := (
      'x' ||
      -- Take the first two bytes (four hex characters)
      substr(
        -- Of the MD5 hash of the data we documented
        md5(table_name || 'ad38da89a15d73ce0be2c38bef02e052' || time_part::text),
        1, 4
      )
    -- And turn it into a bigint
    )::bit(16)::bigint;

    -- Finally, add our sequence number to our base, and chop
    -- it to the last two bytes
    tail := (
      (sequence_base + nextval(table_name || '_id_seq'))
      & 65535);

    -- Return the time part and the sequence part. OR appears
    -- faster here than addition, but they're equivalent:
    -- time_part has no trailing two bytes, and tail is only
    -- the last two bytes.
    RETURN time_part | tail;
  END
$$;


ALTER FUNCTION public.timestamp_id(table_name text) OWNER TO nchiang;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: account_aliases; Type: TABLE; Schema: public; Owner: nchiang
--

CREATE TABLE public.account_aliases (
    id bigint NOT NULL,
    account_id bigint,
    acct character varying DEFAULT ''::character varying NOT NULL,
    uri character varying DEFAULT ''::character varying NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


ALTER TABLE public.account_aliases OWNER TO nchiang;

--
-- Name: account_aliases_id_seq; Type: SEQUENCE; Schema: public; Owner: nchiang
--

CREATE SEQUENCE public.account_aliases_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.account_aliases_id_seq OWNER TO nchiang;

--
-- Name: account_aliases_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nchiang
--

ALTER SEQUENCE public.account_aliases_id_seq OWNED BY public.account_aliases.id;


--
-- Name: account_conversations; Type: TABLE; Schema: public; Owner: nchiang
--

CREATE TABLE public.account_conversations (
    id bigint NOT NULL,
    account_id bigint,
    conversation_id bigint,
    participant_account_ids bigint[] DEFAULT '{}'::bigint[] NOT NULL,
    status_ids bigint[] DEFAULT '{}'::bigint[] NOT NULL,
    last_status_id bigint,
    lock_version integer DEFAULT 0 NOT NULL,
    unread boolean DEFAULT false NOT NULL
);


ALTER TABLE public.account_conversations OWNER TO nchiang;

--
-- Name: account_conversations_id_seq; Type: SEQUENCE; Schema: public; Owner: nchiang
--

CREATE SEQUENCE public.account_conversations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.account_conversations_id_seq OWNER TO nchiang;

--
-- Name: account_conversations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nchiang
--

ALTER SEQUENCE public.account_conversations_id_seq OWNED BY public.account_conversations.id;


--
-- Name: account_deletion_requests; Type: TABLE; Schema: public; Owner: nchiang
--

CREATE TABLE public.account_deletion_requests (
    id bigint NOT NULL,
    account_id bigint,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


ALTER TABLE public.account_deletion_requests OWNER TO nchiang;

--
-- Name: account_deletion_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: nchiang
--

CREATE SEQUENCE public.account_deletion_requests_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.account_deletion_requests_id_seq OWNER TO nchiang;

--
-- Name: account_deletion_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nchiang
--

ALTER SEQUENCE public.account_deletion_requests_id_seq OWNED BY public.account_deletion_requests.id;


--
-- Name: account_domain_blocks; Type: TABLE; Schema: public; Owner: nchiang
--

CREATE TABLE public.account_domain_blocks (
    id bigint NOT NULL,
    domain character varying,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    account_id bigint
);


ALTER TABLE public.account_domain_blocks OWNER TO nchiang;

--
-- Name: account_domain_blocks_id_seq; Type: SEQUENCE; Schema: public; Owner: nchiang
--

CREATE SEQUENCE public.account_domain_blocks_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.account_domain_blocks_id_seq OWNER TO nchiang;

--
-- Name: account_domain_blocks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nchiang
--

ALTER SEQUENCE public.account_domain_blocks_id_seq OWNED BY public.account_domain_blocks.id;


--
-- Name: account_migrations; Type: TABLE; Schema: public; Owner: nchiang
--

CREATE TABLE public.account_migrations (
    id bigint NOT NULL,
    account_id bigint,
    acct character varying DEFAULT ''::character varying NOT NULL,
    followers_count bigint DEFAULT 0 NOT NULL,
    target_account_id bigint,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


ALTER TABLE public.account_migrations OWNER TO nchiang;

--
-- Name: account_migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: nchiang
--

CREATE SEQUENCE public.account_migrations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.account_migrations_id_seq OWNER TO nchiang;

--
-- Name: account_migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nchiang
--

ALTER SEQUENCE public.account_migrations_id_seq OWNED BY public.account_migrations.id;


--
-- Name: account_moderation_notes; Type: TABLE; Schema: public; Owner: nchiang
--

CREATE TABLE public.account_moderation_notes (
    id bigint NOT NULL,
    content text NOT NULL,
    account_id bigint NOT NULL,
    target_account_id bigint NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


ALTER TABLE public.account_moderation_notes OWNER TO nchiang;

--
-- Name: account_moderation_notes_id_seq; Type: SEQUENCE; Schema: public; Owner: nchiang
--

CREATE SEQUENCE public.account_moderation_notes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.account_moderation_notes_id_seq OWNER TO nchiang;

--
-- Name: account_moderation_notes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nchiang
--

ALTER SEQUENCE public.account_moderation_notes_id_seq OWNED BY public.account_moderation_notes.id;


--
-- Name: account_notes; Type: TABLE; Schema: public; Owner: nchiang
--

CREATE TABLE public.account_notes (
    id bigint NOT NULL,
    account_id bigint,
    target_account_id bigint,
    comment text NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


ALTER TABLE public.account_notes OWNER TO nchiang;

--
-- Name: account_notes_id_seq; Type: SEQUENCE; Schema: public; Owner: nchiang
--

CREATE SEQUENCE public.account_notes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.account_notes_id_seq OWNER TO nchiang;

--
-- Name: account_notes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nchiang
--

ALTER SEQUENCE public.account_notes_id_seq OWNED BY public.account_notes.id;


--
-- Name: account_pins; Type: TABLE; Schema: public; Owner: nchiang
--

CREATE TABLE public.account_pins (
    id bigint NOT NULL,
    account_id bigint,
    target_account_id bigint,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


ALTER TABLE public.account_pins OWNER TO nchiang;

--
-- Name: account_pins_id_seq; Type: SEQUENCE; Schema: public; Owner: nchiang
--

CREATE SEQUENCE public.account_pins_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.account_pins_id_seq OWNER TO nchiang;

--
-- Name: account_pins_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nchiang
--

ALTER SEQUENCE public.account_pins_id_seq OWNED BY public.account_pins.id;


--
-- Name: account_stats; Type: TABLE; Schema: public; Owner: nchiang
--

CREATE TABLE public.account_stats (
    id bigint NOT NULL,
    account_id bigint NOT NULL,
    statuses_count bigint DEFAULT 0 NOT NULL,
    following_count bigint DEFAULT 0 NOT NULL,
    followers_count bigint DEFAULT 0 NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    last_status_at timestamp without time zone
);


ALTER TABLE public.account_stats OWNER TO nchiang;

--
-- Name: account_stats_id_seq; Type: SEQUENCE; Schema: public; Owner: nchiang
--

CREATE SEQUENCE public.account_stats_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.account_stats_id_seq OWNER TO nchiang;

--
-- Name: account_stats_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nchiang
--

ALTER SEQUENCE public.account_stats_id_seq OWNED BY public.account_stats.id;


--
-- Name: account_statuses_cleanup_policies; Type: TABLE; Schema: public; Owner: nchiang
--

CREATE TABLE public.account_statuses_cleanup_policies (
    id bigint NOT NULL,
    account_id bigint NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    min_status_age integer DEFAULT 1209600 NOT NULL,
    keep_direct boolean DEFAULT true NOT NULL,
    keep_pinned boolean DEFAULT true NOT NULL,
    keep_polls boolean DEFAULT false NOT NULL,
    keep_media boolean DEFAULT false NOT NULL,
    keep_self_fav boolean DEFAULT true NOT NULL,
    keep_self_bookmark boolean DEFAULT true NOT NULL,
    min_favs integer,
    min_reblogs integer,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);


ALTER TABLE public.account_statuses_cleanup_policies OWNER TO nchiang;

--
-- Name: account_statuses_cleanup_policies_id_seq; Type: SEQUENCE; Schema: public; Owner: nchiang
--

CREATE SEQUENCE public.account_statuses_cleanup_policies_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.account_statuses_cleanup_policies_id_seq OWNER TO nchiang;

--
-- Name: account_statuses_cleanup_policies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nchiang
--

ALTER SEQUENCE public.account_statuses_cleanup_policies_id_seq OWNED BY public.account_statuses_cleanup_policies.id;


--
-- Name: accounts; Type: TABLE; Schema: public; Owner: nchiang
--

CREATE TABLE public.accounts (
    id bigint DEFAULT public.timestamp_id('accounts'::text) NOT NULL,
    username character varying DEFAULT ''::character varying NOT NULL,
    domain character varying,
    private_key text,
    public_key text DEFAULT ''::text NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    note text DEFAULT ''::text NOT NULL,
    display_name character varying DEFAULT ''::character varying NOT NULL,
    uri character varying DEFAULT ''::character varying NOT NULL,
    url character varying,
    avatar_file_name character varying,
    avatar_content_type character varying,
    avatar_file_size integer,
    avatar_updated_at timestamp without time zone,
    header_file_name character varying,
    header_content_type character varying,
    header_file_size integer,
    header_updated_at timestamp without time zone,
    avatar_remote_url character varying,
    locked boolean DEFAULT false NOT NULL,
    header_remote_url character varying DEFAULT ''::character varying NOT NULL,
    last_webfingered_at timestamp without time zone,
    inbox_url character varying DEFAULT ''::character varying NOT NULL,
    outbox_url character varying DEFAULT ''::character varying NOT NULL,
    shared_inbox_url character varying DEFAULT ''::character varying NOT NULL,
    followers_url character varying DEFAULT ''::character varying NOT NULL,
    protocol integer DEFAULT 0 NOT NULL,
    memorial boolean DEFAULT false NOT NULL,
    moved_to_account_id bigint,
    featured_collection_url character varying,
    fields jsonb,
    actor_type character varying,
    discoverable boolean,
    also_known_as character varying[],
    silenced_at timestamp without time zone,
    suspended_at timestamp without time zone,
    hide_collections boolean,
    avatar_storage_schema_version integer,
    header_storage_schema_version integer,
    devices_url character varying,
    suspension_origin integer,
    sensitized_at timestamp without time zone,
    trendable boolean,
    reviewed_at timestamp without time zone,
    requested_review_at timestamp without time zone
);


ALTER TABLE public.accounts OWNER TO nchiang;

--
-- Name: statuses; Type: TABLE; Schema: public; Owner: nchiang
--

CREATE TABLE public.statuses (
    id bigint DEFAULT public.timestamp_id('statuses'::text) NOT NULL,
    uri character varying,
    text text DEFAULT ''::text NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    in_reply_to_id bigint,
    reblog_of_id bigint,
    url character varying,
    sensitive boolean DEFAULT false NOT NULL,
    visibility integer DEFAULT 0 NOT NULL,
    spoiler_text text DEFAULT ''::text NOT NULL,
    reply boolean DEFAULT false NOT NULL,
    language character varying,
    conversation_id bigint,
    local boolean,
    account_id bigint NOT NULL,
    application_id bigint,
    in_reply_to_account_id bigint,
    poll_id bigint,
    deleted_at timestamp without time zone,
    edited_at timestamp without time zone,
    trendable boolean,
    ordered_media_attachment_ids bigint[]
);


ALTER TABLE public.statuses OWNER TO nchiang;

--
-- Name: account_summaries; Type: MATERIALIZED VIEW; Schema: public; Owner: nchiang
--

CREATE MATERIALIZED VIEW public.account_summaries AS
 SELECT accounts.id AS account_id,
    mode() WITHIN GROUP (ORDER BY t0.language) AS language,
    mode() WITHIN GROUP (ORDER BY t0.sensitive) AS sensitive
   FROM (public.accounts
     CROSS JOIN LATERAL ( SELECT statuses.account_id,
            statuses.language,
            statuses.sensitive
           FROM public.statuses
          WHERE ((statuses.account_id = accounts.id) AND (statuses.deleted_at IS NULL) AND (statuses.reblog_of_id IS NULL))
          ORDER BY statuses.id DESC
         LIMIT 20) t0)
  WHERE ((accounts.suspended_at IS NULL) AND (accounts.silenced_at IS NULL) AND (accounts.moved_to_account_id IS NULL) AND (accounts.discoverable = true) AND (accounts.locked = false))
  GROUP BY accounts.id
  WITH NO DATA;


ALTER TABLE public.account_summaries OWNER TO nchiang;

--
-- Name: account_warning_presets; Type: TABLE; Schema: public; Owner: nchiang
--

CREATE TABLE public.account_warning_presets (
    id bigint NOT NULL,
    text text DEFAULT ''::text NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    title character varying DEFAULT ''::character varying NOT NULL
);


ALTER TABLE public.account_warning_presets OWNER TO nchiang;

--
-- Name: account_warning_presets_id_seq; Type: SEQUENCE; Schema: public; Owner: nchiang
--

CREATE SEQUENCE public.account_warning_presets_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.account_warning_presets_id_seq OWNER TO nchiang;

--
-- Name: account_warning_presets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nchiang
--

ALTER SEQUENCE public.account_warning_presets_id_seq OWNED BY public.account_warning_presets.id;


--
-- Name: account_warnings; Type: TABLE; Schema: public; Owner: nchiang
--

CREATE TABLE public.account_warnings (
    id bigint NOT NULL,
    account_id bigint,
    target_account_id bigint,
    action integer DEFAULT 0 NOT NULL,
    text text DEFAULT ''::text NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    report_id bigint,
    status_ids character varying[],
    overruled_at timestamp without time zone
);


ALTER TABLE public.account_warnings OWNER TO nchiang;

--
-- Name: account_warnings_id_seq; Type: SEQUENCE; Schema: public; Owner: nchiang
--

CREATE SEQUENCE public.account_warnings_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.account_warnings_id_seq OWNER TO nchiang;

--
-- Name: account_warnings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nchiang
--

ALTER SEQUENCE public.account_warnings_id_seq OWNED BY public.account_warnings.id;


--
-- Name: accounts_id_seq; Type: SEQUENCE; Schema: public; Owner: nchiang
--

CREATE SEQUENCE public.accounts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.accounts_id_seq OWNER TO nchiang;

--
-- Name: accounts_tags; Type: TABLE; Schema: public; Owner: nchiang
--

CREATE TABLE public.accounts_tags (
    account_id bigint NOT NULL,
    tag_id bigint NOT NULL
);


ALTER TABLE public.accounts_tags OWNER TO nchiang;

--
-- Name: admin_action_logs; Type: TABLE; Schema: public; Owner: nchiang
--

CREATE TABLE public.admin_action_logs (
    id bigint NOT NULL,
    account_id bigint,
    action character varying DEFAULT ''::character varying NOT NULL,
    target_type character varying,
    target_id bigint,
    recorded_changes text DEFAULT ''::text NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


ALTER TABLE public.admin_action_logs OWNER TO nchiang;

--
-- Name: admin_action_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: nchiang
--

CREATE SEQUENCE public.admin_action_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.admin_action_logs_id_seq OWNER TO nchiang;

--
-- Name: admin_action_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nchiang
--

ALTER SEQUENCE public.admin_action_logs_id_seq OWNED BY public.admin_action_logs.id;


--
-- Name: announcement_mutes; Type: TABLE; Schema: public; Owner: nchiang
--

CREATE TABLE public.announcement_mutes (
    id bigint NOT NULL,
    account_id bigint,
    announcement_id bigint,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


ALTER TABLE public.announcement_mutes OWNER TO nchiang;

--
-- Name: announcement_mutes_id_seq; Type: SEQUENCE; Schema: public; Owner: nchiang
--

CREATE SEQUENCE public.announcement_mutes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.announcement_mutes_id_seq OWNER TO nchiang;

--
-- Name: announcement_mutes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nchiang
--

ALTER SEQUENCE public.announcement_mutes_id_seq OWNED BY public.announcement_mutes.id;


--
-- Name: announcement_reactions; Type: TABLE; Schema: public; Owner: nchiang
--

CREATE TABLE public.announcement_reactions (
    id bigint NOT NULL,
    account_id bigint,
    announcement_id bigint,
    name character varying DEFAULT ''::character varying NOT NULL,
    custom_emoji_id bigint,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


ALTER TABLE public.announcement_reactions OWNER TO nchiang;

--
-- Name: announcement_reactions_id_seq; Type: SEQUENCE; Schema: public; Owner: nchiang
--

CREATE SEQUENCE public.announcement_reactions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.announcement_reactions_id_seq OWNER TO nchiang;

--
-- Name: announcement_reactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nchiang
--

ALTER SEQUENCE public.announcement_reactions_id_seq OWNED BY public.announcement_reactions.id;


--
-- Name: announcements; Type: TABLE; Schema: public; Owner: nchiang
--

CREATE TABLE public.announcements (
    id bigint NOT NULL,
    text text DEFAULT ''::text NOT NULL,
    published boolean DEFAULT false NOT NULL,
    all_day boolean DEFAULT false NOT NULL,
    scheduled_at timestamp without time zone,
    starts_at timestamp without time zone,
    ends_at timestamp without time zone,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    published_at timestamp without time zone,
    status_ids bigint[]
);


ALTER TABLE public.announcements OWNER TO nchiang;

--
-- Name: announcements_id_seq; Type: SEQUENCE; Schema: public; Owner: nchiang
--

CREATE SEQUENCE public.announcements_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.announcements_id_seq OWNER TO nchiang;

--
-- Name: announcements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nchiang
--

ALTER SEQUENCE public.announcements_id_seq OWNED BY public.announcements.id;


--
-- Name: appeals; Type: TABLE; Schema: public; Owner: nchiang
--

CREATE TABLE public.appeals (
    id bigint NOT NULL,
    account_id bigint NOT NULL,
    account_warning_id bigint NOT NULL,
    text text DEFAULT ''::text NOT NULL,
    approved_at timestamp without time zone,
    approved_by_account_id bigint,
    rejected_at timestamp without time zone,
    rejected_by_account_id bigint,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);


ALTER TABLE public.appeals OWNER TO nchiang;

--
-- Name: appeals_id_seq; Type: SEQUENCE; Schema: public; Owner: nchiang
--

CREATE SEQUENCE public.appeals_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.appeals_id_seq OWNER TO nchiang;

--
-- Name: appeals_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nchiang
--

ALTER SEQUENCE public.appeals_id_seq OWNED BY public.appeals.id;


--
-- Name: ar_internal_metadata; Type: TABLE; Schema: public; Owner: nchiang
--

CREATE TABLE public.ar_internal_metadata (
    key character varying NOT NULL,
    value character varying,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);


ALTER TABLE public.ar_internal_metadata OWNER TO nchiang;

--
-- Name: backups; Type: TABLE; Schema: public; Owner: nchiang
--

CREATE TABLE public.backups (
    id bigint NOT NULL,
    user_id bigint,
    dump_file_name character varying,
    dump_content_type character varying,
    dump_updated_at timestamp without time zone,
    processed boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    dump_file_size bigint
);


ALTER TABLE public.backups OWNER TO nchiang;

--
-- Name: backups_id_seq; Type: SEQUENCE; Schema: public; Owner: nchiang
--

CREATE SEQUENCE public.backups_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.backups_id_seq OWNER TO nchiang;

--
-- Name: backups_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nchiang
--

ALTER SEQUENCE public.backups_id_seq OWNED BY public.backups.id;


--
-- Name: blocks; Type: TABLE; Schema: public; Owner: nchiang
--

CREATE TABLE public.blocks (
    id bigint NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    account_id bigint NOT NULL,
    target_account_id bigint NOT NULL,
    uri character varying
);


ALTER TABLE public.blocks OWNER TO nchiang;

--
-- Name: blocks_id_seq; Type: SEQUENCE; Schema: public; Owner: nchiang
--

CREATE SEQUENCE public.blocks_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.blocks_id_seq OWNER TO nchiang;

--
-- Name: blocks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nchiang
--

ALTER SEQUENCE public.blocks_id_seq OWNED BY public.blocks.id;


--
-- Name: bookmarks; Type: TABLE; Schema: public; Owner: nchiang
--

CREATE TABLE public.bookmarks (
    id bigint NOT NULL,
    account_id bigint NOT NULL,
    status_id bigint NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


ALTER TABLE public.bookmarks OWNER TO nchiang;

--
-- Name: bookmarks_id_seq; Type: SEQUENCE; Schema: public; Owner: nchiang
--

CREATE SEQUENCE public.bookmarks_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.bookmarks_id_seq OWNER TO nchiang;

--
-- Name: bookmarks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nchiang
--

ALTER SEQUENCE public.bookmarks_id_seq OWNED BY public.bookmarks.id;


--
-- Name: canonical_email_blocks; Type: TABLE; Schema: public; Owner: nchiang
--

CREATE TABLE public.canonical_email_blocks (
    id bigint NOT NULL,
    canonical_email_hash character varying DEFAULT ''::character varying NOT NULL,
    reference_account_id bigint NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);


ALTER TABLE public.canonical_email_blocks OWNER TO nchiang;

--
-- Name: canonical_email_blocks_id_seq; Type: SEQUENCE; Schema: public; Owner: nchiang
--

CREATE SEQUENCE public.canonical_email_blocks_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.canonical_email_blocks_id_seq OWNER TO nchiang;

--
-- Name: canonical_email_blocks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nchiang
--

ALTER SEQUENCE public.canonical_email_blocks_id_seq OWNED BY public.canonical_email_blocks.id;


--
-- Name: conversation_mutes; Type: TABLE; Schema: public; Owner: nchiang
--

CREATE TABLE public.conversation_mutes (
    id bigint NOT NULL,
    conversation_id bigint NOT NULL,
    account_id bigint NOT NULL
);


ALTER TABLE public.conversation_mutes OWNER TO nchiang;

--
-- Name: conversation_mutes_id_seq; Type: SEQUENCE; Schema: public; Owner: nchiang
--

CREATE SEQUENCE public.conversation_mutes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.conversation_mutes_id_seq OWNER TO nchiang;

--
-- Name: conversation_mutes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nchiang
--

ALTER SEQUENCE public.conversation_mutes_id_seq OWNED BY public.conversation_mutes.id;


--
-- Name: conversations; Type: TABLE; Schema: public; Owner: nchiang
--

CREATE TABLE public.conversations (
    id bigint NOT NULL,
    uri character varying,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


ALTER TABLE public.conversations OWNER TO nchiang;

--
-- Name: conversations_id_seq; Type: SEQUENCE; Schema: public; Owner: nchiang
--

CREATE SEQUENCE public.conversations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.conversations_id_seq OWNER TO nchiang;

--
-- Name: conversations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nchiang
--

ALTER SEQUENCE public.conversations_id_seq OWNED BY public.conversations.id;


--
-- Name: custom_emoji_categories; Type: TABLE; Schema: public; Owner: nchiang
--

CREATE TABLE public.custom_emoji_categories (
    id bigint NOT NULL,
    name character varying,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


ALTER TABLE public.custom_emoji_categories OWNER TO nchiang;

--
-- Name: custom_emoji_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: nchiang
--

CREATE SEQUENCE public.custom_emoji_categories_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.custom_emoji_categories_id_seq OWNER TO nchiang;

--
-- Name: custom_emoji_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nchiang
--

ALTER SEQUENCE public.custom_emoji_categories_id_seq OWNED BY public.custom_emoji_categories.id;


--
-- Name: custom_emojis; Type: TABLE; Schema: public; Owner: nchiang
--

CREATE TABLE public.custom_emojis (
    id bigint NOT NULL,
    shortcode character varying DEFAULT ''::character varying NOT NULL,
    domain character varying,
    image_file_name character varying,
    image_content_type character varying,
    image_file_size integer,
    image_updated_at timestamp without time zone,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    disabled boolean DEFAULT false NOT NULL,
    uri character varying,
    image_remote_url character varying,
    visible_in_picker boolean DEFAULT true NOT NULL,
    category_id bigint,
    image_storage_schema_version integer
);


ALTER TABLE public.custom_emojis OWNER TO nchiang;

--
-- Name: custom_emojis_id_seq; Type: SEQUENCE; Schema: public; Owner: nchiang
--

CREATE SEQUENCE public.custom_emojis_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.custom_emojis_id_seq OWNER TO nchiang;

--
-- Name: custom_emojis_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nchiang
--

ALTER SEQUENCE public.custom_emojis_id_seq OWNED BY public.custom_emojis.id;


--
-- Name: custom_filters; Type: TABLE; Schema: public; Owner: nchiang
--

CREATE TABLE public.custom_filters (
    id bigint NOT NULL,
    account_id bigint,
    expires_at timestamp without time zone,
    phrase text DEFAULT ''::text NOT NULL,
    context character varying[] DEFAULT '{}'::character varying[] NOT NULL,
    irreversible boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    whole_word boolean DEFAULT true NOT NULL
);


ALTER TABLE public.custom_filters OWNER TO nchiang;

--
-- Name: custom_filters_id_seq; Type: SEQUENCE; Schema: public; Owner: nchiang
--

CREATE SEQUENCE public.custom_filters_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.custom_filters_id_seq OWNER TO nchiang;

--
-- Name: custom_filters_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nchiang
--

ALTER SEQUENCE public.custom_filters_id_seq OWNED BY public.custom_filters.id;


--
-- Name: devices; Type: TABLE; Schema: public; Owner: nchiang
--

CREATE TABLE public.devices (
    id bigint NOT NULL,
    access_token_id bigint,
    account_id bigint,
    device_id character varying DEFAULT ''::character varying NOT NULL,
    name character varying DEFAULT ''::character varying NOT NULL,
    fingerprint_key text DEFAULT ''::text NOT NULL,
    identity_key text DEFAULT ''::text NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


ALTER TABLE public.devices OWNER TO nchiang;

--
-- Name: devices_id_seq; Type: SEQUENCE; Schema: public; Owner: nchiang
--

CREATE SEQUENCE public.devices_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.devices_id_seq OWNER TO nchiang;

--
-- Name: devices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nchiang
--

ALTER SEQUENCE public.devices_id_seq OWNED BY public.devices.id;


--
-- Name: domain_allows; Type: TABLE; Schema: public; Owner: nchiang
--

CREATE TABLE public.domain_allows (
    id bigint NOT NULL,
    domain character varying DEFAULT ''::character varying NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


ALTER TABLE public.domain_allows OWNER TO nchiang;

--
-- Name: domain_allows_id_seq; Type: SEQUENCE; Schema: public; Owner: nchiang
--

CREATE SEQUENCE public.domain_allows_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.domain_allows_id_seq OWNER TO nchiang;

--
-- Name: domain_allows_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nchiang
--

ALTER SEQUENCE public.domain_allows_id_seq OWNED BY public.domain_allows.id;


--
-- Name: domain_blocks; Type: TABLE; Schema: public; Owner: nchiang
--

CREATE TABLE public.domain_blocks (
    id bigint NOT NULL,
    domain character varying DEFAULT ''::character varying NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    severity integer DEFAULT 0,
    reject_media boolean DEFAULT false NOT NULL,
    reject_reports boolean DEFAULT false NOT NULL,
    private_comment text,
    public_comment text,
    obfuscate boolean DEFAULT false NOT NULL
);


ALTER TABLE public.domain_blocks OWNER TO nchiang;

--
-- Name: domain_blocks_id_seq; Type: SEQUENCE; Schema: public; Owner: nchiang
--

CREATE SEQUENCE public.domain_blocks_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.domain_blocks_id_seq OWNER TO nchiang;

--
-- Name: domain_blocks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nchiang
--

ALTER SEQUENCE public.domain_blocks_id_seq OWNED BY public.domain_blocks.id;


--
-- Name: email_domain_blocks; Type: TABLE; Schema: public; Owner: nchiang
--

CREATE TABLE public.email_domain_blocks (
    id bigint NOT NULL,
    domain character varying DEFAULT ''::character varying NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    parent_id bigint,
    ips inet[],
    last_refresh_at timestamp without time zone
);


ALTER TABLE public.email_domain_blocks OWNER TO nchiang;

--
-- Name: email_domain_blocks_id_seq; Type: SEQUENCE; Schema: public; Owner: nchiang
--

CREATE SEQUENCE public.email_domain_blocks_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.email_domain_blocks_id_seq OWNER TO nchiang;

--
-- Name: email_domain_blocks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nchiang
--

ALTER SEQUENCE public.email_domain_blocks_id_seq OWNED BY public.email_domain_blocks.id;


--
-- Name: encrypted_messages; Type: TABLE; Schema: public; Owner: nchiang
--

CREATE TABLE public.encrypted_messages (
    id bigint DEFAULT public.timestamp_id('encrypted_messages'::text) NOT NULL,
    device_id bigint,
    from_account_id bigint,
    from_device_id character varying DEFAULT ''::character varying NOT NULL,
    type integer DEFAULT 0 NOT NULL,
    body text DEFAULT ''::text NOT NULL,
    digest text DEFAULT ''::text NOT NULL,
    message_franking text DEFAULT ''::text NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


ALTER TABLE public.encrypted_messages OWNER TO nchiang;

--
-- Name: encrypted_messages_id_seq; Type: SEQUENCE; Schema: public; Owner: nchiang
--

CREATE SEQUENCE public.encrypted_messages_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.encrypted_messages_id_seq OWNER TO nchiang;

--
-- Name: favourites; Type: TABLE; Schema: public; Owner: nchiang
--

CREATE TABLE public.favourites (
    id bigint NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    account_id bigint NOT NULL,
    status_id bigint NOT NULL
);


ALTER TABLE public.favourites OWNER TO nchiang;

--
-- Name: favourites_id_seq; Type: SEQUENCE; Schema: public; Owner: nchiang
--

CREATE SEQUENCE public.favourites_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.favourites_id_seq OWNER TO nchiang;

--
-- Name: favourites_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nchiang
--

ALTER SEQUENCE public.favourites_id_seq OWNED BY public.favourites.id;


--
-- Name: featured_tags; Type: TABLE; Schema: public; Owner: nchiang
--

CREATE TABLE public.featured_tags (
    id bigint NOT NULL,
    account_id bigint NOT NULL,
    tag_id bigint NOT NULL,
    statuses_count bigint DEFAULT 0 NOT NULL,
    last_status_at timestamp without time zone,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


ALTER TABLE public.featured_tags OWNER TO nchiang;

--
-- Name: featured_tags_id_seq; Type: SEQUENCE; Schema: public; Owner: nchiang
--

CREATE SEQUENCE public.featured_tags_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.featured_tags_id_seq OWNER TO nchiang;

--
-- Name: featured_tags_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nchiang
--

ALTER SEQUENCE public.featured_tags_id_seq OWNED BY public.featured_tags.id;


--
-- Name: follow_recommendation_suppressions; Type: TABLE; Schema: public; Owner: nchiang
--

CREATE TABLE public.follow_recommendation_suppressions (
    id bigint NOT NULL,
    account_id bigint NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);


ALTER TABLE public.follow_recommendation_suppressions OWNER TO nchiang;

--
-- Name: follow_recommendation_suppressions_id_seq; Type: SEQUENCE; Schema: public; Owner: nchiang
--

CREATE SEQUENCE public.follow_recommendation_suppressions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.follow_recommendation_suppressions_id_seq OWNER TO nchiang;

--
-- Name: follow_recommendation_suppressions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nchiang
--

ALTER SEQUENCE public.follow_recommendation_suppressions_id_seq OWNED BY public.follow_recommendation_suppressions.id;


--
-- Name: follows; Type: TABLE; Schema: public; Owner: nchiang
--

CREATE TABLE public.follows (
    id bigint NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    account_id bigint NOT NULL,
    target_account_id bigint NOT NULL,
    show_reblogs boolean DEFAULT true NOT NULL,
    uri character varying,
    notify boolean DEFAULT false NOT NULL
);


ALTER TABLE public.follows OWNER TO nchiang;

--
-- Name: status_stats; Type: TABLE; Schema: public; Owner: nchiang
--

CREATE TABLE public.status_stats (
    id bigint NOT NULL,
    status_id bigint NOT NULL,
    replies_count bigint DEFAULT 0 NOT NULL,
    reblogs_count bigint DEFAULT 0 NOT NULL,
    favourites_count bigint DEFAULT 0 NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


ALTER TABLE public.status_stats OWNER TO nchiang;

--
-- Name: users; Type: TABLE; Schema: public; Owner: nchiang
--

CREATE TABLE public.users (
    id bigint NOT NULL,
    email character varying DEFAULT ''::character varying NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    encrypted_password character varying DEFAULT ''::character varying NOT NULL,
    reset_password_token character varying,
    reset_password_sent_at timestamp without time zone,
    sign_in_count integer DEFAULT 0 NOT NULL,
    current_sign_in_at timestamp without time zone,
    last_sign_in_at timestamp without time zone,
    admin boolean DEFAULT false NOT NULL,
    confirmation_token character varying,
    confirmed_at timestamp without time zone,
    confirmation_sent_at timestamp without time zone,
    unconfirmed_email character varying,
    locale character varying,
    encrypted_otp_secret character varying,
    encrypted_otp_secret_iv character varying,
    encrypted_otp_secret_salt character varying,
    consumed_timestep integer,
    otp_required_for_login boolean DEFAULT false NOT NULL,
    last_emailed_at timestamp without time zone,
    otp_backup_codes character varying[],
    filtered_languages character varying[] DEFAULT '{}'::character varying[] NOT NULL,
    account_id bigint NOT NULL,
    disabled boolean DEFAULT false NOT NULL,
    moderator boolean DEFAULT false NOT NULL,
    invite_id bigint,
    chosen_languages character varying[],
    created_by_application_id bigint,
    approved boolean DEFAULT true NOT NULL,
    sign_in_token character varying,
    sign_in_token_sent_at timestamp without time zone,
    webauthn_id character varying,
    sign_up_ip inet,
    skip_sign_in_token boolean
);


ALTER TABLE public.users OWNER TO nchiang;

--
-- Name: follow_recommendations; Type: MATERIALIZED VIEW; Schema: public; Owner: nchiang
--

CREATE MATERIALIZED VIEW public.follow_recommendations AS
 SELECT t0.account_id,
    sum(t0.rank) AS rank,
    array_agg(t0.reason) AS reason
   FROM ( SELECT account_summaries.account_id,
            ((count(follows.id))::numeric / (1.0 + (count(follows.id))::numeric)) AS rank,
            'most_followed'::text AS reason
           FROM (((public.follows
             JOIN public.account_summaries ON ((account_summaries.account_id = follows.target_account_id)))
             JOIN public.users ON ((users.account_id = follows.account_id)))
             LEFT JOIN public.follow_recommendation_suppressions ON ((follow_recommendation_suppressions.account_id = follows.target_account_id)))
          WHERE ((users.current_sign_in_at >= (now() - '30 days'::interval)) AND (account_summaries.sensitive = false) AND (follow_recommendation_suppressions.id IS NULL))
          GROUP BY account_summaries.account_id
         HAVING (count(follows.id) >= 5)
        UNION ALL
         SELECT account_summaries.account_id,
            (sum((status_stats.reblogs_count + status_stats.favourites_count)) / (1.0 + sum((status_stats.reblogs_count + status_stats.favourites_count)))) AS rank,
            'most_interactions'::text AS reason
           FROM (((public.status_stats
             JOIN public.statuses ON ((statuses.id = status_stats.status_id)))
             JOIN public.account_summaries ON ((account_summaries.account_id = statuses.account_id)))
             LEFT JOIN public.follow_recommendation_suppressions ON ((follow_recommendation_suppressions.account_id = statuses.account_id)))
          WHERE ((statuses.id >= (((date_part('epoch'::text, (now() - '30 days'::interval)) * (1000)::double precision))::bigint << 16)) AND (account_summaries.sensitive = false) AND (follow_recommendation_suppressions.id IS NULL))
          GROUP BY account_summaries.account_id
         HAVING (sum((status_stats.reblogs_count + status_stats.favourites_count)) >= (5)::numeric)) t0
  GROUP BY t0.account_id
  ORDER BY (sum(t0.rank)) DESC
  WITH NO DATA;


ALTER TABLE public.follow_recommendations OWNER TO nchiang;

--
-- Name: follow_requests; Type: TABLE; Schema: public; Owner: nchiang
--

CREATE TABLE public.follow_requests (
    id bigint NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    account_id bigint NOT NULL,
    target_account_id bigint NOT NULL,
    show_reblogs boolean DEFAULT true NOT NULL,
    uri character varying,
    notify boolean DEFAULT false NOT NULL
);


ALTER TABLE public.follow_requests OWNER TO nchiang;

--
-- Name: follow_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: nchiang
--

CREATE SEQUENCE public.follow_requests_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.follow_requests_id_seq OWNER TO nchiang;

--
-- Name: follow_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nchiang
--

ALTER SEQUENCE public.follow_requests_id_seq OWNED BY public.follow_requests.id;


--
-- Name: follows_id_seq; Type: SEQUENCE; Schema: public; Owner: nchiang
--

CREATE SEQUENCE public.follows_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.follows_id_seq OWNER TO nchiang;

--
-- Name: follows_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nchiang
--

ALTER SEQUENCE public.follows_id_seq OWNED BY public.follows.id;


--
-- Name: identities; Type: TABLE; Schema: public; Owner: nchiang
--

CREATE TABLE public.identities (
    id bigint NOT NULL,
    provider character varying DEFAULT ''::character varying NOT NULL,
    uid character varying DEFAULT ''::character varying NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    user_id bigint
);


ALTER TABLE public.identities OWNER TO nchiang;

--
-- Name: identities_id_seq; Type: SEQUENCE; Schema: public; Owner: nchiang
--

CREATE SEQUENCE public.identities_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.identities_id_seq OWNER TO nchiang;

--
-- Name: identities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nchiang
--

ALTER SEQUENCE public.identities_id_seq OWNED BY public.identities.id;


--
-- Name: imports; Type: TABLE; Schema: public; Owner: nchiang
--

CREATE TABLE public.imports (
    id bigint NOT NULL,
    type integer NOT NULL,
    approved boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    data_file_name character varying,
    data_content_type character varying,
    data_file_size integer,
    data_updated_at timestamp without time zone,
    account_id bigint NOT NULL,
    overwrite boolean DEFAULT false NOT NULL
);


ALTER TABLE public.imports OWNER TO nchiang;

--
-- Name: imports_id_seq; Type: SEQUENCE; Schema: public; Owner: nchiang
--

CREATE SEQUENCE public.imports_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.imports_id_seq OWNER TO nchiang;

--
-- Name: imports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nchiang
--

ALTER SEQUENCE public.imports_id_seq OWNED BY public.imports.id;


--
-- Name: instances; Type: MATERIALIZED VIEW; Schema: public; Owner: nchiang
--

CREATE MATERIALIZED VIEW public.instances AS
 WITH domain_counts(domain, accounts_count) AS (
         SELECT accounts.domain,
            count(*) AS accounts_count
           FROM public.accounts
          WHERE (accounts.domain IS NOT NULL)
          GROUP BY accounts.domain
        )
 SELECT domain_counts.domain,
    domain_counts.accounts_count
   FROM domain_counts
UNION
 SELECT domain_blocks.domain,
    COALESCE(domain_counts.accounts_count, (0)::bigint) AS accounts_count
   FROM (public.domain_blocks
     LEFT JOIN domain_counts ON (((domain_counts.domain)::text = (domain_blocks.domain)::text)))
UNION
 SELECT domain_allows.domain,
    COALESCE(domain_counts.accounts_count, (0)::bigint) AS accounts_count
   FROM (public.domain_allows
     LEFT JOIN domain_counts ON (((domain_counts.domain)::text = (domain_allows.domain)::text)))
  WITH NO DATA;


ALTER TABLE public.instances OWNER TO nchiang;

--
-- Name: invites; Type: TABLE; Schema: public; Owner: nchiang
--

CREATE TABLE public.invites (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    code character varying DEFAULT ''::character varying NOT NULL,
    expires_at timestamp without time zone,
    max_uses integer,
    uses integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    autofollow boolean DEFAULT false NOT NULL,
    comment text
);


ALTER TABLE public.invites OWNER TO nchiang;

--
-- Name: invites_id_seq; Type: SEQUENCE; Schema: public; Owner: nchiang
--

CREATE SEQUENCE public.invites_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.invites_id_seq OWNER TO nchiang;

--
-- Name: invites_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nchiang
--

ALTER SEQUENCE public.invites_id_seq OWNED BY public.invites.id;


--
-- Name: ip_blocks; Type: TABLE; Schema: public; Owner: nchiang
--

CREATE TABLE public.ip_blocks (
    id bigint NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    expires_at timestamp without time zone,
    ip inet DEFAULT '0.0.0.0'::inet NOT NULL,
    severity integer DEFAULT 0 NOT NULL,
    comment text DEFAULT ''::text NOT NULL
);


ALTER TABLE public.ip_blocks OWNER TO nchiang;

--
-- Name: ip_blocks_id_seq; Type: SEQUENCE; Schema: public; Owner: nchiang
--

CREATE SEQUENCE public.ip_blocks_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.ip_blocks_id_seq OWNER TO nchiang;

--
-- Name: ip_blocks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nchiang
--

ALTER SEQUENCE public.ip_blocks_id_seq OWNED BY public.ip_blocks.id;


--
-- Name: list_accounts; Type: TABLE; Schema: public; Owner: nchiang
--

CREATE TABLE public.list_accounts (
    id bigint NOT NULL,
    list_id bigint NOT NULL,
    account_id bigint NOT NULL,
    follow_id bigint
);


ALTER TABLE public.list_accounts OWNER TO nchiang;

--
-- Name: list_accounts_id_seq; Type: SEQUENCE; Schema: public; Owner: nchiang
--

CREATE SEQUENCE public.list_accounts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.list_accounts_id_seq OWNER TO nchiang;

--
-- Name: list_accounts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nchiang
--

ALTER SEQUENCE public.list_accounts_id_seq OWNED BY public.list_accounts.id;


--
-- Name: lists; Type: TABLE; Schema: public; Owner: nchiang
--

CREATE TABLE public.lists (
    id bigint NOT NULL,
    account_id bigint NOT NULL,
    title character varying DEFAULT ''::character varying NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    replies_policy integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.lists OWNER TO nchiang;

--
-- Name: lists_id_seq; Type: SEQUENCE; Schema: public; Owner: nchiang
--

CREATE SEQUENCE public.lists_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.lists_id_seq OWNER TO nchiang;

--
-- Name: lists_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nchiang
--

ALTER SEQUENCE public.lists_id_seq OWNED BY public.lists.id;


--
-- Name: login_activities; Type: TABLE; Schema: public; Owner: nchiang
--

CREATE TABLE public.login_activities (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    authentication_method character varying,
    provider character varying,
    success boolean,
    failure_reason character varying,
    ip inet,
    user_agent character varying,
    created_at timestamp without time zone
);


ALTER TABLE public.login_activities OWNER TO nchiang;

--
-- Name: login_activities_id_seq; Type: SEQUENCE; Schema: public; Owner: nchiang
--

CREATE SEQUENCE public.login_activities_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.login_activities_id_seq OWNER TO nchiang;

--
-- Name: login_activities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nchiang
--

ALTER SEQUENCE public.login_activities_id_seq OWNED BY public.login_activities.id;


--
-- Name: markers; Type: TABLE; Schema: public; Owner: nchiang
--

CREATE TABLE public.markers (
    id bigint NOT NULL,
    user_id bigint,
    timeline character varying DEFAULT ''::character varying NOT NULL,
    last_read_id bigint DEFAULT 0 NOT NULL,
    lock_version integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


ALTER TABLE public.markers OWNER TO nchiang;

--
-- Name: markers_id_seq; Type: SEQUENCE; Schema: public; Owner: nchiang
--

CREATE SEQUENCE public.markers_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.markers_id_seq OWNER TO nchiang;

--
-- Name: markers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nchiang
--

ALTER SEQUENCE public.markers_id_seq OWNED BY public.markers.id;


--
-- Name: media_attachments; Type: TABLE; Schema: public; Owner: nchiang
--

CREATE TABLE public.media_attachments (
    id bigint DEFAULT public.timestamp_id('media_attachments'::text) NOT NULL,
    status_id bigint,
    file_file_name character varying,
    file_content_type character varying,
    file_file_size integer,
    file_updated_at timestamp without time zone,
    remote_url character varying DEFAULT ''::character varying NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    shortcode character varying,
    type integer DEFAULT 0 NOT NULL,
    file_meta json,
    account_id bigint,
    description text,
    scheduled_status_id bigint,
    blurhash character varying,
    processing integer,
    file_storage_schema_version integer,
    thumbnail_file_name character varying,
    thumbnail_content_type character varying,
    thumbnail_file_size integer,
    thumbnail_updated_at timestamp without time zone,
    thumbnail_remote_url character varying
);


ALTER TABLE public.media_attachments OWNER TO nchiang;

--
-- Name: media_attachments_id_seq; Type: SEQUENCE; Schema: public; Owner: nchiang
--

CREATE SEQUENCE public.media_attachments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.media_attachments_id_seq OWNER TO nchiang;

--
-- Name: mentions; Type: TABLE; Schema: public; Owner: nchiang
--

CREATE TABLE public.mentions (
    id bigint NOT NULL,
    status_id bigint,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    account_id bigint,
    silent boolean DEFAULT false NOT NULL
);


ALTER TABLE public.mentions OWNER TO nchiang;

--
-- Name: mentions_id_seq; Type: SEQUENCE; Schema: public; Owner: nchiang
--

CREATE SEQUENCE public.mentions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.mentions_id_seq OWNER TO nchiang;

--
-- Name: mentions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nchiang
--

ALTER SEQUENCE public.mentions_id_seq OWNED BY public.mentions.id;


--
-- Name: mutes; Type: TABLE; Schema: public; Owner: nchiang
--

CREATE TABLE public.mutes (
    id bigint NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    hide_notifications boolean DEFAULT true NOT NULL,
    account_id bigint NOT NULL,
    target_account_id bigint NOT NULL,
    expires_at timestamp without time zone
);


ALTER TABLE public.mutes OWNER TO nchiang;

--
-- Name: mutes_id_seq; Type: SEQUENCE; Schema: public; Owner: nchiang
--

CREATE SEQUENCE public.mutes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.mutes_id_seq OWNER TO nchiang;

--
-- Name: mutes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nchiang
--

ALTER SEQUENCE public.mutes_id_seq OWNED BY public.mutes.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: nchiang
--

CREATE TABLE public.notifications (
    id bigint NOT NULL,
    activity_id bigint NOT NULL,
    activity_type character varying NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    account_id bigint NOT NULL,
    from_account_id bigint NOT NULL,
    type character varying
);


ALTER TABLE public.notifications OWNER TO nchiang;

--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: nchiang
--

CREATE SEQUENCE public.notifications_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.notifications_id_seq OWNER TO nchiang;

--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nchiang
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- Name: oauth_access_grants; Type: TABLE; Schema: public; Owner: nchiang
--

CREATE TABLE public.oauth_access_grants (
    id bigint NOT NULL,
    token character varying NOT NULL,
    expires_in integer NOT NULL,
    redirect_uri text NOT NULL,
    created_at timestamp without time zone NOT NULL,
    revoked_at timestamp without time zone,
    scopes character varying,
    application_id bigint NOT NULL,
    resource_owner_id bigint NOT NULL
);


ALTER TABLE public.oauth_access_grants OWNER TO nchiang;

--
-- Name: oauth_access_grants_id_seq; Type: SEQUENCE; Schema: public; Owner: nchiang
--

CREATE SEQUENCE public.oauth_access_grants_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.oauth_access_grants_id_seq OWNER TO nchiang;

--
-- Name: oauth_access_grants_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nchiang
--

ALTER SEQUENCE public.oauth_access_grants_id_seq OWNED BY public.oauth_access_grants.id;


--
-- Name: oauth_access_tokens; Type: TABLE; Schema: public; Owner: nchiang
--

CREATE TABLE public.oauth_access_tokens (
    id bigint NOT NULL,
    token character varying NOT NULL,
    refresh_token character varying,
    expires_in integer,
    revoked_at timestamp without time zone,
    created_at timestamp without time zone NOT NULL,
    scopes character varying,
    application_id bigint,
    resource_owner_id bigint,
    last_used_at timestamp without time zone,
    last_used_ip inet
);


ALTER TABLE public.oauth_access_tokens OWNER TO nchiang;

--
-- Name: oauth_access_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: nchiang
--

CREATE SEQUENCE public.oauth_access_tokens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.oauth_access_tokens_id_seq OWNER TO nchiang;

--
-- Name: oauth_access_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nchiang
--

ALTER SEQUENCE public.oauth_access_tokens_id_seq OWNED BY public.oauth_access_tokens.id;


--
-- Name: oauth_applications; Type: TABLE; Schema: public; Owner: nchiang
--

CREATE TABLE public.oauth_applications (
    id bigint NOT NULL,
    name character varying NOT NULL,
    uid character varying NOT NULL,
    secret character varying NOT NULL,
    redirect_uri text NOT NULL,
    scopes character varying DEFAULT ''::character varying NOT NULL,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    superapp boolean DEFAULT false NOT NULL,
    website character varying,
    owner_type character varying,
    owner_id bigint,
    confidential boolean DEFAULT true NOT NULL
);


ALTER TABLE public.oauth_applications OWNER TO nchiang;

--
-- Name: oauth_applications_id_seq; Type: SEQUENCE; Schema: public; Owner: nchiang
--

CREATE SEQUENCE public.oauth_applications_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.oauth_applications_id_seq OWNER TO nchiang;

--
-- Name: oauth_applications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nchiang
--

ALTER SEQUENCE public.oauth_applications_id_seq OWNED BY public.oauth_applications.id;


--
-- Name: one_time_keys; Type: TABLE; Schema: public; Owner: nchiang
--

CREATE TABLE public.one_time_keys (
    id bigint NOT NULL,
    device_id bigint,
    key_id character varying DEFAULT ''::character varying NOT NULL,
    key text DEFAULT ''::text NOT NULL,
    signature text DEFAULT ''::text NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


ALTER TABLE public.one_time_keys OWNER TO nchiang;

--
-- Name: one_time_keys_id_seq; Type: SEQUENCE; Schema: public; Owner: nchiang
--

CREATE SEQUENCE public.one_time_keys_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.one_time_keys_id_seq OWNER TO nchiang;

--
-- Name: one_time_keys_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nchiang
--

ALTER SEQUENCE public.one_time_keys_id_seq OWNED BY public.one_time_keys.id;


--
-- Name: pghero_space_stats; Type: TABLE; Schema: public; Owner: nchiang
--

CREATE TABLE public.pghero_space_stats (
    id bigint NOT NULL,
    database text,
    schema text,
    relation text,
    size bigint,
    captured_at timestamp without time zone
);


ALTER TABLE public.pghero_space_stats OWNER TO nchiang;

--
-- Name: pghero_space_stats_id_seq; Type: SEQUENCE; Schema: public; Owner: nchiang
--

CREATE SEQUENCE public.pghero_space_stats_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.pghero_space_stats_id_seq OWNER TO nchiang;

--
-- Name: pghero_space_stats_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nchiang
--

ALTER SEQUENCE public.pghero_space_stats_id_seq OWNED BY public.pghero_space_stats.id;


--
-- Name: poll_votes; Type: TABLE; Schema: public; Owner: nchiang
--

CREATE TABLE public.poll_votes (
    id bigint NOT NULL,
    account_id bigint,
    poll_id bigint,
    choice integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    uri character varying
);


ALTER TABLE public.poll_votes OWNER TO nchiang;

--
-- Name: poll_votes_id_seq; Type: SEQUENCE; Schema: public; Owner: nchiang
--

CREATE SEQUENCE public.poll_votes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.poll_votes_id_seq OWNER TO nchiang;

--
-- Name: poll_votes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nchiang
--

ALTER SEQUENCE public.poll_votes_id_seq OWNED BY public.poll_votes.id;


--
-- Name: polls; Type: TABLE; Schema: public; Owner: nchiang
--

CREATE TABLE public.polls (
    id bigint NOT NULL,
    account_id bigint,
    status_id bigint,
    expires_at timestamp without time zone,
    options character varying[] DEFAULT '{}'::character varying[] NOT NULL,
    cached_tallies bigint[] DEFAULT '{}'::bigint[] NOT NULL,
    multiple boolean DEFAULT false NOT NULL,
    hide_totals boolean DEFAULT false NOT NULL,
    votes_count bigint DEFAULT 0 NOT NULL,
    last_fetched_at timestamp without time zone,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    lock_version integer DEFAULT 0 NOT NULL,
    voters_count bigint
);


ALTER TABLE public.polls OWNER TO nchiang;

--
-- Name: polls_id_seq; Type: SEQUENCE; Schema: public; Owner: nchiang
--

CREATE SEQUENCE public.polls_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.polls_id_seq OWNER TO nchiang;

--
-- Name: polls_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nchiang
--

ALTER SEQUENCE public.polls_id_seq OWNED BY public.polls.id;


--
-- Name: preview_card_providers; Type: TABLE; Schema: public; Owner: nchiang
--

CREATE TABLE public.preview_card_providers (
    id bigint NOT NULL,
    domain character varying DEFAULT ''::character varying NOT NULL,
    icon_file_name character varying,
    icon_content_type character varying,
    icon_file_size bigint,
    icon_updated_at timestamp without time zone,
    trendable boolean,
    reviewed_at timestamp without time zone,
    requested_review_at timestamp without time zone,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);


ALTER TABLE public.preview_card_providers OWNER TO nchiang;

--
-- Name: preview_card_providers_id_seq; Type: SEQUENCE; Schema: public; Owner: nchiang
--

CREATE SEQUENCE public.preview_card_providers_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.preview_card_providers_id_seq OWNER TO nchiang;

--
-- Name: preview_card_providers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nchiang
--

ALTER SEQUENCE public.preview_card_providers_id_seq OWNED BY public.preview_card_providers.id;


--
-- Name: preview_cards; Type: TABLE; Schema: public; Owner: nchiang
--

CREATE TABLE public.preview_cards (
    id bigint NOT NULL,
    url character varying DEFAULT ''::character varying NOT NULL,
    title character varying DEFAULT ''::character varying NOT NULL,
    description character varying DEFAULT ''::character varying NOT NULL,
    image_file_name character varying,
    image_content_type character varying,
    image_file_size integer,
    image_updated_at timestamp without time zone,
    type integer DEFAULT 0 NOT NULL,
    html text DEFAULT ''::text NOT NULL,
    author_name character varying DEFAULT ''::character varying NOT NULL,
    author_url character varying DEFAULT ''::character varying NOT NULL,
    provider_name character varying DEFAULT ''::character varying NOT NULL,
    provider_url character varying DEFAULT ''::character varying NOT NULL,
    width integer DEFAULT 0 NOT NULL,
    height integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    embed_url character varying DEFAULT ''::character varying NOT NULL,
    image_storage_schema_version integer,
    blurhash character varying,
    language character varying,
    max_score double precision,
    max_score_at timestamp without time zone,
    trendable boolean,
    link_type integer
);


ALTER TABLE public.preview_cards OWNER TO nchiang;

--
-- Name: preview_cards_id_seq; Type: SEQUENCE; Schema: public; Owner: nchiang
--

CREATE SEQUENCE public.preview_cards_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.preview_cards_id_seq OWNER TO nchiang;

--
-- Name: preview_cards_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nchiang
--

ALTER SEQUENCE public.preview_cards_id_seq OWNED BY public.preview_cards.id;


--
-- Name: preview_cards_statuses; Type: TABLE; Schema: public; Owner: nchiang
--

CREATE TABLE public.preview_cards_statuses (
    preview_card_id bigint NOT NULL,
    status_id bigint NOT NULL
);


ALTER TABLE public.preview_cards_statuses OWNER TO nchiang;

--
-- Name: relays; Type: TABLE; Schema: public; Owner: nchiang
--

CREATE TABLE public.relays (
    id bigint NOT NULL,
    inbox_url character varying DEFAULT ''::character varying NOT NULL,
    follow_activity_id character varying,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    state integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.relays OWNER TO nchiang;

--
-- Name: relays_id_seq; Type: SEQUENCE; Schema: public; Owner: nchiang
--

CREATE SEQUENCE public.relays_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.relays_id_seq OWNER TO nchiang;

--
-- Name: relays_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nchiang
--

ALTER SEQUENCE public.relays_id_seq OWNED BY public.relays.id;


--
-- Name: report_notes; Type: TABLE; Schema: public; Owner: nchiang
--

CREATE TABLE public.report_notes (
    id bigint NOT NULL,
    content text NOT NULL,
    report_id bigint NOT NULL,
    account_id bigint NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


ALTER TABLE public.report_notes OWNER TO nchiang;

--
-- Name: report_notes_id_seq; Type: SEQUENCE; Schema: public; Owner: nchiang
--

CREATE SEQUENCE public.report_notes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.report_notes_id_seq OWNER TO nchiang;

--
-- Name: report_notes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nchiang
--

ALTER SEQUENCE public.report_notes_id_seq OWNED BY public.report_notes.id;


--
-- Name: reports; Type: TABLE; Schema: public; Owner: nchiang
--

CREATE TABLE public.reports (
    id bigint NOT NULL,
    status_ids bigint[] DEFAULT '{}'::bigint[] NOT NULL,
    comment text DEFAULT ''::text NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    account_id bigint NOT NULL,
    action_taken_by_account_id bigint,
    target_account_id bigint NOT NULL,
    assigned_account_id bigint,
    uri character varying,
    forwarded boolean,
    category integer DEFAULT 0 NOT NULL,
    action_taken_at timestamp without time zone,
    rule_ids bigint[]
);


ALTER TABLE public.reports OWNER TO nchiang;

--
-- Name: reports_id_seq; Type: SEQUENCE; Schema: public; Owner: nchiang
--

CREATE SEQUENCE public.reports_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.reports_id_seq OWNER TO nchiang;

--
-- Name: reports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nchiang
--

ALTER SEQUENCE public.reports_id_seq OWNED BY public.reports.id;


--
-- Name: rules; Type: TABLE; Schema: public; Owner: nchiang
--

CREATE TABLE public.rules (
    id bigint NOT NULL,
    priority integer DEFAULT 0 NOT NULL,
    deleted_at timestamp without time zone,
    text text DEFAULT ''::text NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


ALTER TABLE public.rules OWNER TO nchiang;

--
-- Name: rules_id_seq; Type: SEQUENCE; Schema: public; Owner: nchiang
--

CREATE SEQUENCE public.rules_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.rules_id_seq OWNER TO nchiang;

--
-- Name: rules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nchiang
--

ALTER SEQUENCE public.rules_id_seq OWNED BY public.rules.id;


--
-- Name: scheduled_statuses; Type: TABLE; Schema: public; Owner: nchiang
--

CREATE TABLE public.scheduled_statuses (
    id bigint NOT NULL,
    account_id bigint,
    scheduled_at timestamp without time zone,
    params jsonb
);


ALTER TABLE public.scheduled_statuses OWNER TO nchiang;

--
-- Name: scheduled_statuses_id_seq; Type: SEQUENCE; Schema: public; Owner: nchiang
--

CREATE SEQUENCE public.scheduled_statuses_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.scheduled_statuses_id_seq OWNER TO nchiang;

--
-- Name: scheduled_statuses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nchiang
--

ALTER SEQUENCE public.scheduled_statuses_id_seq OWNED BY public.scheduled_statuses.id;


--
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: nchiang
--

CREATE TABLE public.schema_migrations (
    version character varying NOT NULL
);


ALTER TABLE public.schema_migrations OWNER TO nchiang;

--
-- Name: session_activations; Type: TABLE; Schema: public; Owner: nchiang
--

CREATE TABLE public.session_activations (
    id bigint NOT NULL,
    session_id character varying NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    user_agent character varying DEFAULT ''::character varying NOT NULL,
    ip inet,
    access_token_id bigint,
    user_id bigint NOT NULL,
    web_push_subscription_id bigint
);


ALTER TABLE public.session_activations OWNER TO nchiang;

--
-- Name: session_activations_id_seq; Type: SEQUENCE; Schema: public; Owner: nchiang
--

CREATE SEQUENCE public.session_activations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.session_activations_id_seq OWNER TO nchiang;

--
-- Name: session_activations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nchiang
--

ALTER SEQUENCE public.session_activations_id_seq OWNED BY public.session_activations.id;


--
-- Name: settings; Type: TABLE; Schema: public; Owner: nchiang
--

CREATE TABLE public.settings (
    id bigint NOT NULL,
    var character varying NOT NULL,
    value text,
    thing_type character varying,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    thing_id bigint
);


ALTER TABLE public.settings OWNER TO nchiang;

--
-- Name: settings_id_seq; Type: SEQUENCE; Schema: public; Owner: nchiang
--

CREATE SEQUENCE public.settings_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.settings_id_seq OWNER TO nchiang;

--
-- Name: settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nchiang
--

ALTER SEQUENCE public.settings_id_seq OWNED BY public.settings.id;


--
-- Name: site_uploads; Type: TABLE; Schema: public; Owner: nchiang
--

CREATE TABLE public.site_uploads (
    id bigint NOT NULL,
    var character varying DEFAULT ''::character varying NOT NULL,
    file_file_name character varying,
    file_content_type character varying,
    file_file_size integer,
    file_updated_at timestamp without time zone,
    meta json,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


ALTER TABLE public.site_uploads OWNER TO nchiang;

--
-- Name: site_uploads_id_seq; Type: SEQUENCE; Schema: public; Owner: nchiang
--

CREATE SEQUENCE public.site_uploads_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.site_uploads_id_seq OWNER TO nchiang;

--
-- Name: site_uploads_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nchiang
--

ALTER SEQUENCE public.site_uploads_id_seq OWNED BY public.site_uploads.id;


--
-- Name: status_edits; Type: TABLE; Schema: public; Owner: nchiang
--

CREATE TABLE public.status_edits (
    id bigint NOT NULL,
    status_id bigint NOT NULL,
    account_id bigint,
    text text DEFAULT ''::text NOT NULL,
    spoiler_text text DEFAULT ''::text NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL,
    ordered_media_attachment_ids bigint[],
    media_descriptions text[],
    poll_options character varying[],
    sensitive boolean
);


ALTER TABLE public.status_edits OWNER TO nchiang;

--
-- Name: status_edits_id_seq; Type: SEQUENCE; Schema: public; Owner: nchiang
--

CREATE SEQUENCE public.status_edits_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.status_edits_id_seq OWNER TO nchiang;

--
-- Name: status_edits_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nchiang
--

ALTER SEQUENCE public.status_edits_id_seq OWNED BY public.status_edits.id;


--
-- Name: status_pins; Type: TABLE; Schema: public; Owner: nchiang
--

CREATE TABLE public.status_pins (
    id bigint NOT NULL,
    account_id bigint NOT NULL,
    status_id bigint NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.status_pins OWNER TO nchiang;

--
-- Name: status_pins_id_seq; Type: SEQUENCE; Schema: public; Owner: nchiang
--

CREATE SEQUENCE public.status_pins_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.status_pins_id_seq OWNER TO nchiang;

--
-- Name: status_pins_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nchiang
--

ALTER SEQUENCE public.status_pins_id_seq OWNED BY public.status_pins.id;


--
-- Name: status_stats_id_seq; Type: SEQUENCE; Schema: public; Owner: nchiang
--

CREATE SEQUENCE public.status_stats_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.status_stats_id_seq OWNER TO nchiang;

--
-- Name: status_stats_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nchiang
--

ALTER SEQUENCE public.status_stats_id_seq OWNED BY public.status_stats.id;


--
-- Name: statuses_id_seq; Type: SEQUENCE; Schema: public; Owner: nchiang
--

CREATE SEQUENCE public.statuses_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.statuses_id_seq OWNER TO nchiang;

--
-- Name: statuses_tags; Type: TABLE; Schema: public; Owner: nchiang
--

CREATE TABLE public.statuses_tags (
    status_id bigint NOT NULL,
    tag_id bigint NOT NULL
);


ALTER TABLE public.statuses_tags OWNER TO nchiang;

--
-- Name: system_keys; Type: TABLE; Schema: public; Owner: nchiang
--

CREATE TABLE public.system_keys (
    id bigint NOT NULL,
    key bytea,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


ALTER TABLE public.system_keys OWNER TO nchiang;

--
-- Name: system_keys_id_seq; Type: SEQUENCE; Schema: public; Owner: nchiang
--

CREATE SEQUENCE public.system_keys_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.system_keys_id_seq OWNER TO nchiang;

--
-- Name: system_keys_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nchiang
--

ALTER SEQUENCE public.system_keys_id_seq OWNED BY public.system_keys.id;


--
-- Name: tags; Type: TABLE; Schema: public; Owner: nchiang
--

CREATE TABLE public.tags (
    id bigint NOT NULL,
    name character varying DEFAULT ''::character varying NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    usable boolean,
    trendable boolean,
    listable boolean,
    reviewed_at timestamp without time zone,
    requested_review_at timestamp without time zone,
    last_status_at timestamp without time zone,
    max_score double precision,
    max_score_at timestamp without time zone
);


ALTER TABLE public.tags OWNER TO nchiang;

--
-- Name: tags_id_seq; Type: SEQUENCE; Schema: public; Owner: nchiang
--

CREATE SEQUENCE public.tags_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.tags_id_seq OWNER TO nchiang;

--
-- Name: tags_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nchiang
--

ALTER SEQUENCE public.tags_id_seq OWNED BY public.tags.id;


--
-- Name: tombstones; Type: TABLE; Schema: public; Owner: nchiang
--

CREATE TABLE public.tombstones (
    id bigint NOT NULL,
    account_id bigint,
    uri character varying NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    by_moderator boolean
);


ALTER TABLE public.tombstones OWNER TO nchiang;

--
-- Name: tombstones_id_seq; Type: SEQUENCE; Schema: public; Owner: nchiang
--

CREATE SEQUENCE public.tombstones_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.tombstones_id_seq OWNER TO nchiang;

--
-- Name: tombstones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nchiang
--

ALTER SEQUENCE public.tombstones_id_seq OWNED BY public.tombstones.id;


--
-- Name: unavailable_domains; Type: TABLE; Schema: public; Owner: nchiang
--

CREATE TABLE public.unavailable_domains (
    id bigint NOT NULL,
    domain character varying DEFAULT ''::character varying NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


ALTER TABLE public.unavailable_domains OWNER TO nchiang;

--
-- Name: unavailable_domains_id_seq; Type: SEQUENCE; Schema: public; Owner: nchiang
--

CREATE SEQUENCE public.unavailable_domains_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.unavailable_domains_id_seq OWNER TO nchiang;

--
-- Name: unavailable_domains_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nchiang
--

ALTER SEQUENCE public.unavailable_domains_id_seq OWNED BY public.unavailable_domains.id;


--
-- Name: user_invite_requests; Type: TABLE; Schema: public; Owner: nchiang
--

CREATE TABLE public.user_invite_requests (
    id bigint NOT NULL,
    user_id bigint,
    text text,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


ALTER TABLE public.user_invite_requests OWNER TO nchiang;

--
-- Name: user_invite_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: nchiang
--

CREATE SEQUENCE public.user_invite_requests_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.user_invite_requests_id_seq OWNER TO nchiang;

--
-- Name: user_invite_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nchiang
--

ALTER SEQUENCE public.user_invite_requests_id_seq OWNED BY public.user_invite_requests.id;


--
-- Name: user_ips; Type: VIEW; Schema: public; Owner: nchiang
--

CREATE VIEW public.user_ips AS
 SELECT t0.user_id,
    t0.ip,
    max(t0.used_at) AS used_at
   FROM ( SELECT users.id AS user_id,
            users.sign_up_ip AS ip,
            users.created_at AS used_at
           FROM public.users
          WHERE (users.sign_up_ip IS NOT NULL)
        UNION ALL
         SELECT session_activations.user_id,
            session_activations.ip,
            session_activations.updated_at
           FROM public.session_activations
        UNION ALL
         SELECT login_activities.user_id,
            login_activities.ip,
            login_activities.created_at
           FROM public.login_activities
          WHERE (login_activities.success = true)) t0
  GROUP BY t0.user_id, t0.ip;


ALTER TABLE public.user_ips OWNER TO nchiang;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: nchiang
--

CREATE SEQUENCE public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.users_id_seq OWNER TO nchiang;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nchiang
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: web_push_subscriptions; Type: TABLE; Schema: public; Owner: nchiang
--

CREATE TABLE public.web_push_subscriptions (
    id bigint NOT NULL,
    endpoint character varying NOT NULL,
    key_p256dh character varying NOT NULL,
    key_auth character varying NOT NULL,
    data json,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    access_token_id bigint,
    user_id bigint
);


ALTER TABLE public.web_push_subscriptions OWNER TO nchiang;

--
-- Name: web_push_subscriptions_id_seq; Type: SEQUENCE; Schema: public; Owner: nchiang
--

CREATE SEQUENCE public.web_push_subscriptions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.web_push_subscriptions_id_seq OWNER TO nchiang;

--
-- Name: web_push_subscriptions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nchiang
--

ALTER SEQUENCE public.web_push_subscriptions_id_seq OWNED BY public.web_push_subscriptions.id;


--
-- Name: web_settings; Type: TABLE; Schema: public; Owner: nchiang
--

CREATE TABLE public.web_settings (
    id bigint NOT NULL,
    data json,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    user_id bigint NOT NULL
);


ALTER TABLE public.web_settings OWNER TO nchiang;

--
-- Name: web_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: nchiang
--

CREATE SEQUENCE public.web_settings_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.web_settings_id_seq OWNER TO nchiang;

--
-- Name: web_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nchiang
--

ALTER SEQUENCE public.web_settings_id_seq OWNED BY public.web_settings.id;


--
-- Name: webauthn_credentials; Type: TABLE; Schema: public; Owner: nchiang
--

CREATE TABLE public.webauthn_credentials (
    id bigint NOT NULL,
    external_id character varying NOT NULL,
    public_key character varying NOT NULL,
    nickname character varying NOT NULL,
    sign_count bigint DEFAULT 0 NOT NULL,
    user_id bigint,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


ALTER TABLE public.webauthn_credentials OWNER TO nchiang;

--
-- Name: webauthn_credentials_id_seq; Type: SEQUENCE; Schema: public; Owner: nchiang
--

CREATE SEQUENCE public.webauthn_credentials_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.webauthn_credentials_id_seq OWNER TO nchiang;

--
-- Name: webauthn_credentials_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nchiang
--

ALTER SEQUENCE public.webauthn_credentials_id_seq OWNED BY public.webauthn_credentials.id;


--
-- Name: account_aliases id; Type: DEFAULT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.account_aliases ALTER COLUMN id SET DEFAULT nextval('public.account_aliases_id_seq'::regclass);


--
-- Name: account_conversations id; Type: DEFAULT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.account_conversations ALTER COLUMN id SET DEFAULT nextval('public.account_conversations_id_seq'::regclass);


--
-- Name: account_deletion_requests id; Type: DEFAULT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.account_deletion_requests ALTER COLUMN id SET DEFAULT nextval('public.account_deletion_requests_id_seq'::regclass);


--
-- Name: account_domain_blocks id; Type: DEFAULT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.account_domain_blocks ALTER COLUMN id SET DEFAULT nextval('public.account_domain_blocks_id_seq'::regclass);


--
-- Name: account_migrations id; Type: DEFAULT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.account_migrations ALTER COLUMN id SET DEFAULT nextval('public.account_migrations_id_seq'::regclass);


--
-- Name: account_moderation_notes id; Type: DEFAULT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.account_moderation_notes ALTER COLUMN id SET DEFAULT nextval('public.account_moderation_notes_id_seq'::regclass);


--
-- Name: account_notes id; Type: DEFAULT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.account_notes ALTER COLUMN id SET DEFAULT nextval('public.account_notes_id_seq'::regclass);


--
-- Name: account_pins id; Type: DEFAULT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.account_pins ALTER COLUMN id SET DEFAULT nextval('public.account_pins_id_seq'::regclass);


--
-- Name: account_stats id; Type: DEFAULT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.account_stats ALTER COLUMN id SET DEFAULT nextval('public.account_stats_id_seq'::regclass);


--
-- Name: account_statuses_cleanup_policies id; Type: DEFAULT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.account_statuses_cleanup_policies ALTER COLUMN id SET DEFAULT nextval('public.account_statuses_cleanup_policies_id_seq'::regclass);


--
-- Name: account_warning_presets id; Type: DEFAULT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.account_warning_presets ALTER COLUMN id SET DEFAULT nextval('public.account_warning_presets_id_seq'::regclass);


--
-- Name: account_warnings id; Type: DEFAULT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.account_warnings ALTER COLUMN id SET DEFAULT nextval('public.account_warnings_id_seq'::regclass);


--
-- Name: admin_action_logs id; Type: DEFAULT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.admin_action_logs ALTER COLUMN id SET DEFAULT nextval('public.admin_action_logs_id_seq'::regclass);


--
-- Name: announcement_mutes id; Type: DEFAULT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.announcement_mutes ALTER COLUMN id SET DEFAULT nextval('public.announcement_mutes_id_seq'::regclass);


--
-- Name: announcement_reactions id; Type: DEFAULT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.announcement_reactions ALTER COLUMN id SET DEFAULT nextval('public.announcement_reactions_id_seq'::regclass);


--
-- Name: announcements id; Type: DEFAULT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.announcements ALTER COLUMN id SET DEFAULT nextval('public.announcements_id_seq'::regclass);


--
-- Name: appeals id; Type: DEFAULT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.appeals ALTER COLUMN id SET DEFAULT nextval('public.appeals_id_seq'::regclass);


--
-- Name: backups id; Type: DEFAULT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.backups ALTER COLUMN id SET DEFAULT nextval('public.backups_id_seq'::regclass);


--
-- Name: blocks id; Type: DEFAULT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.blocks ALTER COLUMN id SET DEFAULT nextval('public.blocks_id_seq'::regclass);


--
-- Name: bookmarks id; Type: DEFAULT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.bookmarks ALTER COLUMN id SET DEFAULT nextval('public.bookmarks_id_seq'::regclass);


--
-- Name: canonical_email_blocks id; Type: DEFAULT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.canonical_email_blocks ALTER COLUMN id SET DEFAULT nextval('public.canonical_email_blocks_id_seq'::regclass);


--
-- Name: conversation_mutes id; Type: DEFAULT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.conversation_mutes ALTER COLUMN id SET DEFAULT nextval('public.conversation_mutes_id_seq'::regclass);


--
-- Name: conversations id; Type: DEFAULT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.conversations ALTER COLUMN id SET DEFAULT nextval('public.conversations_id_seq'::regclass);


--
-- Name: custom_emoji_categories id; Type: DEFAULT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.custom_emoji_categories ALTER COLUMN id SET DEFAULT nextval('public.custom_emoji_categories_id_seq'::regclass);


--
-- Name: custom_emojis id; Type: DEFAULT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.custom_emojis ALTER COLUMN id SET DEFAULT nextval('public.custom_emojis_id_seq'::regclass);


--
-- Name: custom_filters id; Type: DEFAULT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.custom_filters ALTER COLUMN id SET DEFAULT nextval('public.custom_filters_id_seq'::regclass);


--
-- Name: devices id; Type: DEFAULT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.devices ALTER COLUMN id SET DEFAULT nextval('public.devices_id_seq'::regclass);


--
-- Name: domain_allows id; Type: DEFAULT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.domain_allows ALTER COLUMN id SET DEFAULT nextval('public.domain_allows_id_seq'::regclass);


--
-- Name: domain_blocks id; Type: DEFAULT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.domain_blocks ALTER COLUMN id SET DEFAULT nextval('public.domain_blocks_id_seq'::regclass);


--
-- Name: email_domain_blocks id; Type: DEFAULT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.email_domain_blocks ALTER COLUMN id SET DEFAULT nextval('public.email_domain_blocks_id_seq'::regclass);


--
-- Name: favourites id; Type: DEFAULT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.favourites ALTER COLUMN id SET DEFAULT nextval('public.favourites_id_seq'::regclass);


--
-- Name: featured_tags id; Type: DEFAULT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.featured_tags ALTER COLUMN id SET DEFAULT nextval('public.featured_tags_id_seq'::regclass);


--
-- Name: follow_recommendation_suppressions id; Type: DEFAULT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.follow_recommendation_suppressions ALTER COLUMN id SET DEFAULT nextval('public.follow_recommendation_suppressions_id_seq'::regclass);


--
-- Name: follow_requests id; Type: DEFAULT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.follow_requests ALTER COLUMN id SET DEFAULT nextval('public.follow_requests_id_seq'::regclass);


--
-- Name: follows id; Type: DEFAULT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.follows ALTER COLUMN id SET DEFAULT nextval('public.follows_id_seq'::regclass);


--
-- Name: identities id; Type: DEFAULT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.identities ALTER COLUMN id SET DEFAULT nextval('public.identities_id_seq'::regclass);


--
-- Name: imports id; Type: DEFAULT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.imports ALTER COLUMN id SET DEFAULT nextval('public.imports_id_seq'::regclass);


--
-- Name: invites id; Type: DEFAULT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.invites ALTER COLUMN id SET DEFAULT nextval('public.invites_id_seq'::regclass);


--
-- Name: ip_blocks id; Type: DEFAULT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.ip_blocks ALTER COLUMN id SET DEFAULT nextval('public.ip_blocks_id_seq'::regclass);


--
-- Name: list_accounts id; Type: DEFAULT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.list_accounts ALTER COLUMN id SET DEFAULT nextval('public.list_accounts_id_seq'::regclass);


--
-- Name: lists id; Type: DEFAULT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.lists ALTER COLUMN id SET DEFAULT nextval('public.lists_id_seq'::regclass);


--
-- Name: login_activities id; Type: DEFAULT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.login_activities ALTER COLUMN id SET DEFAULT nextval('public.login_activities_id_seq'::regclass);


--
-- Name: markers id; Type: DEFAULT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.markers ALTER COLUMN id SET DEFAULT nextval('public.markers_id_seq'::regclass);


--
-- Name: mentions id; Type: DEFAULT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.mentions ALTER COLUMN id SET DEFAULT nextval('public.mentions_id_seq'::regclass);


--
-- Name: mutes id; Type: DEFAULT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.mutes ALTER COLUMN id SET DEFAULT nextval('public.mutes_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- Name: oauth_access_grants id; Type: DEFAULT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.oauth_access_grants ALTER COLUMN id SET DEFAULT nextval('public.oauth_access_grants_id_seq'::regclass);


--
-- Name: oauth_access_tokens id; Type: DEFAULT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.oauth_access_tokens ALTER COLUMN id SET DEFAULT nextval('public.oauth_access_tokens_id_seq'::regclass);


--
-- Name: oauth_applications id; Type: DEFAULT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.oauth_applications ALTER COLUMN id SET DEFAULT nextval('public.oauth_applications_id_seq'::regclass);


--
-- Name: one_time_keys id; Type: DEFAULT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.one_time_keys ALTER COLUMN id SET DEFAULT nextval('public.one_time_keys_id_seq'::regclass);


--
-- Name: pghero_space_stats id; Type: DEFAULT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.pghero_space_stats ALTER COLUMN id SET DEFAULT nextval('public.pghero_space_stats_id_seq'::regclass);


--
-- Name: poll_votes id; Type: DEFAULT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.poll_votes ALTER COLUMN id SET DEFAULT nextval('public.poll_votes_id_seq'::regclass);


--
-- Name: polls id; Type: DEFAULT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.polls ALTER COLUMN id SET DEFAULT nextval('public.polls_id_seq'::regclass);


--
-- Name: preview_card_providers id; Type: DEFAULT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.preview_card_providers ALTER COLUMN id SET DEFAULT nextval('public.preview_card_providers_id_seq'::regclass);


--
-- Name: preview_cards id; Type: DEFAULT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.preview_cards ALTER COLUMN id SET DEFAULT nextval('public.preview_cards_id_seq'::regclass);


--
-- Name: relays id; Type: DEFAULT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.relays ALTER COLUMN id SET DEFAULT nextval('public.relays_id_seq'::regclass);


--
-- Name: report_notes id; Type: DEFAULT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.report_notes ALTER COLUMN id SET DEFAULT nextval('public.report_notes_id_seq'::regclass);


--
-- Name: reports id; Type: DEFAULT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.reports ALTER COLUMN id SET DEFAULT nextval('public.reports_id_seq'::regclass);


--
-- Name: rules id; Type: DEFAULT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.rules ALTER COLUMN id SET DEFAULT nextval('public.rules_id_seq'::regclass);


--
-- Name: scheduled_statuses id; Type: DEFAULT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.scheduled_statuses ALTER COLUMN id SET DEFAULT nextval('public.scheduled_statuses_id_seq'::regclass);


--
-- Name: session_activations id; Type: DEFAULT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.session_activations ALTER COLUMN id SET DEFAULT nextval('public.session_activations_id_seq'::regclass);


--
-- Name: settings id; Type: DEFAULT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.settings ALTER COLUMN id SET DEFAULT nextval('public.settings_id_seq'::regclass);


--
-- Name: site_uploads id; Type: DEFAULT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.site_uploads ALTER COLUMN id SET DEFAULT nextval('public.site_uploads_id_seq'::regclass);


--
-- Name: status_edits id; Type: DEFAULT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.status_edits ALTER COLUMN id SET DEFAULT nextval('public.status_edits_id_seq'::regclass);


--
-- Name: status_pins id; Type: DEFAULT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.status_pins ALTER COLUMN id SET DEFAULT nextval('public.status_pins_id_seq'::regclass);


--
-- Name: status_stats id; Type: DEFAULT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.status_stats ALTER COLUMN id SET DEFAULT nextval('public.status_stats_id_seq'::regclass);


--
-- Name: system_keys id; Type: DEFAULT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.system_keys ALTER COLUMN id SET DEFAULT nextval('public.system_keys_id_seq'::regclass);


--
-- Name: tags id; Type: DEFAULT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.tags ALTER COLUMN id SET DEFAULT nextval('public.tags_id_seq'::regclass);


--
-- Name: tombstones id; Type: DEFAULT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.tombstones ALTER COLUMN id SET DEFAULT nextval('public.tombstones_id_seq'::regclass);


--
-- Name: unavailable_domains id; Type: DEFAULT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.unavailable_domains ALTER COLUMN id SET DEFAULT nextval('public.unavailable_domains_id_seq'::regclass);


--
-- Name: user_invite_requests id; Type: DEFAULT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.user_invite_requests ALTER COLUMN id SET DEFAULT nextval('public.user_invite_requests_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: web_push_subscriptions id; Type: DEFAULT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.web_push_subscriptions ALTER COLUMN id SET DEFAULT nextval('public.web_push_subscriptions_id_seq'::regclass);


--
-- Name: web_settings id; Type: DEFAULT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.web_settings ALTER COLUMN id SET DEFAULT nextval('public.web_settings_id_seq'::regclass);


--
-- Name: webauthn_credentials id; Type: DEFAULT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.webauthn_credentials ALTER COLUMN id SET DEFAULT nextval('public.webauthn_credentials_id_seq'::regclass);


--
-- Data for Name: account_aliases; Type: TABLE DATA; Schema: public; Owner: nchiang
--

COPY public.account_aliases (id, account_id, acct, uri, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: account_conversations; Type: TABLE DATA; Schema: public; Owner: nchiang
--

COPY public.account_conversations (id, account_id, conversation_id, participant_account_ids, status_ids, last_status_id, lock_version, unread) FROM stdin;
\.


--
-- Data for Name: account_deletion_requests; Type: TABLE DATA; Schema: public; Owner: nchiang
--

COPY public.account_deletion_requests (id, account_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: account_domain_blocks; Type: TABLE DATA; Schema: public; Owner: nchiang
--

COPY public.account_domain_blocks (id, domain, created_at, updated_at, account_id) FROM stdin;
\.


--
-- Data for Name: account_migrations; Type: TABLE DATA; Schema: public; Owner: nchiang
--

COPY public.account_migrations (id, account_id, acct, followers_count, target_account_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: account_moderation_notes; Type: TABLE DATA; Schema: public; Owner: nchiang
--

COPY public.account_moderation_notes (id, content, account_id, target_account_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: account_notes; Type: TABLE DATA; Schema: public; Owner: nchiang
--

COPY public.account_notes (id, account_id, target_account_id, comment, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: account_pins; Type: TABLE DATA; Schema: public; Owner: nchiang
--

COPY public.account_pins (id, account_id, target_account_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: account_stats; Type: TABLE DATA; Schema: public; Owner: nchiang
--

COPY public.account_stats (id, account_id, statuses_count, following_count, followers_count, created_at, updated_at, last_status_at) FROM stdin;
\.


--
-- Data for Name: account_statuses_cleanup_policies; Type: TABLE DATA; Schema: public; Owner: nchiang
--

COPY public.account_statuses_cleanup_policies (id, account_id, enabled, min_status_age, keep_direct, keep_pinned, keep_polls, keep_media, keep_self_fav, keep_self_bookmark, min_favs, min_reblogs, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: account_warning_presets; Type: TABLE DATA; Schema: public; Owner: nchiang
--

COPY public.account_warning_presets (id, text, created_at, updated_at, title) FROM stdin;
\.


--
-- Data for Name: account_warnings; Type: TABLE DATA; Schema: public; Owner: nchiang
--

COPY public.account_warnings (id, account_id, target_account_id, action, text, created_at, updated_at, report_id, status_ids, overruled_at) FROM stdin;
\.


--
-- Data for Name: accounts; Type: TABLE DATA; Schema: public; Owner: nchiang
--

COPY public.accounts (id, username, domain, private_key, public_key, created_at, updated_at, note, display_name, uri, url, avatar_file_name, avatar_content_type, avatar_file_size, avatar_updated_at, header_file_name, header_content_type, header_file_size, header_updated_at, avatar_remote_url, locked, header_remote_url, last_webfingered_at, inbox_url, outbox_url, shared_inbox_url, followers_url, protocol, memorial, moved_to_account_id, featured_collection_url, fields, actor_type, discoverable, also_known_as, silenced_at, suspended_at, hide_collections, avatar_storage_schema_version, header_storage_schema_version, devices_url, suspension_origin, sensitized_at, trendable, reviewed_at, requested_review_at) FROM stdin;
-99	localhost:3000	\N	-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEAstKnRv7LTmU+2KsLLpkVn7YYNxczACdO9irnxILF3pTdfNkM\nGujGzeUijf8q6TydPpe55bhUwazpay9Kz9VJ2hx8WUxCb/5+/qjHLB1xmXy6H3th\nNAXSsUGebF3C4KXjwXvWvuHnbtFBOx12QMVzGAT2v6lIYYuLg3eBOCmEcimYGLkS\n383pe2pA2gW/TlP9fXdmrR3647PNPR7Rwwm5lybYBq0B5GUrQoZ+Fu5f4iVlpHjx\nOZXN8iSLbc1WfcSE5CEQ7gudHVL1G5cN3ZOtvAqMnH6TXscJMqzB1zvgWiTmtSlW\nyDX4JMvd/5OJLP48cfDtkl0UaTu303S3ylSngQIDAQABAoIBAAFSx8QhvJVu8GEg\nGuwUW/GbomA9/rWglNgDh0WQBjDYfy8eWBWW5Wm+qVvNqJ6jQTKmYszNaWspgWy2\no+IX3P0NOupaQx+bDYuK6jZsXVvabXIwMo71ABMpvidlJj0NXTsgVH2DJHhQeiAa\n3rYp/+kMmFrgwNVf9/9YEg+9VuqVWwjuRO6T0dnUrrIlM2rFSdvgLI+lsCngT6pB\nCXMAdBw4dHtU5sEbyjjyL9Q1p0hooK5zThLdhs4xLVzatCi93IZDwJbckzhpyXyw\ngMVWI8Y4/Wq6PR0ifLh+3/h5ylZYGhGv/HRElIi43n4c5lBugz7817w8UqbPdRc5\nAs0efqUCgYEA7MJRN1KmVd511Yre7+LLlQeKP4nW2NTDSHRhHpESbSsUbF39of0h\nyN1A+EX1jjRZLdypfmtxuYPJbcxF4KKjwnlH7GYQtkNyDpwqBAUq0Vfkr+GaSvG6\nvqfLjSauPfzQzADWP1hlgJMt87XZ7HzqXKDWhEgqbNmraCmLp7PMBTMCgYEAwVr+\n5BPiNEJp2TCXeFehaW390COsk8XZAhxL2B+LCIDjEpFCEUAuGKNXD187mBywuQ8T\nQzXOvoreQPqyvFnMKlWWtmrcxZqIzfc/7fRum83W4JL1QeUTwdehF3lBuYSvM5+1\nuNH5NwNqmhEKJTjg2Cm7jBXpWFCxnfPA70spOHsCgYALIz0E2DuA8J0kdYr1R/sB\nwMANKyPTQXcKUoc7E+IFBrDIREepNio/s8DZrRjXHrlPQgErNEy+SGfSZXioD56a\niHAMu+RvXo7gBxKm68NO486bQ4apneOGEoit1DMAMYN1BVkO0866lLHltBlTWbEA\nuIQ+5tIwGrFIjiPGuNuRJwKBgQCbKRloD2izhSQJrQuv/6pAv4oxL596igcFwY0/\nZricX0lZCgXZcAZNsS3Y4RQikctjBezwP0qj7y5BOKybpvfGdR5XTlPRopvrpGDB\n5CeqkbjASE3Vzi1XnWDhRGXwqMArjhs2sBDsC6rM7aWVjxonfP3KgX7aZw7RcNy/\najIu5wKBgQCWALDr5Ad5U2sJNnZZpLCQi0TJPeJQ67Ui9ZmR3CXvZQXcv7fVSJv3\nAZOYybFifJPpjYBoyDL/qFUCXNJEo5F9L3TLgRHvANzKWZJJ63sgKZeARmv8/8wh\nPyvJ/wTZy85LnQivyyt6wM6+IcpiZ+CC2Wjg8TSApcvWybufHRIqLQ==\n-----END RSA PRIVATE KEY-----\n	-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAstKnRv7LTmU+2KsLLpkV\nn7YYNxczACdO9irnxILF3pTdfNkMGujGzeUijf8q6TydPpe55bhUwazpay9Kz9VJ\n2hx8WUxCb/5+/qjHLB1xmXy6H3thNAXSsUGebF3C4KXjwXvWvuHnbtFBOx12QMVz\nGAT2v6lIYYuLg3eBOCmEcimYGLkS383pe2pA2gW/TlP9fXdmrR3647PNPR7Rwwm5\nlybYBq0B5GUrQoZ+Fu5f4iVlpHjxOZXN8iSLbc1WfcSE5CEQ7gudHVL1G5cN3ZOt\nvAqMnH6TXscJMqzB1zvgWiTmtSlWyDX4JMvd/5OJLP48cfDtkl0UaTu303S3ylSn\ngQIDAQAB\n-----END PUBLIC KEY-----\n	2022-04-22 17:23:26.602625	2022-04-22 17:23:26.602625				\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t		\N					0	f	\N	\N	\N	Application	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
108176880874707606	admin	\N	-----BEGIN RSA PRIVATE KEY-----\nMIIEogIBAAKCAQEAu5oAvCK8T9nnEzd2pEY/UIq0Et1zEEfs3/Payn+0SNouauBX\nUKnua01aQ1s2fLZhnGqyx0pit6ZvqYdrAegsHm2eCifx6Oxd/ulDfRdzp5E8QKo/\njzYaNqRvX3Zk3cMGhUL583mpl1ArXZEtOWJB/ayPZT7M6DqbVrymOkhWV8yF3kaF\n3xkfQfZy9n0t2DEb2XV6u2fzzNUhth+7BZgPF0GgJgm19evUyV2ezJaewL33dxjw\n4FFrHHrelpkOC70Um3dALLGao9jFOEWAuG7SIzimD6jt2eMP3w67NKmWGistCS+u\nVFYZMV/ot5kC0bN/uF/5mgoJw479iatUqRlppwIDAQABAoIBAAudu5HqrLJdEbvU\n4VnGp8D69a99WtSVP4uWc+O6CJXCPMGNZpquCv9F6OLm0Pbj7CNdT/ibGIW6notm\nwS97CtBPhUunsYj0qdVQ6EbkntqvWYW/hPP/K5xajjLhB9nba5nwzb1PuTqPUkAW\n7y/wb5mfh7mDK/jtOBUk1T4ioIYLHscFPKMtcebatRQiOUt2LMeSKtuk8KBfT53v\nj+XQNx847roo3SARMVp2aotosG7dzISMNy5h3V48wYhfWFAvwbgGcfBXDNxkBdSR\nBED6ZwDjESKQL2JU9nHgYaPkDkZXZcUzcfWv2jOCMzIrjKUcGP5DWHsaJaz2h/4i\nhnAasrECgYEA6IWZDoV2WAU+X/Clts58OugLnAIUU46tD9WeJnd1v90UvdUp3wAb\nUQZinjkuY+yLFlDC94e/9k577FpALAAcEgJJnrduNBjUuo7FT4kJ3V3sBZhMepCf\n7DlCtz6r6Xj33tgpUTBWt7ctAZkeJ+2hFtd7F0YscN+dH6mcWuuRILMCgYEAzotF\nZaj97nUULtp7ph6O4toDI+CUFP5xwQyXaxWiUEWnRcuqAo519fe7+shydacD21L0\nNX3ZQ1biEVQjV+sSkdDPIZkIh4JBGCAMMI37GahGkbpGP2XBQsJCZNe6qtaXWgOG\n276RfkjXQjDakSptn92366LPCd6BpAwPMRbqZT0CgYAslWExjZmRav/4uVWs5Y6g\nZNnFAgkPtG2ueZEnYwRq02MkuviaT5TtRkImgGRKuJI6pyWa/KZr/cR5Hxzq0uKO\n+W1QR2+UAabYVoOyql3/2gBlWjxfy9c+HgSSyiuASreMPPo/HPujojW49rj3gvK+\nRHbPkZ73zYh9B7J5JG3hTQKBgH6HaxgAEq+GIbsiNSVrCvWFwO61oYHK7jzpTclY\nE3tBcFudjKTMSQ9JmGrlaNkSW5Z8lwY99l7+Vrdu58fwRgv18y4N5d+9t8rjtxP3\npp/tKm4Twv0LhP00rB/C2KPXmhiWmIL9l3vZe6Uc8IiFiWqqFQXRUywklx68FIJq\nG2WxAoGATtMDZ7HhR1+GiR09A6l9GRdZaCuWNKHoDQ5dTjxZWbtvauF1oSrwZsyx\nCXXNdpLn2lS1Q3Dwz1DtCgVzSs6I9XMgrCqBBLgcjgEcqaYkSJGOMM/7xlMcsHiP\nGBK1T2fDBQcznjIGReDrwiQh+Iscr/7xVDCWEZfE48ruFH/0RU8=\n-----END RSA PRIVATE KEY-----\n	-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAu5oAvCK8T9nnEzd2pEY/\nUIq0Et1zEEfs3/Payn+0SNouauBXUKnua01aQ1s2fLZhnGqyx0pit6ZvqYdrAegs\nHm2eCifx6Oxd/ulDfRdzp5E8QKo/jzYaNqRvX3Zk3cMGhUL583mpl1ArXZEtOWJB\n/ayPZT7M6DqbVrymOkhWV8yF3kaF3xkfQfZy9n0t2DEb2XV6u2fzzNUhth+7BZgP\nF0GgJgm19evUyV2ezJaewL33dxjw4FFrHHrelpkOC70Um3dALLGao9jFOEWAuG7S\nIzimD6jt2eMP3w67NKmWGistCS+uVFYZMV/ot5kC0bN/uF/5mgoJw479iatUqRlp\npwIDAQAB\n-----END PUBLIC KEY-----\n	2022-04-22 17:23:26.667106	2022-04-22 17:23:26.667106				\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f		\N					0	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
\.


--
-- Data for Name: accounts_tags; Type: TABLE DATA; Schema: public; Owner: nchiang
--

COPY public.accounts_tags (account_id, tag_id) FROM stdin;
\.


--
-- Data for Name: admin_action_logs; Type: TABLE DATA; Schema: public; Owner: nchiang
--

COPY public.admin_action_logs (id, account_id, action, target_type, target_id, recorded_changes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: announcement_mutes; Type: TABLE DATA; Schema: public; Owner: nchiang
--

COPY public.announcement_mutes (id, account_id, announcement_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: announcement_reactions; Type: TABLE DATA; Schema: public; Owner: nchiang
--

COPY public.announcement_reactions (id, account_id, announcement_id, name, custom_emoji_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: announcements; Type: TABLE DATA; Schema: public; Owner: nchiang
--

COPY public.announcements (id, text, published, all_day, scheduled_at, starts_at, ends_at, created_at, updated_at, published_at, status_ids) FROM stdin;
\.


--
-- Data for Name: appeals; Type: TABLE DATA; Schema: public; Owner: nchiang
--

COPY public.appeals (id, account_id, account_warning_id, text, approved_at, approved_by_account_id, rejected_at, rejected_by_account_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: ar_internal_metadata; Type: TABLE DATA; Schema: public; Owner: nchiang
--

COPY public.ar_internal_metadata (key, value, created_at, updated_at) FROM stdin;
environment	development	2022-04-22 17:23:24.14497	2022-04-22 17:23:24.14497
schema_sha1	097565e955ac861dd4017fa42bcf5923ca126fca	2022-04-22 17:23:24.149089	2022-04-22 17:23:24.149089
\.


--
-- Data for Name: backups; Type: TABLE DATA; Schema: public; Owner: nchiang
--

COPY public.backups (id, user_id, dump_file_name, dump_content_type, dump_updated_at, processed, created_at, updated_at, dump_file_size) FROM stdin;
\.


--
-- Data for Name: blocks; Type: TABLE DATA; Schema: public; Owner: nchiang
--

COPY public.blocks (id, created_at, updated_at, account_id, target_account_id, uri) FROM stdin;
\.


--
-- Data for Name: bookmarks; Type: TABLE DATA; Schema: public; Owner: nchiang
--

COPY public.bookmarks (id, account_id, status_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: canonical_email_blocks; Type: TABLE DATA; Schema: public; Owner: nchiang
--

COPY public.canonical_email_blocks (id, canonical_email_hash, reference_account_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: conversation_mutes; Type: TABLE DATA; Schema: public; Owner: nchiang
--

COPY public.conversation_mutes (id, conversation_id, account_id) FROM stdin;
\.


--
-- Data for Name: conversations; Type: TABLE DATA; Schema: public; Owner: nchiang
--

COPY public.conversations (id, uri, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: custom_emoji_categories; Type: TABLE DATA; Schema: public; Owner: nchiang
--

COPY public.custom_emoji_categories (id, name, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: custom_emojis; Type: TABLE DATA; Schema: public; Owner: nchiang
--

COPY public.custom_emojis (id, shortcode, domain, image_file_name, image_content_type, image_file_size, image_updated_at, created_at, updated_at, disabled, uri, image_remote_url, visible_in_picker, category_id, image_storage_schema_version) FROM stdin;
\.


--
-- Data for Name: custom_filters; Type: TABLE DATA; Schema: public; Owner: nchiang
--

COPY public.custom_filters (id, account_id, expires_at, phrase, context, irreversible, created_at, updated_at, whole_word) FROM stdin;
\.


--
-- Data for Name: devices; Type: TABLE DATA; Schema: public; Owner: nchiang
--

COPY public.devices (id, access_token_id, account_id, device_id, name, fingerprint_key, identity_key, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: domain_allows; Type: TABLE DATA; Schema: public; Owner: nchiang
--

COPY public.domain_allows (id, domain, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: domain_blocks; Type: TABLE DATA; Schema: public; Owner: nchiang
--

COPY public.domain_blocks (id, domain, created_at, updated_at, severity, reject_media, reject_reports, private_comment, public_comment, obfuscate) FROM stdin;
\.


--
-- Data for Name: email_domain_blocks; Type: TABLE DATA; Schema: public; Owner: nchiang
--

COPY public.email_domain_blocks (id, domain, created_at, updated_at, parent_id, ips, last_refresh_at) FROM stdin;
\.


--
-- Data for Name: encrypted_messages; Type: TABLE DATA; Schema: public; Owner: nchiang
--

COPY public.encrypted_messages (id, device_id, from_account_id, from_device_id, type, body, digest, message_franking, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: favourites; Type: TABLE DATA; Schema: public; Owner: nchiang
--

COPY public.favourites (id, created_at, updated_at, account_id, status_id) FROM stdin;
\.


--
-- Data for Name: featured_tags; Type: TABLE DATA; Schema: public; Owner: nchiang
--

COPY public.featured_tags (id, account_id, tag_id, statuses_count, last_status_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: follow_recommendation_suppressions; Type: TABLE DATA; Schema: public; Owner: nchiang
--

COPY public.follow_recommendation_suppressions (id, account_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: follow_requests; Type: TABLE DATA; Schema: public; Owner: nchiang
--

COPY public.follow_requests (id, created_at, updated_at, account_id, target_account_id, show_reblogs, uri, notify) FROM stdin;
\.


--
-- Data for Name: follows; Type: TABLE DATA; Schema: public; Owner: nchiang
--

COPY public.follows (id, created_at, updated_at, account_id, target_account_id, show_reblogs, uri, notify) FROM stdin;
\.


--
-- Data for Name: identities; Type: TABLE DATA; Schema: public; Owner: nchiang
--

COPY public.identities (id, provider, uid, created_at, updated_at, user_id) FROM stdin;
\.


--
-- Data for Name: imports; Type: TABLE DATA; Schema: public; Owner: nchiang
--

COPY public.imports (id, type, approved, created_at, updated_at, data_file_name, data_content_type, data_file_size, data_updated_at, account_id, overwrite) FROM stdin;
\.


--
-- Data for Name: invites; Type: TABLE DATA; Schema: public; Owner: nchiang
--

COPY public.invites (id, user_id, code, expires_at, max_uses, uses, created_at, updated_at, autofollow, comment) FROM stdin;
\.


--
-- Data for Name: ip_blocks; Type: TABLE DATA; Schema: public; Owner: nchiang
--

COPY public.ip_blocks (id, created_at, updated_at, expires_at, ip, severity, comment) FROM stdin;
\.


--
-- Data for Name: list_accounts; Type: TABLE DATA; Schema: public; Owner: nchiang
--

COPY public.list_accounts (id, list_id, account_id, follow_id) FROM stdin;
\.


--
-- Data for Name: lists; Type: TABLE DATA; Schema: public; Owner: nchiang
--

COPY public.lists (id, account_id, title, created_at, updated_at, replies_policy) FROM stdin;
\.


--
-- Data for Name: login_activities; Type: TABLE DATA; Schema: public; Owner: nchiang
--

COPY public.login_activities (id, user_id, authentication_method, provider, success, failure_reason, ip, user_agent, created_at) FROM stdin;
\.


--
-- Data for Name: markers; Type: TABLE DATA; Schema: public; Owner: nchiang
--

COPY public.markers (id, user_id, timeline, last_read_id, lock_version, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: media_attachments; Type: TABLE DATA; Schema: public; Owner: nchiang
--

COPY public.media_attachments (id, status_id, file_file_name, file_content_type, file_file_size, file_updated_at, remote_url, created_at, updated_at, shortcode, type, file_meta, account_id, description, scheduled_status_id, blurhash, processing, file_storage_schema_version, thumbnail_file_name, thumbnail_content_type, thumbnail_file_size, thumbnail_updated_at, thumbnail_remote_url) FROM stdin;
\.


--
-- Data for Name: mentions; Type: TABLE DATA; Schema: public; Owner: nchiang
--

COPY public.mentions (id, status_id, created_at, updated_at, account_id, silent) FROM stdin;
\.


--
-- Data for Name: mutes; Type: TABLE DATA; Schema: public; Owner: nchiang
--

COPY public.mutes (id, created_at, updated_at, hide_notifications, account_id, target_account_id, expires_at) FROM stdin;
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: nchiang
--

COPY public.notifications (id, activity_id, activity_type, created_at, updated_at, account_id, from_account_id, type) FROM stdin;
\.


--
-- Data for Name: oauth_access_grants; Type: TABLE DATA; Schema: public; Owner: nchiang
--

COPY public.oauth_access_grants (id, token, expires_in, redirect_uri, created_at, revoked_at, scopes, application_id, resource_owner_id) FROM stdin;
\.


--
-- Data for Name: oauth_access_tokens; Type: TABLE DATA; Schema: public; Owner: nchiang
--

COPY public.oauth_access_tokens (id, token, refresh_token, expires_in, revoked_at, created_at, scopes, application_id, resource_owner_id, last_used_at, last_used_ip) FROM stdin;
\.


--
-- Data for Name: oauth_applications; Type: TABLE DATA; Schema: public; Owner: nchiang
--

COPY public.oauth_applications (id, name, uid, secret, redirect_uri, scopes, created_at, updated_at, superapp, website, owner_type, owner_id, confidential) FROM stdin;
1	Web	awEMundg44zEIvFngUvssZmGsIevzJzZFTKaiKMV4ZY	0V6AeDdOrOhOhCpRlw4G0OUkrlaYvR8m6ZP9Kvd1Rng	urn:ietf:wg:oauth:2.0:oob	read write follow push	2022-04-22 17:23:26.529937	2022-04-22 17:23:26.529937	t	\N	\N	\N	t
\.


--
-- Data for Name: one_time_keys; Type: TABLE DATA; Schema: public; Owner: nchiang
--

COPY public.one_time_keys (id, device_id, key_id, key, signature, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: pghero_space_stats; Type: TABLE DATA; Schema: public; Owner: nchiang
--

COPY public.pghero_space_stats (id, database, schema, relation, size, captured_at) FROM stdin;
\.


--
-- Data for Name: poll_votes; Type: TABLE DATA; Schema: public; Owner: nchiang
--

COPY public.poll_votes (id, account_id, poll_id, choice, created_at, updated_at, uri) FROM stdin;
\.


--
-- Data for Name: polls; Type: TABLE DATA; Schema: public; Owner: nchiang
--

COPY public.polls (id, account_id, status_id, expires_at, options, cached_tallies, multiple, hide_totals, votes_count, last_fetched_at, created_at, updated_at, lock_version, voters_count) FROM stdin;
\.


--
-- Data for Name: preview_card_providers; Type: TABLE DATA; Schema: public; Owner: nchiang
--

COPY public.preview_card_providers (id, domain, icon_file_name, icon_content_type, icon_file_size, icon_updated_at, trendable, reviewed_at, requested_review_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: preview_cards; Type: TABLE DATA; Schema: public; Owner: nchiang
--

COPY public.preview_cards (id, url, title, description, image_file_name, image_content_type, image_file_size, image_updated_at, type, html, author_name, author_url, provider_name, provider_url, width, height, created_at, updated_at, embed_url, image_storage_schema_version, blurhash, language, max_score, max_score_at, trendable, link_type) FROM stdin;
\.


--
-- Data for Name: preview_cards_statuses; Type: TABLE DATA; Schema: public; Owner: nchiang
--

COPY public.preview_cards_statuses (preview_card_id, status_id) FROM stdin;
\.


--
-- Data for Name: relays; Type: TABLE DATA; Schema: public; Owner: nchiang
--

COPY public.relays (id, inbox_url, follow_activity_id, created_at, updated_at, state) FROM stdin;
\.


--
-- Data for Name: report_notes; Type: TABLE DATA; Schema: public; Owner: nchiang
--

COPY public.report_notes (id, content, report_id, account_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: reports; Type: TABLE DATA; Schema: public; Owner: nchiang
--

COPY public.reports (id, status_ids, comment, created_at, updated_at, account_id, action_taken_by_account_id, target_account_id, assigned_account_id, uri, forwarded, category, action_taken_at, rule_ids) FROM stdin;
\.


--
-- Data for Name: rules; Type: TABLE DATA; Schema: public; Owner: nchiang
--

COPY public.rules (id, priority, deleted_at, text, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: scheduled_statuses; Type: TABLE DATA; Schema: public; Owner: nchiang
--

COPY public.scheduled_statuses (id, account_id, scheduled_at, params) FROM stdin;
\.


--
-- Data for Name: schema_migrations; Type: TABLE DATA; Schema: public; Owner: nchiang
--

COPY public.schema_migrations (version) FROM stdin;
20220316233212
20160220174730
20160220211917
20160221003140
20160221003621
20160222122600
20160222143943
20160223162837
20160223164502
20160223165723
20160223165855
20160223171800
20160224223247
20160227230233
20160305115639
20160306172223
20160312193225
20160314164231
20160316103650
20160322193748
20160325130944
20160826155805
20160905150353
20160919221059
20160920003904
20160926213048
20161003142332
20161003145426
20161006213403
20161009120834
20161027172456
20161104173623
20161105130633
20161116162355
20161119211120
20161122163057
20161123093447
20161128103007
20161130142058
20161130185319
20161202132159
20161203164520
20161205214545
20161221152630
20161222201034
20161222204147
20170105224407
20170109120109
20170112154826
20170114194937
20170114203041
20170119214911
20170123162658
20170123203248
20170125145934
20170127165745
20170205175257
20170209184350
20170214110202
20170217012631
20170301222600
20170303212857
20170304202101
20170317193015
20170318214217
20170322021028
20170322143850
20170322162804
20170330021336
20170330163835
20170330164118
20170403172249
20170405112956
20170406215816
20170409170753
20170414080609
20170414132105
20170418160728
20170423005413
20170424003227
20170424112722
20170425131920
20170425202925
20170427011934
20170506235850
20170507000211
20170507141759
20170508230434
20170516072309
20170520145338
20170601210557
20170604144747
20170606113804
20170609145826
20170610000000
20170623152212
20170624134742
20170625140443
20170711225116
20170713112503
20170713175513
20170713190709
20170714184731
20170716191202
20170718211102
20170720000000
20170823162448
20170824103029
20170829215220
20170901141119
20170901142658
20170905044538
20170905165803
20170913000752
20170917153509
20170918125918
20170920024819
20170920032311
20170924022025
20170927215609
20170928082043
20171005102658
20171005171936
20171006142024
20171010023049
20171010025614
20171020084748
20171028221157
20171107143332
20171107143624
20171109012327
20171114080328
20171114231651
20171116161857
20171118012443
20171119172437
20171122120436
20171125024930
20171125031751
20171125185353
20171125190735
20171129172043
20171130000000
20171201000000
20171212195226
20171226094803
20180106000232
20180109143959
20180204034416
20180206000000
20180211015820
20180304013859
20180310000000
20180402031200
20180402040909
20180410204633
20180416210259
20180506221944
20180510214435
20180510230049
20180514130000
20180514140000
20180528141303
20180608213548
20180609104432
20180615122121
20180616192031
20180617162849
20180628181026
20180707154237
20180711152640
20180808175627
20180812123222
20180812162710
20180812173710
20180813113448
20180814171349
20180820232245
20180831171112
20180929222014
20181007025445
20181010141500
20181017170937
20181018205649
20181024224956
20181026034033
20181116165755
20181116173541
20181116184611
20181127130500
20181127165847
20181203003808
20181203021853
20181204193439
20181204215309
20181207011115
20181213184704
20181213185533
20181219235220
20181226021420
20190103124649
20190103124754
20190117114553
20190201012802
20190203180359
20190225031541
20190225031625
20190226003449
20190304152020
20190306145741
20190307234537
20190314181829
20190316190352
20190317135723
20190403141604
20190409054914
20190420025523
20190509164208
20190511134027
20190511152737
20190519130537
20190529143559
20190627222225
20190627222826
20190701022101
20190705002136
20190706233204
20190715031050
20190715164535
20190726175042
20190729185330
20190805123746
20190807135426
20190815225426
20190819134503
20190820003045
20190823221802
20190901035623
20190901040524
20190904222339
20190914202517
20190915194355
20190917213523
20190927124642
20190927232842
20191001213028
20191007013357
20191031163205
20191212003415
20191212163405
20191218153258
20200113125135
20200114113335
20200119112504
20200126203551
20200306035625
20200309150742
20200312144258
20200312162302
20200312185443
20200317021758
20200407201300
20200407202420
20200417125749
20200508212852
20200510110808
20200510181721
20200516180352
20200516183822
20200518083523
20200521180606
20200529214050
20200601222558
20200605155027
20200608113046
20200614002136
20200620164023
20200622213645
20200627125810
20200628133322
20200630190240
20200630190544
20200908193330
20200917192924
20200917193034
20200917193528
20200917222316
20200917222734
20201008202037
20201008220312
20201017233919
20201017234926
20201206004238
20201218054746
20210221045109
20210306164523
20210308133107
20210322164601
20210323114347
20210324171613
20210416200740
20210421121431
20210425135952
20210502233513
20210505174616
20210507001928
20210526193025
20210609202149
20210616214135
20210616214526
20210621221010
20210630000137
20210722120340
20210808071221
20210904215403
20210908220918
20211031031021
20211112011713
20211115032527
20211123212714
20211126000907
20211213040746
20211231080958
20220105163928
20220109213908
20220115125126
20220115125341
20220116202951
20220118183010
20220118183123
20220124141035
20220202200743
20220202200926
20220202201015
20220210153119
20220224010024
20220227041951
20220302232632
20220303000827
20220303203437
20220304195405
20220307083603
20220307094650
20220309213005
20220310060545
20220310060556
20220310060614
20220310060626
20220310060641
20220310060653
20220310060706
20220310060722
20220310060740
20220310060750
20220310060809
20220310060833
20220310060854
20220310060913
20220310060926
20220310060939
20220310060959
\.


--
-- Data for Name: session_activations; Type: TABLE DATA; Schema: public; Owner: nchiang
--

COPY public.session_activations (id, session_id, created_at, updated_at, user_agent, ip, access_token_id, user_id, web_push_subscription_id) FROM stdin;
\.


--
-- Data for Name: settings; Type: TABLE DATA; Schema: public; Owner: nchiang
--

COPY public.settings (id, var, value, thing_type, created_at, updated_at, thing_id) FROM stdin;
\.


--
-- Data for Name: site_uploads; Type: TABLE DATA; Schema: public; Owner: nchiang
--

COPY public.site_uploads (id, var, file_file_name, file_content_type, file_file_size, file_updated_at, meta, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: status_edits; Type: TABLE DATA; Schema: public; Owner: nchiang
--

COPY public.status_edits (id, status_id, account_id, text, spoiler_text, created_at, updated_at, ordered_media_attachment_ids, media_descriptions, poll_options, sensitive) FROM stdin;
\.


--
-- Data for Name: status_pins; Type: TABLE DATA; Schema: public; Owner: nchiang
--

COPY public.status_pins (id, account_id, status_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: status_stats; Type: TABLE DATA; Schema: public; Owner: nchiang
--

COPY public.status_stats (id, status_id, replies_count, reblogs_count, favourites_count, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: statuses; Type: TABLE DATA; Schema: public; Owner: nchiang
--

COPY public.statuses (id, uri, text, created_at, updated_at, in_reply_to_id, reblog_of_id, url, sensitive, visibility, spoiler_text, reply, language, conversation_id, local, account_id, application_id, in_reply_to_account_id, poll_id, deleted_at, edited_at, trendable, ordered_media_attachment_ids) FROM stdin;
\.


--
-- Data for Name: statuses_tags; Type: TABLE DATA; Schema: public; Owner: nchiang
--

COPY public.statuses_tags (status_id, tag_id) FROM stdin;
\.


--
-- Data for Name: system_keys; Type: TABLE DATA; Schema: public; Owner: nchiang
--

COPY public.system_keys (id, key, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: tags; Type: TABLE DATA; Schema: public; Owner: nchiang
--

COPY public.tags (id, name, created_at, updated_at, usable, trendable, listable, reviewed_at, requested_review_at, last_status_at, max_score, max_score_at) FROM stdin;
\.


--
-- Data for Name: tombstones; Type: TABLE DATA; Schema: public; Owner: nchiang
--

COPY public.tombstones (id, account_id, uri, created_at, updated_at, by_moderator) FROM stdin;
\.


--
-- Data for Name: unavailable_domains; Type: TABLE DATA; Schema: public; Owner: nchiang
--

COPY public.unavailable_domains (id, domain, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: user_invite_requests; Type: TABLE DATA; Schema: public; Owner: nchiang
--

COPY public.user_invite_requests (id, user_id, text, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: nchiang
--

COPY public.users (id, email, created_at, updated_at, encrypted_password, reset_password_token, reset_password_sent_at, sign_in_count, current_sign_in_at, last_sign_in_at, admin, confirmation_token, confirmed_at, confirmation_sent_at, unconfirmed_email, locale, encrypted_otp_secret, encrypted_otp_secret_iv, encrypted_otp_secret_salt, consumed_timestep, otp_required_for_login, last_emailed_at, otp_backup_codes, filtered_languages, account_id, disabled, moderator, invite_id, chosen_languages, created_by_application_id, approved, sign_in_token, sign_in_token_sent_at, webauthn_id, sign_up_ip, skip_sign_in_token) FROM stdin;
1	admin@localhost:3000	2022-04-22 17:23:26.779884	2022-04-22 17:23:26.779884	$2a$10$qVBoMxF2U7gDcr8QgbVPg.t0J4eJehOR6gLh5W.V7Qptr6Ou6Tl12	\N	\N	0	\N	\N	t	\N	2022-04-22 17:23:26.71288	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	{}	108176880874707606	f	f	\N	\N	\N	t	\N	\N	\N	\N	\N
\.


--
-- Data for Name: web_push_subscriptions; Type: TABLE DATA; Schema: public; Owner: nchiang
--

COPY public.web_push_subscriptions (id, endpoint, key_p256dh, key_auth, data, created_at, updated_at, access_token_id, user_id) FROM stdin;
\.


--
-- Data for Name: web_settings; Type: TABLE DATA; Schema: public; Owner: nchiang
--

COPY public.web_settings (id, data, created_at, updated_at, user_id) FROM stdin;
\.


--
-- Data for Name: webauthn_credentials; Type: TABLE DATA; Schema: public; Owner: nchiang
--

COPY public.webauthn_credentials (id, external_id, public_key, nickname, sign_count, user_id, created_at, updated_at) FROM stdin;
\.


--
-- Name: account_aliases_id_seq; Type: SEQUENCE SET; Schema: public; Owner: nchiang
--

SELECT pg_catalog.setval('public.account_aliases_id_seq', 1, false);


--
-- Name: account_conversations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: nchiang
--

SELECT pg_catalog.setval('public.account_conversations_id_seq', 1, false);


--
-- Name: account_deletion_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: nchiang
--

SELECT pg_catalog.setval('public.account_deletion_requests_id_seq', 1, false);


--
-- Name: account_domain_blocks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: nchiang
--

SELECT pg_catalog.setval('public.account_domain_blocks_id_seq', 1, false);


--
-- Name: account_migrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: nchiang
--

SELECT pg_catalog.setval('public.account_migrations_id_seq', 1, false);


--
-- Name: account_moderation_notes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: nchiang
--

SELECT pg_catalog.setval('public.account_moderation_notes_id_seq', 1, false);


--
-- Name: account_notes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: nchiang
--

SELECT pg_catalog.setval('public.account_notes_id_seq', 1, false);


--
-- Name: account_pins_id_seq; Type: SEQUENCE SET; Schema: public; Owner: nchiang
--

SELECT pg_catalog.setval('public.account_pins_id_seq', 1, false);


--
-- Name: account_stats_id_seq; Type: SEQUENCE SET; Schema: public; Owner: nchiang
--

SELECT pg_catalog.setval('public.account_stats_id_seq', 1, false);


--
-- Name: account_statuses_cleanup_policies_id_seq; Type: SEQUENCE SET; Schema: public; Owner: nchiang
--

SELECT pg_catalog.setval('public.account_statuses_cleanup_policies_id_seq', 1, false);


--
-- Name: account_warning_presets_id_seq; Type: SEQUENCE SET; Schema: public; Owner: nchiang
--

SELECT pg_catalog.setval('public.account_warning_presets_id_seq', 1, false);


--
-- Name: account_warnings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: nchiang
--

SELECT pg_catalog.setval('public.account_warnings_id_seq', 1, false);


--
-- Name: accounts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: nchiang
--

SELECT pg_catalog.setval('public.accounts_id_seq', 1, true);


--
-- Name: admin_action_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: nchiang
--

SELECT pg_catalog.setval('public.admin_action_logs_id_seq', 1, false);


--
-- Name: announcement_mutes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: nchiang
--

SELECT pg_catalog.setval('public.announcement_mutes_id_seq', 1, false);


--
-- Name: announcement_reactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: nchiang
--

SELECT pg_catalog.setval('public.announcement_reactions_id_seq', 1, false);


--
-- Name: announcements_id_seq; Type: SEQUENCE SET; Schema: public; Owner: nchiang
--

SELECT pg_catalog.setval('public.announcements_id_seq', 1, false);


--
-- Name: appeals_id_seq; Type: SEQUENCE SET; Schema: public; Owner: nchiang
--

SELECT pg_catalog.setval('public.appeals_id_seq', 1, false);


--
-- Name: backups_id_seq; Type: SEQUENCE SET; Schema: public; Owner: nchiang
--

SELECT pg_catalog.setval('public.backups_id_seq', 1, false);


--
-- Name: blocks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: nchiang
--

SELECT pg_catalog.setval('public.blocks_id_seq', 1, false);


--
-- Name: bookmarks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: nchiang
--

SELECT pg_catalog.setval('public.bookmarks_id_seq', 1, false);


--
-- Name: canonical_email_blocks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: nchiang
--

SELECT pg_catalog.setval('public.canonical_email_blocks_id_seq', 1, false);


--
-- Name: conversation_mutes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: nchiang
--

SELECT pg_catalog.setval('public.conversation_mutes_id_seq', 1, false);


--
-- Name: conversations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: nchiang
--

SELECT pg_catalog.setval('public.conversations_id_seq', 1, false);


--
-- Name: custom_emoji_categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: nchiang
--

SELECT pg_catalog.setval('public.custom_emoji_categories_id_seq', 1, false);


--
-- Name: custom_emojis_id_seq; Type: SEQUENCE SET; Schema: public; Owner: nchiang
--

SELECT pg_catalog.setval('public.custom_emojis_id_seq', 1, false);


--
-- Name: custom_filters_id_seq; Type: SEQUENCE SET; Schema: public; Owner: nchiang
--

SELECT pg_catalog.setval('public.custom_filters_id_seq', 1, false);


--
-- Name: devices_id_seq; Type: SEQUENCE SET; Schema: public; Owner: nchiang
--

SELECT pg_catalog.setval('public.devices_id_seq', 1, false);


--
-- Name: domain_allows_id_seq; Type: SEQUENCE SET; Schema: public; Owner: nchiang
--

SELECT pg_catalog.setval('public.domain_allows_id_seq', 1, false);


--
-- Name: domain_blocks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: nchiang
--

SELECT pg_catalog.setval('public.domain_blocks_id_seq', 1, false);


--
-- Name: email_domain_blocks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: nchiang
--

SELECT pg_catalog.setval('public.email_domain_blocks_id_seq', 1, false);


--
-- Name: encrypted_messages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: nchiang
--

SELECT pg_catalog.setval('public.encrypted_messages_id_seq', 1, false);


--
-- Name: favourites_id_seq; Type: SEQUENCE SET; Schema: public; Owner: nchiang
--

SELECT pg_catalog.setval('public.favourites_id_seq', 1, false);


--
-- Name: featured_tags_id_seq; Type: SEQUENCE SET; Schema: public; Owner: nchiang
--

SELECT pg_catalog.setval('public.featured_tags_id_seq', 1, false);


--
-- Name: follow_recommendation_suppressions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: nchiang
--

SELECT pg_catalog.setval('public.follow_recommendation_suppressions_id_seq', 1, false);


--
-- Name: follow_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: nchiang
--

SELECT pg_catalog.setval('public.follow_requests_id_seq', 1, false);


--
-- Name: follows_id_seq; Type: SEQUENCE SET; Schema: public; Owner: nchiang
--

SELECT pg_catalog.setval('public.follows_id_seq', 1, false);


--
-- Name: identities_id_seq; Type: SEQUENCE SET; Schema: public; Owner: nchiang
--

SELECT pg_catalog.setval('public.identities_id_seq', 1, false);


--
-- Name: imports_id_seq; Type: SEQUENCE SET; Schema: public; Owner: nchiang
--

SELECT pg_catalog.setval('public.imports_id_seq', 1, false);


--
-- Name: invites_id_seq; Type: SEQUENCE SET; Schema: public; Owner: nchiang
--

SELECT pg_catalog.setval('public.invites_id_seq', 1, false);


--
-- Name: ip_blocks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: nchiang
--

SELECT pg_catalog.setval('public.ip_blocks_id_seq', 1, false);


--
-- Name: list_accounts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: nchiang
--

SELECT pg_catalog.setval('public.list_accounts_id_seq', 1, false);


--
-- Name: lists_id_seq; Type: SEQUENCE SET; Schema: public; Owner: nchiang
--

SELECT pg_catalog.setval('public.lists_id_seq', 1, false);


--
-- Name: login_activities_id_seq; Type: SEQUENCE SET; Schema: public; Owner: nchiang
--

SELECT pg_catalog.setval('public.login_activities_id_seq', 1, false);


--
-- Name: markers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: nchiang
--

SELECT pg_catalog.setval('public.markers_id_seq', 1, false);


--
-- Name: media_attachments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: nchiang
--

SELECT pg_catalog.setval('public.media_attachments_id_seq', 1, false);


--
-- Name: mentions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: nchiang
--

SELECT pg_catalog.setval('public.mentions_id_seq', 1, false);


--
-- Name: mutes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: nchiang
--

SELECT pg_catalog.setval('public.mutes_id_seq', 1, false);


--
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: nchiang
--

SELECT pg_catalog.setval('public.notifications_id_seq', 1, false);


--
-- Name: oauth_access_grants_id_seq; Type: SEQUENCE SET; Schema: public; Owner: nchiang
--

SELECT pg_catalog.setval('public.oauth_access_grants_id_seq', 1, false);


--
-- Name: oauth_access_tokens_id_seq; Type: SEQUENCE SET; Schema: public; Owner: nchiang
--

SELECT pg_catalog.setval('public.oauth_access_tokens_id_seq', 1, false);


--
-- Name: oauth_applications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: nchiang
--

SELECT pg_catalog.setval('public.oauth_applications_id_seq', 1, true);


--
-- Name: one_time_keys_id_seq; Type: SEQUENCE SET; Schema: public; Owner: nchiang
--

SELECT pg_catalog.setval('public.one_time_keys_id_seq', 1, false);


--
-- Name: pghero_space_stats_id_seq; Type: SEQUENCE SET; Schema: public; Owner: nchiang
--

SELECT pg_catalog.setval('public.pghero_space_stats_id_seq', 1, false);


--
-- Name: poll_votes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: nchiang
--

SELECT pg_catalog.setval('public.poll_votes_id_seq', 1, false);


--
-- Name: polls_id_seq; Type: SEQUENCE SET; Schema: public; Owner: nchiang
--

SELECT pg_catalog.setval('public.polls_id_seq', 1, false);


--
-- Name: preview_card_providers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: nchiang
--

SELECT pg_catalog.setval('public.preview_card_providers_id_seq', 1, false);


--
-- Name: preview_cards_id_seq; Type: SEQUENCE SET; Schema: public; Owner: nchiang
--

SELECT pg_catalog.setval('public.preview_cards_id_seq', 1, false);


--
-- Name: relays_id_seq; Type: SEQUENCE SET; Schema: public; Owner: nchiang
--

SELECT pg_catalog.setval('public.relays_id_seq', 1, false);


--
-- Name: report_notes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: nchiang
--

SELECT pg_catalog.setval('public.report_notes_id_seq', 1, false);


--
-- Name: reports_id_seq; Type: SEQUENCE SET; Schema: public; Owner: nchiang
--

SELECT pg_catalog.setval('public.reports_id_seq', 1, false);


--
-- Name: rules_id_seq; Type: SEQUENCE SET; Schema: public; Owner: nchiang
--

SELECT pg_catalog.setval('public.rules_id_seq', 1, false);


--
-- Name: scheduled_statuses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: nchiang
--

SELECT pg_catalog.setval('public.scheduled_statuses_id_seq', 1, false);


--
-- Name: session_activations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: nchiang
--

SELECT pg_catalog.setval('public.session_activations_id_seq', 1, false);


--
-- Name: settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: nchiang
--

SELECT pg_catalog.setval('public.settings_id_seq', 1, false);


--
-- Name: site_uploads_id_seq; Type: SEQUENCE SET; Schema: public; Owner: nchiang
--

SELECT pg_catalog.setval('public.site_uploads_id_seq', 1, false);


--
-- Name: status_edits_id_seq; Type: SEQUENCE SET; Schema: public; Owner: nchiang
--

SELECT pg_catalog.setval('public.status_edits_id_seq', 1, false);


--
-- Name: status_pins_id_seq; Type: SEQUENCE SET; Schema: public; Owner: nchiang
--

SELECT pg_catalog.setval('public.status_pins_id_seq', 1, false);


--
-- Name: status_stats_id_seq; Type: SEQUENCE SET; Schema: public; Owner: nchiang
--

SELECT pg_catalog.setval('public.status_stats_id_seq', 1, false);


--
-- Name: statuses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: nchiang
--

SELECT pg_catalog.setval('public.statuses_id_seq', 1, false);


--
-- Name: system_keys_id_seq; Type: SEQUENCE SET; Schema: public; Owner: nchiang
--

SELECT pg_catalog.setval('public.system_keys_id_seq', 1, false);


--
-- Name: tags_id_seq; Type: SEQUENCE SET; Schema: public; Owner: nchiang
--

SELECT pg_catalog.setval('public.tags_id_seq', 1, false);


--
-- Name: tombstones_id_seq; Type: SEQUENCE SET; Schema: public; Owner: nchiang
--

SELECT pg_catalog.setval('public.tombstones_id_seq', 1, false);


--
-- Name: unavailable_domains_id_seq; Type: SEQUENCE SET; Schema: public; Owner: nchiang
--

SELECT pg_catalog.setval('public.unavailable_domains_id_seq', 1, false);


--
-- Name: user_invite_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: nchiang
--

SELECT pg_catalog.setval('public.user_invite_requests_id_seq', 1, false);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: nchiang
--

SELECT pg_catalog.setval('public.users_id_seq', 1, true);


--
-- Name: web_push_subscriptions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: nchiang
--

SELECT pg_catalog.setval('public.web_push_subscriptions_id_seq', 1, false);


--
-- Name: web_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: nchiang
--

SELECT pg_catalog.setval('public.web_settings_id_seq', 1, false);


--
-- Name: webauthn_credentials_id_seq; Type: SEQUENCE SET; Schema: public; Owner: nchiang
--

SELECT pg_catalog.setval('public.webauthn_credentials_id_seq', 1, false);


--
-- Name: account_aliases account_aliases_pkey; Type: CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.account_aliases
    ADD CONSTRAINT account_aliases_pkey PRIMARY KEY (id);


--
-- Name: account_conversations account_conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.account_conversations
    ADD CONSTRAINT account_conversations_pkey PRIMARY KEY (id);


--
-- Name: account_deletion_requests account_deletion_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.account_deletion_requests
    ADD CONSTRAINT account_deletion_requests_pkey PRIMARY KEY (id);


--
-- Name: account_domain_blocks account_domain_blocks_pkey; Type: CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.account_domain_blocks
    ADD CONSTRAINT account_domain_blocks_pkey PRIMARY KEY (id);


--
-- Name: account_migrations account_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.account_migrations
    ADD CONSTRAINT account_migrations_pkey PRIMARY KEY (id);


--
-- Name: account_moderation_notes account_moderation_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.account_moderation_notes
    ADD CONSTRAINT account_moderation_notes_pkey PRIMARY KEY (id);


--
-- Name: account_notes account_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.account_notes
    ADD CONSTRAINT account_notes_pkey PRIMARY KEY (id);


--
-- Name: account_pins account_pins_pkey; Type: CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.account_pins
    ADD CONSTRAINT account_pins_pkey PRIMARY KEY (id);


--
-- Name: account_stats account_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.account_stats
    ADD CONSTRAINT account_stats_pkey PRIMARY KEY (id);


--
-- Name: account_statuses_cleanup_policies account_statuses_cleanup_policies_pkey; Type: CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.account_statuses_cleanup_policies
    ADD CONSTRAINT account_statuses_cleanup_policies_pkey PRIMARY KEY (id);


--
-- Name: account_warning_presets account_warning_presets_pkey; Type: CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.account_warning_presets
    ADD CONSTRAINT account_warning_presets_pkey PRIMARY KEY (id);


--
-- Name: account_warnings account_warnings_pkey; Type: CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.account_warnings
    ADD CONSTRAINT account_warnings_pkey PRIMARY KEY (id);


--
-- Name: accounts accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_pkey PRIMARY KEY (id);


--
-- Name: admin_action_logs admin_action_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.admin_action_logs
    ADD CONSTRAINT admin_action_logs_pkey PRIMARY KEY (id);


--
-- Name: announcement_mutes announcement_mutes_pkey; Type: CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.announcement_mutes
    ADD CONSTRAINT announcement_mutes_pkey PRIMARY KEY (id);


--
-- Name: announcement_reactions announcement_reactions_pkey; Type: CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.announcement_reactions
    ADD CONSTRAINT announcement_reactions_pkey PRIMARY KEY (id);


--
-- Name: announcements announcements_pkey; Type: CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_pkey PRIMARY KEY (id);


--
-- Name: appeals appeals_pkey; Type: CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.appeals
    ADD CONSTRAINT appeals_pkey PRIMARY KEY (id);


--
-- Name: ar_internal_metadata ar_internal_metadata_pkey; Type: CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.ar_internal_metadata
    ADD CONSTRAINT ar_internal_metadata_pkey PRIMARY KEY (key);


--
-- Name: backups backups_pkey; Type: CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.backups
    ADD CONSTRAINT backups_pkey PRIMARY KEY (id);


--
-- Name: blocks blocks_pkey; Type: CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.blocks
    ADD CONSTRAINT blocks_pkey PRIMARY KEY (id);


--
-- Name: bookmarks bookmarks_pkey; Type: CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.bookmarks
    ADD CONSTRAINT bookmarks_pkey PRIMARY KEY (id);


--
-- Name: canonical_email_blocks canonical_email_blocks_pkey; Type: CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.canonical_email_blocks
    ADD CONSTRAINT canonical_email_blocks_pkey PRIMARY KEY (id);


--
-- Name: conversation_mutes conversation_mutes_pkey; Type: CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.conversation_mutes
    ADD CONSTRAINT conversation_mutes_pkey PRIMARY KEY (id);


--
-- Name: conversations conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_pkey PRIMARY KEY (id);


--
-- Name: custom_emoji_categories custom_emoji_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.custom_emoji_categories
    ADD CONSTRAINT custom_emoji_categories_pkey PRIMARY KEY (id);


--
-- Name: custom_emojis custom_emojis_pkey; Type: CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.custom_emojis
    ADD CONSTRAINT custom_emojis_pkey PRIMARY KEY (id);


--
-- Name: custom_filters custom_filters_pkey; Type: CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.custom_filters
    ADD CONSTRAINT custom_filters_pkey PRIMARY KEY (id);


--
-- Name: devices devices_pkey; Type: CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.devices
    ADD CONSTRAINT devices_pkey PRIMARY KEY (id);


--
-- Name: domain_allows domain_allows_pkey; Type: CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.domain_allows
    ADD CONSTRAINT domain_allows_pkey PRIMARY KEY (id);


--
-- Name: domain_blocks domain_blocks_pkey; Type: CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.domain_blocks
    ADD CONSTRAINT domain_blocks_pkey PRIMARY KEY (id);


--
-- Name: email_domain_blocks email_domain_blocks_pkey; Type: CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.email_domain_blocks
    ADD CONSTRAINT email_domain_blocks_pkey PRIMARY KEY (id);


--
-- Name: encrypted_messages encrypted_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.encrypted_messages
    ADD CONSTRAINT encrypted_messages_pkey PRIMARY KEY (id);


--
-- Name: favourites favourites_pkey; Type: CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.favourites
    ADD CONSTRAINT favourites_pkey PRIMARY KEY (id);


--
-- Name: featured_tags featured_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.featured_tags
    ADD CONSTRAINT featured_tags_pkey PRIMARY KEY (id);


--
-- Name: follow_recommendation_suppressions follow_recommendation_suppressions_pkey; Type: CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.follow_recommendation_suppressions
    ADD CONSTRAINT follow_recommendation_suppressions_pkey PRIMARY KEY (id);


--
-- Name: follow_requests follow_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.follow_requests
    ADD CONSTRAINT follow_requests_pkey PRIMARY KEY (id);


--
-- Name: follows follows_pkey; Type: CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.follows
    ADD CONSTRAINT follows_pkey PRIMARY KEY (id);


--
-- Name: identities identities_pkey; Type: CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.identities
    ADD CONSTRAINT identities_pkey PRIMARY KEY (id);


--
-- Name: imports imports_pkey; Type: CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.imports
    ADD CONSTRAINT imports_pkey PRIMARY KEY (id);


--
-- Name: invites invites_pkey; Type: CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.invites
    ADD CONSTRAINT invites_pkey PRIMARY KEY (id);


--
-- Name: ip_blocks ip_blocks_pkey; Type: CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.ip_blocks
    ADD CONSTRAINT ip_blocks_pkey PRIMARY KEY (id);


--
-- Name: list_accounts list_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.list_accounts
    ADD CONSTRAINT list_accounts_pkey PRIMARY KEY (id);


--
-- Name: lists lists_pkey; Type: CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.lists
    ADD CONSTRAINT lists_pkey PRIMARY KEY (id);


--
-- Name: login_activities login_activities_pkey; Type: CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.login_activities
    ADD CONSTRAINT login_activities_pkey PRIMARY KEY (id);


--
-- Name: markers markers_pkey; Type: CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.markers
    ADD CONSTRAINT markers_pkey PRIMARY KEY (id);


--
-- Name: media_attachments media_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.media_attachments
    ADD CONSTRAINT media_attachments_pkey PRIMARY KEY (id);


--
-- Name: mentions mentions_pkey; Type: CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.mentions
    ADD CONSTRAINT mentions_pkey PRIMARY KEY (id);


--
-- Name: mutes mutes_pkey; Type: CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.mutes
    ADD CONSTRAINT mutes_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: oauth_access_grants oauth_access_grants_pkey; Type: CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.oauth_access_grants
    ADD CONSTRAINT oauth_access_grants_pkey PRIMARY KEY (id);


--
-- Name: oauth_access_tokens oauth_access_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.oauth_access_tokens
    ADD CONSTRAINT oauth_access_tokens_pkey PRIMARY KEY (id);


--
-- Name: oauth_applications oauth_applications_pkey; Type: CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.oauth_applications
    ADD CONSTRAINT oauth_applications_pkey PRIMARY KEY (id);


--
-- Name: one_time_keys one_time_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.one_time_keys
    ADD CONSTRAINT one_time_keys_pkey PRIMARY KEY (id);


--
-- Name: pghero_space_stats pghero_space_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.pghero_space_stats
    ADD CONSTRAINT pghero_space_stats_pkey PRIMARY KEY (id);


--
-- Name: poll_votes poll_votes_pkey; Type: CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.poll_votes
    ADD CONSTRAINT poll_votes_pkey PRIMARY KEY (id);


--
-- Name: polls polls_pkey; Type: CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.polls
    ADD CONSTRAINT polls_pkey PRIMARY KEY (id);


--
-- Name: preview_card_providers preview_card_providers_pkey; Type: CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.preview_card_providers
    ADD CONSTRAINT preview_card_providers_pkey PRIMARY KEY (id);


--
-- Name: preview_cards preview_cards_pkey; Type: CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.preview_cards
    ADD CONSTRAINT preview_cards_pkey PRIMARY KEY (id);


--
-- Name: relays relays_pkey; Type: CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.relays
    ADD CONSTRAINT relays_pkey PRIMARY KEY (id);


--
-- Name: report_notes report_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.report_notes
    ADD CONSTRAINT report_notes_pkey PRIMARY KEY (id);


--
-- Name: reports reports_pkey; Type: CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_pkey PRIMARY KEY (id);


--
-- Name: rules rules_pkey; Type: CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.rules
    ADD CONSTRAINT rules_pkey PRIMARY KEY (id);


--
-- Name: scheduled_statuses scheduled_statuses_pkey; Type: CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.scheduled_statuses
    ADD CONSTRAINT scheduled_statuses_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: session_activations session_activations_pkey; Type: CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.session_activations
    ADD CONSTRAINT session_activations_pkey PRIMARY KEY (id);


--
-- Name: settings settings_pkey; Type: CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (id);


--
-- Name: site_uploads site_uploads_pkey; Type: CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.site_uploads
    ADD CONSTRAINT site_uploads_pkey PRIMARY KEY (id);


--
-- Name: status_edits status_edits_pkey; Type: CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.status_edits
    ADD CONSTRAINT status_edits_pkey PRIMARY KEY (id);


--
-- Name: status_pins status_pins_pkey; Type: CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.status_pins
    ADD CONSTRAINT status_pins_pkey PRIMARY KEY (id);


--
-- Name: status_stats status_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.status_stats
    ADD CONSTRAINT status_stats_pkey PRIMARY KEY (id);


--
-- Name: statuses statuses_pkey; Type: CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.statuses
    ADD CONSTRAINT statuses_pkey PRIMARY KEY (id);


--
-- Name: system_keys system_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.system_keys
    ADD CONSTRAINT system_keys_pkey PRIMARY KEY (id);


--
-- Name: tags tags_pkey; Type: CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_pkey PRIMARY KEY (id);


--
-- Name: tombstones tombstones_pkey; Type: CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.tombstones
    ADD CONSTRAINT tombstones_pkey PRIMARY KEY (id);


--
-- Name: unavailable_domains unavailable_domains_pkey; Type: CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.unavailable_domains
    ADD CONSTRAINT unavailable_domains_pkey PRIMARY KEY (id);


--
-- Name: user_invite_requests user_invite_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.user_invite_requests
    ADD CONSTRAINT user_invite_requests_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: web_push_subscriptions web_push_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.web_push_subscriptions
    ADD CONSTRAINT web_push_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: web_settings web_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.web_settings
    ADD CONSTRAINT web_settings_pkey PRIMARY KEY (id);


--
-- Name: webauthn_credentials webauthn_credentials_pkey; Type: CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.webauthn_credentials
    ADD CONSTRAINT webauthn_credentials_pkey PRIMARY KEY (id);


--
-- Name: index_account_aliases_on_account_id; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE INDEX index_account_aliases_on_account_id ON public.account_aliases USING btree (account_id);


--
-- Name: index_account_conversations_on_conversation_id; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE INDEX index_account_conversations_on_conversation_id ON public.account_conversations USING btree (conversation_id);


--
-- Name: index_account_deletion_requests_on_account_id; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE INDEX index_account_deletion_requests_on_account_id ON public.account_deletion_requests USING btree (account_id);


--
-- Name: index_account_domain_blocks_on_account_id_and_domain; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE UNIQUE INDEX index_account_domain_blocks_on_account_id_and_domain ON public.account_domain_blocks USING btree (account_id, domain);


--
-- Name: index_account_migrations_on_account_id; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE INDEX index_account_migrations_on_account_id ON public.account_migrations USING btree (account_id);


--
-- Name: index_account_migrations_on_target_account_id; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE INDEX index_account_migrations_on_target_account_id ON public.account_migrations USING btree (target_account_id) WHERE (target_account_id IS NOT NULL);


--
-- Name: index_account_moderation_notes_on_account_id; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE INDEX index_account_moderation_notes_on_account_id ON public.account_moderation_notes USING btree (account_id);


--
-- Name: index_account_moderation_notes_on_target_account_id; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE INDEX index_account_moderation_notes_on_target_account_id ON public.account_moderation_notes USING btree (target_account_id);


--
-- Name: index_account_notes_on_account_id_and_target_account_id; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE UNIQUE INDEX index_account_notes_on_account_id_and_target_account_id ON public.account_notes USING btree (account_id, target_account_id);


--
-- Name: index_account_notes_on_target_account_id; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE INDEX index_account_notes_on_target_account_id ON public.account_notes USING btree (target_account_id);


--
-- Name: index_account_pins_on_account_id_and_target_account_id; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE UNIQUE INDEX index_account_pins_on_account_id_and_target_account_id ON public.account_pins USING btree (account_id, target_account_id);


--
-- Name: index_account_pins_on_target_account_id; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE INDEX index_account_pins_on_target_account_id ON public.account_pins USING btree (target_account_id);


--
-- Name: index_account_stats_on_account_id; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE UNIQUE INDEX index_account_stats_on_account_id ON public.account_stats USING btree (account_id);


--
-- Name: index_account_statuses_cleanup_policies_on_account_id; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE INDEX index_account_statuses_cleanup_policies_on_account_id ON public.account_statuses_cleanup_policies USING btree (account_id);


--
-- Name: index_account_summaries_on_account_id; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE UNIQUE INDEX index_account_summaries_on_account_id ON public.account_summaries USING btree (account_id);


--
-- Name: index_account_warnings_on_account_id; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE INDEX index_account_warnings_on_account_id ON public.account_warnings USING btree (account_id);


--
-- Name: index_account_warnings_on_target_account_id; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE INDEX index_account_warnings_on_target_account_id ON public.account_warnings USING btree (target_account_id);


--
-- Name: index_accounts_on_moved_to_account_id; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE INDEX index_accounts_on_moved_to_account_id ON public.accounts USING btree (moved_to_account_id) WHERE (moved_to_account_id IS NOT NULL);


--
-- Name: index_accounts_on_uri; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE INDEX index_accounts_on_uri ON public.accounts USING btree (uri);


--
-- Name: index_accounts_on_url; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE INDEX index_accounts_on_url ON public.accounts USING btree (url text_pattern_ops) WHERE (url IS NOT NULL);


--
-- Name: index_accounts_on_username_and_domain_lower; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE UNIQUE INDEX index_accounts_on_username_and_domain_lower ON public.accounts USING btree (lower((username)::text), COALESCE(lower((domain)::text), ''::text));


--
-- Name: index_accounts_tags_on_account_id_and_tag_id; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE INDEX index_accounts_tags_on_account_id_and_tag_id ON public.accounts_tags USING btree (account_id, tag_id);


--
-- Name: index_accounts_tags_on_tag_id_and_account_id; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE UNIQUE INDEX index_accounts_tags_on_tag_id_and_account_id ON public.accounts_tags USING btree (tag_id, account_id);


--
-- Name: index_admin_action_logs_on_account_id; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE INDEX index_admin_action_logs_on_account_id ON public.admin_action_logs USING btree (account_id);


--
-- Name: index_admin_action_logs_on_target_type_and_target_id; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE INDEX index_admin_action_logs_on_target_type_and_target_id ON public.admin_action_logs USING btree (target_type, target_id);


--
-- Name: index_announcement_mutes_on_account_id_and_announcement_id; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE UNIQUE INDEX index_announcement_mutes_on_account_id_and_announcement_id ON public.announcement_mutes USING btree (account_id, announcement_id);


--
-- Name: index_announcement_mutes_on_announcement_id; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE INDEX index_announcement_mutes_on_announcement_id ON public.announcement_mutes USING btree (announcement_id);


--
-- Name: index_announcement_reactions_on_account_id_and_announcement_id; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE UNIQUE INDEX index_announcement_reactions_on_account_id_and_announcement_id ON public.announcement_reactions USING btree (account_id, announcement_id, name);


--
-- Name: index_announcement_reactions_on_announcement_id; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE INDEX index_announcement_reactions_on_announcement_id ON public.announcement_reactions USING btree (announcement_id);


--
-- Name: index_announcement_reactions_on_custom_emoji_id; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE INDEX index_announcement_reactions_on_custom_emoji_id ON public.announcement_reactions USING btree (custom_emoji_id) WHERE (custom_emoji_id IS NOT NULL);


--
-- Name: index_appeals_on_account_id; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE INDEX index_appeals_on_account_id ON public.appeals USING btree (account_id);


--
-- Name: index_appeals_on_account_warning_id; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE UNIQUE INDEX index_appeals_on_account_warning_id ON public.appeals USING btree (account_warning_id);


--
-- Name: index_appeals_on_approved_by_account_id; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE INDEX index_appeals_on_approved_by_account_id ON public.appeals USING btree (approved_by_account_id) WHERE (approved_by_account_id IS NOT NULL);


--
-- Name: index_appeals_on_rejected_by_account_id; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE INDEX index_appeals_on_rejected_by_account_id ON public.appeals USING btree (rejected_by_account_id) WHERE (rejected_by_account_id IS NOT NULL);


--
-- Name: index_blocks_on_account_id_and_target_account_id; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE UNIQUE INDEX index_blocks_on_account_id_and_target_account_id ON public.blocks USING btree (account_id, target_account_id);


--
-- Name: index_blocks_on_target_account_id; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE INDEX index_blocks_on_target_account_id ON public.blocks USING btree (target_account_id);


--
-- Name: index_bookmarks_on_account_id_and_status_id; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE UNIQUE INDEX index_bookmarks_on_account_id_and_status_id ON public.bookmarks USING btree (account_id, status_id);


--
-- Name: index_bookmarks_on_status_id; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE INDEX index_bookmarks_on_status_id ON public.bookmarks USING btree (status_id);


--
-- Name: index_canonical_email_blocks_on_canonical_email_hash; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE UNIQUE INDEX index_canonical_email_blocks_on_canonical_email_hash ON public.canonical_email_blocks USING btree (canonical_email_hash);


--
-- Name: index_canonical_email_blocks_on_reference_account_id; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE INDEX index_canonical_email_blocks_on_reference_account_id ON public.canonical_email_blocks USING btree (reference_account_id);


--
-- Name: index_conversation_mutes_on_account_id_and_conversation_id; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE UNIQUE INDEX index_conversation_mutes_on_account_id_and_conversation_id ON public.conversation_mutes USING btree (account_id, conversation_id);


--
-- Name: index_conversations_on_uri; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE UNIQUE INDEX index_conversations_on_uri ON public.conversations USING btree (uri text_pattern_ops) WHERE (uri IS NOT NULL);


--
-- Name: index_custom_emoji_categories_on_name; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE UNIQUE INDEX index_custom_emoji_categories_on_name ON public.custom_emoji_categories USING btree (name);


--
-- Name: index_custom_emojis_on_shortcode_and_domain; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE UNIQUE INDEX index_custom_emojis_on_shortcode_and_domain ON public.custom_emojis USING btree (shortcode, domain);


--
-- Name: index_custom_filters_on_account_id; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE INDEX index_custom_filters_on_account_id ON public.custom_filters USING btree (account_id);


--
-- Name: index_devices_on_access_token_id; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE INDEX index_devices_on_access_token_id ON public.devices USING btree (access_token_id);


--
-- Name: index_devices_on_account_id; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE INDEX index_devices_on_account_id ON public.devices USING btree (account_id);


--
-- Name: index_domain_allows_on_domain; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE UNIQUE INDEX index_domain_allows_on_domain ON public.domain_allows USING btree (domain);


--
-- Name: index_domain_blocks_on_domain; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE UNIQUE INDEX index_domain_blocks_on_domain ON public.domain_blocks USING btree (domain);


--
-- Name: index_email_domain_blocks_on_domain; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE UNIQUE INDEX index_email_domain_blocks_on_domain ON public.email_domain_blocks USING btree (domain);


--
-- Name: index_encrypted_messages_on_device_id; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE INDEX index_encrypted_messages_on_device_id ON public.encrypted_messages USING btree (device_id);


--
-- Name: index_encrypted_messages_on_from_account_id; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE INDEX index_encrypted_messages_on_from_account_id ON public.encrypted_messages USING btree (from_account_id);


--
-- Name: index_favourites_on_account_id_and_id; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE INDEX index_favourites_on_account_id_and_id ON public.favourites USING btree (account_id, id);


--
-- Name: index_favourites_on_account_id_and_status_id; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE UNIQUE INDEX index_favourites_on_account_id_and_status_id ON public.favourites USING btree (account_id, status_id);


--
-- Name: index_favourites_on_status_id; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE INDEX index_favourites_on_status_id ON public.favourites USING btree (status_id);


--
-- Name: index_featured_tags_on_account_id; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE INDEX index_featured_tags_on_account_id ON public.featured_tags USING btree (account_id);


--
-- Name: index_featured_tags_on_tag_id; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE INDEX index_featured_tags_on_tag_id ON public.featured_tags USING btree (tag_id);


--
-- Name: index_follow_recommendation_suppressions_on_account_id; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE UNIQUE INDEX index_follow_recommendation_suppressions_on_account_id ON public.follow_recommendation_suppressions USING btree (account_id);


--
-- Name: index_follow_recommendations_on_account_id; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE UNIQUE INDEX index_follow_recommendations_on_account_id ON public.follow_recommendations USING btree (account_id);


--
-- Name: index_follow_requests_on_account_id_and_target_account_id; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE UNIQUE INDEX index_follow_requests_on_account_id_and_target_account_id ON public.follow_requests USING btree (account_id, target_account_id);


--
-- Name: index_follows_on_account_id_and_target_account_id; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE UNIQUE INDEX index_follows_on_account_id_and_target_account_id ON public.follows USING btree (account_id, target_account_id);


--
-- Name: index_follows_on_target_account_id; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE INDEX index_follows_on_target_account_id ON public.follows USING btree (target_account_id);


--
-- Name: index_identities_on_user_id; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE INDEX index_identities_on_user_id ON public.identities USING btree (user_id);


--
-- Name: index_instances_on_domain; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE UNIQUE INDEX index_instances_on_domain ON public.instances USING btree (domain);


--
-- Name: index_invites_on_code; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE UNIQUE INDEX index_invites_on_code ON public.invites USING btree (code);


--
-- Name: index_invites_on_user_id; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE INDEX index_invites_on_user_id ON public.invites USING btree (user_id);


--
-- Name: index_list_accounts_on_account_id_and_list_id; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE UNIQUE INDEX index_list_accounts_on_account_id_and_list_id ON public.list_accounts USING btree (account_id, list_id);


--
-- Name: index_list_accounts_on_follow_id; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE INDEX index_list_accounts_on_follow_id ON public.list_accounts USING btree (follow_id) WHERE (follow_id IS NOT NULL);


--
-- Name: index_list_accounts_on_list_id_and_account_id; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE INDEX index_list_accounts_on_list_id_and_account_id ON public.list_accounts USING btree (list_id, account_id);


--
-- Name: index_lists_on_account_id; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE INDEX index_lists_on_account_id ON public.lists USING btree (account_id);


--
-- Name: index_login_activities_on_user_id; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE INDEX index_login_activities_on_user_id ON public.login_activities USING btree (user_id);


--
-- Name: index_markers_on_user_id_and_timeline; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE UNIQUE INDEX index_markers_on_user_id_and_timeline ON public.markers USING btree (user_id, timeline);


--
-- Name: index_media_attachments_on_account_id_and_status_id; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE INDEX index_media_attachments_on_account_id_and_status_id ON public.media_attachments USING btree (account_id, status_id DESC);


--
-- Name: index_media_attachments_on_scheduled_status_id; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE INDEX index_media_attachments_on_scheduled_status_id ON public.media_attachments USING btree (scheduled_status_id) WHERE (scheduled_status_id IS NOT NULL);


--
-- Name: index_media_attachments_on_shortcode; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE UNIQUE INDEX index_media_attachments_on_shortcode ON public.media_attachments USING btree (shortcode text_pattern_ops) WHERE (shortcode IS NOT NULL);


--
-- Name: index_media_attachments_on_status_id; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE INDEX index_media_attachments_on_status_id ON public.media_attachments USING btree (status_id);


--
-- Name: index_mentions_on_account_id_and_status_id; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE UNIQUE INDEX index_mentions_on_account_id_and_status_id ON public.mentions USING btree (account_id, status_id);


--
-- Name: index_mentions_on_status_id; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE INDEX index_mentions_on_status_id ON public.mentions USING btree (status_id);


--
-- Name: index_mutes_on_account_id_and_target_account_id; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE UNIQUE INDEX index_mutes_on_account_id_and_target_account_id ON public.mutes USING btree (account_id, target_account_id);


--
-- Name: index_mutes_on_target_account_id; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE INDEX index_mutes_on_target_account_id ON public.mutes USING btree (target_account_id);


--
-- Name: index_notifications_on_account_id_and_id_and_type; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE INDEX index_notifications_on_account_id_and_id_and_type ON public.notifications USING btree (account_id, id DESC, type);


--
-- Name: index_notifications_on_activity_id_and_activity_type; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE INDEX index_notifications_on_activity_id_and_activity_type ON public.notifications USING btree (activity_id, activity_type);


--
-- Name: index_notifications_on_from_account_id; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE INDEX index_notifications_on_from_account_id ON public.notifications USING btree (from_account_id);


--
-- Name: index_oauth_access_grants_on_resource_owner_id; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE INDEX index_oauth_access_grants_on_resource_owner_id ON public.oauth_access_grants USING btree (resource_owner_id);


--
-- Name: index_oauth_access_grants_on_token; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE UNIQUE INDEX index_oauth_access_grants_on_token ON public.oauth_access_grants USING btree (token);


--
-- Name: index_oauth_access_tokens_on_refresh_token; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE UNIQUE INDEX index_oauth_access_tokens_on_refresh_token ON public.oauth_access_tokens USING btree (refresh_token text_pattern_ops) WHERE (refresh_token IS NOT NULL);


--
-- Name: index_oauth_access_tokens_on_resource_owner_id; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE INDEX index_oauth_access_tokens_on_resource_owner_id ON public.oauth_access_tokens USING btree (resource_owner_id) WHERE (resource_owner_id IS NOT NULL);


--
-- Name: index_oauth_access_tokens_on_token; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE UNIQUE INDEX index_oauth_access_tokens_on_token ON public.oauth_access_tokens USING btree (token);


--
-- Name: index_oauth_applications_on_owner_id_and_owner_type; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE INDEX index_oauth_applications_on_owner_id_and_owner_type ON public.oauth_applications USING btree (owner_id, owner_type);


--
-- Name: index_oauth_applications_on_uid; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE UNIQUE INDEX index_oauth_applications_on_uid ON public.oauth_applications USING btree (uid);


--
-- Name: index_one_time_keys_on_device_id; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE INDEX index_one_time_keys_on_device_id ON public.one_time_keys USING btree (device_id);


--
-- Name: index_one_time_keys_on_key_id; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE INDEX index_one_time_keys_on_key_id ON public.one_time_keys USING btree (key_id);


--
-- Name: index_pghero_space_stats_on_database_and_captured_at; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE INDEX index_pghero_space_stats_on_database_and_captured_at ON public.pghero_space_stats USING btree (database, captured_at);


--
-- Name: index_poll_votes_on_account_id; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE INDEX index_poll_votes_on_account_id ON public.poll_votes USING btree (account_id);


--
-- Name: index_poll_votes_on_poll_id; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE INDEX index_poll_votes_on_poll_id ON public.poll_votes USING btree (poll_id);


--
-- Name: index_polls_on_account_id; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE INDEX index_polls_on_account_id ON public.polls USING btree (account_id);


--
-- Name: index_polls_on_status_id; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE INDEX index_polls_on_status_id ON public.polls USING btree (status_id);


--
-- Name: index_preview_card_providers_on_domain; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE UNIQUE INDEX index_preview_card_providers_on_domain ON public.preview_card_providers USING btree (domain);


--
-- Name: index_preview_cards_on_url; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE UNIQUE INDEX index_preview_cards_on_url ON public.preview_cards USING btree (url);


--
-- Name: index_preview_cards_statuses_on_status_id_and_preview_card_id; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE INDEX index_preview_cards_statuses_on_status_id_and_preview_card_id ON public.preview_cards_statuses USING btree (status_id, preview_card_id);


--
-- Name: index_report_notes_on_account_id; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE INDEX index_report_notes_on_account_id ON public.report_notes USING btree (account_id);


--
-- Name: index_report_notes_on_report_id; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE INDEX index_report_notes_on_report_id ON public.report_notes USING btree (report_id);


--
-- Name: index_reports_on_account_id; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE INDEX index_reports_on_account_id ON public.reports USING btree (account_id);


--
-- Name: index_reports_on_target_account_id; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE INDEX index_reports_on_target_account_id ON public.reports USING btree (target_account_id);


--
-- Name: index_scheduled_statuses_on_account_id; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE INDEX index_scheduled_statuses_on_account_id ON public.scheduled_statuses USING btree (account_id);


--
-- Name: index_scheduled_statuses_on_scheduled_at; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE INDEX index_scheduled_statuses_on_scheduled_at ON public.scheduled_statuses USING btree (scheduled_at);


--
-- Name: index_session_activations_on_access_token_id; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE INDEX index_session_activations_on_access_token_id ON public.session_activations USING btree (access_token_id);


--
-- Name: index_session_activations_on_session_id; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE UNIQUE INDEX index_session_activations_on_session_id ON public.session_activations USING btree (session_id);


--
-- Name: index_session_activations_on_user_id; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE INDEX index_session_activations_on_user_id ON public.session_activations USING btree (user_id);


--
-- Name: index_settings_on_thing_type_and_thing_id_and_var; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE UNIQUE INDEX index_settings_on_thing_type_and_thing_id_and_var ON public.settings USING btree (thing_type, thing_id, var);


--
-- Name: index_site_uploads_on_var; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE UNIQUE INDEX index_site_uploads_on_var ON public.site_uploads USING btree (var);


--
-- Name: index_status_edits_on_account_id; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE INDEX index_status_edits_on_account_id ON public.status_edits USING btree (account_id);


--
-- Name: index_status_edits_on_status_id; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE INDEX index_status_edits_on_status_id ON public.status_edits USING btree (status_id);


--
-- Name: index_status_pins_on_account_id_and_status_id; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE UNIQUE INDEX index_status_pins_on_account_id_and_status_id ON public.status_pins USING btree (account_id, status_id);


--
-- Name: index_status_stats_on_status_id; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE UNIQUE INDEX index_status_stats_on_status_id ON public.status_stats USING btree (status_id);


--
-- Name: index_statuses_20190820; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE INDEX index_statuses_20190820 ON public.statuses USING btree (account_id, id DESC, visibility, updated_at) WHERE (deleted_at IS NULL);


--
-- Name: index_statuses_local_20190824; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE INDEX index_statuses_local_20190824 ON public.statuses USING btree (id DESC, account_id) WHERE ((local OR (uri IS NULL)) AND (deleted_at IS NULL) AND (visibility = 0) AND (reblog_of_id IS NULL) AND ((NOT reply) OR (in_reply_to_account_id = account_id)));


--
-- Name: index_statuses_on_deleted_at; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE INDEX index_statuses_on_deleted_at ON public.statuses USING btree (deleted_at) WHERE (deleted_at IS NOT NULL);


--
-- Name: index_statuses_on_in_reply_to_account_id; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE INDEX index_statuses_on_in_reply_to_account_id ON public.statuses USING btree (in_reply_to_account_id) WHERE (in_reply_to_account_id IS NOT NULL);


--
-- Name: index_statuses_on_in_reply_to_id; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE INDEX index_statuses_on_in_reply_to_id ON public.statuses USING btree (in_reply_to_id) WHERE (in_reply_to_id IS NOT NULL);


--
-- Name: index_statuses_on_reblog_of_id_and_account_id; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE INDEX index_statuses_on_reblog_of_id_and_account_id ON public.statuses USING btree (reblog_of_id, account_id);


--
-- Name: index_statuses_on_uri; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE UNIQUE INDEX index_statuses_on_uri ON public.statuses USING btree (uri text_pattern_ops) WHERE (uri IS NOT NULL);


--
-- Name: index_statuses_public_20200119; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE INDEX index_statuses_public_20200119 ON public.statuses USING btree (id DESC, account_id) WHERE ((deleted_at IS NULL) AND (visibility = 0) AND (reblog_of_id IS NULL) AND ((NOT reply) OR (in_reply_to_account_id = account_id)));


--
-- Name: index_statuses_tags_on_status_id; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE INDEX index_statuses_tags_on_status_id ON public.statuses_tags USING btree (status_id);


--
-- Name: index_statuses_tags_on_tag_id_and_status_id; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE UNIQUE INDEX index_statuses_tags_on_tag_id_and_status_id ON public.statuses_tags USING btree (tag_id, status_id);


--
-- Name: index_tags_on_name_lower_btree; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE UNIQUE INDEX index_tags_on_name_lower_btree ON public.tags USING btree (lower((name)::text) text_pattern_ops);


--
-- Name: index_tombstones_on_account_id; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE INDEX index_tombstones_on_account_id ON public.tombstones USING btree (account_id);


--
-- Name: index_tombstones_on_uri; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE INDEX index_tombstones_on_uri ON public.tombstones USING btree (uri);


--
-- Name: index_unavailable_domains_on_domain; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE UNIQUE INDEX index_unavailable_domains_on_domain ON public.unavailable_domains USING btree (domain);


--
-- Name: index_unique_conversations; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE UNIQUE INDEX index_unique_conversations ON public.account_conversations USING btree (account_id, conversation_id, participant_account_ids);


--
-- Name: index_user_invite_requests_on_user_id; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE INDEX index_user_invite_requests_on_user_id ON public.user_invite_requests USING btree (user_id);


--
-- Name: index_users_on_account_id; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE INDEX index_users_on_account_id ON public.users USING btree (account_id);


--
-- Name: index_users_on_confirmation_token; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE UNIQUE INDEX index_users_on_confirmation_token ON public.users USING btree (confirmation_token);


--
-- Name: index_users_on_created_by_application_id; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE INDEX index_users_on_created_by_application_id ON public.users USING btree (created_by_application_id) WHERE (created_by_application_id IS NOT NULL);


--
-- Name: index_users_on_email; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE UNIQUE INDEX index_users_on_email ON public.users USING btree (email);


--
-- Name: index_users_on_reset_password_token; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE UNIQUE INDEX index_users_on_reset_password_token ON public.users USING btree (reset_password_token text_pattern_ops) WHERE (reset_password_token IS NOT NULL);


--
-- Name: index_web_push_subscriptions_on_access_token_id; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE INDEX index_web_push_subscriptions_on_access_token_id ON public.web_push_subscriptions USING btree (access_token_id) WHERE (access_token_id IS NOT NULL);


--
-- Name: index_web_push_subscriptions_on_user_id; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE INDEX index_web_push_subscriptions_on_user_id ON public.web_push_subscriptions USING btree (user_id);


--
-- Name: index_web_settings_on_user_id; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE UNIQUE INDEX index_web_settings_on_user_id ON public.web_settings USING btree (user_id);


--
-- Name: index_webauthn_credentials_on_external_id; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE UNIQUE INDEX index_webauthn_credentials_on_external_id ON public.webauthn_credentials USING btree (external_id);


--
-- Name: index_webauthn_credentials_on_user_id; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE INDEX index_webauthn_credentials_on_user_id ON public.webauthn_credentials USING btree (user_id);


--
-- Name: search_index; Type: INDEX; Schema: public; Owner: nchiang
--

CREATE INDEX search_index ON public.accounts USING gin ((((setweight(to_tsvector('simple'::regconfig, (display_name)::text), 'A'::"char") || setweight(to_tsvector('simple'::regconfig, (username)::text), 'B'::"char")) || setweight(to_tsvector('simple'::regconfig, (COALESCE(domain, ''::character varying))::text), 'C'::"char"))));


--
-- Name: web_settings fk_11910667b2; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.web_settings
    ADD CONSTRAINT fk_11910667b2 FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: account_domain_blocks fk_206c6029bd; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.account_domain_blocks
    ADD CONSTRAINT fk_206c6029bd FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: conversation_mutes fk_225b4212bb; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.conversation_mutes
    ADD CONSTRAINT fk_225b4212bb FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: statuses_tags fk_3081861e21; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.statuses_tags
    ADD CONSTRAINT fk_3081861e21 FOREIGN KEY (tag_id) REFERENCES public.tags(id) ON DELETE CASCADE;


--
-- Name: follows fk_32ed1b5560; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.follows
    ADD CONSTRAINT fk_32ed1b5560 FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: oauth_access_grants fk_34d54b0a33; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.oauth_access_grants
    ADD CONSTRAINT fk_34d54b0a33 FOREIGN KEY (application_id) REFERENCES public.oauth_applications(id) ON DELETE CASCADE;


--
-- Name: blocks fk_4269e03e65; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.blocks
    ADD CONSTRAINT fk_4269e03e65 FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: reports fk_4b81f7522c; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT fk_4b81f7522c FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: users fk_50500f500d; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT fk_50500f500d FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: favourites fk_5eb6c2b873; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.favourites
    ADD CONSTRAINT fk_5eb6c2b873 FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: oauth_access_grants fk_63b044929b; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.oauth_access_grants
    ADD CONSTRAINT fk_63b044929b FOREIGN KEY (resource_owner_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: imports fk_6db1b6e408; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.imports
    ADD CONSTRAINT fk_6db1b6e408 FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: follows fk_745ca29eac; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.follows
    ADD CONSTRAINT fk_745ca29eac FOREIGN KEY (target_account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: follow_requests fk_76d644b0e7; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.follow_requests
    ADD CONSTRAINT fk_76d644b0e7 FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: follow_requests fk_9291ec025d; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.follow_requests
    ADD CONSTRAINT fk_9291ec025d FOREIGN KEY (target_account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: blocks fk_9571bfabc1; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.blocks
    ADD CONSTRAINT fk_9571bfabc1 FOREIGN KEY (target_account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: session_activations fk_957e5bda89; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.session_activations
    ADD CONSTRAINT fk_957e5bda89 FOREIGN KEY (access_token_id) REFERENCES public.oauth_access_tokens(id) ON DELETE CASCADE;


--
-- Name: media_attachments fk_96dd81e81b; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.media_attachments
    ADD CONSTRAINT fk_96dd81e81b FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE SET NULL;


--
-- Name: mentions fk_970d43f9d1; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.mentions
    ADD CONSTRAINT fk_970d43f9d1 FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: statuses fk_9bda1543f7; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.statuses
    ADD CONSTRAINT fk_9bda1543f7 FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: oauth_applications fk_b0988c7c0a; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.oauth_applications
    ADD CONSTRAINT fk_b0988c7c0a FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: favourites fk_b0e856845e; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.favourites
    ADD CONSTRAINT fk_b0e856845e FOREIGN KEY (status_id) REFERENCES public.statuses(id) ON DELETE CASCADE;


--
-- Name: mutes fk_b8d8daf315; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.mutes
    ADD CONSTRAINT fk_b8d8daf315 FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: reports fk_bca45b75fd; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT fk_bca45b75fd FOREIGN KEY (action_taken_by_account_id) REFERENCES public.accounts(id) ON DELETE SET NULL;


--
-- Name: identities fk_bea040f377; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.identities
    ADD CONSTRAINT fk_bea040f377 FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: notifications fk_c141c8ee55; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT fk_c141c8ee55 FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: statuses fk_c7fa917661; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.statuses
    ADD CONSTRAINT fk_c7fa917661 FOREIGN KEY (in_reply_to_account_id) REFERENCES public.accounts(id) ON DELETE SET NULL;


--
-- Name: status_pins fk_d4cb435b62; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.status_pins
    ADD CONSTRAINT fk_d4cb435b62 FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: session_activations fk_e5fda67334; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.session_activations
    ADD CONSTRAINT fk_e5fda67334 FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: oauth_access_tokens fk_e84df68546; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.oauth_access_tokens
    ADD CONSTRAINT fk_e84df68546 FOREIGN KEY (resource_owner_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: reports fk_eb37af34f0; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT fk_eb37af34f0 FOREIGN KEY (target_account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: mutes fk_eecff219ea; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.mutes
    ADD CONSTRAINT fk_eecff219ea FOREIGN KEY (target_account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: oauth_access_tokens fk_f5fc4c1ee3; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.oauth_access_tokens
    ADD CONSTRAINT fk_f5fc4c1ee3 FOREIGN KEY (application_id) REFERENCES public.oauth_applications(id) ON DELETE CASCADE;


--
-- Name: notifications fk_fbd6b0bf9e; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT fk_fbd6b0bf9e FOREIGN KEY (from_account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: backups fk_rails_096669d221; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.backups
    ADD CONSTRAINT fk_rails_096669d221 FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: bookmarks fk_rails_11207ffcfd; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.bookmarks
    ADD CONSTRAINT fk_rails_11207ffcfd FOREIGN KEY (status_id) REFERENCES public.statuses(id) ON DELETE CASCADE;


--
-- Name: account_conversations fk_rails_1491654f9f; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.account_conversations
    ADD CONSTRAINT fk_rails_1491654f9f FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;


--
-- Name: featured_tags fk_rails_174efcf15f; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.featured_tags
    ADD CONSTRAINT fk_rails_174efcf15f FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: canonical_email_blocks fk_rails_1ecb262096; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.canonical_email_blocks
    ADD CONSTRAINT fk_rails_1ecb262096 FOREIGN KEY (reference_account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: account_stats fk_rails_215bb31ff1; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.account_stats
    ADD CONSTRAINT fk_rails_215bb31ff1 FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: accounts fk_rails_2320833084; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT fk_rails_2320833084 FOREIGN KEY (moved_to_account_id) REFERENCES public.accounts(id) ON DELETE SET NULL;


--
-- Name: featured_tags fk_rails_23a9055c7c; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.featured_tags
    ADD CONSTRAINT fk_rails_23a9055c7c FOREIGN KEY (tag_id) REFERENCES public.tags(id) ON DELETE CASCADE;


--
-- Name: scheduled_statuses fk_rails_23bd9018f9; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.scheduled_statuses
    ADD CONSTRAINT fk_rails_23bd9018f9 FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: account_statuses_cleanup_policies fk_rails_23d5f73cfe; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.account_statuses_cleanup_policies
    ADD CONSTRAINT fk_rails_23d5f73cfe FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: statuses fk_rails_256483a9ab; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.statuses
    ADD CONSTRAINT fk_rails_256483a9ab FOREIGN KEY (reblog_of_id) REFERENCES public.statuses(id) ON DELETE CASCADE;


--
-- Name: account_notes fk_rails_2801b48f1a; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.account_notes
    ADD CONSTRAINT fk_rails_2801b48f1a FOREIGN KEY (target_account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: media_attachments fk_rails_31fc5aeef1; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.media_attachments
    ADD CONSTRAINT fk_rails_31fc5aeef1 FOREIGN KEY (scheduled_status_id) REFERENCES public.scheduled_statuses(id) ON DELETE SET NULL;


--
-- Name: user_invite_requests fk_rails_3773f15361; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.user_invite_requests
    ADD CONSTRAINT fk_rails_3773f15361 FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: lists fk_rails_3853b78dac; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.lists
    ADD CONSTRAINT fk_rails_3853b78dac FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: devices fk_rails_393f74df68; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.devices
    ADD CONSTRAINT fk_rails_393f74df68 FOREIGN KEY (access_token_id) REFERENCES public.oauth_access_tokens(id) ON DELETE CASCADE;


--
-- Name: polls fk_rails_3e0d9f1115; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.polls
    ADD CONSTRAINT fk_rails_3e0d9f1115 FOREIGN KEY (status_id) REFERENCES public.statuses(id) ON DELETE CASCADE;


--
-- Name: media_attachments fk_rails_3ec0cfdd70; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.media_attachments
    ADD CONSTRAINT fk_rails_3ec0cfdd70 FOREIGN KEY (status_id) REFERENCES public.statuses(id) ON DELETE SET NULL;


--
-- Name: account_moderation_notes fk_rails_3f8b75089b; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.account_moderation_notes
    ADD CONSTRAINT fk_rails_3f8b75089b FOREIGN KEY (account_id) REFERENCES public.accounts(id);


--
-- Name: email_domain_blocks fk_rails_408efe0a15; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.email_domain_blocks
    ADD CONSTRAINT fk_rails_408efe0a15 FOREIGN KEY (parent_id) REFERENCES public.email_domain_blocks(id) ON DELETE CASCADE;


--
-- Name: list_accounts fk_rails_40f9cc29f1; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.list_accounts
    ADD CONSTRAINT fk_rails_40f9cc29f1 FOREIGN KEY (follow_id) REFERENCES public.follows(id) ON DELETE CASCADE;


--
-- Name: account_deletion_requests fk_rails_45bf2626b9; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.account_deletion_requests
    ADD CONSTRAINT fk_rails_45bf2626b9 FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: status_stats fk_rails_4a247aac42; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.status_stats
    ADD CONSTRAINT fk_rails_4a247aac42 FOREIGN KEY (status_id) REFERENCES public.statuses(id) ON DELETE CASCADE;


--
-- Name: reports fk_rails_4e7a498fb4; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT fk_rails_4e7a498fb4 FOREIGN KEY (assigned_account_id) REFERENCES public.accounts(id) ON DELETE SET NULL;


--
-- Name: account_notes fk_rails_4ee4503c69; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.account_notes
    ADD CONSTRAINT fk_rails_4ee4503c69 FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: appeals fk_rails_501c3a6e13; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.appeals
    ADD CONSTRAINT fk_rails_501c3a6e13 FOREIGN KEY (rejected_by_account_id) REFERENCES public.accounts(id) ON DELETE SET NULL;


--
-- Name: mentions fk_rails_59edbe2887; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.mentions
    ADD CONSTRAINT fk_rails_59edbe2887 FOREIGN KEY (status_id) REFERENCES public.statuses(id) ON DELETE CASCADE;


--
-- Name: conversation_mutes fk_rails_5ab139311f; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.conversation_mutes
    ADD CONSTRAINT fk_rails_5ab139311f FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;


--
-- Name: polls fk_rails_5b19a0c011; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.polls
    ADD CONSTRAINT fk_rails_5b19a0c011 FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: status_pins fk_rails_65c05552f1; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.status_pins
    ADD CONSTRAINT fk_rails_65c05552f1 FOREIGN KEY (status_id) REFERENCES public.statuses(id) ON DELETE CASCADE;


--
-- Name: account_conversations fk_rails_6f5278b6e9; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.account_conversations
    ADD CONSTRAINT fk_rails_6f5278b6e9 FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: announcement_reactions fk_rails_7444ad831f; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.announcement_reactions
    ADD CONSTRAINT fk_rails_7444ad831f FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: web_push_subscriptions fk_rails_751a9f390b; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.web_push_subscriptions
    ADD CONSTRAINT fk_rails_751a9f390b FOREIGN KEY (access_token_id) REFERENCES public.oauth_access_tokens(id) ON DELETE CASCADE;


--
-- Name: report_notes fk_rails_7fa83a61eb; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.report_notes
    ADD CONSTRAINT fk_rails_7fa83a61eb FOREIGN KEY (report_id) REFERENCES public.reports(id) ON DELETE CASCADE;


--
-- Name: list_accounts fk_rails_85fee9d6ab; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.list_accounts
    ADD CONSTRAINT fk_rails_85fee9d6ab FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: custom_filters fk_rails_8b8d786993; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.custom_filters
    ADD CONSTRAINT fk_rails_8b8d786993 FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: account_warnings fk_rails_8f2bab4b16; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.account_warnings
    ADD CONSTRAINT fk_rails_8f2bab4b16 FOREIGN KEY (report_id) REFERENCES public.reports(id) ON DELETE CASCADE;


--
-- Name: users fk_rails_8fb2a43e88; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT fk_rails_8fb2a43e88 FOREIGN KEY (invite_id) REFERENCES public.invites(id) ON DELETE SET NULL;


--
-- Name: statuses fk_rails_94a6f70399; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.statuses
    ADD CONSTRAINT fk_rails_94a6f70399 FOREIGN KEY (in_reply_to_id) REFERENCES public.statuses(id) ON DELETE SET NULL;


--
-- Name: announcement_mutes fk_rails_9c99f8e835; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.announcement_mutes
    ADD CONSTRAINT fk_rails_9c99f8e835 FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: appeals fk_rails_9deb2f63ad; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.appeals
    ADD CONSTRAINT fk_rails_9deb2f63ad FOREIGN KEY (approved_by_account_id) REFERENCES public.accounts(id) ON DELETE SET NULL;


--
-- Name: bookmarks fk_rails_9f6ac182a6; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.bookmarks
    ADD CONSTRAINT fk_rails_9f6ac182a6 FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: announcement_reactions fk_rails_a1226eaa5c; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.announcement_reactions
    ADD CONSTRAINT fk_rails_a1226eaa5c FOREIGN KEY (announcement_id) REFERENCES public.announcements(id) ON DELETE CASCADE;


--
-- Name: account_pins fk_rails_a176e26c37; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.account_pins
    ADD CONSTRAINT fk_rails_a176e26c37 FOREIGN KEY (target_account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: encrypted_messages fk_rails_a42ad0f8d5; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.encrypted_messages
    ADD CONSTRAINT fk_rails_a42ad0f8d5 FOREIGN KEY (from_account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: webauthn_credentials fk_rails_a4355aef77; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.webauthn_credentials
    ADD CONSTRAINT fk_rails_a4355aef77 FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: account_warnings fk_rails_a65a1bf71b; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.account_warnings
    ADD CONSTRAINT fk_rails_a65a1bf71b FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE SET NULL;


--
-- Name: poll_votes fk_rails_a6e6974b7e; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.poll_votes
    ADD CONSTRAINT fk_rails_a6e6974b7e FOREIGN KEY (poll_id) REFERENCES public.polls(id) ON DELETE CASCADE;


--
-- Name: markers fk_rails_a7009bc2b6; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.markers
    ADD CONSTRAINT fk_rails_a7009bc2b6 FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: admin_action_logs fk_rails_a7667297fa; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.admin_action_logs
    ADD CONSTRAINT fk_rails_a7667297fa FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: devices fk_rails_a796b75798; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.devices
    ADD CONSTRAINT fk_rails_a796b75798 FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: account_warnings fk_rails_a7ebbb1e37; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.account_warnings
    ADD CONSTRAINT fk_rails_a7ebbb1e37 FOREIGN KEY (target_account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: encrypted_messages fk_rails_a83e4df7ae; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.encrypted_messages
    ADD CONSTRAINT fk_rails_a83e4df7ae FOREIGN KEY (device_id) REFERENCES public.devices(id) ON DELETE CASCADE;


--
-- Name: status_edits fk_rails_a960f234a0; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.status_edits
    ADD CONSTRAINT fk_rails_a960f234a0 FOREIGN KEY (status_id) REFERENCES public.statuses(id) ON DELETE CASCADE;


--
-- Name: appeals fk_rails_a99f14546e; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.appeals
    ADD CONSTRAINT fk_rails_a99f14546e FOREIGN KEY (account_warning_id) REFERENCES public.account_warnings(id) ON DELETE CASCADE;


--
-- Name: web_push_subscriptions fk_rails_b006f28dac; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.web_push_subscriptions
    ADD CONSTRAINT fk_rails_b006f28dac FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: poll_votes fk_rails_b6c18cf44a; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.poll_votes
    ADD CONSTRAINT fk_rails_b6c18cf44a FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: announcement_reactions fk_rails_b742c91c0e; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.announcement_reactions
    ADD CONSTRAINT fk_rails_b742c91c0e FOREIGN KEY (custom_emoji_id) REFERENCES public.custom_emojis(id) ON DELETE CASCADE;


--
-- Name: account_migrations fk_rails_c9f701caaf; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.account_migrations
    ADD CONSTRAINT fk_rails_c9f701caaf FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: report_notes fk_rails_cae66353f3; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.report_notes
    ADD CONSTRAINT fk_rails_cae66353f3 FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: one_time_keys fk_rails_d3edd8c878; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.one_time_keys
    ADD CONSTRAINT fk_rails_d3edd8c878 FOREIGN KEY (device_id) REFERENCES public.devices(id) ON DELETE CASCADE;


--
-- Name: account_pins fk_rails_d44979e5dd; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.account_pins
    ADD CONSTRAINT fk_rails_d44979e5dd FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: account_migrations fk_rails_d9a8dad070; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.account_migrations
    ADD CONSTRAINT fk_rails_d9a8dad070 FOREIGN KEY (target_account_id) REFERENCES public.accounts(id) ON DELETE SET NULL;


--
-- Name: status_edits fk_rails_dc8988c545; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.status_edits
    ADD CONSTRAINT fk_rails_dc8988c545 FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE SET NULL;


--
-- Name: account_moderation_notes fk_rails_dd62ed5ac3; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.account_moderation_notes
    ADD CONSTRAINT fk_rails_dd62ed5ac3 FOREIGN KEY (target_account_id) REFERENCES public.accounts(id);


--
-- Name: statuses_tags fk_rails_df0fe11427; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.statuses_tags
    ADD CONSTRAINT fk_rails_df0fe11427 FOREIGN KEY (status_id) REFERENCES public.statuses(id) ON DELETE CASCADE;


--
-- Name: follow_recommendation_suppressions fk_rails_dfb9a1dbe2; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.follow_recommendation_suppressions
    ADD CONSTRAINT fk_rails_dfb9a1dbe2 FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: announcement_mutes fk_rails_e35401adf1; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.announcement_mutes
    ADD CONSTRAINT fk_rails_e35401adf1 FOREIGN KEY (announcement_id) REFERENCES public.announcements(id) ON DELETE CASCADE;


--
-- Name: login_activities fk_rails_e4b6396b41; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.login_activities
    ADD CONSTRAINT fk_rails_e4b6396b41 FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: list_accounts fk_rails_e54e356c88; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.list_accounts
    ADD CONSTRAINT fk_rails_e54e356c88 FOREIGN KEY (list_id) REFERENCES public.lists(id) ON DELETE CASCADE;


--
-- Name: appeals fk_rails_ea84881569; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.appeals
    ADD CONSTRAINT fk_rails_ea84881569 FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: users fk_rails_ecc9536e7c; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT fk_rails_ecc9536e7c FOREIGN KEY (created_by_application_id) REFERENCES public.oauth_applications(id) ON DELETE SET NULL;


--
-- Name: tombstones fk_rails_f95b861449; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.tombstones
    ADD CONSTRAINT fk_rails_f95b861449 FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: account_aliases fk_rails_fc91575d08; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.account_aliases
    ADD CONSTRAINT fk_rails_fc91575d08 FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: invites fk_rails_ff69dbb2ac; Type: FK CONSTRAINT; Schema: public; Owner: nchiang
--

ALTER TABLE ONLY public.invites
    ADD CONSTRAINT fk_rails_ff69dbb2ac FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: account_summaries; Type: MATERIALIZED VIEW DATA; Schema: public; Owner: nchiang
--

REFRESH MATERIALIZED VIEW public.account_summaries;


--
-- Name: follow_recommendations; Type: MATERIALIZED VIEW DATA; Schema: public; Owner: nchiang
--

REFRESH MATERIALIZED VIEW public.follow_recommendations;


--
-- Name: instances; Type: MATERIALIZED VIEW DATA; Schema: public; Owner: nchiang
--

REFRESH MATERIALIZED VIEW public.instances;


--
-- PostgreSQL database dump complete
--

