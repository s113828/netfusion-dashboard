-- NetFusion SEO Automation Platform
-- Supabase Database Schema

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- User Sites table (stores connected GSC properties)
create table if not exists user_sites (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  site_url text not null,
  permission_level text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, site_url)
);

-- SEO Metrics table (daily snapshots)
create table if not exists seo_metrics (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  site_url text not null,
  date date not null,
  clicks integer default 0,
  impressions integer default 0,
  ctr decimal(5,4) default 0,
  position decimal(6,2) default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, site_url, date)
);

-- Top Queries table (keyword tracking)
create table if not exists top_queries (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  site_url text not null,
  query text not null,
  clicks integer default 0,
  impressions integer default 0,
  ctr decimal(5,4) default 0,
  position decimal(6,2) default 0,
  date date not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- AI Recommendations table
create table if not exists recommendations (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  site_url text not null,
  type text not null check (type in ('actionable', 'watch', 'risk')),
  priority integer default 3 check (priority between 1 and 5),
  title text not null,
  description text,
  status text default 'pending' check (status in ('pending', 'completed', 'dismissed')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Keyword Rankings History
create table if not exists keyword_rankings (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  site_url text not null,
  keyword text not null,
  position decimal(6,2),
  previous_position decimal(6,2),
  change decimal(6,2),
  date date not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, site_url, keyword, date)
);

-- User Settings
create table if not exists user_settings (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade unique not null,
  default_site text,
  email_notifications boolean default true,
  weekly_report boolean default true,
  alert_threshold integer default 10,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Row Level Security (RLS) Policies
alter table user_sites enable row level security;
alter table seo_metrics enable row level security;
alter table top_queries enable row level security;
alter table recommendations enable row level security;
alter table keyword_rankings enable row level security;
alter table user_settings enable row level security;

-- Users can only see their own data
create policy "Users can view own sites" on user_sites
  for select using (auth.uid() = user_id);

create policy "Users can insert own sites" on user_sites
  for insert with check (auth.uid() = user_id);

create policy "Users can update own sites" on user_sites
  for update using (auth.uid() = user_id);

create policy "Users can delete own sites" on user_sites
  for delete using (auth.uid() = user_id);

-- SEO Metrics policies
create policy "Users can view own metrics" on seo_metrics
  for select using (auth.uid() = user_id);

create policy "Users can insert own metrics" on seo_metrics
  for insert with check (auth.uid() = user_id);

-- Top Queries policies
create policy "Users can view own queries" on top_queries
  for select using (auth.uid() = user_id);

create policy "Users can insert own queries" on top_queries
  for insert with check (auth.uid() = user_id);

-- Recommendations policies
create policy "Users can view own recommendations" on recommendations
  for select using (auth.uid() = user_id);

create policy "Users can insert own recommendations" on recommendations
  for insert with check (auth.uid() = user_id);

create policy "Users can update own recommendations" on recommendations
  for update using (auth.uid() = user_id);

-- Keyword Rankings policies
create policy "Users can view own rankings" on keyword_rankings
  for select using (auth.uid() = user_id);

create policy "Users can insert own rankings" on keyword_rankings
  for insert with check (auth.uid() = user_id);

-- User Settings policies
create policy "Users can view own settings" on user_settings
  for select using (auth.uid() = user_id);

create policy "Users can insert own settings" on user_settings
  for insert with check (auth.uid() = user_id);

create policy "Users can update own settings" on user_settings
  for update using (auth.uid() = user_id);

-- Indexes for better query performance
create index if not exists idx_seo_metrics_user_site_date on seo_metrics(user_id, site_url, date);
create index if not exists idx_top_queries_user_site_date on top_queries(user_id, site_url, date);
create index if not exists idx_keyword_rankings_user_site on keyword_rankings(user_id, site_url);
create index if not exists idx_recommendations_user_status on recommendations(user_id, status);

-- Function to auto-update updated_at timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- Triggers for updated_at
create trigger update_user_sites_updated_at before update on user_sites
  for each row execute function update_updated_at_column();

create trigger update_recommendations_updated_at before update on recommendations
  for each row execute function update_updated_at_column();

create trigger update_user_settings_updated_at before update on user_settings
  for each row execute function update_updated_at_column();
