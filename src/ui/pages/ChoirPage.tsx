import { useState, useEffect } from 'react'; 
import { useNavigate, useParams } from 'react-router-dom';
import { getCurrentUser, getUserDelegations, getUserParamId } from '../../infrastructure/storage/authService';
import { getChoir } from '../../infrastructure/storage/choirsService';
import { getChoirSongs, toggleFavoriteSong, toggleCommonSong } from '../../infrastructure/storage/songsService';
import { getChoirEvents, toggleEventActive } from '../../infrastructure/storage/eventsService';
import { getStoredChoirs, getStoredEvents } from '../../infrastructure/storage/localStorageService';
import '../../App.css';
import TopBar from '../components/TopBar';
import { type UserProfile } from '../components/helpData';

export default function ChoirPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [choir, setChoir] = useState<any>(null);
  const [isOwner, setIsOwner] = useState(false);
  // Vrai si l'utilisateur a rejoint la chorale explicitement (via son code)
  // Faux si l'utilisateur n'a accès qu'à certains événements (chorale "fantôme")
  const [isFullMember, setIsFullMember] = useState(false);
  const [songs, setSongs] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'events' | 'songs'>('events');
  const [groupByHashtag, setGroupByHashtag] = useState(false);

  const [isDelegate, setIsDelegate] = useState(false);
  const [userParamId, setUserParamId] = useState<number | null>(null);

  type FilterState = 'all' | 'true' | 'false';
  const [filterCommon, setFilterCommon] = useState<FilterState>('all');
  const [filterFavorite, setFilterFavorite] = useState<FilterState>('all');

  const [helpProfiles, setHelpProfiles] = useState<UserProfile[]>([]);

  useEffect(() => {
    const fetchChoir = async () => {
      // Récupérer l'utilisateur connecté (peut être null)
      const currentUser = await getCurrentUser();

      // Vérifier si l'utilisateur a la délégation pour cette chorale
      const delegations = currentUser ? await getUserDelegations(currentUser.email!) : [];
      setIsDelegate(delegations.includes(String(id)));

      // Récupérer l'id dans users_param pour identifier les événements créés par le délégué
      if (currentUser) {
        const paramId = await getUserParamId(currentUser.email!);
        setUserParamId(paramId);
      }

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
      
      let ownerCheckLocal = false;

      // Stratégie d'accès à deux niveaux :
      // 1. Vérification rapide depuis le localStorage (offline-first) pour déterminer les droits de base
      // 2. Vérification Supabase pour obtenir les données à jour et confirmer le propriétaire
      // En cas d'échec Supabase, les données localStorage servent de fallback
      try {
        // Récupérer la chorale depuis Supabase
        const data = await getChoir(id!);
        setChoir(data);

        // Vérifier si l'utilisateur connecté est le propriétaire
        const ownerCheck = currentUser && data.owner_id === currentUser.id;
        ownerCheckLocal = !!ownerCheck;
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

        // Récupérer les chants (propriétaire et délégations) et les événements en parallèle
        const [songsData, eventsData] = await Promise.all([
          (ownerCheck || delegations.includes(String(id))) ? getChoirSongs(id!) : Promise.resolve([]),
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
          .map((e: any) => ({
            id: e.id,
            name: e.name,
            code: e.code,
            event_date: e.event_date
          }))
          .sort(
            (a, b) =>
              new Date(b.event_date).getTime() -
              new Date(a.event_date).getTime()
          );
        setEvents(offlineEvents);

        // En mode offline, les chants ne sont pas disponibles car leurs fichiers ne sont pas en cache
        // (seuls les fichiers d'un événement mis en cache dans MyEventsPage sont accessibles offline)        
        setSongs([]);
      }

      // Construire les profils d'aide — déterminés par rapport à cette chorale spécifique
      const profiles: UserProfile[] = [];
      if (!currentUser) {
        if (isInJoinedChoirs) profiles.push('member');
        else if (hasDirectEvent) profiles.push('guest');
        else profiles.push('anonymous');
      } else {
        // Utiliser les variables déjà calculées dans ce useEffect
        if (ownerCheckLocal) profiles.push('owner');
        else if (delegations.includes(String(id))) profiles.push('delegate');
        else if (isInJoinedChoirs) profiles.push('member');
        else if (hasDirectEvent) profiles.push('guest');
        else profiles.push('anonymous');
      }
      setHelpProfiles(profiles);      

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
      groups.push({
        tag,
        songs: songsToGroup
          .filter((s) => s.hashtags?.includes(tag))
          .sort((a, b) => a.title.localeCompare(b.title, 'fr', { sensitivity: 'base' })),
      });
    }
    const noTagSongs = songsToGroup
      .filter((s) => !s.hashtags || s.hashtags.length === 0)
      .sort((a, b) => a.title.localeCompare(b.title, 'fr', { sensitivity: 'base' }));
    if (noTagSongs.length > 0) {
      groups.push({ tag: 'Sans hashtag', songs: noTagSongs });
    }
    return groups;
  };

  const handleToggleEventActive = async (evId: string, current: boolean) => {
    try {
      await toggleEventActive(evId, !current);
      // Mettre à jour le state local sans recharger
      setEvents((prev) =>
        prev.map((ev) => String(ev.id) === String(evId) ? { ...ev, active: !current } : ev)
      );
    } catch {}
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

  const handleToggleCommon = async (songId: string, current: boolean) => {
    try {
      await toggleCommonSong(songId, !current);
      setSongs((prev) =>
        prev.map((s) => s.id === songId ? { ...s, is_common: !current } : s)
      );
    } catch {}
  };

  // Ordre alphabétique
  const sortedSongs = [...songs].sort((a, b) =>
    a.title.localeCompare(b.title, 'fr', { sensitivity: 'base' })
  );

  // Appliquer les filtres
  const filteredSongs = sortedSongs.filter((s) => {
    if (filterCommon === 'true' && !s.is_common) return false;
    if (filterCommon === 'false' && s.is_common) return false;
    if (filterFavorite === 'true' && !s.is_favorite) return false;
    if (filterFavorite === 'false' && s.is_favorite) return false;
    return true;
  });

  return (
    <div className="page-container">
      <TopBar helpPage="choir" helpProfiles={helpProfiles} />
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

          {/* Onglets : l'onglet Chants n'est visible que pour le propriétaire et pour les utilisateurs ayant reçu délégation */}
          <div style={{ display: 'flex', marginBottom: '1.5rem', borderBottom: '3px solid #ddd' }}>
            {(isOwner || isDelegate) && (
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
                      {/* Icône calendrier : rose si actif, grise si inactif
                          Cliquable uniquement par le propriétaire ou le délégué créateur */}
                      <i
                        className="fa fa-calendar-days note"
                        onClick={() => {
                          const canToggle = isOwner || (isDelegate && userParamId !== null && ev.created_by === userParamId);
                          if (canToggle) handleToggleEventActive(String(ev.id), ev.active ?? true);
                        }}
                        style={{
                          color: (ev.active ?? true) ? '#DA486D' : '#ccc',
                          cursor: (isOwner || (isDelegate && userParamId !== null && ev.created_by === userParamId)) ? 'pointer' : 'default',
                        }}
                      />
                      <div
                        className="text"
                        onClick={() => navigate(`/event/${ev.id}`)}
                        style={{ cursor: 'pointer' }}
                      >
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                          {/* Griser le contenu si inactif */}
                          <strong style={{ color: (ev.active ?? true) ? undefined : '#aaa' }}>{ev.name}</strong>

                          {isOwner && ev.views > 0 && (
                            <span style={{
                              fontSize: '0.75rem', color: '#888',
                              backgroundColor: '#f0f0f0',
                              padding: '0.15rem 0.4rem',
                              borderRadius: '6px',
                            }}>
                              {ev.views} vue{ev.views > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>

                        <div style={{ paddingLeft: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.1rem', marginTop: '0.2rem' }}>
                          {ev.event_date && (
                            <span style={{ fontSize: '0.85rem', color: (ev.active ?? true) ? undefined : '#aaa' }}>
                              Date : {new Date(ev.event_date).toLocaleDateString('fr-FR')}
                            </span>
                          )}
                          <span style={{ fontSize: '0.85rem', color: (ev.active ?? true) ? undefined : '#aaa' }}>
                            Code : {formatCode(String(ev.code))}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}>
                        {/* Icône quitter : uniquement si l'événement a été rejoint directement
                          (pas via la chorale) — les membres explicites ne peuvent pas quitter
                          un événement individuellement */}
                        {isOwner ? (
                          <i className="fa fa-trash trash" style={{ marginLeft: 0 }} onClick={() => navigate(`/delete-event/${ev.id}`)} />
                        ) : isDelegate && userParamId !== null && ev.created_by === userParamId ? (
                          // Délégué : peut supprimer les événements qu'il a créés
                          <i className="fa fa-trash trash" style={{ marginLeft: 0 }} onClick={() => navigate(`/delete-event/${ev.id}`)} />
                        ) : !isFullMember ? (
                          // Membre fantôme : a rejoint l'événement directement → peut le quitter
                          <i className="fa fa-sign-out trash" style={{ marginLeft: 0 }} onClick={() => navigate(`/leave-event/${ev.id}`)} />
                        ) : null /* Membre explicite : voit tous les events via la chorale → pas d'icône quitter */}

                        {/* Icône offline : bleue si mémorisé, grise sinon → redirige vers my-events */}
                        {(() => {
                          const isCached = getStoredEvents().find((se) => String(se.id) === String(ev.id))?.is_cached ?? false;
                          return (
                            <i
                              className="fa fa-download"
                              onClick={(e) => { e.stopPropagation(); navigate('/my-events'); }}
                              style={{ fontSize: '1.1rem', color: isCached ? '#044C8D' : '#ccc', cursor: 'pointer', marginLeft: '0.5rem' }}
                            />
                          );
                        })()}
                      </div>
                    </div>
                  ))}
                </ul>
              )}

              {/* Bouton ajout événement (propriétaire uniquement) */}
              {(isOwner || isDelegate) && (
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
                    <i className="fa fa-hashtag"></i> &nbsp; Par hashtags
                  </button>
                </div>
              )}

              {/* Filtres commun + favori */}
              {songs.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1.5rem', justifyContent: 'center' }}>

                  {/* Filtre commun */}
                  <i className="fa fa-music" style={{ color: '#888', flexShrink: 0 }}></i>
                  {(['all', 'true', 'false'] as FilterState[]).map((val) => (
                    <button
                      key={val}
                      onClick={() => setFilterCommon(val)}
                      style={{
                        padding: '0.2rem 0.6rem',
                        border: 'none',
                        borderRadius: '20px',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        backgroundColor:
                          filterCommon === val
                            ? val === 'true' ? '#FFB300'
                            : val === 'false' ? '#DA486D'
                            : '#044C8D'
                            : '#E6F2FF',
                        color: filterCommon === val ? 'white' : '#044C8D',
                        fontWeight: filterCommon === val ? 'bold' : 'normal',
                        textDecoration: val === 'false' ? 'line-through' : 'none',
                      }}
                    >
                      {val === 'all' ? 'Tous' : '♪'}
                    </button>
                  ))}

                  {/* Séparateur */}
                  <span style={{ color: '#ddd' }}>|</span>

                  {/* Filtre favori */}
                  <i className="fa fa-heart" style={{ color: '#888', flexShrink: 0 }}></i>
                  {(['all', 'true', 'false'] as FilterState[]).map((val) => (
                    <button
                      key={val}
                      onClick={() => setFilterFavorite(val)}
                      style={{
                        padding: '0.2rem 0.6rem',
                        border: 'none',
                        borderRadius: '20px',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        backgroundColor:
                          filterFavorite === val
                            ? val === 'true' ? '#DA486D'
                            : val === 'false' ? '#aaa'
                            : '#044C8D'
                            : '#E6F2FF',
                        color: filterFavorite === val ? 'white' : '#044C8D',
                        fontWeight: filterFavorite === val ? 'bold' : 'normal',
                        textDecoration: val === 'false' ? 'line-through' : 'none',
                      }}
                    >
                      {val === 'all' ? 'Tous' : '♥'}
                    </button>
                  ))}

                </div>
              )}

              {/* Compteur */}
              {songs.length > 0 && (
                <p style={{ color: '#888', fontSize: '0.85rem', margin: '0 0 0.5rem 0' }}>
                  {filteredSongs.length} chant{filteredSongs.length !== 1 ? 's' : ''}
                </p>
              )}

              {songs.length === 0 ? (
                <p>Aucun chant pour cette chorale.</p>
              ) : !groupByHashtag ? (
                // ── Vue alphabétique ──
                <ul className="list-music">
                  {filteredSongs.map((s) => (
                    <div key={s.id} className="card-music pink">
                      <i
                        className="fa fa-music"
                        onClick={isOwner ? () => handleToggleCommon(s.id, s.is_common) : undefined}
                        style={{
                          cursor: 'pointer',
                          color: s.is_common ? '#FFB300' : '#DA486D',
                          fontSize: '1.2rem',
                          marginRight: '0.5rem',
                        }}
                      ></i>
                      {/* Icône cœur : toggle favori */}
                      <i
                        className="fa fa-heart"
                        onClick={isOwner ? () => handleToggleFavorite(s.id, s.is_favorite) : undefined}
                        style={{
                          cursor: 'pointer',
                          color: s.is_favorite ? '#DA486D' : '#ddd',
                          fontSize: '1.2rem',
                          marginLeft: '0.5rem',
                          marginRight: '1rem',
                        }}
                      ></i>
                      <div className="text" 
                        onClick={() => navigate(`/song/${s.id}`, {
                          state: {
                            backUrl: `/choir/${id}`,
                            // Liste ordonnée des ids après filtres — permet le swipe dans SongPage
                            songList: filteredSongs.map((s) => s.id),
                          }
                        })}                        
                        style={{ cursor: 'pointer' }}
                        >

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                          <strong>{s.title}</strong>

                          {isOwner && s.code && (
                            <span style={{
                              fontSize: '0.7rem',
                              backgroundColor: '#eee',
                              padding: '0.15rem 0.4rem',
                              borderRadius: '6px',
                              color: '#555',
                            }}>
                              {s.code}
                            </span>
                          )}

                          {isOwner && s.views > 0 && (
                            <span style={{
                              fontSize: '0.7rem', color: '#888',
                              backgroundColor: '#f0f0f0',
                              padding: '0.15rem 0.4rem',
                              borderRadius: '6px',
                              marginLeft: '0.3rem',
                            }}>
                              {s.views} vue{s.views > 1 ? 's' : ''}
                            </span>
                          )}

                        </div>

                        {s.hashtags?.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.3rem' }}>
                            {s.hashtags.map((tag: string) => (
                              <span key={tag} className="hashtag-pill">{tag}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      {/* Icône delete — propriétaire uniquement */}
                      {isOwner && (
                        <i className="fa fa-trash trash" onClick={() => navigate(`/delete-song/${s.id}`)}></i>
                      )}
                    </div>
                  ))}
                </ul>
              ) : (
                // ── Vue par hashtag ──
                <>
                  {getGroupedSongs(filteredSongs).map(({ tag, songs: groupSongs }) => (
                    <div key={tag} style={{ marginBottom: '1.2rem' }}>
                      <p style={{ color: '#044C8D', fontWeight: 'bold', margin: '0.5rem 0' }}>{tag}</p>
                      <ul className="list-music">
                        {groupSongs.map((s) => (
                          <div key={`${tag}-${s.id}`} className="card-music pink">
                            <i
                              className="fa fa-music"
                              onClick={isOwner ? () => handleToggleCommon(s.id, s.is_common) : undefined}
                              style={{
                                cursor: 'pointer',
                                color: s.is_common ? '#FFB300' : '#DA486D',
                                fontSize: '1.2rem',
                                marginRight: '0.5rem',
                              }}
                            ></i>
                            {/* Icône cœur : toggle favori */}
                            <i
                              className="fa fa-heart"
                              onClick={isOwner ? () => handleToggleFavorite(s.id, s.is_favorite) : undefined}
                              style={{
                                cursor: 'pointer',
                                color: s.is_favorite ? '#DA486D' : '#ddd',
                                fontSize: '1.2rem',
                                marginLeft: '0.5rem',
                                marginRight: '1rem',
                              }}
                            ></i>
                            <div className="text" 
                              onClick={() => navigate(`/song/${s.id}`, {
                                state: {
                                  backUrl: `/choir/${id}`,
                                  // Liste ordonnée des ids après filtres — permet le swipe dans SongPage
                                  songList: getGroupedSongs(filteredSongs).flatMap((g) => g.songs.map((s) => s.id)),
                                }
                              })}
                              style={{ cursor: 'pointer' }}
                              >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                                <strong>{s.title}</strong>

                                {isOwner && s.code && (
                                  <span style={{
                                    fontSize: '0.7rem',
                                    backgroundColor: '#eee',
                                    padding: '0.15rem 0.4rem',
                                    borderRadius: '6px',
                                    color: '#555',
                                  }}>
                                    {s.code}
                                  </span>
                                )}

                                {isOwner && s.views > 0 && (
                                  <span style={{
                                    fontSize: '0.7rem', color: '#888',
                                    backgroundColor: '#f0f0f0',
                                    padding: '0.15rem 0.4rem',
                                    borderRadius: '6px',
                                    marginLeft: '0.3rem',
                                  }}>
                                    {s.views} vue{s.views > 1 ? 's' : ''}
                                  </span>
                                )}

                              </div>
                            </div>
                            {/* Icône delete — propriétaire uniquement */}
                            {isOwner && (
                              <i className="fa fa-trash trash" onClick={() => navigate(`/delete-song/${s.id}`)}></i>
                            )}
                          </div>
                        ))}
                      </ul>
                    </div>
                  ))}
                </>
              )}

              {/* Boutons ajout / import / délégation — propriétaire uniquement */}
              {isOwner && (
                <>
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
            </>
          )}

          {/* Bouton supprimer / quitter :
              - propriétaire → supprimer la chorale
              - membre explicite → quitter la chorale
              - membre fantôme → pas de bouton (il n'a pas rejoint la chorale) */}
          {isOwner ? (
            <>
              <div style={{ marginTop: '1.5rem' }}>
                <button className="page-button" onClick={() => navigate(`/choir-delegation/${choir.id}`)}>
                  <i className="fa fa-user-plus"></i> &nbsp; Donner délégation
                </button>
              </div>
              <div style={{ marginTop: '1.5rem' }}>
                <button className="page-button orange" onClick={() => navigate(`/delete-choir/${choir.id}`)}>
                  <i className="fa fa-users"></i> &nbsp; Supprimer la chorale
                </button>
              </div>
            </>
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