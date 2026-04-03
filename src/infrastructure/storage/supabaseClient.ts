// Ce fichier crée et exporte l'instance unique du client Supabase.
// Les variables d'environnement VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY
// sont définies dans le fichier .env (non versionné).
// L'instance est partagée par tous les services via cet import — ne pas créer
// d'autres instances dans d'autres fichiers pour éviter des problèmes de session.

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);