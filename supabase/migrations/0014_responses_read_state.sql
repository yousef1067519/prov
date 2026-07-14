-- Track page unread highlighting: a reply stays highlighted until the user
-- opens it (read_at). updated_at moves when a newer message from the same
-- sender replaces the stored reply, which also resets read_at to unread.
-- gmail_message_id dedupes sync runs — only a genuinely new inbox message
-- updates the row (otherwise the hourly cron would reset read_at forever).
alter table responses add column if not exists read_at timestamptz;
alter table responses add column if not exists updated_at timestamptz default now();
alter table responses add column if not exists gmail_message_id text;
