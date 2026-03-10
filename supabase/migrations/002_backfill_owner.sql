-- Run this AFTER the platform owner has signed up and you have their auth.users.id
-- Replace <OWNER_UUID> with the actual UUID from auth.users

-- UPDATE thoughts SET user_id = '<OWNER_UUID>' WHERE user_id IS NULL;
-- UPDATE documents SET user_id = '<OWNER_UUID>' WHERE user_id IS NULL;
-- UPDATE chunks SET user_id = '<OWNER_UUID>' WHERE user_id IS NULL;
-- UPDATE conversations SET user_id = '<OWNER_UUID>' WHERE user_id IS NULL;

-- After backfill, enforce NOT NULL:
-- ALTER TABLE thoughts ALTER COLUMN user_id SET NOT NULL;
-- ALTER TABLE documents ALTER COLUMN user_id SET NOT NULL;
-- ALTER TABLE chunks ALTER COLUMN user_id SET NOT NULL;
-- ALTER TABLE conversations ALTER COLUMN user_id SET NOT NULL;
