import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../infrastructure/storage/supabaseClient';
import logo from '../../assets/logo.png';
import { getStoredChoirs, getStoredEvents } from '../../infrastructure/storage/localStorageService';
import '../../App.css';

export default function HomePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [hasChoirs, setHasChoirs] = useState(false);

  // Vérifie si un utilisateur est connecté
  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      const currentUser = data.user || null;
      setUser(currentUser);

      // Afficher "Mes chorales" si :
      // - l'utilisateur est connecté (peut avoir des chorales propriétaire)
      // - OU il a des chorales rejointes dans le localStorage
      // - OU il a des événements rejoints (chorales fantômes)
      const hasStoredChoirs = getStoredChoirs().length > 0;
      const hasStoredEvents = getStoredEvents().length > 0;
      setHasChoirs(!!currentUser || hasStoredChoirs || hasStoredEvents);
    };
    getUser();
  }, []);

  return (
    <div className="page-container">
      <div style={{ margin: '30px 0' }}>
        <img
          src={logo}
          alt="La voix est libre"
          className="page-logo"
        />
      </div>

      {/* Boutons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
        {hasChoirs && (
          <button
            className="page-button"
            style={{ width: '270px' }}
            onClick={() => navigate('/my-choirs')}
          >
            Mes chorales
          </button>
        )}
        
        <button
          className="page-button"
          style={{ width: '270px' }}
          onClick={() => navigate('/join-choir')}
        >
          Rejoindre une chorale
        </button>

        <button
          className="page-button2"
          style={{ width: '270px' }}
          onClick={() => navigate('/login')}
        >
          {user ? 'Se déconnecter' : 'Se connecter'}
        </button>
      </div>
    </div>
  );
}