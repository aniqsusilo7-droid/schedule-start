import { createClient } from '@supabase/supabase-js';
const supabaseUrl = 'https://zcflkcbyezpehyqrimqe.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjZmxrY2J5ZXpwZWh5cXJpbXFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzODE2ODYsImV4cCI6MjA4Njk1NzY4Nn0.b1kxg_BunqcjmtHPAPeiHeLAzwuQyI8EWi_afiUQXEA';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  let e1 = await supabase.from('reactor_notes').select('*');
  console.log("reactor_notes error:", e1.error);
  
  let e2 = await supabase.from('kesepakatan').select('*');
  console.log("kesepakatan error:", e2.error);
  
  let e3 = await supabase.from('catatan_data').select('*');
  console.log("catatan_data error:", e3.error);
}
run();
