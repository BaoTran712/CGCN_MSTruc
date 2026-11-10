-- Migration to add submission tracking table for admin review
CREATE TABLE submission_tracking (
  id UUID PRIMARY KEY,
  dossier_id UUID NOT NULL REFERENCES dossiers(id),
  ten_de_tai VARCHAR(255) NOT NULL,
  status VARCHAR(30) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

