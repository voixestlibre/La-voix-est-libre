import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getCurrentUser, getUserDelegations } from '../../infrastructure/storage/authService';
import { getStoredEvents, setStoredEvents, getCachedEvent } from '../../infrastructure/storage/localStorageService';
import { getCachedFileUrl, cacheEventFiles, clearEventCache, isCacheable } from '../../infrastructure/storage/cacheService';
import {
  getSong,
  getSongFiles,
  fileExists,
  uploadSongFile,
  deleteSongFile,
  getSongFileUrl,
  updateSong,
  getChoirHashtags,
  toggleFavoriteSong,
  toggleCommonSong,
} from '../../infrastructure/storage/songsService';
import { getChoirOwner } from '../../infrastructure/storage/choirsService';
import '../../App.css';
import TopBar from '../components/TopBar';

export default function SongPage() {
  const { songId } = useParams();
  const navigate = useNavigate();
  const [isOffline, setIsOffline] = useState(false);
  const [song, setSong] = useState<any>(null);
  const [files, setFiles] = useState<any[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [isDelegate, setIsDelegate] = useState(false);
  const [loading, setLoading] = useState(true);

  // Ajout d'hashtags
  const [showHashtagInput, setShowHashtagInput] = useState(false);
  const [quickHashtagInput, setQuickHashtagInput] = useState('');
  const [allHashtags, setAllHashtags] = useState<string[]>([]);
  const [hashtagSuggestions, setHashtagSuggestions] = useState<string[]>([]);  
  const clickedSuggestionRef = useRef<string | null>(null);

  // Formulaire ajout fichier
  const [label, setLabel] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  // Référence vers l'input file pour pouvoir le réinitialiser après upload
  const fileInputRef = useRef<HTMLInputElement>(null);

  // PDF affiché en plein écran
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  // Audio en cours de lecture
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioName, setAudioName] = useState<string>('');
  const audioRef = useRef<HTMLAudioElement>(null);

  // Menu déroulant sélection audio
  const [showAudioSelect, setShowAudioSelect] = useState(false);

  // PDF ouvert sans audio sélectionné, mais des audios sont disponibles
  const [pdfAudioReady, setPdfAudioReady] = useState(false);

  // Événement mémorisé auquel ce chant appartient (null si aucun)
  const [cachedEventId, setCachedEventIdState] = useState<string | null>(null);
  // Ensemble des noms de fichiers déjà téléchargés pour ce chant
  const [downloadedFiles, setDownloadedFiles] = useState<Set<string>>(new Set());
  // Progression du téléchargement/suppression en cours
  const [fileProgress, setFileProgress] = useState<{ done: number; total: number } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      // Récupérer l'utilisateur connecté
      const currentUser = await getCurrentUser();
  
      const storedEvents = getStoredEvents();
  
      try {
        // Récupérer le chant
        const songData = await getSong(songId!);
        setSong(songData);
  
        const known = await getChoirHashtags(songData.choir_id);
        setAllHashtags(known);
  
        // Vérifier si l'utilisateur connecté est le propriétaire de la chorale
        const ownerId = await getChoirOwner(songData.choir_id);
        const ownerCheck = currentUser && ownerId === currentUser.id;
        if (ownerCheck) setIsOwner(true);

        // Vérifier la délégation
        const delegations = currentUser ? await getUserDelegations(currentUser.email!) : [];
        const delegateCheck = delegations.includes(String(songData.choir_id));
        setIsDelegate(delegateCheck);

        // Contrôle d'accès online
        // - propriétaire → accès total
        // - delegation → accès partiel
        // - sinon → accès uniquement si le chant est dans un événement rejoint
        const hasEventAccess = storedEvents.some((e) =>
          e.songs?.some((s) => String(s.id) === String(songId))
        );
  
        if (!ownerCheck && !delegateCheck && !hasEventAccess) {
          navigate('/');
          return;
        }
  
        await fetchFiles();

        // Vérifier si ce chant appartient à l'événement mémorisé localement
        const cachedEvent = getCachedEvent();
        if (cachedEvent && cachedEvent.cached_files) {
          const songIsInCachedEvent = cachedEvent.cached_files.some(
            (f) => String(f.songId) === String(songId)
          );
          if (songIsInCachedEvent) {
            setCachedEventIdState(String(cachedEvent.id));
            // Construire la liste des fichiers déjà téléchargés
            const downloaded = new Set<string>();
            for (const f of cachedEvent.cached_files.filter((f) => String(f.songId) === String(songId))) {
              const publicUrl = getSongFileUrl(String(songId), f.fileName);
              const cachedUrl = await getCachedFileUrl(String(cachedEvent.id), publicUrl);
              if (cachedUrl) downloaded.add(f.fileName);
            }
            setDownloadedFiles(downloaded);
          }
        }

      } catch {
        // Fallback offline : chercher le chant dans les événements du localStorage
        const matchingEvent = storedEvents.find((e) =>
          e.songs?.some((s) => String(s.id) === String(songId))
        );
  
        if (!matchingEvent) {
          navigate('/my-choirs', { replace: true }); 
          return;
        }
  
        const cachedSong = matchingEvent.songs.find((s) => String(s.id) === String(songId));
        if (cachedSong) {
          setSong({
            id: cachedSong.id,
            title: cachedSong.title,
            choir_id: matchingEvent.choir_id,
            hashtags: [],
          });
        }
  
        // Fallback offline : chercher les fichiers PDF dans le cache
        const cachedEvent = getCachedEvent();
        if (cachedEvent && String(cachedEvent.id) === String(matchingEvent.id) && cachedEvent.cached_files) {
          const offlineFiles: { name: string }[] = [];
          for (const f of cachedEvent.cached_files.filter((f) => String(f.songId) === String(songId))) {
            const publicUrl = getSongFileUrl(String(songId), f.fileName);
            const cachedUrl = await getCachedFileUrl(String(cachedEvent.id), publicUrl);
            if (cachedUrl) offlineFiles.push({ name: f.fileName });
          }

          // Trier comme en online : PDF d'abord, puis audio, alphabétique dans chaque groupe
          offlineFiles.sort((a, b) => {
            const extA = a.name.split('.').pop()?.toLowerCase() || '';
            const extB = b.name.split('.').pop()?.toLowerCase() || '';
            const isAudioA = ['mp3', 'wav', 'ogg', 'm4a'].includes(extA);
            const isAudioB = ['mp3', 'wav', 'ogg', 'm4a'].includes(extB);
            if (isAudioA !== isAudioB) return isAudioA ? 1 : -1;
            const nameA = a.name.split('.').slice(0, -1).join('.');
            const nameB = b.name.split('.').slice(0, -1).join('.');
            return nameA.localeCompare(nameB);
          });

          setFiles(offlineFiles);
          setIsOffline(true);

        } else {
          setFiles([]);
        }

      }
  
      setLoading(false);
    };
    fetchData();
  
    // Arrêter la musique quand on quitte la page
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, [songId, navigate]);

  // Lancer automatiquement la lecture quand l'audio change
  useEffect(() => {
    if (audioUrl && audioRef.current) {
      audioRef.current.load();
      audioRef.current.play().catch(() => {});
    }
  }, [audioUrl]);  

  // Lister les fichiers triés : PDF en premier, puis audio, ordre alphabétique dans chaque groupe
  const fetchFiles = async () => {
    const data = await getSongFiles(songId!);
    const sorted = [...data].sort((a, b) => {
      const extA = a.name.split('.').pop()?.toLowerCase() || '';
      const extB = b.name.split('.').pop()?.toLowerCase() || '';
      const isAudioA = ['mp3', 'wav', 'ogg', 'm4a'].includes(extA);
      const isAudioB = ['mp3', 'wav', 'ogg', 'm4a'].includes(extB);
      if (isAudioA !== isAudioB) return isAudioA ? 1 : -1;
      const nameA = a.name.split('.').slice(0, -1).join('.');
      const nameB = b.name.split('.').slice(0, -1).join('.');
      return nameA.localeCompare(nameB);
    });
    setFiles(sorted);
  };

  // Ajouter un hashtag directement depuis la page du chant
  const handleQuickAddHashtag = async (value: string) => {
    const clean = value.trim().replace(/^#+/, '');
    if (!clean) return;
    const noAccent = clean.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const capitalized = noAccent.charAt(0).toUpperCase() + noAccent.slice(1);
    const tag = `#${capitalized}`;
    const updatedHashtags = song.hashtags?.includes(tag)
      ? song.hashtags
      : [...(song.hashtags || []), tag];
    try {
      await updateSong(song.id, song.title, updatedHashtags);
      setSong({ ...song, hashtags: updatedHashtags });
    } catch (err: any) {
      setMessage(`Erreur : ${err.message}`);
    }
    setQuickHashtagInput('');
    setShowHashtagInput(false);
  };    

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file || !label) {
      setMessage('Veuillez renseigner un nom et sélectionner un fichier.');
      return;
    }

    // Vérifier l'absence de caractères interdits dans le nom
    const forbiddenChars = /[#?&%+\\/:*"<>|]/;
    if (forbiddenChars.test(label)) {
      setMessage('Le nom ne doit pas contenir de caractères spéciaux : # ? & % + \\ / : * " < > |');
      return;
    }

    setUploading(true);
    setMessage('');

    try {
      // Construire le nom final : label sans accents + extension du fichier original
      const ext = file.name.split('.').pop();
      const cleanLabel = label
        .replace(/œ/g, 'oe').replace(/Œ/g, 'Oe')
        .replace(/æ/g, 'ae').replace(/Æ/g, 'Ae')
        .replace(/[,;]/g, '')
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const finalName = `${cleanLabel}.${ext}`;

      // Vérifier si un fichier avec le même nom existe déjà
      if (await fileExists(songId!, finalName)) {
        setMessage(`Un fichier "${finalName}" existe déjà pour ce chant.`);
        setUploading(false);
        return;
      }

      await uploadSongFile(songId!, finalName, file);

      // Réinitialiser le formulaire
      setLabel('');
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await fetchFiles();
    } catch (err: any) {
      setMessage(`Erreur : ${err.message}`);
    }
    setUploading(false);
  };

  // Supprimer un fichier du bucket (avec confirmation)
  const handleDeleteFile = async (fileName: string) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer "${fileName}" ?`)) return;
    try {
      await deleteSongFile(songId!, fileName);
      await fetchFiles();
    } catch (err: any) {
      setMessage(`Erreur lors de la suppression : ${err.message}`);
    }
  };

  // Ajouter ou supprimer un fichier du cache de l'événement mémorisé
  const handleCacheToggle = async (fileName: string) => {
    if (!cachedEventId || fileProgress) return;

    const publicUrl = getSongFileUrl(songId!, fileName);

    if (downloadedFiles.has(fileName)) {
      // Supprimer le fichier du cache Cache API
      setFileProgress({ done: 0, total: 1 });
      const cache = await caches.open(`event-files-${cachedEventId}`);
      await cache.delete(publicUrl);

      // Mettre à jour cached_files dans le localStorage
      const stored = getStoredEvents();
      setStoredEvents(stored.map((e) =>
        String(e.id) === String(cachedEventId)
          ? { ...e, cached_files: (e.cached_files ?? []).filter(
              (f) => !(String(f.songId) === String(songId) && f.fileName === fileName)
            )}
          : e
      ));

      // Mettre à jour l'état local
      setDownloadedFiles((prev) => { const next = new Set(prev); next.delete(fileName); return next; });
      setFileProgress({ done: 1, total: 1 });
      setTimeout(() => setFileProgress(null), 500);

    } else {
      // Télécharger et ajouter le fichier au cache
      setFileProgress({ done: 0, total: 1 });
      const response = await fetch(publicUrl);
      const cache = await caches.open(`event-files-${cachedEventId}`);
      await cache.put(publicUrl, response);

      // Mettre à jour cached_files dans le localStorage
      const stored = getStoredEvents();
      setStoredEvents(stored.map((e) =>
        String(e.id) === String(cachedEventId)
          ? { ...e, cached_files: [...(e.cached_files ?? []), { songId: String(songId), fileName }]}
          : e
      ));

      // Mettre à jour l'état local
      setDownloadedFiles((prev) => new Set(prev).add(fileName));
      setFileProgress({ done: 1, total: 1 });
      setTimeout(() => setFileProgress(null), 500);
    }
  };  

  // Déterminer l'icône Font Awesome selon l'extension du fichier
  const getIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext || '')) return 'fa-play';
    if (ext === 'pdf') return 'fa-file-lines';
    return 'fa-file';
  };

  // Obtenir l'URL publique d'un fichier dans le bucket
  const getPublicUrl = (fileName: string) => getSongFileUrl(songId!, fileName);

  // Déterminer si fichier audio
  const isAudio = (fileName: string) =>
    ['mp3', 'wav', 'ogg', 'm4a'].includes(fileName.split('.').pop()?.toLowerCase() || '');

  // Déterminer si fichier pdf
  const isPdf = (fileName: string) =>
    fileName.split('.').pop()?.toLowerCase() === 'pdf';

  // Ouvrir un fichier selon son type
  const handleFileClick = async (fileName: string) => {
    let url: string;
    if (isOffline) {
      const cachedEvent = getCachedEvent();
      const publicUrl = getSongFileUrl(songId!, fileName);
      url = (await getCachedFileUrl(String(cachedEvent!.id), publicUrl)) ?? publicUrl;
    } else {
      url = getPublicUrl(fileName);
    }

    if (isPdf(fileName)) {
      setPdfUrl(url);
      // Si pas d'audio en cours mais qu'il y en a de disponibles, préparer le bouton note
      if (!audioUrl && files.some((f) => isAudio(f.name))) {
        setPdfAudioReady(true);
      }
    } else if (isAudio(fileName)) {
      setAudioUrl(url);
      setAudioName(fileName.split('.').slice(0, -1).join('.'));
      setPdfAudioReady(false);
    }
  };

  return (
    <div className="page-container">
      <TopBar />
      
      {loading ? <div className="spinner"></div> : (
        <>
          <h2>
            <i className="fa fa-music" style={{ color: '#DA486D', marginRight: '0.5rem' }}></i>
            {song.title}
          </h2>

          {/* Hashtags du chant + ajout rapide si propriétaire */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', margin: '0.5rem 0', alignItems: 'center' }}>
            {song.hashtags?.map((tag: string) => (
              <span key={tag} className="hashtag-pill">{tag}</span>
            ))}

            {/* Bulle rose "Ajouter un hashtag" (propriétaire uniquement) */}
            {isOwner && !showHashtagInput && (
              <span
                onClick={() => setShowHashtagInput(true)}
                style={{
                  backgroundColor: '#DA486D', color: 'white',
                  borderRadius: '20px', padding: '0.3rem 0.8rem',
                  fontSize: '0.85rem', cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                  lineHeight: 1,
                }}
              >
                <i className="fa fa-plus"></i> Ajouter un hashtag
              </span>
            )}

            {/* Icône note : toggle commun — visible par délégué, modifiable par propriétaire uniquement */}
            {(isOwner || isDelegate) && (
              <i
                className="fa fa-music"
                onClick={isOwner ? async () => {
                  try {
                    await toggleCommonSong(song.id, !song.is_common);
                    setSong({ ...song, is_common: !song.is_common });
                  } catch {}
                } : undefined}
                style={{
                  cursor: isOwner ? 'pointer' : 'default',
                  color: song.is_common ? '#FFB300' : '#ddd',
                  fontSize: '1.4rem',
                  marginLeft: '0.5rem',
                }}
              ></i>
            )}

            {/* Icône cœur : toggle favori — visible par délégué, modifiable par propriétaire uniquement */}
            {(isOwner || isDelegate) && (
              <i
                className="fa fa-heart"
                onClick={isOwner ? async () => {
                  try {
                    await toggleFavoriteSong(song.id, !song.is_favorite);
                    setSong({ ...song, is_favorite: !song.is_favorite });
                  } catch {}
                } : undefined}
                style={{
                  cursor: isOwner ? 'pointer' : 'default',
                  color: song.is_favorite ? '#DA486D' : '#ddd',
                  fontSize: '1.4rem',
                  marginLeft: '0.5rem',
                }}
              ></i>
            )}

            {/* Champ de saisie rapide avec suggestions */}
            {isOwner && showHashtagInput && (
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  autoFocus
                  placeholder="Hashtag..."
                  value={quickHashtagInput}
                  onChange={(e) => {
                    setQuickHashtagInput(e.target.value);
                    const search = e.target.value.toLowerCase();
                    setHashtagSuggestions(
                      search.trim().length === 0 ? [] :
                      allHashtags.filter(
                        (h) => h.toLowerCase().includes(search) && !song.hashtags?.includes(h)
                      )
                    );
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleQuickAddHashtag(quickHashtagInput);
                      setHashtagSuggestions([]);
                    }
                    if (e.key === 'Escape') {
                      setShowHashtagInput(false);
                      setQuickHashtagInput('');
                      setHashtagSuggestions([]);
                    }
                  }}
                  onBlur={() => {
                    setTimeout(() => {
                      if (clickedSuggestionRef.current) {
                        handleQuickAddHashtag(clickedSuggestionRef.current);
                        clickedSuggestionRef.current = null;
                      } else if (quickHashtagInput.trim().length > 0) {
                        handleQuickAddHashtag(quickHashtagInput);
                      } else {
                        setShowHashtagInput(false);
                      }
                      setHashtagSuggestions([]);
                    }, 150);
                  }}
                  style={{
                    borderRadius: '20px', padding: '0.3rem 0.8rem',
                    border: '2px solid #DA486D', fontSize: '0.85rem',
                    outline: 'none', width: '130px',
                  }}
                />

                {/* Suggestions d'autocomplétion */}
                {hashtagSuggestions.length > 0 && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0,
                    backgroundColor: 'white', borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                    overflow: 'hidden', minWidth: '160px', zIndex: 100,
                  }}>
                    {hashtagSuggestions.map((s) => (
                      <div
                        key={s}
                        onMouseDown={() => {
                          clickedSuggestionRef.current = s;
                        }}
                        style={{
                          padding: '0.5rem 1rem', fontSize: '0.9rem',
                          cursor: 'pointer', color: '#222',
                          borderBottom: '1px solid #eee',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#E6F2FF')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'white')}
                      >
                        {s}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Liste des fichiers du chant */}
          {files.length === 0 ? (
            <p>Aucun fichier pour ce chant.</p>
          ) : (
            <>
              {/* Barre de progression téléchargement fichier individuel */}
              {fileProgress && (
                <div style={{ marginBottom: '0.8rem' }}>
                  <div style={{ height: '6px', backgroundColor: '#FDE8ED', borderRadius: '4px' }}>
                    <div style={{
                      height: '100%', borderRadius: '4px', backgroundColor: '#DA486D',
                      width: fileProgress.total > 0 ? `${Math.round((fileProgress.done / fileProgress.total) * 100)}%` : '0%',
                      transition: 'width 0.3s',
                    }} />
                  </div>
                </div>
              )}
              <ul className="list-music">
                {files.map((f) => (
                  <div key={f.name} className="card-music">
                    <i
                      className={`fa ${getIcon(f.name)} note`}
                      onClick={() => handleFileClick(f.name)}
                      style={{ cursor: 'pointer' }}
                    ></i>
                    <div
                      className="text"
                      onClick={() => handleFileClick(f.name)}
                      style={{ cursor: 'pointer' }}
                    >
                      <strong>{f.name.split('.').slice(0, -1).join('.')}</strong>
                    </div>

                    {/* Icônes à droite : poubelle (propriétaire) + cache (si événement mémorisé) */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}>
                      {/* Icône cache : affichée uniquement si le chant appartient à l'événement mémorisé
                          et si le fichier est d'un type téléchargeable */}
                      {cachedEventId && isCacheable(f.name) && (
                        <i
                          className="fa fa-download"
                          style={{ marginLeft: 0 }}
                          onClick={() => handleCacheToggle(f.name)}
                          style={{
                            fontSize: '1.1rem',
                            color: downloadedFiles.has(f.name) ? '#044C8D' : '#ccc',
                            cursor: fileProgress ? 'default' : 'pointer',
                            marginLeft: 0,
                            pointerEvents: fileProgress ? 'none' : 'auto',
                          }}
                        />
                      )}
                      {isOwner && (
                        <i className="fa fa-trash trash" style={{ marginLeft: 0 }}
                          onClick={() => handleDeleteFile(f.name)}
                        ></i>
                      )}
                    </div>
                  </div>
                ))}
              </ul>
            </>
          )}

          {/* Formulaire ajout fichier (propriétaire uniquement) */}
          {isOwner && (
            <>
              <form onSubmit={handleUpload}>
                <div style={{ margin: '0.8rem 0' }}>
                  {/* Input file caché, déclenché par le bouton */}
                  <input
                    type="file"
                    accept="audio/*,.pdf"
                    ref={fileInputRef}
                    onChange={(e) => {
                      const selected = e.target.files?.[0] || null;
                      setFile(selected);
                      // Préremplir le label avec le nom du fichier sans extension si label vide
                      if (selected && !label) {
                        const nameWithoutExt = selected.name.split('.').slice(0, -1).join('.');
                        setLabel(nameWithoutExt);
                      }
                    }}
                    style={{ display: 'none' }}
                  />
                  <button
                    type="button"
                    className="page-button2"
                    onClick={() => fileInputRef.current?.click()}
                    style={{ marginTop: '1.5rem' }}
                  >
                    Choisir un fichier
                  </button>
                  {file && <p style={{ marginTop: '0.3rem', fontSize: '0.9rem', color: '#555' }}>{file.name}</p>}
                </div>
                <input
                  type="text"
                  placeholder="Nom du fichier"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  required
                  className="page-form-input"
                />
                <button className="page-button" type="submit" disabled={uploading}>
                  {uploading ? 'Envoi...' : 'Ajouter'}
                </button>
              </form>

              <div>
                <button
                  className="page-button pink"
                  onClick={() => navigate(`/edit-song/${song.id}`)}
                  style={{ marginTop: '2.5rem' }}
                >
                  <i className="fa fa-music"></i> &nbsp;
                  Modifier le chant
                </button>
              </div>
              <div>
                <button
                  className="page-button pink"
                  onClick={() => navigate(`/delete-song/${song.id}`)}
                  style={{ marginTop: '1.5rem' }}
                >
                  <i className="fa fa-music"></i> &nbsp;
                  Supprimer le chant
                </button>
              </div>
              {message && <p style={{ color: 'red' }}>{message}</p>}
            </>
          )}
        </>
      )}

      {/* Overlay PDF plein écran */}
      {pdfUrl && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          width: '100%', height: '100%',
          backgroundColor: '#0A1F44',
          zIndex: 1000,
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {/* Barre du haut : bouton fermer + lecteur audio si actif ou disponible */}
          <div style={{
            display: 'flex', alignItems: 'center',
            padding: '0.5rem', gap: '0.5rem',
          }}>
            <button
              onClick={() => { setPdfUrl(null); setPdfAudioReady(false); setAudioUrl(null); setAudioName(''); }}
              style={{
                padding: '0.4rem 0.8rem', fontSize: '1rem',
                background: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              ✕ Fermer
            </button>

            {/* Lecteur audio : affiché si un audio est en cours OU si des audios sont disponibles */}
            {(audioUrl || pdfAudioReady) && (
              <>
                {audioUrl ? (
                  // Lecteur audio actif
                  <audio
                    ref={audioRef}
                    controls
                    autoPlay
                    loop
                    src={audioUrl}
                    style={{ flex: 1, height: '35px', minWidth: 0 }}
                  />
                ) : (
                  // Invitation à sélectionner un audio
                  <span style={{ flex: 1, color: 'white', fontSize: '0.9rem', paddingLeft: '0.5rem' }}>
                    Sélectionnez un audio ↓
                  </span>
                )}

                {/* Bouton note → menu déroulant sélection audio */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <button
                    onClick={() => setShowAudioSelect(!showAudioSelect)}
                    style={{
                      height: '35px', width: '35px', borderRadius: '8px', border: 'none',
                      backgroundColor: 'white', color: 'black',
                      fontSize: '1rem', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <i className="fa fa-music"></i>
                  </button>

                  {/* Liste des fichiers audio disponibles */}
                  {showAudioSelect && (
                    <div style={{
                      position: 'absolute', top: '40px', right: 0,
                      backgroundColor: 'white', borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                      overflow: 'hidden', minWidth: '180px', zIndex: 1001,
                    }}>
                      {files.filter((f) => isAudio(f.name)).map((f) => (
                        <div
                          key={f.name}
                          onClick={() => {
                            setAudioUrl(getPublicUrl(f.name));
                            setAudioName(f.name.split('.').slice(0, -1).join('.'));
                            setPdfAudioReady(false);
                            setShowAudioSelect(false);
                          }}
                          style={{
                            padding: '0.6rem 1rem', fontSize: '0.9rem',
                            cursor: 'pointer', color: '#222',
                            borderBottom: '1px solid #eee',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#ddd')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'white')}
                        >
                          {f.name.split('.').slice(0, -1).join('.')}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Iframe PDF */}
          <iframe
            src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`}
            style={{ flex: 1, border: 'none', width: '100%', display: 'block' }}
            title="Partition"
          />
        </div>
      )}

      {/* Popup flottant lecteur audio (uniquement si PDF non ouvert) */}
      {audioUrl && !pdfUrl && (
        <div style={{
          position: 'fixed', bottom: '1rem', right: '1rem',
          backgroundColor: '#044C8D', color: 'white',
          borderRadius: '12px', padding: '0.8rem 1rem',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          zIndex: 999, minWidth: '280px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{audioName}</span>
            <button
              onClick={() => setAudioUrl(null)}
              style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.2rem', cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>
          <audio
            ref={audioRef}
            controls
            autoPlay
            loop
            src={audioUrl}
            style={{ width: '100%', height: '35px' }}
          />
        </div>
      )}
    </div>
  );
}