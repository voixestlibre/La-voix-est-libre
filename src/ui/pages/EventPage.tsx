import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getCurrentUser, getUserParamId } from '../../infrastructure/storage/authService';
import { getChoirOwner, getChoir } from '../../infrastructure/storage/choirsService';
import { getEvent, getEventSongsDetails, incrementEventViews } from '../../infrastructure/storage/eventsService';
import { getCachedEvent, getStoredChoirs, getStoredEvents } from '../../infrastructure/storage/localStorageService';
import { PDFDocument } from 'pdf-lib';
import { getSongFiles, getSongFileUrl } from '../../infrastructure/storage/songsService';
import { getCachedFileUrl } from '../../infrastructure/storage/cacheService';
import '../../App.css';
import TopBar from '../components/TopBar';

export default function EventPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [choirName, setChoirName] = useState<string | null>(null);
  const [event, setEvent] = useState<any>(null);
  const [songs, setSongs] = useState<any[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isDirectEventMember, setIsDirectEventMember] = useState(false);

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfProgress, setPdfProgress] = useState<{ done: number; total: number } | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);

  // Fonction permettant de générer un fichier pdf global
  const handleGenerateLivret = async () => {
    setIsGeneratingPdf(true);
    setPdfProgress({ done: 0, total: songs.length });
    setPdfError(null);
  
    try {
      const mergedPdf = await PDFDocument.create();
      let totalPdfCount = 0;
      const cachedEvent = getCachedEvent();
      const isThisEventCached = cachedEvent && String(cachedEvent.id) === String(eventId);
  
      // Page de garde — avant la boucle sur les chants
      try {
        const { rgb } = await import('pdf-lib');
        const coverPage = mergedPdf.addPage([595, 842]); // A4

        // Logo
        const logoB64 = localStorage.getItem('app_logo_b64');
        if (logoB64) {
          const logoBytes = Uint8Array.from(atob(logoB64.split(',')[1]), c => c.charCodeAt(0));
          const logoImage = await mergedPdf.embedPng(logoBytes);
          const logoDims = logoImage.scaleToFit(200, 200);
          coverPage.drawImage(logoImage, {
            x: (595 - logoDims.width) / 2,
            y: 842 - 150 - logoDims.height,
            width: logoDims.width,
            height: logoDims.height,
          });
        }

        // Nom de l'événement
        const { StandardFonts } = await import('pdf-lib');
        const font = await mergedPdf.embedFont(StandardFonts.HelveticaBold);
        const fontRegular = await mergedPdf.embedFont(StandardFonts.Helvetica);

        coverPage.drawText(event.name, {
          x: 50,
          y: 400,
          size: 28,
          font,
          color: rgb(0.02, 0.30, 0.55), // #044C8D
        });

        // Date
        const dateStr = formatDate(event.event_date);
        if (dateStr) {
          coverPage.drawText(dateStr, {
            x: 50,
            y: 360,
            size: 16,
            font: fontRegular,
            color: rgb(0.4, 0.4, 0.4),
          });
        }
      } catch {
        // Page de garde non générée → on continue sans
      }          

      for (let i = 0; i < songs.length; i++) {
        const song = songs[i];
        setPdfProgress({ done: i, total: songs.length });
  
        try {
          // Récupérer les fichiers du chant
          let pdfFiles: { name: string; url?: string }[] = [];
  
          if (isThisEventCached && cachedEvent?.cached_files) {
            // Offline : utiliser les fichiers du cache
            pdfFiles = cachedEvent.cached_files
              .filter((f) => String(f.songId) === String(song.id) && f.fileName.toLowerCase().endsWith('.pdf'))
              .map((f) => ({ name: f.fileName, url: f.url }));
          } else {
            // Online : récupérer depuis Supabase
            const allFiles = await getSongFiles(String(song.id), song.title, song.code ?? undefined);
            pdfFiles = allFiles.filter((f: any) => f.name.toLowerCase().endsWith('.pdf'));
          }
  
          // Traiter chaque PDF du chant dans l'ordre
          for (const pdfFile of pdfFiles) {
            try {
              let pdfBytes: ArrayBuffer;
  
              if (isThisEventCached && cachedEvent) {
                // Offline : récupérer depuis le cache
                const cachedFileEntry = cachedEvent.cached_files?.find(
                  (f) => String(f.songId) === String(song.id) && f.fileName === pdfFile.name
                );
                const publicUrl = cachedFileEntry?.url ?? getSongFileUrl(String(song.id), pdfFile.name);
                const cachedUrl = await getCachedFileUrl(String(cachedEvent.id), publicUrl);
                const url = cachedUrl ?? publicUrl;
                pdfBytes = await fetch(url).then((r) => r.arrayBuffer());
              } else {
                // Online : récupérer depuis Supabase ou externe
                const url = pdfFile.url ?? getSongFileUrl(String(song.id), pdfFile.name);
                pdfBytes = await fetch(url).then((r) => r.arrayBuffer());
              }
  
              // Copier les pages dans le document fusionné
              const srcDoc = await PDFDocument.load(pdfBytes);
              const pages = await mergedPdf.copyPages(srcDoc, srcDoc.getPageIndices());
              pages.forEach((page) => mergedPdf.addPage(page));
              totalPdfCount++;
            } catch {
              // Fichier PDF inaccessible → on le saute silencieusement
            }
          }
        } catch {
          // Chant inaccessible → on le saute silencieusement
        }
      }
  
      setPdfProgress({ done: songs.length, total: songs.length });
  
      if (totalPdfCount === 0) {
        setPdfError('Aucun fichier PDF disponible pour cet événement.');
        return;
      }
  
      // Générer et télécharger le PDF final
      const pdfBytes = await mergedPdf.save();
      const blob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${event.name}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
  
    } catch (err: any) {
      setPdfError(`Erreur lors de la génération : ${err.message}`);
    } finally {
      setIsGeneratingPdf(false);
      setPdfProgress(null);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      // Récupérer l'utilisateur connecté (peut être null)
      const currentUser = await getCurrentUser();

      // ── Vérifier les droits d'accès depuis le localStorage ───────────
      // joined_choirs : chorales rejointes explicitement (code connu)
      const storedChoirs = getStoredChoirs();
      // joined_events : événements rejoints (directement ou via une chorale)
      const storedEvents = getStoredEvents();

      // Vérifier si l'événement est dans joined_events
      const storedEvent = storedEvents.find((e) => String(e.id) === String(eventId));

      // Vérifier si la chorale de rattachement est dans joined_choirs
      const choirId = storedEvent?.choir_id;
      const isChoirMember = choirId
        ? storedChoirs.some((c) => String(c.id) === String(choirId))
        : false;

      // L'utilisateur a accès si :
      // - il a rejoint l'événement directement (storedEvent trouvé)
      // - OU il a rejoint la chorale de rattachement (isChoirMember)
      // Note : le cas propriétaire sera vérifié après l'appel Supabase
      const hasLocalAccess = !!storedEvent || isChoirMember;

      // Vrai uniquement si l'événement a été rejoint directement
      // (pas via la chorale) — détermine si le bouton "Quitter" est affiché
      setIsDirectEventMember(!!storedEvent && !isChoirMember);      

      try {
        // Récupérer l'événement depuis Supabase
        const eventData = await getEvent(eventId!);
        setEvent(eventData);

        // Récupérer le nom de la chorale pour l'affichage
        const choirData = await getChoir(String(eventData.choir_id));
        if (choirData) setChoirName(choirData.name);

        // Vérifier si l'utilisateur est propriétaire de la chorale
        const ownerId = await getChoirOwner(String(eventData.choir_id));
        const ownerCheck = currentUser && ownerId === currentUser.id;
        if (ownerCheck) setIsOwner(true);

        // Vérifier si l'utilisateur est le créateur de l'événement
        const userParamId = currentUser ? await getUserParamId(currentUser.email!) : null;
        const creatorCheck = userParamId !== null && eventData.created_by === userParamId;
        if (creatorCheck) setIsCreator(true);

        // Contrôle d'accès final :
        // - propriétaire → accès total
        // - accès local (chorale ou événement rejoint) → accès lecture
        // - aucun droit → redirection
        if (!ownerCheck && !hasLocalAccess) {
          navigate('/');
          return;
        }

        // Bloquer l'accès si l'événement est inactif pour les non-admins
        if (eventData.active === false && !ownerCheck && !creatorCheck) {
          navigate(`/choir/${eventData.choir_id}`, { replace: true });
          return;
        }

        // Récupérer les chants associés à l'événement
        const songsData = await getEventSongsDetails(eventId!);
        setSongs(songsData);

        // Incrémenter le compteur de vues        
        incrementEventViews(String(eventId)).catch(() => {});

      } catch {
        // ── Fallback offline ─────────────────────────────────────────────
        // Supabase inaccessible : on reconstruit ce qu'on peut depuis le localStorage

        // Vérifier les droits d'accès offline
        if (!hasLocalAccess) {
          navigate('/');
          return;
        }

        // Reconstituer l'événement depuis le localStorage
        if (storedEvent) {
          setEvent({
            id: storedEvent.id,
            name: storedEvent.name,
            code: storedEvent.code,
            choir_id: storedEvent.choir_id,
            event_date: storedEvent.event_date ?? null,
          });
          // Récupérer le nom de la chorale
          setChoirName(storedEvent?.choir_name ?? null);
          // Chants disponibles offline grâce au cache localStorage
          setSongs(storedEvent.songs ?? []);
        } else { 
          setSongs([]); 
        }
      }

      setLoading(false);
    };
    fetchData();
  }, [eventId, navigate]);

  // Formater le code en groupes de 2 chiffres séparés par des tirets
  const formatCode = (code: string) => code.match(/.{1,2}/g)?.join('-') ?? code;

  // Formater une date ISO en jj/mm/aaaa
  // Retourne null si la date n'est pas disponible (mode offline)
  const formatDate = (isoDate: string | null) => {
    if (!isoDate) return null;
    const d = new Date(isoDate);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  };

  return (
    <div className="page-container">
      <TopBar />
      
      {loading ? <div className="spinner"></div> : (
        <>
          <h2>
            <i className="fa fa-calendar-days" style={{ color: '#DA486D', marginRight: '0.5rem' }}></i>
            {event.name}
          </h2>

          {/* Bandeau événement inactif — visible uniquement pour propriétaire/créateur */}
          {event.active === false && (isOwner || isCreator) && (
            <div style={{
              backgroundColor: '#f5f5f5', border: '1px solid #aaa',
              borderRadius: '8px', padding: '0.6rem 1rem',
              marginBottom: '1rem', fontSize: '0.9rem', color: '#888',
              display: 'flex', alignItems: 'center', gap: '0.5rem',
            }}>
              <i className="fa fa-eye-slash"></i>
              Cet événement est inactif — invisible pour les autres membres.
            </div>
          )}

          {/* Code de l'événement : toujours affiché
              (utile pour partager l'événement avec d'autres membres) */}
          <p><strong>Code :</strong> {formatCode(String(event.code))}</p>

          {/* Nom de la chorale */}
          {choirName && (
            <p>
              <span
                onClick={() => navigate(`/choir/${event.choir_id}`)}
                style={{ color: '#FB8917', cursor: 'pointer', textDecoration: 'underline' }}
              >
                <i className="fa fa-users" style={{ marginRight: '0.4rem' }}></i>
                {choirName}
              </span>
            </p>
          )}
          
          {/* Date */}
          {formatDate(event.event_date) && (
            <p><strong>Date :</strong> {formatDate(event.event_date)}</p>
          )}

          {/* Liste des chants associés à l'événement
              Non disponible en mode offline */}
          {songs.length === 0 ? (
            <p>Aucun chant associé à cet événement.</p>
          ) : (
            <ul className="list-music">
              {songs.map((s) => (
                <div key={s.id} className="card-music pink">
                  <i className="fa fa-music note"></i>
                  <div
                    className="text"
                    onClick={() => navigate(`/song/${s.id}`, {
                      state: {
                        backUrl: `/event/${eventId}`,
                        // Ordre défini au niveau de l'événement
                        songList: songs.map((song: any) => song.id),
                      }
                    })}                    
                    style={{ cursor: 'pointer' }}
                  >
                    <strong>{s.title}</strong>
                    {/* Hashtags sous forme de pills */}
                    {s.hashtags && s.hashtags.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.3rem' }}>
                        {s.hashtags.map((tag: string) => (
                          <span key={tag} className="hashtag-pill">{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </ul>
          )}

          {/* Bouton quitter : uniquement pour les non-propriétaires
              ayant rejoint l'événement directement (pas via la chorale) */}
          {!isOwner && isDirectEventMember && (
            <div style={{ marginTop: '1.5rem' }}>
              <button
                className="page-button pink"
                onClick={() => navigate(`/leave-event/${eventId}`)}
              >
                <i className="fa fa-sign-out"></i> &nbsp;
                Quitter l'événement
              </button>
            </div>
          )}

          {/* Bouton livret PDF — visible pour tous */}
          {songs.length > 0 && (
            <div style={{ marginTop: '1.5rem' }}>
              <button
                className="page-button pink"
                onClick={handleGenerateLivret}
                disabled={isGeneratingPdf}
              >
                <i className="fa fa-file-pdf"></i> &nbsp;
                {isGeneratingPdf ? 'Génération...' : 'Télécharger le livret PDF'}
              </button>

              {/* Barre de progression */}
              {isGeneratingPdf && pdfProgress && (
                <div style={{ marginTop: '0.5rem' }}>
                  <p style={{ fontSize: '0.85rem', color: '#DA486D', margin: '0 0 0.3rem 0' }}>
                    Traitement : {pdfProgress.done} / {pdfProgress.total} chants
                  </p>
                  <div style={{ height: '6px', backgroundColor: '#FDE8ED', borderRadius: '4px' }}>
                    <div style={{
                      height: '100%', borderRadius: '4px', backgroundColor: '#DA486D',
                      width: pdfProgress.total > 0
                        ? `${Math.round((pdfProgress.done / pdfProgress.total) * 100)}%`
                        : '0%',
                      transition: 'width 0.3s',
                    }} />
                  </div>
                </div>
              )}

              {/* Message d'erreur */}
              {pdfError && (
                <p style={{ color: '#DA486D', fontSize: '0.9rem', marginTop: '0.5rem' }}>{pdfError}</p>
              )}
            </div>
          )}

          {/* Boutons modification / suppression (propriétaire ou délégué) */}
          {(isOwner || isCreator) && (
            <>
              <div style={{ marginTop: '2.5rem' }}>
                <button
                  className="page-button pink"
                  onClick={() => navigate(`/edit-event/${event.id}`)}
                >
                  <i className="fa fa-calendar-days"></i> &nbsp;
                  Modifier l'événement
                </button>
              </div>
              <div style={{ marginTop: '1.5rem' }}>
                <button
                  className="page-button pink"
                  onClick={() => navigate(`/delete-event/${event.id}`)}
                >
                  <i className="fa fa-calendar-days"></i> &nbsp;
                  Supprimer l'événement
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}