create or replace function pg_database_size_mb()
returns table(size_mb numeric) as $$
  select round(pg_database_size(current_database()) / 1024.0 / 1024.0, 2);
$$ language sql stable;
