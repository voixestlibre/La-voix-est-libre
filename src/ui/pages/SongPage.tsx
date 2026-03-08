import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { getCurrentUser } from '../../infrastructure/storage/authService';
import {
  getSong,
  getSongFiles,
  fileExists,
  uploadSongFile,
  deleteSongFile,
  getSongFileUrl,
} from '../../infrastructure/storage/songsService';
import { getChoirOwner } from '../../infrastructure/storage/choirsService';
import '../../App.css';

export default function SongPage() {
  const { songId } = useParams();
  const navigate = useNavigate();
  const [song, setSong] = useState<any>(null);
  const [files, setFiles] = useState<any[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    const fetchData = async () => {
      // Récupérer l'utilisateur connecté
      const currentUser = await getCurrentUser();
      if (currentUser) setUser(currentUser);

      try {
        // Récupérer le chant
        const songData = await getSong(songId!);
        setSong(songData);

        // Vérifier si l'utilisateur connecté est le propriétaire de la chorale
        const ownerId = await getChoirOwner(songData.choir_id);
        if (currentUser && ownerId === currentUser.id) {
          setIsOwner(true);
        }

        await fetchFiles();
      } catch {
        navigate('/');
        return;
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
      const cleanLabel = label.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
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
  const handleFileClick = (fileName: string) => {
    const url = getPublicUrl(fileName);
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
      <div className="top-bar">
        <Link to={`/choir/${song?.choir_id}`} className="navigation">
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
            <i className="fa fa-music" style={{ color: '#DA486D', marginRight: '0.5rem' }}></i>
            {song.title}
          </h2>
          {/* Hashtags du chant */}
          {song.hashtags?.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', margin: '0.5rem 0' }}>
              {song.hashtags.map((tag: string) => (
                <span key={tag} className="hashtag-pill">{tag}</span>
              ))}
            </div>
          )}

          {/* Liste des fichiers du chant */}
          {files.length === 0 ? (
            <p>Aucun fichier pour ce chant.</p>
          ) : (
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
                  {isOwner && (
                    <i
                      className="fa fa-trash trash"
                      onClick={() => handleDeleteFile(f.name)}
                    ></i>
                  )}
                </div>
              ))}
            </ul>
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
                  style={{ marginTop: '1.5rem' }}
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
            src={audioUrl}
            style={{ width: '100%', height: '35px' }}
          />
        </div>
      )}
    </div>
  );
}