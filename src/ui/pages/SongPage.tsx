import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { supabase } from '../../infrastructure/storage/supabaseClient';
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

  // Sélection des musiques
  const [showAudioSelect, setShowAudioSelect] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) setUser(userData.user);

      // Récupérer le chant
      const { data: songData, error } = await supabase
        .from('songs')
        .select('*')
        .eq('id', songId)
        .single();
      if (error || !songData) { navigate('/'); return; }
      setSong(songData);

      // Récupérer le propriétaire de la chorale et vérifier si connecté = propriétaire
      const { data: choirData } = await supabase
        .from('choirs')
        .select('owner_id')
        .eq('id', songData.choir_id)
        .single();
      if (userData.user && choirData?.owner_id === userData.user.id) {
        setIsOwner(true);
      }

      await fetchFiles();
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

  const fetchFiles = async () => {
    const { data } = await supabase.storage.from('songs-files').list(songId);
    setFiles(data || []);
  };

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file || !label) {
      setMessage('Veuillez renseigner un nom et sélectionner un fichier.');
      return;
    }
    const forbiddenChars = /[#?&%+\\/:*"<>|]/;
    if (forbiddenChars.test(label)) {
      setMessage('Le nom ne doit pas contenir de caractères spéciaux : # ? & % + \\ / : * " < > |');
      setUploading(false);
      return;
    }
    setUploading(true);
    setMessage('');

    try {
      // Construire le nom final : label saisi + extension du fichier original
      // Ex : label="Soprano", fichier="partition3.pdf" → "Soprano.pdf"
      const ext = file.name.split('.').pop();
      const finalName = `${label}.${ext}`;
      const filePath = `${songId}/${finalName}`;

      // Vérifier si un fichier avec le même nom existe déjà dans le bucket
      const { data: existing } = await supabase.storage.from('songs-files').list(songId);
      if (existing?.some((f) => f.name === finalName)) {
        setMessage(`Un fichier "${finalName}" existe déjà pour ce chant.`);
        setUploading(false);
        return;
      }

      // Upload du fichier dans le bucket
      const { error: uploadError } = await supabase.storage
        .from('songs-files')
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      // Réinitialiser le formulaire (y compris l'input file via sa ref)
      setLabel('');
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await fetchFiles();
    } catch (err: any) {
      setMessage(`Erreur : ${err.message}`);
    }
    setUploading(false);
  };

  // Supprimer un fichier du bucket
  const handleDeleteFile = async (fileName: string) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer "${fileName}" ?`)) return;
    const { error } = await supabase.storage
      .from('songs-files')
      .remove([`${songId}/${fileName}`]);
    if (error) { alert(`Erreur : ${error.message}`); return; }
    await fetchFiles();
  };

  // Déterminer l'icône Font Awesome selon l'extension du fichier
  const getIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext || '')) return 'fa-play';
    if (ext === 'pdf') return 'fa-file-lines';
    return 'fa-file';
  };

  // Obtenir l'URL publique d'un fichier dans le bucket
  const getPublicUrl = (fileName: string) => {
    const { data } = supabase.storage
      .from('songs-files')
      .getPublicUrl(`${songId}/${fileName}`);
    return data.publicUrl;
  };

  // Déterminer si fichier audio
  const isAudio = (fileName: string) =>
    ['mp3', 'wav', 'ogg', 'm4a'].includes(fileName.split('.').pop()?.toLowerCase() || '');

  // Déterminer si fichier pdf
  const isPdf = (fileName: string) =>
    fileName.split('.').pop()?.toLowerCase() === 'pdf';

  // Ouvrir un fichier selon sa forme
  const handleFileClick = (fileName: string) => {
    const url = getPublicUrl(fileName);
    if (isPdf(fileName)) {
      // Ouvrir le PDF en plein écran
      setPdfUrl(url);
    } else if (isAudio(fileName)) {
      // Lancer la lecture audio dans le popup flottant
      setAudioUrl(url);
      setAudioName(fileName.split('.').slice(0, -1).join('.'));
    }
  };

  return (
    <div className="page-container">
      <div className="top-bar">
        <Link to={`/choir/${song?.choir_id}`} className="navigation">←</Link>
        {user && <Link to="/login" className="navigation">⎋</Link>}
      </div>

      {loading ? <p>Chargement...</p> : (
        <>
          <h2>{song.title}</h2>

          {/* Liste des fichiers du chant */}
          {files.length === 0 ? (
            <p>Aucun fichier pour ce chant.</p>
          ) : (
            <ul className="list-music">
              {files.map((f) => (
                <div key={f.name} className="card-music">
                  {/* Icône selon le type de fichier */}
                  <i className={`fa ${getIcon(f.name)} note`}></i>
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
              <h3>Ajouter un fichier</h3>
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
                      // Préremplir le label avec le nom du fichier sans extension, si label vide
                      if (selected && !label) {
                        const nameWithoutExt = selected.name.split('.').slice(0, -1).join('.');
                        setLabel(nameWithoutExt);
                      }
                    }}
                    style={{ display: 'none' }}
                  />
                  {/* Bouton stylisé qui déclenche l'input file */}
                  <button
                    type="button"
                    className="page-button2"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Choisir un fichier
                  </button>
                  {file && <p style={{ marginTop: '0.3rem', fontSize: '0.9rem', color: '#555' }}>{file.name}</p>}
                </div>
                {/* Nom personnalisé qui deviendra le nom du fichier stocké */}
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
              {message && <p style={{ color: 'red' }}>{message}</p>}
            </>
          )}
        </>
      )}


      {/* Overlay PDF plein écran */}
      {pdfUrl && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: '#0A1F44',
          zIndex: 1000,
          display: 'flex', flexDirection: 'column',
        }}>
          {/* Barre du haut : fermer + lecteur audio si actif */}
          <div style={{
            display: 'flex', alignItems: 'center',
            padding: '0.5rem', gap: '0.5rem',
          }}>
            <button
              onClick={() => setPdfUrl(null)}
              style={{
                padding: '0.4rem 0.8rem', fontSize: '1rem',
                background: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              ✕ Fermer
            </button>

            {audioUrl && (
              <>
                <audio
                  ref={audioRef}
                  controls
                  autoPlay
                  src={audioUrl}
                  style={{ flex: 1, height: '35px', minWidth: 0 }}
                />

                {/* Bouton note qui ouvre/ferme le menu déroulant */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <button
                    onClick={() => setShowAudioSelect(!showAudioSelect)}
                    style={{
                      height: '35px', width: '35px', borderRadius: '8px', border: 'none',
                      backgroundColor: 'white', color: 'black',
                      fontSize: '1rem', cursor: 'pointer',
                    }}
                  >
                    <i className="fa fa-music"></i>
                  </button>

                  {/* Menu déroulant liste des fichiers audio */}
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

          {/* PDF avec paramètres pour masquer toolbar et panneau latéral sur mobile */}
          <iframe
            src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`}
            style={{ flex: 1, border: 'none' }}
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