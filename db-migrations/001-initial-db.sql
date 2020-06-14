CREATE TABLE topics (
  id BIGSERIAL NOT NULL PRIMARY KEY,
  topic_name TEXT NOT NULL,
  topic_slug TEXT NOT NULL UNIQUE,
  topic_key TEXT NOT NULL UNIQUE
);

CREATE TABLE messages (
  id BIGSERIAL NOT NULL PRIMARY KEY,
  topic_id BIGINT NOT NULL REFERENCES topics(id),
  from_email TEXT NOT NULL,
  from_name TEXT NOT NULL,
  reply TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL,
  original_content TEXT NOT NULL,
  edited_content TEXT NULL,
  edited_at TIMESTAMPTZ NULL,
  source_url TEXT NOT NULL UNIQUE
);

CREATE TABLE message_history (
  id BIGSERIAL NOT NULL PRIMARY KEY,
  message_id BIGINT NOT NULL REFERENCES messages(id),
  user_name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);