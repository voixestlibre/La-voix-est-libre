import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { getCurrentUser } from '../../infrastructure/storage/authService';
import { getChoirOwner } from '../../infrastructure/storage/choirsService';
import { createSong, uploadSongFile, fileExists, songTitleExists } from '../../infrastructure/storage/songsService';
import '../../App.css';

type ImportReport = {
  songTitle: string;
  attachedFiles: string[];
  skippedFiles: string[];
  errors: string[];
};

export default function ImportSongPage() {
  const { choirId } = useParams();
  const navigate = useNavigate();
  const [dragging, setDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [error, setError] = useState('');

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

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    setError('');
    setReport(null);

    const items = Array.from(e.dataTransfer.items);

    // Vérifier qu'un seul élément est déposé
    if (items.length !== 1) {
      setError('Veuillez déposer un seul répertoire à la fois.');
      return;
    }

    const entry = items[0].webkitGetAsEntry();

    // Vérifier que c'est un répertoire
    if (!entry || !entry.isDirectory) {
      setError('Veuillez déposer un répertoire, pas un fichier.');
      return;
    }

    const dirEntry = entry as FileSystemDirectoryEntry;
    const reader = dirEntry.createReader();
    const entries = await readEntries(reader);

    // Vérifier l'absence de sous-répertoires
    const hasSubDirs = entries.some((e) => e.isDirectory);
    if (hasSubDirs) {
      setError('Le répertoire ne doit pas contenir de sous-répertoires.');
      return;
    }

    // Vérifier que l'utilisateur est connecté et propriétaire
    const currentUser = await getCurrentUser();
    if (!currentUser) { navigate('/'); return; }
    const ownerId = await getChoirOwner(choirId!);
    if (ownerId !== currentUser.id) { navigate('/'); return; }

    setImporting(true);

    const songTitle = dirEntry.name;
    const importReport: ImportReport = {
      songTitle,
      attachedFiles: [],
      skippedFiles: [],
      errors: [],
    };

    try {
      // Vérifier si un chant avec ce nom existe déjà
      const exists = await songTitleExists(choirId!, songTitle);
      if (exists) {
        setError(`Un chant nommé "${songTitle}" existe déjà.`);
        setImporting(false);
        return;
      }

      // Créer le chant avec le nom du répertoire
      const song = await createSong(choirId!, songTitle, []);

      // Traiter chaque fichier du répertoire
      for (const fileEntry of entries) {
        if (!fileEntry.isFile) continue;

        const file = await readFile(fileEntry as FileSystemFileEntry);

        // Ignorer les fichiers non audio/pdf
        if (!isValidFile(file.name)) {
          importReport.skippedFiles.push(file.name);
          continue;
        }

        try {
          // Construire le nom sans extension comme label, nettoyer les accents
          const ext = file.name.split('.').pop()!;
          const baseName = file.name.slice(0, -(ext.length + 1));
          const cleanName = baseName.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          const finalName = `${cleanName}.${ext}`;

          // Vérifier si le fichier existe déjà
          const alreadyExists = await fileExists(song.id, finalName);
          if (alreadyExists) {
            importReport.skippedFiles.push(`${finalName} (déjà existant)`);
            continue;
          }

          await uploadSongFile(song.id, finalName, file);
          importReport.attachedFiles.push(finalName);
        } catch (err: any) {
          importReport.errors.push(`${file.name} : ${err.message}`);
        }
      }

      setReport(importReport);
    } catch (err: any) {
      setError(`Erreur lors de la création du chant : ${err.message}`);
    }

    setImporting(false);
  };

  return (
    <div className="page-container">
      <div className="top-bar">
        <Link to={`/choir/${choirId}`} className="navigation">
          <i className="fa fa-chevron-left"></i>
        </Link>
        <Link to="/login" className="navigation">
          <i className="fa fa-right-from-bracket"></i>
        </Link>
      </div>

      <h2>Importer un chant</h2>
      {!report && <p>Déposez un répertoire contenant les fichiers audio et PDF du chant.</p>}

      {/* Zone de drop */}
      {!report && (
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
              {dragging ? 'Relâchez pour importer' : 'Glissez-déposez un répertoire ici'}
            </p>
          )}
        </div>
      )}

      {/* Message d'erreur */}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {/* Rapport d'import */}
      {report && (
        <div style={{ marginTop: '1rem' }}>
          <h3>Rapport d'import</h3>

          <p>✅ Chant créé : <strong>{report.songTitle}</strong></p>

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

          {/* Boutons de navigation après import */}
          <div style={{ marginTop: '1.5rem' }}>
            <div style={{ marginBottom: '0.5rem' }}>
              <button
                className="page-button2"
                onClick={() => { setReport(null); setError(''); }}
              >
                Importer un autre chant
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