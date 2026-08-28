-- Provides a stable database-side validation result for the matter form.
-- The existing matters_check constraint remains intact.
create or replace function public.validate_matter_creation(
    p_title text,
    p_individual_user_id uuid default null,
    p_business_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
    if nullif(trim(coalesce(p_title, '')), '') is null then
        return jsonb_build_object('valid', false, 'field', 'title', 'message', 'Matter title is required.');
    end if;

    if (p_individual_user_id is null) = (p_business_id is null) then
        return jsonb_build_object(
            'valid', false,
            'field', 'client',
            'message', 'A matter must be linked to exactly one individual or business client.'
        );
    end if;

    return jsonb_build_object('valid', true);
end;
$$;

revoke all on function public.validate_matter_creation(text, uuid, uuid) from public;
grant execute on function public.validate_matter_creation(text, uuid, uuid) to authenticated;
