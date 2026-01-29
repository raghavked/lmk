import { createClient } from '@supabase/supabase-js';
import { TasteProfileBuilder } from '../lib/tasteProfileBuilder';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function updateAllTasteProfiles() {
  console.log('Starting taste profile update job...');
  
  const { data: profiles } = await supabase.from('profiles').select('id');
  
  if (!profiles) return;

  for (const profile of profiles) {
    const { data: ratings } = await supabase
      .from('ratings')
      .select('*')
      .eq('user_id', profile.id);
      
    if (!ratings || ratings.length === 0) continue;

    const { data: objects } = await supabase
      .from('objects')
      .select('*')
      .in('id', ratings.map(r => r.object_id));

    const newTasteProfile = TasteProfileBuilder.computeTasteProfile(ratings, objects || []);
    
    await supabase
      .from('profiles')
      .update({ taste_profile: newTasteProfile, updated_at: new Date().toISOString() })
      .eq('id', profile.id);
      
    console.log(`Updated taste profile for user: ${profile.id}`);
  }
  
  console.log('Taste profile update job completed.');
}

updateAllTasteProfiles().catch(console.error);
