# PostgreSQL initialization script
# Enable pgcrypto extension for encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

# Create additional indexes for performance
CREATE INDEX IF NOT EXISTS idx_jobs_status_created_at ON jobs(status, created_at);
CREATE INDEX IF NOT EXISTS idx_jobs_type_status ON jobs(type, status);
CREATE INDEX IF NOT EXISTS idx_job_logs_job_id_created_at ON job_logs(job_id, created_at);
CREATE INDEX IF NOT EXISTS idx_pages_content_hash ON pages(content_hash);
CREATE INDEX IF NOT EXISTS idx_pages_job_id ON pages(job_id);
CREATE INDEX IF NOT EXISTS idx_headings_page_id ON headings(page_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_text_hash_model ON embeddings(text_hash, model);
CREATE INDEX IF NOT EXISTS idx_generated_text_section_type ON generated_text(section_type);
CREATE INDEX IF NOT EXISTS idx_prompts_key_version ON prompts(key, version);
CREATE INDEX IF NOT EXISTS idx_text_analytics_cache_expires_at ON text_analytics_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_wordstat_cache_expires_at ON wordstat_cache(expires_at);