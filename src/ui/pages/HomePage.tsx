import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../infrastructure/storage/supabaseClient';
import logo from '../../assets/logo.png';
import '../../App.css';

export default function HomePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);

  // Vérifie si un utilisateur est connecté
  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user || null);
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
        <button
          className="page-button"
          style={{ width: '270px' }}
          onClick={() => navigate('/create')}
        >
          Créer une chorale
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