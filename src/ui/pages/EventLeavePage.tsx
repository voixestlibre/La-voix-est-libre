import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { getCurrentUser } from '../../infrastructure/storage/authService';
import { getEvent } from '../../infrastructure/storage/eventsService';
import { getStoredEvents, removeStoredEvent } from '../../infrastructure/storage/localStorageService';
import '../../App.css';

export default function LeaveEventPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [eventName, setEventName] = useState('');
  const [choirId, setChoirId] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const init = async () => {
      // Vérifier si l'utilisateur est connecté
      const currentUser = await getCurrentUser();
      if (currentUser) setUser(currentUser);

      try {
        // Récupérer l'événement depuis Supabase
        const data = await getEvent(eventId!);
        setEventName(data.name);
        setChoirId(String(data.choir_id));
      } catch {
        // Fallback offline : chercher dans le localStorage
        const stored = getStoredEvents();
        const found = stored.find((e) => String(e.id) === String(eventId));
        if (found) {
          setEventName(found.name);
          setChoirId(String(found.choir_id));
        } else {
          // Événement introuvable même en localStorage → retour à la liste
          navigate('/my-choirs');
        }
      }
    };
    init();
  }, [eventId, navigate]);

  const handleLeave = () => {
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
      <div className="top-bar">
        <Link to={`/event/${eventId}`} className="navigation">
          <i className="fa fa-chevron-left"></i>
        </Link>
        {user && (
          <Link to="/login" className="navigation">
            <i className="fa fa-right-from-bracket"></i>
          </Link>
        )}
      </div>
      <h2>Quitter un événement</h2>
      <p>Êtes-vous sûr de vouloir quitter l'événement <strong>{eventName}</strong> ?</p>
      <div style={{ margin: '0.5rem 0' }}>
        <button className="page-button" onClick={handleLeave}>
          Confirmer
        </button>
      </div>
      <div>
        <button className="page-button2" onClick={() => navigate(`/event/${eventId}`)}>
          Annuler
        </button>
      </div>
    </div>
  );
}