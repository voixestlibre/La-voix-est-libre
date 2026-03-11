import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { getCurrentUser } from '../../infrastructure/storage/authService';
import { getChoir } from '../../infrastructure/storage/choirsService';
import { getChoirSongs, toggleFavoriteSong } from '../../infrastructure/storage/songsService';
import { getChoirEvents } from '../../infrastructure/storage/eventsService';
import { getStoredChoirs, getStoredEvents } from '../../infrastructure/storage/localStorageService';
import '../../App.css';

export default function ChoirPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [choir, setChoir] = useState<any>(null);
  const [isOwner, setIsOwner] = useState(false);
  // Vrai si l'utilisateur a rejoint la chorale explicitement (via son code)
  // Faux si l'utilisateur n'a accès qu'à certains événements (chorale "fantôme")
  const [isFullMember, setIsFullMember] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [songs, setSongs] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'events' | 'songs'>('events');
  const [groupByHashtag, setGroupByHashtag] = useState(false);

  useEffect(() => {
    const fetchChoir = async () => {
      // Récupérer l'utilisateur connecté (peut être null)
      const currentUser = await getCurrentUser();
      if (currentUser) setUser(currentUser);

      // ── Vérifier les droits d'accès depuis le localStorage ───────────
      // joined_choirs : chorales rejointes explicitement (code connu)
      const joinedChoirs = getStoredChoirs();
      // joined_events : événements rejoints (directement ou via une chorale)
      const joinedEvents = getStoredEvents();

      // Vérifier si la chorale est dans joined_choirs (membre explicite)
      const isInJoinedChoirs = joinedChoirs.some((c: any) => String(c.id) === String(id));

      // Vérifier si l'utilisateur a au moins un événement de cette chorale
      const hasDirectEvent = joinedEvents.some((e: any) => String(e.choir_id) === String(id));

      // Récupérer les codes d'événements auxquels l'utilisateur a accès pour cette chorale
      // (utilisé plus bas pour filtrer les événements affichés)
      const allowedEventCodes = joinedEvents
        .filter((e: any) => String(e.choir_id) === String(id))
        .map((e: any) => String(e.code));

      try {
        // Récupérer la chorale depuis Supabase
        const data = await getChoir(id!);
        setChoir(data);

        // Vérifier si l'utilisateur connecté est le propriétaire
        const ownerCheck = currentUser && data.owner_id === currentUser.id;
        setIsOwner(!!ownerCheck);
        if (ownerCheck) setActiveTab('songs');

        // Un membre explicite = propriétaire OU chorale dans joined_choirs
        const fullMember = !!ownerCheck || isInJoinedChoirs;
        setIsFullMember(fullMember);

        // Vérifier les droits d'accès :
        // - propriétaire → accès total
        // - membre explicite → accès total
        // - événement direct → accès limité aux événements concernés
        // - aucun des trois → redirection
        if (!ownerCheck && !isInJoinedChoirs && !hasDirectEvent) {
          navigate('/');
          return;
        }

        // Récupérer les chants (propriétaire uniquement) et les événements en parallèle
        const [songsData, eventsData] = await Promise.all([
          ownerCheck ? getChoirSongs(id!) : Promise.resolve([]),
          getChoirEvents(id!),
        ]);
        setSongs(songsData);

        // Filtrer les événements selon les droits :
        // - propriétaire ou membre explicite → tous les événements
        // - accès via événement direct uniquement → uniquement les événements autorisés
        if (fullMember) {
          setEvents(eventsData);
        } else {
          setEvents(eventsData.filter((ev: any) => allowedEventCodes.includes(String(ev.code))));
        }

      } catch {
        // ── Fallback offline ─────────────────────────────────────────────
        // Supabase inaccessible : on reconstruit ce qu'on peut depuis le localStorage

        // Vérifier les droits d'accès offline
        if (!isInJoinedChoirs && !hasDirectEvent) {
          // Pas de droits connus → redirection
          navigate('/');
          return;
        }

        // Reconstituer la chorale depuis le localStorage
        const choirFromStorage = joinedChoirs.find((c: any) => String(c.id) === String(id));
        if (choirFromStorage) {
          setChoir({ id: choirFromStorage.id, name: choirFromStorage.name, code: choirFromStorage.code });
          setIsFullMember(true);
        } else {
          // Chorale fantôme : on récupère le nom depuis joined_events
          const eventWithChoir = joinedEvents.find((e: any) => String(e.choir_id) === String(id));
          if (eventWithChoir) {
            setChoir({ id, name: eventWithChoir.choir_name, code: null });
          }
          setIsFullMember(false);
        }

        // Reconstituer les événements depuis le localStorage
        // On affiche uniquement les événements auxquels l'utilisateur a accès
        const offlineEvents = joinedEvents
          .filter((e: any) => String(e.choir_id) === String(id))
          .map((e: any) => ({ id: e.id, name: e.name, code: e.code }));
        setEvents(offlineEvents);

        // Pas de chants accessibles offline (les fichiers ne sont pas en cache)
        setSongs([]);
      }

      setLoading(false);
    };
    fetchChoir();
  }, [id, navigate]);

  // Formater le code en groupes de 2 chiffres séparés par des tirets
  const formatCode = (code: string) => code.match(/.{1,2}/g)?.join('-') ?? code;

  // Style d'un onglet selon qu'il est actif ou non
  const tabStyle = (tab: 'events' | 'songs') => ({
    flex: 1,
    padding: '0.6rem 0',
    border: 'none',
    borderBottom: activeTab === tab ? '3px solid #044C8D' : '3px solid #ddd',
    backgroundColor: 'white',
    color: activeTab === tab ? '#044C8D' : '#888',
    fontWeight: activeTab === tab ? 'bold' : 'normal',
    fontSize: '1rem',
    cursor: 'pointer',
  } as React.CSSProperties);

  // Construire la liste des chants groupés par hashtags
  const getGroupedSongs = (songsToGroup: any[]) => {
    const groups: { tag: string; songs: any[] }[] = [];
    const allTags = Array.from(new Set(songsToGroup.flatMap((s) => s.hashtags || []))).sort();
    for (const tag of allTags) {
      groups.push({ tag, songs: songsToGroup.filter((s) => s.hashtags?.includes(tag)) });
    }
    const noTagSongs = songsToGroup.filter((s) => !s.hashtags || s.hashtags.length === 0);
    if (noTagSongs.length > 0) {
      groups.push({ tag: 'Sans hashtag', songs: noTagSongs });
    }
    return groups;
  };

  const handleToggleFavorite = async (songId: string, current: boolean) => {
    try {
      await toggleFavoriteSong(songId, !current);
      // Mettre à jour le state local sans recharger tous les chants
      setSongs((prev) =>
        prev.map((s) => s.id === songId ? { ...s, is_favorite: !current } : s)
      );
    } catch {}
  };

  // Favoris en premier, puis ordre alphabétique
  const sortedSongs = [...songs].sort((a, b) => {
    if (a.is_favorite && !b.is_favorite) return -1;
    if (!a.is_favorite && b.is_favorite) return 1;
    return 0;
  });

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

      {loading ? <div className="spinner"></div> : (
        <>
          <h2>
            <i className="fa fa-users" style={{ color: '#FB8917', marginRight: '0.5rem' }}></i>
            {choir.name}
          </h2>

          {/* Code de la chorale : masqué pour les membres "fantômes"
              (accès via événement direct uniquement) pour éviter qu'ils
              ne rejoignent la chorale et accèdent à tous ses événements */}
          {isFullMember && choir.code && (
            <p><strong>Code :</strong> {formatCode(String(choir.code))}</p>
          )}

          {/* Onglets : l'onglet Chants n'est visible que pour le propriétaire */}
          <div style={{ display: 'flex', marginBottom: '1.5rem', borderBottom: '3px solid #ddd' }}>
            {isOwner && (
              <button style={tabStyle('songs')} onClick={() => setActiveTab('songs')}>
                <i className="fa fa-music"></i> &nbsp; Chants
              </button>
            )}
            <button style={tabStyle('events')} onClick={() => setActiveTab('events')}>
              <i className="fa fa-calendar-days"></i> &nbsp; Evénements
            </button>
          </div>

          {/* ── Onglet Événements ── */}
          {activeTab === 'events' && (
            <>
              {events.length === 0 ? (
                <p>Aucun événement pour cette chorale.</p>
              ) : (
                <ul className="list-music">
                  {events.map((ev) => (
                    <div key={ev.id} className="card-music pink">
                      <i className="fa fa-calendar-days note"></i>
                      <div
                        className="text"
                        onClick={() => navigate(`/event/${ev.id}`)}
                        style={{ cursor: 'pointer' }}
                      >
                        <strong>{ev.name}</strong>
                        {/* Le code de l'événement est toujours affiché :
                            l'utilisateur en a besoin pour le partager */}
                        <span>Code : {formatCode(String(ev.code))}</span>
                      </div>

                      {/* Icône quitter : uniquement si l'événement a été rejoint directement
                          (pas via la chorale) — les membres explicites ne peuvent pas quitter
                          un événement individuellement */}
                      {isOwner ? (
                        <i
                          className="fa fa-trash trash"
                          onClick={() => navigate(`/delete-event/${ev.id}`)}
                        ></i>
                      ) : !isFullMember ? (
                        // Membre fantôme : a rejoint l'événement directement → peut le quitter
                        <i
                          className="fa fa-sign-out trash"
                          onClick={() => navigate(`/leave-event/${ev.id}`)}
                        ></i>
                      ) : null /* Membre explicite : voit tous les events via la chorale → pas d'icône quitter */}

                    </div>
                  ))}
                </ul>
              )}

              {/* Bouton ajout événement (propriétaire uniquement) */}
              {isOwner && (
                <div>
                  <button
                    className="page-button"
                    onClick={() => navigate(`/add-event/${choir.id}`)}
                  >
                    <i className="fa fa-calendar-days"></i> &nbsp;
                    Ajouter un événement
                  </button>
                </div>
              )}
            </>
          )}

          {/* ── Onglet Chants (propriétaire uniquement) ── */}
          {activeTab === 'songs' && (
            <>
              {songs.length > 0 && (
                <div style={{ display: 'flex', marginBottom: '1rem', backgroundColor: '#E6F2FF', borderRadius: '8px', padding: '0.2rem' }}>
                  <button
                    onClick={() => setGroupByHashtag(false)}
                    style={{
                      flex: 1, padding: '0.4rem', border: 'none', borderRadius: '6px', cursor: 'pointer',
                      backgroundColor: !groupByHashtag ? '#044C8D' : 'transparent',
                      color: !groupByHashtag ? 'white' : '#044C8D',
                      fontSize: '0.85rem', fontWeight: !groupByHashtag ? 'bold' : 'normal',
                    }}
                  >
                    <i className="fa fa-arrow-down-a-z"></i> &nbsp; Alphabétique
                  </button>
                  <button
                    onClick={() => setGroupByHashtag(true)}
                    style={{
                      flex: 1, padding: '0.4rem', border: 'none', borderRadius: '6px', cursor: 'pointer',
                      backgroundColor: groupByHashtag ? '#044C8D' : 'transparent',
                      color: groupByHashtag ? 'white' : '#044C8D',
                      fontSize: '0.85rem', fontWeight: groupByHashtag ? 'bold' : 'normal',
                    }}
                  >
                    <i className="fa fa-hashtag"></i> &nbsp; Par hashtag
                  </button>
                </div>
              )}

              {songs.length === 0 ? (
                <p>Aucun chant pour cette chorale.</p>
              ) : !groupByHashtag ? (
                // ── Vue alphabétique ──
                <ul className="list-music">
                  {sortedSongs.map((s) => (
                    <div key={s.id} className="card-music pink">
                      <i className="fa fa-music note"></i>
                      {/* Icône cœur : toggle favori */}
                      <i
                        className="fa fa-heart"
                        onClick={() => handleToggleFavorite(s.id, s.is_favorite)}
                        style={{
                          cursor: 'pointer',
                          color: s.is_favorite ? '#DA486D' : '#ddd',
                          fontSize: '1.2rem',
                          marginLeft: '0.5rem',
                          marginRight: '1rem',
                        }}
                      ></i>
                      <div className="text" onClick={() => navigate(`/song/${s.id}`)} style={{ cursor: 'pointer' }}>
                        <strong>{s.title}</strong>
                        {s.hashtags?.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.3rem' }}>
                            {s.hashtags.map((tag: string) => (
                              <span key={tag} className="hashtag-pill">{tag}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      {/* Icône delete */}
                      <i className="fa fa-trash trash" onClick={() => navigate(`/delete-song/${s.id}`)}></i>
                    </div>
                  ))}
                </ul>
              ) : (
                // ── Vue par hashtag ──
                <>
                  {getGroupedSongs(sortedSongs).map(({ tag, songs: groupSongs }) => (
                    <div key={tag} style={{ marginBottom: '1.2rem' }}>
                      <p style={{ color: '#044C8D', fontWeight: 'bold', margin: '0.5rem 0' }}>{tag}</p>
                      <ul className="list-music">
                        {groupSongs.map((s) => (
                          <div key={`${tag}-${s.id}`} className="card-music pink">
                            <i className="fa fa-music note"></i>
                            {/* Icône cœur : toggle favori */}
                            <i
                              className="fa fa-heart"
                              onClick={() => handleToggleFavorite(s.id, s.is_favorite)}
                              style={{
                                cursor: 'pointer',
                                color: s.is_favorite ? '#DA486D' : '#ddd',
                                fontSize: '1.2rem',
                                marginLeft: '0.5rem',
                                marginRight: '1rem',
                              }}
                            ></i>
                            <div className="text" onClick={() => navigate(`/song/${s.id}`)} style={{ cursor: 'pointer' }}>
                              <strong>{s.title}</strong>
                            </div>
                            {/* Icône delete */}
                            <i className="fa fa-trash trash" onClick={() => navigate(`/delete-song/${s.id}`)}></i>
                          </div>
                        ))}
                      </ul>
                    </div>
                  ))}
                </>
              )}

              {/* Boutons ajout / import (propriétaire uniquement) */}
              <div>
                <button className="page-button" onClick={() => navigate(`/add-song/${choir.id}`)}>
                  <i className="fa fa-music"></i> &nbsp; Ajouter un chant
                </button>
              </div>
              <div style={{ marginTop: '0.5rem' }}>
                <button className="page-button" onClick={() => navigate(`/import-songs/${choir.id}`)}>
                  <i className="fa fa-folder-open"></i> &nbsp; Importer des chants
                </button>
              </div>
            </>
          )}

          {/* Bouton supprimer / quitter :
              - propriétaire → supprimer la chorale
              - membre explicite → quitter la chorale
              - membre fantôme → pas de bouton (il n'a pas rejoint la chorale) */}
          {isOwner ? (
            <div style={{ marginTop: '1.5rem' }}>
              <button className="page-button orange" onClick={() => navigate(`/delete-choir/${choir.id}`)}>
                <i className="fa fa-users"></i> &nbsp; Supprimer la chorale
              </button>
            </div>
          ) : isFullMember ? (
            <div style={{ marginTop: '1.5rem' }}>
              <button className="page-button orange" onClick={() => navigate(`/leave-choir/${choir.id}`)}>
                <i className="fa fa-users"></i> &nbsp; Quitter la chorale
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}