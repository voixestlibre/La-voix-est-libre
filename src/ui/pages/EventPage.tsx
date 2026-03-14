import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getCurrentUser, getUserParamId } from '../../infrastructure/storage/authService';
import { getChoirOwner } from '../../infrastructure/storage/choirsService';
import { getEvent, getEventSongsDetails } from '../../infrastructure/storage/eventsService';
import { getStoredChoirs, getStoredEvents } from '../../infrastructure/storage/localStorageService';
import '../../App.css';
import TopBar from '../components/TopBar';

export default function EventPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<any>(null);
  const [songs, setSongs] = useState<any[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isDirectEventMember, setIsDirectEventMember] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      // Récupérer l'utilisateur connecté (peut être null)
      const currentUser = await getCurrentUser();

      // ── Vérifier les droits d'accès depuis le localStorage ───────────
      // joined_choirs : chorales rejointes explicitement (code connu)
      const storedChoirs = getStoredChoirs();
      // joined_events : événements rejoints (directement ou via une chorale)
      const storedEvents = getStoredEvents();

      // Vérifier si l'événement est dans joined_events
      const storedEvent = storedEvents.find((e) => String(e.id) === String(eventId));

      // Vérifier si la chorale de rattachement est dans joined_choirs
      const choirId = storedEvent?.choir_id;
      const isChoirMember = choirId
        ? storedChoirs.some((c) => String(c.id) === String(choirId))
        : false;

      // L'utilisateur a accès si :
      // - il a rejoint l'événement directement (storedEvent trouvé)
      // - OU il a rejoint la chorale de rattachement (isChoirMember)
      // Note : le cas propriétaire sera vérifié après l'appel Supabase
      const hasLocalAccess = !!storedEvent || isChoirMember;

      // Vrai uniquement si l'événement a été rejoint directement
      // (pas via la chorale) — détermine si le bouton "Quitter" est affiché
      setIsDirectEventMember(!!storedEvent && !isChoirMember);      

      try {
        // Récupérer l'événement depuis Supabase
        const eventData = await getEvent(eventId!);
        setEvent(eventData);

        // Vérifier si l'utilisateur est propriétaire de la chorale
        const ownerId = await getChoirOwner(String(eventData.choir_id));
        const ownerCheck = currentUser && ownerId === currentUser.id;
        if (ownerCheck) setIsOwner(true);

        // Vérifier si l'utilisateur est le créateur de l'événement
        const userParamId = currentUser ? await getUserParamId(currentUser.email!) : null;
        const creatorCheck = userParamId !== null && eventData.created_by === userParamId;
        if (creatorCheck) setIsCreator(true);

        // Contrôle d'accès final :
        // - propriétaire → accès total
        // - accès local (chorale ou événement rejoint) → accès lecture
        // - aucun droit → redirection
        if (!ownerCheck && !hasLocalAccess) {
          navigate('/');
          return;
        }

        // Récupérer les chants associés à l'événement
        const songsData = await getEventSongsDetails(eventId!);
        setSongs(songsData);

      } catch {
        // ── Fallback offline ─────────────────────────────────────────────
        // Supabase inaccessible : on reconstruit ce qu'on peut depuis le localStorage

        // Vérifier les droits d'accès offline
        if (!hasLocalAccess) {
          navigate('/');
          return;
        }

        // Reconstituer l'événement depuis le localStorage
        if (storedEvent) {
          setEvent({
            id: storedEvent.id,
            name: storedEvent.name,
            code: storedEvent.code,
            choir_id: storedEvent.choir_id,
            event_date: storedEvent.event_date ?? null,
          });
          // Chants disponibles offline grâce au cache localStorage
          setSongs(storedEvent.songs ?? []);
        } else { 
          setSongs([]); 
        }
      }

      setLoading(false);
    };
    fetchData();
  }, [eventId, navigate]);

  // Formater le code en groupes de 2 chiffres séparés par des tirets
  const formatCode = (code: string) => code.match(/.{1,2}/g)?.join('-') ?? code;

  // Formater une date ISO en jj/mm/aaaa
  // Retourne null si la date n'est pas disponible (mode offline)
  const formatDate = (isoDate: string | null) => {
    if (!isoDate) return null;
    const d = new Date(isoDate);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  };

  return (
    <div className="page-container">
      <TopBar />
      
      {loading ? <div className="spinner"></div> : (
        <>
          <h2>
            <i className="fa fa-calendar-days" style={{ color: '#DA486D', marginRight: '0.5rem' }}></i>
            {event.name}
          </h2>

          {/* Code de l'événement : toujours affiché
              (utile pour partager l'événement avec d'autres membres) */}
          <p><strong>Code :</strong> {formatCode(String(event.code))}</p>

          {/* Date : masquée en mode offline car non stockée en localStorage */}
          {formatDate(event.event_date) && (
            <p><strong>Date :</strong> {formatDate(event.event_date)}</p>
          )}

          {/* Liste des chants associés à l'événement
              Non disponible en mode offline */}
          {songs.length === 0 ? (
            <p>Aucun chant associé à cet événement.</p>
          ) : (
            <ul className="list-music">
              {songs.map((s) => (
                <div key={s.id} className="card-music pink">
                  <i className="fa fa-music note"></i>
                  <div
                    className="text"
                    onClick={() => navigate(`/song/${s.id}`, { state: { backUrl: `/event/${eventId}` } })}
                    style={{ cursor: 'pointer' }}
                  >
                    <strong>{s.title}</strong>
                    {/* Hashtags sous forme de pills */}
                    {s.hashtags && s.hashtags.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.3rem' }}>
                        {s.hashtags.map((tag: string) => (
                          <span key={tag} className="hashtag-pill">{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </ul>
          )}

          {/* Bouton quitter : uniquement pour les non-propriétaires
              ayant rejoint l'événement directement (pas via la chorale) */}
          {!isOwner && isDirectEventMember && (
            <div style={{ marginTop: '1.5rem' }}>
              <button
                className="page-button pink"
                onClick={() => navigate(`/leave-event/${eventId}`)}
              >
                <i className="fa fa-sign-out"></i> &nbsp;
                Quitter l'événement
              </button>
            </div>
          )}

          {/* Boutons modification / suppression (propriétaire ou délégué) */}
          {(isOwner || isCreator) && (
            <>
              <div style={{ marginTop: '2.5rem' }}>
                <button
                  className="page-button pink"
                  onClick={() => navigate(`/edit-event/${event.id}`)}
                >
                  <i className="fa fa-calendar-days"></i> &nbsp;
                  Modifier l'événement
                </button>
              </div>
              <div style={{ marginTop: '1.5rem' }}>
                <button
                  className="page-button pink"
                  onClick={() => navigate(`/delete-event/${event.id}`)}
                >
                  <i className="fa fa-calendar-days"></i> &nbsp;
                  Supprimer l'événement
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}