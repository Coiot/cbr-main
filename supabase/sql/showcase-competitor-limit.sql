-- Apply after showcase-showrunners.sql. Primary favourite plus nine additional choices.
begin;
alter table public.supporter_showcases drop constraint supporter_showcases_competitors_check;
alter table public.supporter_showcases add constraint supporter_showcases_competitors_check check(cardinality(competitors)<=9);
notify pgrst,'reload schema';
commit;
