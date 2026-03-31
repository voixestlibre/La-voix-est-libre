import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getCurrentUser, getUserParamId } from '../../infrastructure/storage/authService';
import { getChoirOwner } from '../../infrastructure/storage/choirsService';
import { getEvent, deleteEvent } from '../../infrastructure/storage/eventsService';
import { removeStoredEvent, getCachedEvent, clearCachedEventId } from '../../infrastructure/storage/localStorageService';
import { clearEventCache } from '../../infrastructure/storage/cacheService';
import '../../App.css';
import TopBar from '../components/TopBar';
import { type UserProfile } from '../components/helpData';

export default function EventDeletePage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<any>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const [helpProfiles, setHelpProfiles] = useState<UserProfile[]>([]);

  useEffect(() => {
    const init = async () => {
      // Vérifier que l'utilisateur est connecté
      const currentUser = await getCurrentUser();
      if (!currentUser) { navigate('/'); return; }

      try {
        // Récupérer l'événement
        const eventData = await getEvent(eventId!);

        // Boucle historique : si l'événement n'existe plus → déjà supprimé
        if (!eventData) { navigate('/my-choirs', { replace: true }); return; }

        setEvent(eventData);

        // Vérifier que l'utilisateur est propriétaire de la chorale ou créateur de l'évenement
        const ownerId = await getChoirOwner(String(eventData.choir_id));
        const isOwner = ownerId === currentUser.id;

        // Construire les profils d'aide
        if (isOwner) setHelpProfiles(['owner']);
        else setHelpProfiles(['delegate']);        

        const userParamId = await getUserParamId(currentUser.email!);
        const isCreator = userParamId !== null && eventData.created_by === userParamId;

        // Note : les profils d'aide sont définis AVANT la vérification d'accès finale
        // car setHelpProfiles ne bloque pas l'exécution — si l'utilisateur est redirigé,
        // les profils ne seront de toute façon jamais affichés.        
        if (!isOwner && !isCreator) { navigate('/'); return; }

        setPageLoading(false);
      } catch {
        // Supabase inaccessible ou événement introuvable → déjà supprimé
        navigate('/my-choirs', { replace: true });
      }
    };
    init();
  }, [eventId, navigate]);

  // Note : deleteEvent ne supprime que l'événement et ses liens event_songs en base.
  // Les fichiers audio/PDF des chants ne sont PAS supprimés — ils appartiennent aux chants,
  // pas à l'événement. Seul le cache local de cet événement est supprimé.  
  const handleDelete = async () => {
    setLoading(true);
    try {
      // Supprimer l'événement en base et ses liens avec les chants
      await deleteEvent(eventId!);

      // Supprimer l'événement du localStorage
      // (pour tous les utilisateurs qui l'auraient rejoint)
      removeStoredEvent(eventId!);

      // Supprimer le cache si cet événement était mémorisé
      const cachedEvent = getCachedEvent();
      if (cachedEvent && String(cachedEvent.id) === String(eventId)) {
        await clearEventCache(eventId!);
        clearCachedEventId();
      }

      navigate(`/choir/${event.choir_id}`);
    } catch (err: any) {
      setMessage(`Erreur : ${err.message}`);
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <TopBar helpPage="event-delete" helpProfiles={helpProfiles} />
      <h2>Supprimer un événement</h2>

      {pageLoading || loading ? <div className="spinner"></div> : (
        <>
          <p>Êtes-vous sûr de vouloir supprimer l'événement <strong>{event.name}</strong> ?</p>
          <div style={{ margin: '0.5rem 0' }}>
            <button className="page-button" onClick={handleDelete}>
              Confirmer
            </button>
          </div>
          <div>
            <button className="page-button2" onClick={() => navigate(-1)}>
              Annuler
            </button>
          </div>
          {message && <p style={{ color: 'red' }}>{message}</p>}
        </>
      )}
    </div>
  );
}