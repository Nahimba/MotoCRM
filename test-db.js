const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testConnection() {
  console.log("Checking connection to:", process.env.NEXT_PUBLIC_SUPABASE_URL);
  
  const { data, error } = await supabase
    .from('clients')
    .select('count')
    .limit(1);

  if (error) {
    console.error("❌ Connection Failed:", error.message);
  } else {
    console.log("✅ Success! Connected to Supabase. Found", data.length, "clients.");
  }
}

testConnection();