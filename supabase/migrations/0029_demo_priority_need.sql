-- 0029: capture what a demo requester says they need most, so the sales call can
-- lead with the right feature instead of a generic tour.
alter table demo_requests add column if not exists priority_need text;
