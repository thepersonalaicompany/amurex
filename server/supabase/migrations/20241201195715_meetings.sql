create table meetings (
  id serial primary key,
  meeting_id text not null,
  user_id text not null,
  context_files text[],
  embeddings text[],
  chunks text[],
  suggestion_count integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  unique(meeting_id, user_id)
);