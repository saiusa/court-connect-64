const { Client } = require('pg');

const DATABASE_URL = `postgresql://postgres.bqqyxlvyvtwvfgrnbmlc:${process.env.SUPABASE_DB_PASSWORD}@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres`;

async function run() {
  const client = new Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
  
  try {
    await client.connect();
    console.log('Connected to database!');

    const statements = [
      `GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated`,
      `GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO anon`,
      `DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles`,
      `CREATE POLICY "Admins can read all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'))`,
      `DROP POLICY IF EXISTS "Admins can read all roles" ON public.user_roles`,
      `CREATE POLICY "Admins can read all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'))`,
    ];

    for (const sql of statements) {
      try {
        await client.query(sql);
        console.log('✅', sql.substring(0, 60));
      } catch (err) {
        console.log('❌', sql.substring(0, 60), '-', err.message);
      }
    }
    
    console.log('\n🎉 Done! Admin should now be able to read profiles and roles.');
  } catch (err) {
    console.error('Connection error:', err.message);
  } finally {
    await client.end();
  }
}

run();
