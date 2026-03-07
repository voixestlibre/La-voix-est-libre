import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { getCurrentUser } from '../../infrastructure/storage/authService';
import { getChoir } from '../../infrastructure/storage/choirsService';
import { getChoirSongs } from '../../infrastructure/storage/songsService';
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
      const currentUser = await getCurrentUser();
      if (currentUser) setUser(currentUser);

      try {
        // Récupérer la chorale
        const data = await getChoir(id!);
        setChoir(data);

        // Vérifier si l'utilisateur connecté est le propriétaire
        if (currentUser && data.owner_id === currentUser.id) {
          setIsOwner(true);
        }

        // Récupérer les chants de la chorale triés par titre
        const songsData = await getChoirSongs(id!);
        setSongs(songsData);
      } catch {
        navigate('/');
        return;
      }

      setLoading(false);
    };
    fetchChoir();
  }, [id, navigate]);

  // Formater le code en groupes de 2 chiffres séparés par des tirets
  // Ex : "51056723" → "51-05-67-23"
  const formatCode = (code: string) => code.match(/.{1,2}/g)?.join('-') ?? code;

  return (
    <div className="page-container">
      <div className="top-bar">
        <Link to="/my-choirs" className="navigation">←</Link>
        {user && <Link to="/login" className="navigation">⎋</Link>}
      </div>
      {loading ? ( <div className="spinner"></div> ) : (
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
                    {/* Affichage des hashtags sous forme de pills */}
                    {s.hashtags && s.hashtags.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.3rem' }}>
                        {s.hashtags.map((tag: string) => (
                          <span key={tag} className="hashtag-pill">{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Icône suppression visible uniquement pour le propriétaire */}
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