-- Foundation hardening: existing brand assets were stored with the
-- project GitHub Pages origin. The production site uses the custom domain.
-- This migration changes only known non-confidential brand-asset URLs.

update public.organisation_profiles
set logo_url = replace(
    logo_url,
    'https://maliq273.github.io/isaacs-and-partners-website/',
    'https://www.isaacsandpartners.online/'
),
updated_at = now()
where logo_url like 'https://maliq273.github.io/isaacs-and-partners-website/%';

update public.profiles
set avatar_url = replace(
    avatar_url,
    'https://maliq273.github.io/isaacs-and-partners-website/',
    'https://www.isaacsandpartners.online/'
)
where avatar_url like 'https://maliq273.github.io/isaacs-and-partners-website/%';

update public.businesses
set logo_url = replace(
    logo_url,
    'https://maliq273.github.io/isaacs-and-partners-website/',
    'https://www.isaacsandpartners.online/'
)
where logo_url like 'https://maliq273.github.io/isaacs-and-partners-website/%';

comment on column public.organisation_profiles.logo_url is
    'Canonical public URL for the non-confidential organisation brand asset.';
