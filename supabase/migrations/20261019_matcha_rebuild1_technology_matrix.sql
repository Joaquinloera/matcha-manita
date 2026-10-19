-- Matcha Manita Rebuild 1 private technology matrix
create table if not exists public.matcha_technology_matrix (
 id bigint generated always as identity primary key,
 operator_name text not null,
 capability text not null,
 technology_provider text,
 finding text not null,
 evidence_url text not null,
 verification_status text not null default 'public_documentation' check (verification_status in ('public_documentation','operator_confirmed','integration_authorized','unverified')),
 integration_status text not null default 'research_only' check (integration_status in ('research_only','access_requested','sandbox','connected')),
 jurisdiction text not null default 'US',
 reviewed_on date not null default current_date,
 unique(operator_name,capability,evidence_url)
);
alter table public.matcha_technology_matrix enable row level security;
comment on table public.matcha_technology_matrix is 'Private research matrix; no public select policies or credentials stored.';
insert into public.matcha_technology_matrix(operator_name,capability,technology_provider,finding,evidence_url) values
('JARS Cannabis','loyalty and web app',null,'Official web app describes rewards, ordering and order history; internal stack unknown.','https://jarscannabis.com/install'),
('Curaleaf','mobile app and loyalty',null,'Official app offers pickup ordering and rewards balance; internal stack unknown.','https://curaleaf.com/download-our-app'),
('Zen Leaf','app payments and loyalty','Aeropay','App listing describes Aeropay payments and rewards; integration not authorized.','https://apps.apple.com/us/app/zen-leaf/id6448922214'),
('Dutchie','point of sale API','Dutchie','Official POS API documentation; partner access required.','https://api.pos.dutchie.com/'),
('Treez','retail integrations','Treez','Official integrations page describes open API integrations.','https://www.treez.io/integrations'),
('Metrc','track and trace API','Metrc','Official Connect API program; credentials require authorization.','https://www.metrc.com/track-and-trace-technology/metrc-connect/'),
('OpenAI','AI developer API','OpenAI','Official API authentication reference.','https://developers.openai.com/api/reference/overview/')
on conflict(operator_name,capability,evidence_url) do nothing;
