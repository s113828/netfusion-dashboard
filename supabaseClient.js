const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ 缺少 Supabase 設定，請檢查 .env 檔案');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

module.exports = supabase;
