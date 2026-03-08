import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { getCurrentUser } from '../../infrastructure/storage/authService';
import { getChoirOwner } from '../../infrastructure/storage/choirsService';
import { getEvent, getEventSongsDetails } from '../../infrastructure/storage/eventsService';
import '../../App.css';

export default function EventPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<any>(null);
  const [songs, setSongs] = useState<any[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      // Récupérer l'utilisateur connecté (peut être null)
      const currentUser = await getCurrentUser();
      if (currentUser) setUser(currentUser);

      try {
        // Récupérer l'événement
        const eventData = await getEvent(eventId!);
        setEvent(eventData);

        // Vérifier si l'utilisateur est propriétaire de la chorale
        const ownerId = await getChoirOwner(String(eventData.choir_id));
        if (currentUser && ownerId === currentUser.id) {
          setIsOwner(true);
        }

        // Récupérer les chants associés à l'événement
        const songsData = await getEventSongsDetails(eventId!);
        setSongs(songsData);
      } catch {
        navigate('/');
        return;
      }

      setLoading(false);
    };
    fetchData();
  }, [eventId, navigate]);

  // Formater le code en groupes de 2 chiffres séparés par des tirets
  const formatCode = (code: string) => code.match(/.{1,2}/g)?.join('-') ?? code;

  // Formater une date ISO en jj/mm/aaaa
  const formatDate = (isoDate: string) => {
    const d = new Date(isoDate);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  };

  return (
    <div className="page-container">
      <div className="top-bar">
        {/* Retour vers la page de la chorale */}
        <Link to={`/choir/${event?.choir_id}`} className="navigation">
          <i className="fa fa-chevron-left"></i>
        </Link>
        {user && (
          <Link to="/login" className="navigation">
            <i className="fa fa-right-from-bracket"></i>
          </Link>
        )}
      </div>

      {loading ? <div className="spinner"></div> : (
        <>
          <h2>
            <i className="fa fa-calendar-days" style={{ color: '#DA486D', marginRight: '0.5rem' }}></i>
            {event.name}
          </h2>

          <p><strong>Code :</strong> {formatCode(String(event.code))}</p>
          <p><strong>Date :</strong> {formatDate(event.event_date)}</p>

          {/* Liste des chants associés à l'événement */}
          {songs.length === 0 ? (
            <p>Aucun chant associé à cet événement.</p>
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

          {/* Boutons propriétaire uniquement */}
          {isOwner && (
            <>
              <div style={{ marginTop: '1.5rem' }}>
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