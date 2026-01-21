import { createClient } from '@supabase/supabase-js';

// Tyto údaje najdeš ve svém projektu na Supabase.com 
// pod Project Settings -> API
const supabaseUrl = 'https://vgiouwqgypqatzyazoxa.supabase.co';
const supabaseKey = 'sb_publishable_8YpiUbE65wFo3xSjX7gkdw_SMIiOeXV';

export const supabase = createClient(supabaseUrl, supabaseKey);