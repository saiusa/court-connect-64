import { createClient } from '@supabase/supabase-js';

// To run this seeder, you must provide your Supabase Service Role Key.
// 1. Get it from Supabase Dashboard > Project Settings > API > service_role (secret)
// 2. Add it to your .env file as SUPABASE_SERVICE_ROLE_KEY="your-secret-key"
// 3. Run: node --env-file=.env scripts/seed.js

const supabaseUrl = "https://bqqyxlvyvtwvfgrnbmlc.supabase.co";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("❌ ERROR: Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  console.error("Please add SUPABASE_SERVICE_ROLE_KEY to your .env file to seed roles directly.");
  process.exit(1);
}

// Use service role key to bypass RLS
const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function createSeederAccount(email, password, displayName, role) {
  console.log(`\n⏳ Creating ${role} account: ${email}...`);
  
  // 1. Create the user in auth.users
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName }
  });

  let userId;

  if (authError) {
    if (authError.message.includes('already') || authError.message.includes('registered')) {
      console.log(`⚠️ User ${email} already exists. Fetching ID...`);
      // Get existing user ID
      const { data: listData } = await supabase.auth.admin.listUsers();
      const existingUser = listData.users.find(u => u.email === email);
      if (!existingUser) {
        console.error(`❌ Could not find existing user ${email}.`);
        return null;
      }
      userId = existingUser.id;
      console.log(`✅ Found user. Forcibly resetting password to ${password}...`);
      await supabase.auth.admin.updateUserById(userId, { password: password });
    } else {
      console.error(`❌ Error creating auth user: ${authError.message}`);
      return null;
    }
  } else {
    userId = authData.user.id;
    console.log(`✅ Auth user created. ID: ${userId}`);
  }

  // 2. Assign the role in public.user_roles (bypassing RLS with service_role key)
  if (role !== 'user') {
    console.log(`⏳ Assigning '${role}' role to ${email}...`);
    const { error: roleError } = await supabase
      .from('user_roles')
      .upsert({ user_id: userId, role: role }, { onConflict: 'user_id, role' });

    // Ensure the role is also available directly on the user object in app_metadata for instant UI access
    await supabase.auth.admin.updateUserById(userId, { 
      app_metadata: { roles: [role] } 
    });

    if (roleError) {
      console.error(`❌ Error assigning role: ${roleError.message}`);
    } else {
      console.log(`✅ Role '${role}' successfully assigned!`);
    }
  } else {
    console.log(`✅ Default 'user' role applied by database trigger.`);
  }

  return userId;
}

async function seed() {
  console.log("🌱 Starting Database Seeder...");

  // Create Admin
  await createSeederAccount('admin@courtside.com', 'password123', 'Platform Admin', 'admin');
  
  // Create Owner
  const ownerId = await createSeederAccount('owner@courtside.com', 'password123', 'Facility Owner', 'owner');
  
  // Create Player
  await createSeederAccount('player@courtside.com', 'password123', 'Alex Player', 'user');

  console.log("\n🎉 Seeding Complete! You can now log in with the following accounts:");
  console.log("-----------------------------------------------------------------");
  console.log("🧑‍💻 Admin:  admin@courtside.com  / password123 (Navigates to /admin/users)");
  console.log("🏢 Owner:  owner@courtside.com  / password123 (Navigates to /owner)");
  console.log("⛹️ Player: player@courtside.com / password123 (Navigates to /)");
  console.log("-----------------------------------------------------------------");
}

seed();
