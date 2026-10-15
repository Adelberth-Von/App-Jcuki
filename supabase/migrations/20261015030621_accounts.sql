ALTER TABLE jcuki.profiles ADD COLUMN auth_user_id UUID REFERENCES auth.users(id);
ALTER TABLE jcuki.profiles ADD COLUMN full_name TEXT NOT NULL DEFAULT '';
CREATE UNIQUE INDEX profiles_auth_user ON jcuki.profiles(auth_user_id);
COMMENT ON COLUMN jcuki.profiles.auth_user_id IS 'Verified Supabase Auth owner. Device bearer access is disabled after linking.';
