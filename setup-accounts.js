import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createAccount(email, password, displayName) {
  console.log(`Creating account for ${email}...`);
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName }
    }
  });

  if (error) {
    if (error.message.includes('already registered')) {
      console.log(`Account ${email} already exists.`);
      // Try to log in to get the user ID
      const { data: signInData } = await supabase.auth.signInWithPassword({ email, password });
      return signInData?.user?.id;
    }
    console.error(`Error creating ${email}:`, error.message);
    return null;
  }
  
  console.log(`Successfully created ${email} (ID: ${data.user.id})`);
  return data.user.id;
}

async function main() {
  const adminId = await createAccount('admin@courtside.com', 'password123', 'Admin User');
  const ownerId = await createAccount('owner@courtside.com', 'password123', 'Facility Owner');
  const playerId = await createAccount('player@courtside.com', 'password123', 'Player Alex');

  console.log('\n--- ACCOUNTS CREATED ---');
  console.log('To assign the correct roles, please run the following SQL command in your Supabase SQL Editor:');
  console.log('\n=========================================');
  console.log(`
-- 1. Make admin@courtside.com an Admin
INSERT INTO public.user_roles (user_id, role)
VALUES ('${adminId}', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- 2. Make owner@courtside.com an Owner
INSERT INTO public.user_roles (user_id, role)
VALUES ('${ownerId}', 'owner')
ON CONFLICT (user_id, role) DO NOTHING;
  `);
  console.log('=========================================\n');
  console.log('After running the SQL, you can log in with:');
  console.log('Admin: admin@courtside.com / password123');
  console.log('Owner: owner@courtside.com / password123');
  console.log('Player: player@courtside.com / password123');
}

main();
