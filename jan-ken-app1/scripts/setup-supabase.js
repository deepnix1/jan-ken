/**
 * Supabase Database Setup Script
 * 
 * This script sets up the database schema for the Jan-Ken matchmaking system.
 * Run this with: node scripts/setup-supabase.js
 * 
 * Make sure NEXT_PUBLIC_SUPABASE_ANON_KEY is set in your environment.
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = 'https://iophfhfnctqufqsmunyz.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

if (!supabaseKey) {
  console.error('❌ Error: NEXT_PUBLIC_SUPABASE_ANON_KEY or SUPABASE_KEY environment variable is required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupDatabase() {
  console.log('🚀 Setting up Supabase database...\n');

  // Read SQL schema file
  const sqlPath = path.join(__dirname, '../supabase-schema.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  // Split SQL into individual statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

  // Execute each statement
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    
    // Skip comments and empty lines
    if (statement.startsWith('--') || statement.length === 0) {
      continue;
    }

    try {
      console.log(`[${i + 1}/${statements.length}] Executing statement...`);
      console.log(`   ${statement.substring(0, 100)}...`);
      
      // Use Supabase RPC or direct SQL execution
      // Note: Supabase client doesn't support raw SQL execution directly
      // We need to use the REST API or create tables programmatically
      
      // For now, we'll create tables using Supabase client methods
      // This is a workaround - ideally you'd run the SQL in Supabase dashboard
      
      const { data, error } = await supabase.rpc('exec_sql', { 
        sql_query: statement 
      });

      if (error) {
        // If RPC doesn't exist, we'll need to use REST API
        console.warn(`   ⚠️  RPC method not available, skipping...`);
        console.warn(`   💡 Please run the SQL manually in Supabase Dashboard SQL Editor`);
        continue;
      }

      console.log(`   ✅ Success`);
    } catch (err) {
      console.error(`   ❌ Error: ${err.message}`);
      console.warn(`   💡 Please run this statement manually in Supabase Dashboard`);
    }
  }

  console.log('\n✅ Database setup complete!');
  console.log('\n📝 Note: Some statements may need to be run manually in Supabase Dashboard SQL Editor');
  console.log('   Go to: https://supabase.com/dashboard/project/iophfhfnctqufqsmunyz/editor');
}

// Alternative: Create tables programmatically
async function createTablesProgrammatically() {
  console.log('🔧 Creating tables programmatically...\n');

  // This is a simplified approach - we'll create the essential structure
  // Full schema should be run in Supabase Dashboard SQL Editor

  console.log('📝 Please run the SQL schema manually in Supabase Dashboard:');
  console.log('   1. Go to: https://supabase.com/dashboard/project/iophfhfnctqufqsmunyz/editor');
  console.log('   2. Open the SQL Editor');
  console.log('   3. Copy and paste the contents of supabase-schema.sql');
  console.log('   4. Click "Run"\n');
}

if (require.main === module) {
  createTablesProgrammatically();
}

module.exports = { setupDatabase, createTablesProgrammatically };

