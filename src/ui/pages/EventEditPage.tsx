import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getCurrentUser, getUserDelegations, getUserParamId } from '../../infrastructure/storage/authService';
import { getChoirOwner } from '../../infrastructure/storage/choirsService';
import { getChoirSongs } from '../../infrastructure/storage/songsService';
import { getEvent, createEvent, updateEvent, getEventSongs, setEventSongs } from '../../infrastructure/storage/eventsService';
import { getStoredEvents, setStoredEvents } from '../../infrastructure/storage/localStorageService';
import '../../App.css';
import TopBar from '../components/TopBar';
import { type UserProfile } from '../components/helpData';

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

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [pageLoading, setPageLoading] = useState(true);

  // Liste de tous les chants de la chorale
  const [availableSongs, setAvailableSongs] = useState<any[]>([]);
  const [songFilter, setSongFilter] = useState('');
  const [groupByHashtag, setGroupByHashtag] = useState(false);
  // Ids des chants sélectionnés pour cet événement
  const [selectedSongIds, setSelectedSongIds] = useState<string[]>([]);

  const backUrl = isEditing ? `/event/${eventId}` : `/choir/${resolvedChoirId}`;

  const [helpProfiles, setHelpProfiles] = useState<UserProfile[]>([]);

  useEffect(() => {
    const init = async () => {
      const currentUser = await getCurrentUser();
      if (!currentUser) { navigate('/'); return; }
      setCurrentUser(currentUser);
      
      const delegations = await getUserDelegations(currentUser.email!);
      
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
      
          // Autoriser : propriétaire OU créateur de l'événement
          const ownerId = await getChoirOwner(String(data.choir_id));
          const userParamId = await getUserParamId(currentUser.email!);
          const isOwner = ownerId === currentUser.id;
          const isCreator = userParamId !== null && data.created_by === userParamId;

          // Construire les profils d'aide
          if (isOwner) setHelpProfiles(['owner']);
          else setHelpProfiles(['delegate']);          
      
          if (!isOwner && !isCreator) { navigate('/'); return; }
      
          // Charger les chants de la chorale et les chants déjà associés
          const [songs, eventSongIds] = await Promise.all([
            getChoirSongs(String(data.choir_id)),
            getEventSongs(eventId!),
          ]);
          setAvailableSongs(songs);
          setSelectedSongIds(eventSongIds);
          setPageLoading(false);
        } catch {
          navigate('/');
        }
      } else {
        const ownerId = await getChoirOwner(choirId!);
        const isOwner = ownerId === currentUser.id;
        const isDelegate = delegations.includes(choirId!);

        // Construire les profils d'aide
        if (isOwner) setHelpProfiles(['owner']);
        else setHelpProfiles(['delegate']);
        
        if (!isOwner && !isDelegate) { navigate('/'); return; }
      
        setResolvedChoirId(choirId!);
        // Charger les chants de la chorale
        const songs = await getChoirSongs(choirId!);
        setAvailableSongs(songs);
        setPageLoading(false);
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

  // Déplacer un chant vers le haut (-1) ou vers le bas (+1) dans la liste ordonnée
  const moveSong = (index: number, direction: -1 | 1) => {
    const newIds = [...selectedSongIds];
    const target = index + direction;
    if (target < 0 || target >= newIds.length) return;
    [newIds[index], newIds[target]] = [newIds[target], newIds[index]];
    setSelectedSongIds(newIds);
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
      // Chants sélectionnés sous forme { id, title } pour le cache offline
      const songsForStorage = selectedSongIds.map((songId) => {
        const song = availableSongs.find((s) => s.id === songId);
        return { id: songId, title: song?.title ?? '' };
      });

      if (isEditing) {
        // Mettre à jour l'événement en base
        await updateEvent(eventId!, name, eventDate);
        await setEventSongs(eventId!, selectedSongIds);
        
        const stored = getStoredEvents();
        const updated = stored.map((e) =>
          String(e.id) === String(eventId)
            ? { ...e, name, event_date: eventDate, songs: songsForStorage }
            : e
        );
        setStoredEvents(updated);
  
        navigate(`/event/${eventId}`);
      } else {
        // Créer l'événement en base
        const userParamId = await getUserParamId(currentUser!.email!);
        const data = await createEvent(resolvedChoirId, name, eventDate, userParamId!);
        await setEventSongs(String(data.id), selectedSongIds);

        const stored = getStoredEvents();
        setStoredEvents([...stored, {
          id: data.id,
          code: String(data.code),
          name: data.name,
          choir_id: data.choir_id,
          event_date: data.event_date,
          choir_name: null, // sera renseigné au prochain passage sur MyChoirsPage
          songs: songsForStorage,
        }]);

        navigate(`/event/${data.id}`);
      }
    } catch (err: any) {
      setMessage(`Erreur : ${err.message}`);
    }
    setLoading(false);
  };

  // Normaliser une chaîne pour la recherche (minuscules, sans accents, oe/ae)
  const normalize = (str: string) =>
    str.replace(/œ/g, 'oe').replace(/Œ/g, 'oe').replace(/æ/g, 'ae').replace(/Æ/g, 'ae')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/,/g, ' ').replace(/\s+/g, ' ').trim()
      .toLowerCase();

  const getGroupedSongs = (songs: any[]) => {
    const allTags = Array.from(new Set(songs.flatMap((s) => s.hashtags || []))).sort() as string[];
    const groups: { tag: string; songs: any[] }[] = allTags.map((tag) => ({
      tag,
      songs: songs.filter((s) => s.hashtags?.includes(tag)),
    }));
    const noTagSongs = songs.filter((s) => !s.hashtags || s.hashtags.length === 0);
    if (noTagSongs.length > 0) groups.push({ tag: 'Sans hashtag', songs: noTagSongs });
    return groups;
  };
      
  return (
    <div className="page-container">
      <TopBar helpPage="event-edit" helpProfiles={helpProfiles} />
      <h2>{isEditing ? 'Modifier un événement' : 'Ajouter un événement'}</h2>

      {pageLoading || loading ? <div className="spinner"></div> : (
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

          {/* Sélection et ordonnancement des chants */}
          {availableSongs.length > 0 && (
            <>
              {/* Ordre des chants sélectionnés */}
              {selectedSongIds.length > 0 && (
                <>
                  <p style={{ color: '#044C8D', fontWeight: 'bold', margin: '1rem 0 0.5rem 0' }}>
                    Ordre des chants :
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1rem' }}>
                    {selectedSongIds.map((id, index) => {
                      const song = availableSongs.find((s) => s.id === id);
                      if (!song) return null;
                      return (
                        <div key={id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', backgroundColor: '#E6F2FF', borderRadius: '8px', padding: '0.4rem 0.8rem' }}>
                          <span style={{ color: '#044C8D', fontWeight: 'bold', minWidth: '1.5rem' }}>{index + 1}.</span>
                          <span style={{ flex: 1 }}>{song.title}</span>
                          <button type="button" onClick={() => moveSong(index, -1)} disabled={index === 0}
                            style={{ background: 'none', border: 'none', cursor: index === 0 ? 'default' : 'pointer', color: index === 0 ? '#ccc' : '#044C8D', fontSize: '1rem' }}>▲</button>
                          <button type="button" onClick={() => moveSong(index, 1)} disabled={index === selectedSongIds.length - 1}
                            style={{ background: 'none', border: 'none', cursor: index === selectedSongIds.length - 1 ? 'default' : 'pointer', color: index === selectedSongIds.length - 1 ? '#ccc' : '#044C8D', fontSize: '1rem' }}>▼</button>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              <p style={{ color: '#044C8D', fontWeight: 'bold', margin: '1rem 0 0.5rem 0' }}>
                Chants associés à cet événement :
              </p>

              {/* Toggle alphabétique / par hashtag */}
              <div style={{ display: 'flex', marginBottom: '0.6rem', backgroundColor: '#E6F2FF', borderRadius: '8px', padding: '0.2rem', width: 'fit-content' }}>
                <button type="button" onClick={() => setGroupByHashtag(false)}
                  style={{ padding: '0.3rem 0.8rem', border: 'none', borderRadius: '6px', cursor: 'pointer', backgroundColor: !groupByHashtag ? '#044C8D' : 'transparent', color: !groupByHashtag ? 'white' : '#044C8D', fontSize: '0.8rem', fontWeight: !groupByHashtag ? 'bold' : 'normal' }}>
                  <i className="fa fa-arrow-down-a-z"></i> &nbsp; Alphabétique
                </button>
                <button type="button" onClick={() => setGroupByHashtag(true)}
                  style={{ padding: '0.3rem 0.8rem', border: 'none', borderRadius: '6px', cursor: 'pointer', backgroundColor: groupByHashtag ? '#044C8D' : 'transparent', color: groupByHashtag ? 'white' : '#044C8D', fontSize: '0.8rem', fontWeight: groupByHashtag ? 'bold' : 'normal' }}>
                  <i className="fa fa-hashtag"></i> &nbsp; Par hashtag
                </button>
              </div>

              {/* Filtre de recherche */}
              <div style={{ position: 'relative', display: 'inline-flex', width: 'fit-content' }}>
                <input type="text" placeholder="Rechercher..." value={songFilter}
                  onChange={(e) => setSongFilter(e.target.value)}
                  className="page-form-input"
                  style={{ fontSize: '0.85rem', margin: '0.3rem 0 0.6rem 0', paddingRight: '2.5rem', width: '220px' }}
                />
                {songFilter && (
                  <span onClick={() => setSongFilter('')}
                    style={{ position: 'absolute', right: '-1.4rem', top: '50%', transform: 'translateY(-60%)', cursor: 'pointer', color: '#044C8D', fontSize: '1.3rem', lineHeight: 1 }}>×</span>
                )}
              </div>

              {/* Liste des chants */}
              {(() => {
                const filtered = availableSongs.filter((s) => {
                  if (!songFilter.trim()) return true;
                  const search = normalize(songFilter);
                  return normalize(s.title).includes(search) || s.hashtags?.some((h: string) => normalize(h).includes(search));
                });

                const SongCheckbox = ({ s }: { s: any }) => (
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={selectedSongIds.includes(s.id)} onChange={() => toggleSong(s.id)}
                      style={{ width: '1.2rem', height: '1.2rem', accentColor: '#044C8D' }} />
                    <span>
                      {s.title}
                      {!groupByHashtag && s.hashtags?.length > 0 && (
                        <span style={{ color: '#888', fontSize: '0.85rem', marginLeft: '0.4rem' }}>({s.hashtags.join(', ')})</span>
                      )}
                    </span>
                  </label>
                );

                if (!groupByHashtag) {
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1rem' }}>
                      {filtered.map((s) => <SongCheckbox key={s.id} s={s} />)}
                    </div>
                  );
                }

                return (
                  <div style={{ marginBottom: '1rem' }}>
                    {getGroupedSongs(filtered).map(({ tag, songs: groupSongs }) => (
                      <div key={tag} style={{ marginBottom: '0.8rem' }}>
                        <p style={{ color: '#044C8D', fontWeight: 'bold', margin: '0.4rem 0 0.3rem 0', fontSize: '0.9rem' }}>
                          {tag}
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', paddingLeft: '0.5rem' }}>
                          {groupSongs.map((s) => <SongCheckbox key={`${tag}-${s.id}`} s={s} />)}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
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
          <div>
            <button type="button" className="page-button2" onClick={() => navigate(backUrl)}>
              Annuler
            </button>
          </div>
        </form>
      )}

      {message && <p style={{ color: 'red' }}>{message}</p>}
    </div>
  );
}