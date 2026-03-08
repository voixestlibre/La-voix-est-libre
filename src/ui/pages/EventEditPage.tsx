import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { getCurrentUser } from '../../infrastructure/storage/authService';
import { getChoirOwner } from '../../infrastructure/storage/choirsService';
import { getChoirSongs } from '../../infrastructure/storage/songsService';
import { getEvent, createEvent, updateEvent, getEventSongs, setEventSongs } from '../../infrastructure/storage/eventsService';
import '../../App.css';

export default function EventEditPage() {
  const { choirId, eventId } = useParams();
  const isEditing = !!eventId;
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [resolvedChoirId, setResolvedChoirId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Liste de tous les chants de la chorale
  const [availableSongs, setAvailableSongs] = useState<any[]>([]);
  // Ids des chants sélectionnés pour cet événement
  const [selectedSongIds, setSelectedSongIds] = useState<string[]>([]);

  const backUrl = isEditing ? `/event/${eventId}` : `/choir/${resolvedChoirId}`;

  useEffect(() => {
    const init = async () => {
      const currentUser = await getCurrentUser();
      if (!currentUser) { navigate('/'); return; }

      if (isEditing) {
        try {
          const data = await getEvent(eventId!);
          setName(data.name);
          setResolvedChoirId(String(data.choir_id));

          // Décomposer la date en jour / mois / année
          if (data.event_date) {
            const d = new Date(data.event_date);
            setDay(String(d.getDate()).padStart(2, '0'));
            setMonth(String(d.getMonth() + 1).padStart(2, '0'));
            setYear(String(d.getFullYear()));
          }

          // Vérifier que l'utilisateur est propriétaire
          const ownerId = await getChoirOwner(String(data.choir_id));
          if (ownerId !== currentUser.id) { navigate('/'); return; }

          // Charger les chants de la chorale et les chants déjà associés
          const [songs, eventSongIds] = await Promise.all([
            getChoirSongs(String(data.choir_id)),
            getEventSongs(eventId!),
          ]);
          setAvailableSongs(songs);
          setSelectedSongIds(eventSongIds);
        } catch {
          navigate('/');
        }
      } else {
        const ownerId = await getChoirOwner(choirId!);
        if (ownerId !== currentUser.id) { navigate('/'); return; }
        setResolvedChoirId(choirId!);

        // Charger les chants de la chorale
        const songs = await getChoirSongs(choirId!);
        setAvailableSongs(songs);
      }
    };
    init();
  }, [choirId, eventId, navigate, isEditing]);

  // Cocher / décocher un chant
  const toggleSong = (songId: string) => {
    setSelectedSongIds((prev) =>
      prev.includes(songId)
        ? prev.filter((id) => id !== songId)
        : [...prev, songId]
    );
  };

  // Valider et construire la date depuis les 3 champs jj/mm/aaaa
  const buildDate = (): string | null => {
    const d = parseInt(day, 10);
    const m = parseInt(month, 10);
    const y = parseInt(year, 10);
    if (
      isNaN(d) || isNaN(m) || isNaN(y) ||
      d < 1 || d > 31 ||
      m < 1 || m > 12 ||
      y < 2000 || y > 2100
    ) return null;
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage('');

    const eventDate = buildDate();
    if (!eventDate) {
      setMessage('Veuillez saisir une date valide (jj mm aaaa).');
      return;
    }

    setLoading(true);
    try {
      if (isEditing) {
        // Mettre à jour l'événement et ses chants associés
        await updateEvent(eventId!, name, eventDate);
        await setEventSongs(eventId!, selectedSongIds);
        navigate(`/event/${eventId}`);
      } else {
        // Créer l'événement et associer les chants sélectionnés
        const data = await createEvent(resolvedChoirId, name, eventDate);
        await setEventSongs(String(data.id), selectedSongIds);
        navigate(`/event/${data.id}`);
      }
    } catch (err: any) {
      setMessage(`Erreur : ${err.message}`);
    }
    setLoading(false);
  };

  return (
    <div className="page-container">
      <div className="top-bar">
        <Link to={backUrl} className="navigation">
          <i className="fa fa-chevron-left"></i>
        </Link>
        <Link to="/login" className="navigation">
          <i className="fa fa-right-from-bracket"></i>
        </Link>
      </div>

      <h2>{isEditing ? 'Modifier un événement' : 'Ajouter un événement'}</h2>

      <form onSubmit={handleSubmit}>
        {/* Nom de l'événement */}
        <input
          type="text"
          placeholder="Nom de l'événement"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="page-form-input"
        />

        {/* Saisie de la date en 3 champs séparés */}
        <div style={{ display: 'flex', gap: '0.5rem', margin: '0.5rem 0', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="JJ"
            value={day}
            onChange={(e) => setDay(e.target.value.replace(/\D/g, '').slice(0, 2))}
            maxLength={2}
            style={{ width: '3.5rem', textAlign: 'center' }}
            className="page-form-input"
            required
          />
          <span style={{ color: '#044C8D', fontWeight: 'bold' }}>/</span>
          <input
            type="text"
            placeholder="MM"
            value={month}
            onChange={(e) => setMonth(e.target.value.replace(/\D/g, '').slice(0, 2))}
            maxLength={2}
            style={{ width: '3.5rem', textAlign: 'center' }}
            className="page-form-input"
            required
          />
          <span style={{ color: '#044C8D', fontWeight: 'bold' }}>/</span>
          <input
            type="text"
            placeholder="AAAA"
            value={year}
            onChange={(e) => setYear(e.target.value.replace(/\D/g, '').slice(0, 4))}
            maxLength={4}
            style={{ width: '5rem', textAlign: 'center' }}
            className="page-form-input"
            required
          />
        </div>

        {/* Sélection des chants associés à l'événement */}
        {availableSongs.length > 0 && (
          <>
            <p style={{ color: '#044C8D', fontWeight: 'bold', margin: '1rem 0 0.5rem 0' }}>
              Chants associés à cet événement :
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1rem' }}>
              {availableSongs.map((s) => (
                <label
                  key={s.id}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer' }}
                >
                  <input
                    type="checkbox"
                    checked={selectedSongIds.includes(s.id)}
                    onChange={() => toggleSong(s.id)}
                    style={{ width: '1.2rem', height: '1.2rem', accentColor: '#044C8D' }}
                  />
                  <span>
                    {s.title}
                    {s.hashtags && s.hashtags.length > 0 && (
                      <span style={{ color: '#044C8D', fontSize: '0.85rem', marginLeft: '0.4rem' }}>
                        ({s.hashtags.join(', ')})
                      </span>
                    )}
                  </span>

                </label>
              ))}
            </div>
          </>
        )}

        {availableSongs.length === 0 && (
          <p style={{ color: '#888', margin: '0.5rem 0 1rem 0' }}>
            Aucun chant enregistré pour cette chorale.
          </p>
        )}

        <div style={{ marginBottom: '0.5rem' }}>
          <button className="page-button" type="submit" disabled={loading}>
            {loading ? 'Enregistrement...' : isEditing ? 'Modifier' : 'Créer'}
          </button>
        </div>

        {/* Bouton annuler */}
        <div>
          <button
            type="button"
            className="page-button2"
            onClick={() => navigate(backUrl)}
          >
            Annuler
          </button>
        </div>
      </form>

      {message && <p style={{ color: 'red' }}>{message}</p>}
    </div>
  );
}