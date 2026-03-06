import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { supabase } from '../../infrastructure/storage/supabaseClient';
import '../../App.css';

export default function ChoirPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [choir, setChoir] = useState<any>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChoir = async () => {
      // Récupérer l'utilisateur connecté (peut être null)
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) setUser(userData.user);

      // Récupérer la chorale sans restriction
      const { data, error } = await supabase
        .from('choirs')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) {
        navigate('/');
        return;
      }

      setChoir(data);
      // Vérifier si l'utilisateur connecté est le propriétaire
      if (userData.user && data.owner_id === userData.user.id) {
        setIsOwner(true);
      }

      setLoading(false);
    };
    fetchChoir();
  }, [id, navigate]);

  const formatCode = (code: string) => code.match(/.{1,2}/g)?.join('-') ?? code;

  return (
    <div className="page-container">
      <div className="top-bar">
        <Link to="/my-choirs" className="navigation">←</Link>
        {user && <Link to="/login" className="navigation">⎋</Link>}
      </div>
      {loading ? (
        <p>Chargement...</p>
      ) : (
        <>
          <h2>{choir.name}</h2>
          <p>Code : {formatCode(choir.code)}</p>

          {isOwner ? (
            <button
              className="page-button orange"
              onClick={() => navigate(`/delete-choir/${choir.id}`)}
            >
              Supprimer la chorale
            </button>
          ) : (
            <button
              className="page-button orange"
              onClick={() => navigate(`/leave-choir/${choir.id}`)}
            >
              Quitter la chorale
            </button>
          )}
        </>
      )}
    </div>
  );
}