-- Sponsors need a real contact address: the app previously fabricated
-- contact@<name>.com at send time, which mailed guessed addresses. Outreach
-- now only goes to sponsors with an explicit email.
alter table sponsors add column if not exists email text;
