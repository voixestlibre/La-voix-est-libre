import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { getCurrentUser } from '../../infrastructure/storage/authService';
import { getChoir } from '../../infrastructure/storage/choirsService';
import { getStoredChoirs, setStoredChoirs, removeStoredEventsByChoirId } from '../../infrastructure/storage/localStorageService';
import '../../App.css';

export default function LeaveChoirPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [choirName, setChoirName] = useState('');
  const [choirCode, setChoirCode] = useState('');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const init = async () => {
      // Vérifier si l'utilisateur est connecté
      const currentUser = await getCurrentUser();
      if (currentUser) setUser(currentUser);

      try {
        // Récupérer la chorale depuis Supabase
        const data = await getChoir(id!);
        setChoirName(data.name);
        setChoirCode(String(data.code));
      } catch {
        // Fallback offline : chercher dans le localStorage
        const stored = getStoredChoirs();
        const found = stored.find((c) => String(c.id) === String(id));
        if (found) {
          setChoirName(found.name);
          setChoirCode(found.code);
        } else {
          // Chorale introuvable même en localStorage → retour à la liste
          navigate('/my-choirs');
        }
      }
    };
    init();
  }, [id, navigate]);

  const handleLeave = () => {
    // Supprimer la chorale du localStorage (comparaison par id)
    setStoredChoirs(getStoredChoirs().filter((c) => String(c.id) !== String(id)));

    // Supprimer aussi tous les événements de cette chorale dans joined_events
    // (sinon ils resteraient en localStorage et créeraient une chorale fantôme indésirable)
    removeStoredEventsByChoirId(id!);

    navigate('/my-choirs');
  };

  return (
    <div className="page-container">
      <div className="top-bar">
        <Link to="/my-choirs" className="navigation">
          <i className="fa fa-chevron-left"></i>
        </Link>
        {user && (
          <Link to="/login" className="navigation">
            <i className="fa fa-right-from-bracket"></i>
          </Link>
        )}
      </div>
      <h2>Quitter une chorale</h2>
      <p>Êtes-vous sûr de vouloir quitter la chorale <strong>{choirName}</strong> ?</p>
      <div style={{ margin: '0.5rem 0' }}>
        <button className="page-button" onClick={handleLeave}>
          Confirmer
        </button>
      </div>
      <div>
        <button className="page-button2" onClick={() => navigate('/my-choirs')}>
          Annuler
        </button>
      </div>
    </div>
  );
}