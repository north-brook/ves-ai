
  create policy "Colleagues can view colleagues"
  on "public"."users"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.roles their_roles
  WHERE ((users.id = their_roles.user_id) AND (their_roles.project_id IN ( SELECT my_roles.project_id
           FROM public.roles my_roles
          WHERE (my_roles.user_id = ( SELECT auth.uid() AS uid))))))));



