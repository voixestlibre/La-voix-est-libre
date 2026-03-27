import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getChoir } from '../../infrastructure/storage/choirsService';
import { getCurrentUser, getUserDelegations } from '../../infrastructure/storage/authService';
import { getStoredChoirs, setStoredChoirs, removeStoredEventsByChoirId } from '../../infrastructure/storage/localStorageService';
import '../../App.css';
import TopBar from '../components/TopBar';
import { type UserProfile } from '../components/helpData';

export default function LeaveChoirPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [choirName, setChoirName] = useState('');
  const [loading, setLoading] = useState(true);
  const [helpProfiles, setHelpProfiles] = useState<UserProfile[]>([]);

  useEffect(() => {
    const init = async () => {
      // Vérifier si la chorale est encore dans le localStorage
      // Si elle n'y est plus, c'est qu'elle a déjà été quittée → redirection
      const stored = getStoredChoirs();
      const found = stored.find((c) => String(c.id) === String(id));
      if (!found) { navigate('/my-choirs'); return; }

      const currentUser = await getCurrentUser();

      try {
        const data = await getChoir(id!);
        setChoirName(data.name);
        // Rediriger le propriétaire vers la page de la chorale        
        if (currentUser && data.owner_id === currentUser.id) {
          navigate(`/choir/${id}`, { replace: true });
          return;
        }        
      } catch {
        // Fallback offline
        setChoirName(found.name);
      }
      
      // Construire les profils d'aide
      try {        
        if (currentUser) {
          const delegations = await getUserDelegations(currentUser.email!);
          if (delegations.includes(String(id))) {
            setHelpProfiles(['delegate']);
          } else {
            setHelpProfiles(['member']);
          }
        } else {
          setHelpProfiles(['member']);
        }
      } catch {
        setHelpProfiles(['member']);
      }      

      setLoading(false); 
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
      <TopBar helpPage="choir-leave" helpProfiles={helpProfiles} />
      <h2>Quitter une chorale</h2>
      {loading ? <div className="spinner"></div> : (
        <>
          <p>Êtes-vous sûr de vouloir quitter la chorale <strong>{choirName}</strong> ?</p>
          <div style={{ margin: '0.5rem 0' }}>
            <button className="page-button" onClick={handleLeave}>
              Confirmer
            </button>
          </div>
          <div>
            <button className="page-button2" onClick={() => navigate(-1)}>
              Annuler
            </button>
          </div>
        </>
      )}
    </div>
  );
}