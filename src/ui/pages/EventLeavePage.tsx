import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getCurrentUser } from '../../infrastructure/storage/authService';
import { getEvent } from '../../infrastructure/storage/eventsService';
import { getStoredEvents, removeStoredEvent, getCachedEvent, clearCachedEventId } from '../../infrastructure/storage/localStorageService';
import { clearEventCache } from '../../infrastructure/storage/cacheService';
import '../../App.css';
import TopBar from '../components/TopBar';

export default function LeaveEventPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [eventName, setEventName] = useState('');
  const [choirId, setChoirId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      // Vérifier si l'utilisateur est connecté
      await getCurrentUser();

      // Si l'événement n'est plus dans le localStorage → déjà quitté
      const stored = getStoredEvents();
      const found = stored.find((e) => String(e.id) === String(eventId));
      if (!found) { navigate('/my-choirs', { replace: true }); return; }

      try {
        // Récupérer l'événement depuis Supabase
        const data = await getEvent(eventId!);
        setEventName(data.name);
        setChoirId(String(data.choir_id));
      } catch {
        // Fallback offline : chercher dans le localStorage
        setEventName(found.name);
        setChoirId(String(found.choir_id));
      }

      setLoading(false);
    };
    init();
  }, [eventId, navigate]);

  const handleLeave = async () => {
    // Supprimer le cache si cet événement était mémorisé
    const cachedEvent = getCachedEvent();
    if (cachedEvent && String(cachedEvent.id) === String(eventId)) {
      await clearEventCache(eventId!);
      clearCachedEventId();
    }

    // Supprimer l'événement du localStorage
    removeStoredEvent(eventId!);

    // Si la chorale de rattachement est connue, retourner à sa page
    // (elle sera peut-être une chorale fantôme, mais MyChoirsPage la recalculera)
    // Sinon retourner à la liste des chorales
    if (choirId) {
      navigate(`/choir/${choirId}`);
    } else {
      navigate('/my-choirs');
    }
  };

  return (
    <div className="page-container">
      <TopBar />
      <h2>Quitter un événement</h2>

      {loading ? <div className="spinner"></div> : (
        <>
          <p>Êtes-vous sûr de vouloir quitter l'événement <strong>{eventName}</strong> ?</p>
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