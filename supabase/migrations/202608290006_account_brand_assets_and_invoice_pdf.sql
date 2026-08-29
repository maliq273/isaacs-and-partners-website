-- PR25: optional account branding/profile assets and invoice PDF branding.
-- Binary assets are stored in the repository through a privileged Edge Function;
-- only their public GitHub Pages URL is stored in Supabase.
--
-- This migration is versioned after the sales runtime (202608290004) and
-- GitHub integration Vault migration (202608290005) to avoid duplicate
-- migration versions.

alter table if exists public.profiles
    add column if not exists avatar_url text;

alter table if exists public.businesses
    add column if not exists logo_url text;

alter table if exists public.invoices
    add column if not exists document_logo_url text;

create index if not exists profiles_avatar_url_idx
    on public.profiles(id)
    where avatar_url is not null;

create index if not exists businesses_logo_url_idx
    on public.businesses(id)
    where logo_url is not null;

comment on column public.profiles.avatar_url is
    'Optional Super Admin managed profile photograph URL for individual client presentation.';

comment on column public.businesses.logo_url is
    'Optional Super Admin managed business logo URL for client and invoice presentation.';

comment on column public.invoices.document_logo_url is
    'Brand asset snapshot used by the invoice visual/PDF renderer.';
