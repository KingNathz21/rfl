-- Routeflow LDN Phase 1 foundation schema.
-- Intended target: PostgreSQL.

create table roles (
  id bigserial primary key,
  name text not null unique check (name in ('User', 'Admin')),
  created_at timestamptz not null default now()
);

create table users (
  id bigserial primary key,
  role_id bigint not null references roles(id),
  name text not null,
  email text not null unique,
  password_hash text not null,
  status text not null default 'active' check (status in ('active', 'suspended')),
  reset_token_hash text,
  reset_token_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table operators (
  id bigserial primary key,
  name text not null unique
);

create table garages (
  id bigserial primary key,
  operator_id bigint references operators(id),
  name text not null,
  code text,
  unique (operator_id, name)
);

create table vehicle_types (
  id bigserial primary key,
  name text not null unique,
  manufacturer text,
  deck_type text
);

create table buses (
  id bigserial primary key,
  fleet_number text not null unique,
  registration text not null unique,
  operator_id bigint references operators(id),
  garage_id bigint references garages(id),
  vehicle_type_id bigint references vehicle_types(id),
  fuel_type text not null,
  status text not null default 'active',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table bus_identifiers (
  id bigserial primary key,
  bus_id bigint not null references buses(id) on delete cascade,
  identifier_type text not null,
  identifier_value text not null,
  unique (identifier_type, identifier_value)
);

create table stops (
  id bigserial primary key,
  tfl_stop_id text unique,
  name text not null,
  latitude numeric(10, 7),
  longitude numeric(10, 7)
);

create table routes (
  id bigserial primary key,
  route_number text not null unique,
  status text not null default 'unknown',
  notes text,
  tags text[] not null default '{}',
  hidden boolean not null default false,
  featured boolean not null default false
);

create table route_stops (
  route_id bigint not null references routes(id) on delete cascade,
  stop_id bigint not null references stops(id) on delete cascade,
  stop_order integer not null,
  primary key (route_id, stop_id)
);

create table boards (
  id bigserial primary key,
  owner_user_id bigint references users(id),
  name text not null,
  is_global boolean not null default false,
  is_shared boolean not null default false,
  created_at timestamptz not null default now()
);

create table board_items (
  id bigserial primary key,
  board_id bigint not null references boards(id) on delete cascade,
  stop_id bigint not null references stops(id),
  display_name text,
  sort_order integer not null default 0
);

create table sightings (
  id bigserial primary key,
  bus_id bigint references buses(id),
  route_id bigint references routes(id),
  stop_id bigint references stops(id),
  user_id bigint references users(id),
  location_text text,
  source text not null default 'manual',
  status text not null default 'pending',
  seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table live_vehicle_state (
  id bigserial primary key,
  bus_id bigint references buses(id),
  route_id bigint references routes(id),
  stop_id bigint references stops(id),
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  bearing numeric(6, 2),
  last_seen_at timestamptz not null,
  payload jsonb not null default '{}'::jsonb
);

create table media (
  id bigserial primary key,
  bus_id bigint references buses(id) on delete cascade,
  sighting_id bigint references sightings(id) on delete set null,
  url text not null,
  caption text,
  uploaded_by_user_id bigint references users(id),
  created_at timestamptz not null default now()
);

create table events (
  id bigserial primary key,
  event_type text not null,
  actor_user_id bigint references users(id),
  subject_type text not null,
  subject_id bigint,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table settings (
  key text primary key,
  value jsonb not null,
  updated_by_user_id bigint references users(id),
  updated_at timestamptz not null default now()
);

create table audit_logs (
  id bigserial primary key,
  user_id bigint references users(id),
  action text not null,
  ip inet,
  previous_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);

create index idx_buses_fleet_number on buses (fleet_number);
create index idx_buses_registration on buses (registration);
create index idx_sightings_seen_at on sightings (seen_at desc);
create index idx_live_vehicle_state_last_seen on live_vehicle_state (last_seen_at desc);
