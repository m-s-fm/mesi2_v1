-- 1. Drop unused Telegram-specific tables
DROP TABLE IF EXISTS telegram_sessions CASCADE;
DROP TABLE IF EXISTS telegram_login_attempts CASCADE;

-- 2. Create Stripe subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    stripe_customer_id TEXT NOT NULL,
    stripe_subscription_id TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL,
    current_period_end TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS on subscriptions table (no client policies defined - only accessible via service_role)
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- 3. Drop all previous dev/fallback policies to ensure clean state
DROP POLICY IF EXISTS dev_fallback ON x_sessions;
DROP POLICY IF EXISTS dev_fallback ON x_login_attempts;
DROP POLICY IF EXISTS dev_fallback ON messages;
DROP POLICY IF EXISTS dev_fallback ON outbox;
DROP POLICY IF EXISTS allow_all_dev ON x_sessions;
DROP POLICY IF EXISTS allow_all_dev ON x_login_attempts;
DROP POLICY IF EXISTS allow_all_dev ON messages;
DROP POLICY IF EXISTS allow_all_dev ON outbox;

-- 4. Enable RLS on all active developer tables
ALTER TABLE x_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE x_login_attempts ENABLE ROW LEVEL SECURITY;

-- 5. Create new strict RLS policies using auth.uid()
CREATE POLICY user_x_sessions_policy ON x_sessions 
    FOR ALL 
    TO authenticated 
    USING (auth.uid() = user_id) 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY user_x_login_attempts_policy ON x_login_attempts 
    FOR ALL 
    TO authenticated 
    USING (auth.uid() = user_id) 
    WITH CHECK (auth.uid() = user_id);

-- Optional/Fallback tables for messages and outbox (if they exist in DB)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'messages') THEN
        ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS user_messages_policy ON messages;
        CREATE POLICY user_messages_policy ON messages 
            FOR ALL 
            TO authenticated 
            USING (auth.uid() = user_id) 
            WITH CHECK (auth.uid() = user_id);
    END IF;

    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'outbox') THEN
        ALTER TABLE outbox ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS user_outbox_policy ON outbox;
        CREATE POLICY user_outbox_policy ON outbox 
            FOR ALL 
            TO authenticated 
            USING (auth.uid() = user_id) 
            WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;
