CREATE TABLE feedback (
  id SERIAL PRIMARY KEY,
  name TEXT,
  comment TEXT,
  latitude FLOAT,
  longitude FLOAT,
  image_url TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);