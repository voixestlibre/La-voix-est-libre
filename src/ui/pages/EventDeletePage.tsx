import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { getCurrentUser, getUserParamId } from '../../infrastructure/storage/authService';
import { getChoirOwner } from '../../infrastructure/storage/choirsService';
import { getEvent, deleteEvent } from '../../infrastructure/storage/eventsService';
import { removeStoredEvent } from '../../infrastructure/storage/localStorageService';
import '../../App.css';

export default function EventDeletePage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const init = async () => {
      // Vérifier que l'utilisateur est connecté
      const currentUser = await getCurrentUser();
      if (!currentUser) { navigate('/'); return; }

      try {
        // Récupérer l'événement
        const eventData = await getEvent(eventId!);
        setEvent(eventData);

        // Vérifier que l'utilisateur est propriétaire de la chorale ou créateur de l'évenement
        const ownerId = await getChoirOwner(String(eventData.choir_id));
        const isOwner = ownerId === currentUser.id;
        
        const userParamId = await getUserParamId(currentUser.email!);
        const isCreator = userParamId !== null && eventData.created_by === userParamId;
        
        if (!isOwner && !isCreator) { navigate('/'); return; }
      } catch {
        navigate('/');
      }
    };
    init();
  }, [eventId, navigate]);

  const handleDelete = async () => {
    setLoading(true);
    try {
      // Supprimer l'événement en base et ses liens avec les chants
      await deleteEvent(eventId!);
  
      // Supprimer l'événement du localStorage
      // (pour tous les utilisateurs qui l'auraient rejoint)
      removeStoredEvent(eventId!);
  
      navigate(`/choir/${event.choir_id}`);
    } catch (err: any) {
      setMessage(`Erreur : ${err.message}`);
    }
    setLoading(false);
  };

  return (
    <div className="page-container">
      <div className="top-bar">
        <Link to={`/event/${eventId}`} className="navigation">
          <i className="fa fa-chevron-left"></i>
        </Link>
        <Link to="/login" className="navigation">
          <i className="fa fa-right-from-bracket"></i>
        </Link>
      </div>

      <h2>Supprimer un événement</h2>

      {event && (
        <p>
          Êtes-vous sûr de vouloir supprimer l'événement <strong>{event.name}</strong> ?
        </p>
      )}

      <div style={{ margin: '0.5rem 0' }}>
        <button className="page-button" onClick={handleDelete} disabled={loading}>
          {loading ? 'Suppression...' : 'Confirmer'}
        </button>
      </div>
      <div>
        <button className="page-button2" onClick={() => navigate(`/event/${eventId}`)}>
          Annuler
        </button>
      </div>

      {message && <p style={{ color: 'red' }}>{message}</p>}
    </div>
  );
}