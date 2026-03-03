import { useState } from 'react';
import { supabase } from '../../infrastructure/storage/supabaseClient';

export default function HomePage() {
  const [choirs, setChoirs] = useState<any[]>([]);
  const [message, setMessage] = useState('');

  async function testSupabase() {
    const { data, error } = await supabase.from('choirs').select('*');
    if (error) setMessage('Erreur : ' + error.message);
    else {
      setChoirs(data || []);
      setMessage(`Connexion OK - ${data?.length || 0} chorales trouvées`);
    }
  }

  return (
    <div>
      <h1>Page Accueil - La voix est libre</h1>
      <button onClick={testSupabase}>Test Supabase</button>
      {message && <p>{message}</p>}
      <ul>
        {choirs.map(c => (
          <li key={c.id}>{c.name} - code : {c.code}</li>
        ))}
      </ul>
    </div>
  );
}