import { createClient } from '@supabase/supabase-js';
const supabaseUrl = 'https://zcflkcbyezpehyqrimqe.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjZmxrY2J5ZXpwZWh5cXJpbXFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzODE2ODYsImV4cCI6MjA4Njk1NzY4Nn0.b1kxg_BunqcjmtHPAPeiHeLAzwuQyI8EWi_afiUQXEA';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('app_settings').select('*');
  console.log("Data:", data);
  console.log("Error:", error);
}
run();
