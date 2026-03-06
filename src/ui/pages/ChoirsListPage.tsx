import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../infrastructure/storage/supabaseClient';
import '../../App.css';

export default function MyChoirsPage() {
  const [, setUser] = useState<any>(null);
  const [choirs, setChoirs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Vérifie si utilisateur connecté et récupère ses chorales
  useEffect(() => {
    const fetchData = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        navigate('/'); // redirection si non connecté
        return;
      }
      setUser(userData.user);

      // Récupérer les chorales de cet utilisateur
      const { data: choirData, error } = await supabase
        .from('choirs')
        .select('*')
        .eq('owner_id', userData.user.id);

      if (error) {
        console.error(error);
        setChoirs([]);
      } else {
        setChoirs(choirData || []);
      }

      setLoading(false);
    };

    fetchData();
  }, [navigate]);

  return (
    <div className="page-container">
      {/* Barre du haut */}
      <div className="top-bar">
        <Link to="/" className="navigation">←</Link>
        <Link to="/login" className="navigation">⎋</Link>
      </div>
      <h2>Mes chorales</h2>

      {loading ? (
        <p>Chargement...</p>
      ) : choirs.length === 0 ? (
        <p>Vous n’avez encore créé aucune chorale.</p>
      ) : (
        <ul className="list-music">
          {choirs.map((c) => (
            <div key={c.id} className="card-music">
            <i className="fa fa-music note"></i>
            <div className="text">
              {/* Titre en gras */}
              <strong>{c.name}</strong>
              {/* Saut de ligne pour le code */}
              <span>Code : {c.code}</span>
            </div>
            </div>
          ))}
        </ul>
      )}
    </div>
  );
}