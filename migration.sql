-- 1. Create the new general api_usage table
CREATE TABLE IF NOT EXISTS api_usage (
    platform TEXT PRIMARY KEY,
    count INTEGER DEFAULT 0 NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. Migrate existing Twitter API call count data if x_api_usage exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'x_api_usage') THEN
        INSERT INTO api_usage (platform, count, updated_at)
        SELECT 'twitter', count, COALESCE(updated_at, now())
        FROM x_api_usage
        WHERE id = 1
        ON CONFLICT (platform) DO UPDATE
        SET count = EXCLUDED.count, updated_at = EXCLUDED.updated_at;
    ELSE
        INSERT INTO api_usage (platform, count)
        VALUES ('twitter', 0)
        ON CONFLICT (platform) DO NOTHING;
    END IF;
END $$;
