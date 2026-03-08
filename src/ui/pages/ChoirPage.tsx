import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { getCurrentUser } from '../../infrastructure/storage/authService';
import { getChoir } from '../../infrastructure/storage/choirsService';
import { getChoirSongs } from '../../infrastructure/storage/songsService';
import { getChoirEvents } from '../../infrastructure/storage/eventsService';
import '../../App.css';

export default function ChoirPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [choir, setChoir] = useState<any>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [songs, setSongs] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  // Onglet actif : 'events' ou 'songs'
  const [activeTab, setActiveTab] = useState<'events' | 'songs'>('songs');
  const [groupByHashtag, setGroupByHashtag] = useState(false);

  useEffect(() => {
    const fetchChoir = async () => {
      // Récupérer l'utilisateur connecté (peut être null)
      const currentUser = await getCurrentUser();
      if (currentUser) setUser(currentUser);

      try {
        // Récupérer la chorale
        const data = await getChoir(id!);
        setChoir(data);

        // Vérifier si l'utilisateur connecté est le propriétaire
        if (currentUser && data.owner_id === currentUser.id) {
          setIsOwner(true);
        }

        // Récupérer les chants et les événements en parallèle
        const [songsData, eventsData] = await Promise.all([
          getChoirSongs(id!),
          getChoirEvents(id!),
        ]);
        setSongs(songsData);
        setEvents(eventsData);
      } catch {
        navigate('/');
        return;
      }

      setLoading(false);
    };
    fetchChoir();
  }, [id, navigate]);

  // Formater le code en groupes de 2 chiffres séparés par des tirets
  const formatCode = (code: string) => code.match(/.{1,2}/g)?.join('-') ?? code;

  // Formater une date ISO en jj/mm/aaaa
  const formatDate = (isoDate: string) => {
    const d = new Date(isoDate);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  };

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

  // Construire la liste groupée par hashtags
  const getGroupedSongs = () => {
    const groups: { tag: string; songs: any[] }[] = [];
    const allTags = Array.from(new Set(songs.flatMap((s) => s.hashtags || []))).sort();
    for (const tag of allTags) {
      groups.push({ tag, songs: songs.filter((s) => s.hashtags?.includes(tag)) });
    }
    const noTagSongs = songs.filter((s) => !s.hashtags || s.hashtags.length === 0);
    if (noTagSongs.length > 0) {
      groups.push({ tag: 'Sans hashtag', songs: noTagSongs });
    }
    return groups;
  };

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
          <p><strong>Code :</strong> {formatCode(String(choir.code))}</p>

          {/* Onglets */}
          <div style={{ display: 'flex', marginBottom: '1.5rem', borderBottom: '3px solid #ddd' }}>
            <button style={tabStyle('songs')} onClick={() => setActiveTab('songs')}>
              <i className="fa fa-music"></i> &nbsp; Chants
            </button>
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
                        <span>Code : {formatCode(ev.code)}</span>
                      </div>
                      {/* Icône suppression visible uniquement pour le propriétaire */}
                      {isOwner && (
                        <i
                          className="fa fa-trash trash"
                          onClick={() => navigate(`/delete-event/${ev.id}`)}
                        ></i>
                      )}
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

          {/* ── Onglet Chants ── */}
          {activeTab === 'songs' && (
            <>
              {/* Toggle tri / regroupement */}
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
                  {songs.map((s) => (
                    <div key={s.id} className="card-music pink">
                      <i className="fa fa-music note"></i>
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
                      {isOwner && (
                        <i className="fa fa-trash trash" onClick={() => navigate(`/delete-song/${s.id}`)}></i>
                      )}
                    </div>
                  ))}
                </ul>
              ) : (
                // ── Vue par hashtag ──
                <>
                  {getGroupedSongs().map(({ tag, songs: groupSongs }) => (
                    <div key={tag} style={{ marginBottom: '1.2rem' }}>
                      <p style={{ color: '#044C8D', fontWeight: 'bold', margin: '0.5rem 0' }}>
                        {tag}
                      </p>
                      <ul className="list-music">
                        {groupSongs.map((s) => (
                          <div key={`${tag}-${s.id}`} className="card-music pink">
                            <i className="fa fa-music note"></i>
                            <div className="text" onClick={() => navigate(`/song/${s.id}`)} style={{ cursor: 'pointer' }}>
                              <strong>{s.title}</strong>
                            </div>
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

              {/* Boutons ajout / import (propriétaire uniquement) */}
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

          {/* Bouton supprimer / quitter (sous les onglets, toujours visible) */}
          {isOwner ? (
            <div style={{ marginTop: '1.5rem' }}>
              <button
                className="page-button orange"
                onClick={() => navigate(`/delete-choir/${choir.id}`)}
              >
                <i className="fa fa-users"></i> &nbsp;
                Supprimer la chorale
              </button>
            </div>
          ) : (
            <div style={{ marginTop: '1.5rem' }}>
              <button
                className="page-button orange"
                onClick={() => navigate(`/leave-choir/${choir.id}`)}
              >
                <i className="fa fa-users"></i> &nbsp;
                Quitter la chorale
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}