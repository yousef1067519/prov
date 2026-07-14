-- Prov seed data
--
-- Creators are NOT seeded here. Real influencers are ingested by the scraper
-- via POST /api/creators/import (deduped on platform+handle). Running this file
-- will not add any placeholder/sample creators.
--
-- Optional utility: backfill a language for any imported rows that are missing
-- one, inferred from country. Safe to run anytime; it only touches NULL languages.

update creators set language = case
  when country in ('USA','United States','UK','United Kingdom','Canada','Australia','Ireland','New Zealand','South Africa','Nigeria','Kenya','Ghana','Singapore','Philippines') then 'English'
  when country in ('Germany','Austria','Switzerland') then 'German'
  when country in ('France','Belgium') then 'French'
  when country in ('Spain','Mexico','Argentina','Colombia','Chile','Peru','Venezuela','Ecuador') then 'Spanish'
  when country in ('Brazil','Portugal') then 'Portuguese'
  when country in ('Italy') then 'Italian'
  when country in ('Netherlands') then 'Dutch'
  when country in ('Japan') then 'Japanese'
  when country in ('South Korea') then 'Korean'
  when country in ('India') then 'Hindi'
  when country in ('China','Taiwan','Hong Kong') then 'Mandarin Chinese'
  when country in ('Russia') then 'Russian'
  when country in ('Ukraine') then 'Ukrainian'
  else language
end
where language is null;
