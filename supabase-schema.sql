-- Sources table (the core database)
create table sources (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  url text not null,
  topic text not null,
  source_type text,
  education_level text,
  citation_count integer default 1,
  status text default 'pending', -- pending, approved, rejected
  submitted_by text,
  created_at timestamp with time zone default now()
);

-- Saved sources per user
create table saved_sources (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  source_id uuid references sources(id) on delete cascade,
  created_at timestamp with time zone default now(),
  unique(user_id, source_id)
);

-- Enable RLS
alter table sources enable row level security;
alter table saved_sources enable row level security;

-- Anyone can read approved sources
create policy "Public can read approved sources"
  on sources for select
  using (status = 'approved');

-- Authenticated users can save sources
create policy "Users can manage their saved sources"
  on saved_sources for all
  using (auth.uid() = user_id);
