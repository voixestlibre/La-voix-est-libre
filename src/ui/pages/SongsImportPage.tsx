import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getCurrentUser } from '../../infrastructure/storage/authService';
import { getChoirOwner } from '../../infrastructure/storage/choirsService';
import { createSong, uploadSongFile, fileExists, updateSong, getSongByTitle } from '../../infrastructure/storage/songsService';
import '../../App.css';
import TopBar from '../components/TopBar';
import { type UserProfile } from '../components/helpData';

type ImportReport = {
  songTitle: string;
  success: boolean;
  attachedFiles: string[];
  skippedFiles: string[];
  errors: string[];
};

export default function ImportSongPage() {
  const { choirId } = useParams();
  const navigate = useNavigate();
  const [dragging, setDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const [reports, setReports] = useState<ImportReport[]>([]);
  const [error, setError] = useState('');
  const [pageLoading, setPageLoading] = useState(true);

  const [helpProfiles] = useState<UserProfile[]>(['owner']);

  // Redirection si l'utilisateur n'est pas le propriétaire de la chorale
  useEffect(() => {
    const checkAccess = async () => {
      const currentUser = await getCurrentUser();
      if (!currentUser) { navigate('/'); return; }
      const ownerId = await getChoirOwner(choirId!);
      if (ownerId !== currentUser.id) {
        navigate(`/choir/${choirId}`, { replace: true });
      }
      setPageLoading(false);
    };
    checkAccess();
  }, [choirId, navigate]);

  // Vérifier si un fichier est audio ou pdf
  const isValidFile = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase() || '';
    return ['mp3', 'wav', 'ogg', 'm4a', 'pdf'].includes(ext);
  };

  // Lire les entrées d'un répertoire de façon asynchrone
  const readEntries = (reader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> => {
    return new Promise((resolve, reject) => reader.readEntries(resolve, reject));
  };

  // Lire un fichier depuis une FileEntry
  const readFile = (entry: FileSystemFileEntry): Promise<File> => {
    return new Promise((resolve, reject) => entry.file(resolve, reject));
  };

  // Importer un seul répertoire et retourner le rapport
  const importDirectory = async (dirEntry: FileSystemDirectoryEntry): Promise<ImportReport> => {
    const rawName = dirEntry.name;
    const report: ImportReport = {
      songTitle: rawName,
      success: false,
      attachedFiles: [],
      skippedFiles: [],
      errors: [],
    };
  
    // Extraire le nom et le code depuis le nom du répertoire
    const codeMatch = rawName.match(/^(.+?)\s*-\s*Code-(.+)$/);
    const songTitle = codeMatch ? codeMatch[1].trim() : rawName;
    const songCode = codeMatch ? codeMatch[2].trim().toUpperCase() : null;
    report.songTitle = songTitle;
  
    // Vérifier si un chant avec ce nom existe déjà
    const existingSong = await getSongByTitle(choirId!, songTitle);
  
    if (existingSong) {
      if (!existingSong.code && songCode) {
        // Mettre à jour le code
        const hashtags = existingSong.hashtags
          ? existingSong.hashtags.split(',').filter(Boolean)
          : [];
        await updateSong(existingSong.id, existingSong.title, hashtags, songCode);
        report.errors.push(`Chant existant — Code "${songCode}" associé.`);
      } else if (existingSong.code && existingSong.code !== songCode) {
        report.errors.push(`Chant existant avec un code différent (${existingSong.code}) — Import ignoré.`);
      } else {
        report.errors.push(`Chant existant — Import ignoré.`);
      }
      return report;
    }
  
    // Créer le chant
    const song = await createSong(choirId!, songTitle, [], songCode);
    report.success = true;
  
    // Lire et uploader les fichiers
    const reader = dirEntry.createReader();
    const entries = await readEntries(reader);
  
    for (const fileEntry of entries) {
      if (!fileEntry.isFile) continue;
      const file = await readFile(fileEntry as FileSystemFileEntry);
  
      if (!isValidFile(file.name)) {
        report.skippedFiles.push(file.name);
        continue;
      }
  
      try {
        const ext = file.name.split('.').pop()!;
        const baseName = file.name.slice(0, -(ext.length + 1));
        const cleanName = baseName
          .replace(/œ/g, 'oe').replace(/Œ/g, 'Oe')
          .replace(/æ/g, 'ae').replace(/Æ/g, 'Ae')
          .replace(/[,;]/g, '')
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const finalName = `${cleanName}.${ext}`;
  
        const alreadyExists = await fileExists(song.id, finalName);
        if (alreadyExists) {
          report.skippedFiles.push(`${finalName} (déjà existant)`);
          continue;
        }
  
        await uploadSongFile(song.id, finalName, file);
        report.attachedFiles.push(finalName);
      } catch (err: any) {
        report.errors.push(`${file.name} : ${err.message}`);
      }
    }
  
    return report;
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    setError('');
    setReports([]);

    const items = Array.from(e.dataTransfer.items);

    // Récupérer toutes les entrées
    const entries = items.map((item) => item.webkitGetAsEntry());

    // Vérifier que tous les éléments sont des répertoires
    if (entries.some((entry) => !entry || !entry.isDirectory)) {
      setError('Tous les éléments déposés doivent être des répertoires, pas des fichiers.');
      return;
    }

    const dirEntries = entries as FileSystemDirectoryEntry[];

    // Vérifier l'absence de sous-répertoires dans chaque répertoire
    for (const dirEntry of dirEntries) {
      const reader = dirEntry.createReader();
      const subEntries = await readEntries(reader);
      if (subEntries.some((e) => e.isDirectory)) {
        setError(`Le répertoire "${dirEntry.name}" contient des sous-répertoires.`);
        return;
      }
    }

    // Vérifier que l'utilisateur est connecté et propriétaire
    const currentUser = await getCurrentUser();
    if (!currentUser) { navigate('/'); return; }
    const ownerId = await getChoirOwner(choirId!);
    if (ownerId !== currentUser.id) { navigate('/'); return; }

    setImporting(true);

    // Importer chaque répertoire et collecter les rapports
    const allReports: ImportReport[] = [];
    for (const dirEntry of dirEntries) {
      try {
        const report = await importDirectory(dirEntry);
        allReports.push(report);
      } catch (err: any) {
        allReports.push({
          songTitle: dirEntry.name,
          success: false,
          attachedFiles: [],
          skippedFiles: [],
          errors: [`Erreur : ${err.message}`],
        });
      }
    }

    setReports(allReports);
    setImporting(false);
  };

  // Pendant le chargement de la page
  if (pageLoading) {
    return (
      <div className="page-container">
        <TopBar />
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    // Quand la page est chargée
    <div className="page-container">
      <TopBar helpPage="songs-import" helpProfiles={helpProfiles} />
      <h2>Importer des chants</h2>
      {reports.length === 0 && <div><p>Déposez un ou plusieurs répertoires contenant les fichiers audio et PDF.</p><p>Le nom de chaque répertoire sera utilisé pour créer un chant, et les différents fichiers audio ou pdf des répertoires seront associés aux chants correspondants...</p></div>}

      {/* Zone de drop */}
      {reports.length === 0 && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          style={{
            border: `2px dashed ${dragging ? '#FB8917' : '#044C8D'}`,
            borderRadius: '12px',
            padding: '3rem 1rem',
            textAlign: 'center',
            backgroundColor: dragging ? '#FFF4E6' : '#E6F2FF',
            cursor: 'pointer',
            transition: 'all 0.2s',
            margin: '1.5rem 0',
          }}
        >
          <i className="fa fa-folder-open" style={{ fontSize: '2.5rem', color: '#044C8D', marginBottom: '0.8rem', display: 'block' }}></i>
          {importing ? (
            <div className="spinner"></div>
          ) : (
            <p style={{ color: '#044C8D', margin: 0 }}>
              {dragging ? 'Relâchez pour importer' : 'Glissez-déposez un ou plusieurs répertoires ici'}
            </p>
          )}
        </div>
      )}

      {/* Message d'erreur global */}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {/* Rapports d'import */}
      {reports.length > 0 && (
        <div style={{ marginTop: '1rem' }}>
          <h3>Rapport d'import</h3>

          {reports.map((report, index) => (
            <div
              key={index}
              style={{
                borderLeft: `4px solid ${report.errors.length > 0 ? 'red' : '#044C8D'}`,
                paddingLeft: '1rem',
                marginBottom: '1.5rem',
              }}
            >
              <p>{report.success ? '✅' : '⚠️'} Chant : <strong>{report.songTitle}</strong></p>

              {report.attachedFiles.length > 0 && (
                <>
                  <p style={{ marginBottom: '0.3rem' }}>📎 Fichiers attachés :</p>
                  <ul style={{ paddingLeft: '1.5rem' }}>
                    {report.attachedFiles.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                </>
              )}

              {report.skippedFiles.length > 0 && (
                <>
                  <p style={{ marginBottom: '0.3rem', color: '#888' }}>⏭️ Fichiers ignorés :</p>
                  <ul style={{ paddingLeft: '1.5rem', color: '#888' }}>
                    {report.skippedFiles.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                </>
              )}

              {report.errors.length > 0 && (
                <>
                  <p style={{ marginBottom: '0.3rem', color: 'red' }}>❌ Erreurs :</p>
                  <ul style={{ paddingLeft: '1.5rem', color: 'red' }}>
                    {report.errors.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          ))}

          {/* Boutons de navigation après import */}
          <div style={{ marginTop: '1.5rem' }}>
            <div style={{ marginBottom: '0.5rem' }}>
              <button
                className="page-button2"
                onClick={() => { setReports([]); setError(''); }}
              >
                Importer d'autres chants
              </button>
            </div>
            <div>
              <button
                className="page-button2"
                onClick={() => navigate(`/choir/${choirId}`)}
              >
                Retour à la chorale
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}