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
  const [songs, setSongs] = useState<any[]>([]);
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

      if (error || !data) { navigate('/'); return; }
      setChoir(data);

      // Vérifier si l'utilisateur connecté est le propriétaire
      if (userData.user && data.owner_id === userData.user.id) {
        setIsOwner(true);
      }

      // Récupérer les chants de la chorale
      const { data: songsData } = await supabase
        .from('songs')
        .select('*')
        .eq('choir_id', id)
        .order('title');
      setSongs(songsData || []);

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
          <p><strong>Code :</strong> {formatCode(String(choir.code))}</p>

          {/* Liste des chants */}
          {songs.length === 0 ? (
            <p>Aucun chant pour cette chorale.</p>
          ) : (
            <ul className="list-music">
              {songs.map((s) => (
                <div key={s.id} className="card-music pink">
                  <i className="fa fa-music note"></i>
                  <div
                    className="text"
                    onClick={() => navigate(`/song/${s.id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <strong>{s.title}</strong>
                  </div>
                  {isOwner && (
                    <i
                      className="fa fa-trash trash"
                      onClick={() => navigate(`/delete-song/${s.id}`)}
                    ></i>
                  )}
                </div>
              ))}
            </ul>
          )}

          {/* Boutons propriétaire / non propriétaire */}
          {isOwner ? (
            <>
              <div>
                <button
                  className="page-button"
                  onClick={() => navigate(`/add-song/${choir.id}`)}
                >
                  <i className="fa fa-music"></i> &nbsp; 
                  Ajouter un chant
                </button>
              </div>
              <div>
                <button
                  className="page-button orange"
                  onClick={() => navigate(`/delete-choir/${choir.id}`)}
                  style={{ marginTop: '1.5rem' }}
                >
                  <i className="fa fa-users"></i> &nbsp; 
                  Supprimer la chorale
                </button>
              </div>
            </>
          ) : (
            <button
              className="page-button orange"
              onClick={() => navigate(`/leave-choir/${choir.id}`)}
              style={{ marginTop: '1.5rem' }}
            >
              <i className="fa fa-users"></i> &nbsp; 
              Quitter la chorale
            </button>
          )}
        </>
      )}
    </div>
  );
}