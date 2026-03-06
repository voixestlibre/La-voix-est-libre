import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../infrastructure/storage/supabaseClient';
import '../../App.css';

export default function MyChoirsPage() {
  const [, setUser] = useState<any>(null);
  const [choirs, setChoirs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [canCreate, setCanCreate] = useState(false);
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

      // Récupérer choirs_nb depuis users_param
      const { data: param } = await supabase
        .from('users_param')
        .select('choirs_nb')
        .eq('email', userData.user.email)
        .single();

      // Récupérer les chorales de cet utilisateur
      const { data: choirData, error } = await supabase
        .from('choirs')
        .select('*')
        .eq('owner_id', userData.user.id);

      if (param) {
        setCanCreate((choirData?.length ?? 0) < param.choirs_nb);
      }

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

  const formatCode = (code: string) => code.match(/.{1,2}/g)?.join('-') ?? code;
  
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
            <div key={c.id} className="card-music orange">
            <i className="fa fa-music note"></i>
            <div className="text" onClick={() => navigate(`/choir/${c.id}`)} style={{ cursor: 'pointer' }}>
              <strong>{c.name}</strong>
              <span>Code : {formatCode(c.code)}</span>
            </div>
            <i
              className="fa fa-trash trash"
              onClick={() => navigate(`/delete-choir/${c.id}`)}
            ></i>
            </div>
          ))}
        </ul>
      )}
      {canCreate && (
        <button
          className="page-button"
          onClick={() => navigate('/create-choir')}
          style={{ marginBottom: '1rem' }}
        >
          Créer une chorale
        </button>
      )}
    </div>
  );
}