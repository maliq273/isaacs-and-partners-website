begin;
create or replace function public.payroll_reviewer_admin_snapshot()
returns jsonb language plpgsql security definer stable set search_path=public as $$
begin
 if not public.is_super_admin() then raise exception 'Only Super Admin may manage payroll reviewers.'; end if;
 return jsonb_build_object('businesses',coalesce((select jsonb_agg(jsonb_build_object('business_id',b.id,'legal_name',b.legal_name,'trading_name',b.trading_name,'owner_user_id',b.owner_user_id,'reviewers',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'user_id',r.user_id,'first_name',p.first_name,'last_name',p.last_name,'email',p.email,'phone',p.phone,'is_primary',r.is_primary,'active',r.active,'notes',r.notes) order by r.is_primary desc,p.last_name,p.first_name) from public.hr_payroll_reviewers r join public.profiles p on p.id=r.user_id where r.business_id=b.id and r.active),'[]'::jsonb)) order by b.created_at desc) from public.businesses b where b.is_active),'[]'::jsonb),'candidates',coalesce((select jsonb_agg(jsonb_build_object('user_id',p.id,'first_name',p.first_name,'last_name',p.last_name,'email',p.email,'role',p.role) order by p.role,p.last_name,p.first_name) from public.profiles p where p.is_active and p.role::text in ('BUSINESS','INDIVIDUAL','STAFF','SUPER_ADMIN')),'[]'::jsonb));
end $$;
create or replace function public.super_admin_payroll_approval_snapshot()
returns jsonb language plpgsql security definer stable set search_path=public as $$
begin
 if not public.is_super_admin() then raise exception 'Only Super Admin may view payroll approval queue.'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object('run_id',r.id,'business_id',r.business_id,'business_name',coalesce(b.trading_name,b.legal_name),'period_start',r.period_start,'period_end',r.period_end,'approval_status',r.approval_status,'workflow_stage',r.workflow_stage,'created_at',r.created_at,'created_by',r.created_by,'completed_by',coalesce(p.first_name||' '||p.last_name,p.email),'reconciliation',coalesce(r.metadata->'reconciliation','{}'::jsonb)) order by r.created_at desc) from public.hr_payroll_runs r join public.businesses b on b.id=r.business_id left join public.profiles p on p.id=r.created_by where b.is_internal_company=true and r.approval_status='PENDING_SUPER_ADMIN'),'[]'::jsonb);
end $$;
revoke all on function public.super_admin_payroll_approval_snapshot() from public;
grant execute on function public.super_admin_payroll_approval_snapshot() to authenticated;
notify pgrst,'reload schema';
commit;