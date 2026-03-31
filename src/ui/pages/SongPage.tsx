import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { getCurrentUser, getUserDelegations } from '../../infrastructure/storage/authService';
import { getStoredEvents, getCachedEvent, setStoredEvents } from '../../infrastructure/storage/localStorageService';
import { getCachedFileUrl, isCacheable } from '../../infrastructure/storage/cacheService';
import {
  getSong, getSongFiles, fileExists, uploadSongFile, deleteSongFile, incrementSongViews,
  getSongFileUrl, updateSong, getChoirHashtags, toggleFavoriteSong, toggleCommonSong,
} from '../../infrastructure/storage/songsService';
import { getChoirOwner } from '../../infrastructure/storage/choirsService';
import '../../App.css';
import TopBar from '../components/TopBar';
import { type UserProfile } from '../components/helpData';

export default function SongPage() {
  const { songId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOffline, setIsOffline] = useState(false);
  const [song, setSong] = useState<any>(null);
  const [files, setFiles] = useState<any[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [isDelegate, setIsDelegate] = useState(false);
  const [loading, setLoading] = useState(true);

  // ── Navigation par swipe ─────────────────────────────────────────────
  // songList est transmis dans location.state par la page appelante (ChoirPage, EventPage)
  // Il contient la liste ordonnée des ids des chants, permettant la navigation swipe
  const songList: string[] | undefined = location.state?.songList;
  const currentIndex = songList ? songList.findIndex((id) => String(id) === String(songId)) : -1;
  const hasPrev = currentIndex > 0;
  const hasNext = songList ? currentIndex < songList.length - 1 : false;

  // Titres des chants précédent et suivant — chargés une seule fois quand l'index change
  const [prevTitle, setPrevTitle] = useState<string>('');
  const [nextTitle, setNextTitle] = useState<string>('');

  // État du swipe en cours
  const [translateX, setTranslateX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const pointerStartX = useRef<number | null>(null);
  const pointerStartY = useRef<number | null>(null);

  // Seuil en pixels à partir duquel le swipe déclenche la navigation
  const SWIPE_THRESHOLD = 80;
  // Marge gauche en dessous de laquelle on ignore le swipe
  // (pour éviter la confusion avec le geste "back" natif iOS)
  const LEFT_EDGE_MARGIN = 25;

  // ── Hashtags ─────────────────────────────────────────────────────────
  const [showHashtagInput, setShowHashtagInput] = useState(false);
  const [quickHashtagInput, setQuickHashtagInput] = useState('');
  const [allHashtags, setAllHashtags] = useState<string[]>([]);
  const [hashtagSuggestions, setHashtagSuggestions] = useState<string[]>([]);
  // Ref pour détecter le clic sur une suggestion (évite la perte de focus)
  const clickedSuggestionRef = useRef<string | null>(null);

  // ── Formulaire ajout fichier ──────────────────────────────────────────
  const [label, setLabel] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Visionneuse PDF plein écran ───────────────────────────────────────
  // Les pages PDF sont rasterisées en images JPEG via pdfjs-dist
  const [pdfPages, setPdfPages] = useState<string[]>([]);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  // ── Lecteur audio ─────────────────────────────────────────────────────
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioName, setAudioName] = useState<string>('');
  const audioRef = useRef<HTMLAudioElement>(null);
  // Sélecteur audio affiché dans l'overlay PDF
  const [showAudioSelect, setShowAudioSelect] = useState(false);
  // Vrai si le PDF est ouvert et qu'il y a des fichiers audio disponibles
  const [pdfAudioReady, setPdfAudioReady] = useState(false);

  // ── Cache fichiers individuels ────────────────────────────────────────
  // Si le chant appartient à l'événement mémorisé, l'utilisateur peut
  // ajouter/supprimer des fichiers individuels du cache offline
  const [cachedEventId, setCachedEventIdState] = useState<string | null>(null);
  const [downloadedFiles, setDownloadedFiles] = useState<Set<string>>(new Set());
  const [fileProgress, setFileProgress] = useState<{ done: number; total: number } | null>(null);

  // ── Aide contextuelle ─────────────────────────────────────────────────
  const [helpProfiles, setHelpProfiles] = useState<UserProfile[]>([]);

  // ── Chargement des titres adjacents ──────────────────────────────────
  // Chargés une seule fois quand l'index change pour l'aperçu swipe
  useEffect(() => {
    const loadAdjacentTitles = async () => {
      if (!songList) return;
      if (hasPrev) {
        try {
          const s = await getSong(songList[currentIndex - 1]);
          setPrevTitle(s.title);
        } catch { setPrevTitle(''); }
      }
      if (hasNext) {
        try {
          const s = await getSong(songList[currentIndex + 1]);
          setNextTitle(s.title);
        } catch { setNextTitle(''); }
      }
    };
    loadAdjacentTitles();
  }, [songList, currentIndex]);

  // Reset translateX à chaque changement de chant
  useEffect(() => {
    setTranslateX(0);
  }, [songId]);

  // ── Chargement principal ──────────────────────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      // Reset de tous les states au changement de chant
      // (important pour la navigation par swipe qui ne recharge pas la page)
      setFiles([]);
      setIsOffline(false);
      setSong(null);
      setIsOwner(false);
      setIsDelegate(false);
      setCachedEventIdState(null);
      setDownloadedFiles(new Set());
      setLoading(true);

      const currentUser = await getCurrentUser();
      const storedEvents = getStoredEvents();

      // Variables locales pour les profils d'aide — le state React n'est pas
      // encore mis à jour au moment où on construit les profils
      let ownerCheckLocal = false;
      let delegateCheckLocal = false;

      try {
        // ── Mode online ───────────────────────────────────────────────
        const songData = await getSong(songId!);
        setSong(songData);

        // Charger les hashtags connus de la chorale pour l'autocomplétion
        const known = await getChoirHashtags(songData.choir_id);
        setAllHashtags(known);

        // Vérifier si l'utilisateur est propriétaire de la chorale
        const ownerId = await getChoirOwner(songData.choir_id);
        const ownerCheck = currentUser && ownerId === currentUser.id;
        if (ownerCheck) setIsOwner(true);
        ownerCheckLocal = ownerCheck ?? false;

        // Vérifier si l'utilisateur a reçu délégation sur cette chorale
        const delegations = currentUser ? await getUserDelegations(currentUser.email!) : [];
        const delegateCheck = delegations.includes(String(songData.choir_id));
        setIsDelegate(delegateCheck);
        delegateCheckLocal = delegateCheck;

        // Contrôle d'accès :
        // - propriétaire → accès total (upload, suppression, hashtags)
        // - délégué → accès partiel (lecture seule des fichiers)
        // - membre/guest → accès uniquement si le chant est dans un événement rejoint
        const hasEventAccess = storedEvents.some((e) =>
          e.songs?.some((s) => String(s.id) === String(songId))
        );
        if (!ownerCheck && !delegateCheck && !hasEventAccess) {
          navigate('/');
          return;
        }

        await fetchFiles(songData.title, songData.code ?? undefined);

        // Incrémenter le compteur de vues silencieusement
        incrementSongViews(String(songId)).catch(() => {});

        // Vérifier si ce chant appartient à l'événement mémorisé pour le cache offline
        // → affiche les icônes de téléchargement individuel sur chaque fichier
        const cachedEvent = getCachedEvent();
        if (cachedEvent?.cached_files) {
          const songIsInCachedEvent = cachedEvent.cached_files.some(
            (f) => String(f.songId) === String(songId)
          );
          if (songIsInCachedEvent) {
            setCachedEventIdState(String(cachedEvent.id));
            // Construire la liste des fichiers déjà présents dans le cache
            const downloaded = new Set<string>();
            for (const f of cachedEvent.cached_files.filter((f) => String(f.songId) === String(songId))) {
              const publicUrl = f.url ?? getSongFileUrl(String(songId), f.fileName);
              const cachedUrl = await getCachedFileUrl(String(cachedEvent.id), publicUrl);
              if (cachedUrl) downloaded.add(f.fileName);
            }
            setDownloadedFiles(downloaded);
          }
        }
      } catch {
        // ── Fallback offline ──────────────────────────────────────────
        // Supabase inaccessible : reconstituer depuis le localStorage et le cache

        // Vérifier que le chant est accessible via un événement en localStorage
        const matchingEvent = storedEvents.find((e) =>
          e.songs?.some((s) => String(s.id) === String(songId))
        );
        if (!matchingEvent) {
          navigate('/my-choirs', { replace: true });
          return;
        }

        // Reconstituer le chant depuis le localStorage
        const cachedSong = matchingEvent.songs.find((s) => String(s.id) === String(songId));
        if (cachedSong) {
          setSong({
            id: cachedSong.id,
            title: cachedSong.title,
            choir_id: matchingEvent.choir_id,
            hashtags: [],
          });
        }

        // Reconstituer les fichiers depuis le cache offline (Cache API)
        const cachedEvent = getCachedEvent();
        if (cachedEvent?.cached_files) {
          const offlineFiles: { name: string }[] = [];
          for (const f of cachedEvent.cached_files.filter((f) => String(f.songId) === String(songId))) {
            const publicUrl = f.url ?? getSongFileUrl(String(songId), f.fileName);
            const cachedUrl = await getCachedFileUrl(String(cachedEvent.id), publicUrl);
            if (cachedUrl) offlineFiles.push({ name: f.fileName });
          }
          // Trier : PDF d'abord, puis audio, alphabétique dans chaque groupe
          offlineFiles.sort((a, b) => {
            const extA = a.name.split('.').pop()?.toLowerCase() || '';
            const extB = b.name.split('.').pop()?.toLowerCase() || '';
            const isAudioA = ['mp3', 'wav', 'ogg', 'm4a'].includes(extA);
            const isAudioB = ['mp3', 'wav', 'ogg', 'm4a'].includes(extB);
            if (isAudioA !== isAudioB) return isAudioA ? 1 : -1;
            return a.name.localeCompare(b.name);
          });
          setFiles(offlineFiles);
          setIsOffline(true);
        } else {
          setFiles([]);
        }
      }

      // ── Construire les profils d'aide ─────────────────────────────
      const profiles: UserProfile[] = [];
      if (!currentUser) {
        if (storedEvents.some((e) => e.songs?.some((s) => String(s.id) === String(songId)))) {
          profiles.push('member');
        } else {
          profiles.push('anonymous');
        }
      } else {
        if (ownerCheckLocal) profiles.push('owner');
        else if (delegateCheckLocal) profiles.push('delegate');
        else if (storedEvents.some((e) => e.songs?.some((s) => String(s.id) === String(songId)))) {
          profiles.push('member');
        } else {
          profiles.push('anonymous');
        }
      }
      setHelpProfiles(profiles);

      setLoading(false);
    };

    fetchData();

    // Arrêter la musique quand on quitte la page ou change de chant
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, [songId, navigate]);

  // Lancer automatiquement la lecture quand l'URL audio change
  useEffect(() => {
    if (audioUrl && audioRef.current) {
      audioRef.current.load();
      audioRef.current.play().catch(() => {});
    }
  }, [audioUrl]);

  // ── Vibration mobile ──────────────────────────────────────────────────
  const vibrateIfMobile = () => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(50);
    }
  };

  // ── Navigation entre chants ───────────────────────────────────────────
  // Arrête l'audio et navigue vers un autre chant en conservant songList dans le state
  const navigateToSong = (targetId: string) => {
    vibrateIfMobile();
    // Arrêter et fermer le lecteur audio avant de naviguer
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    setAudioUrl(null);
    setAudioName('');
    navigate(`/song/${targetId}`, {
      state: {
        backUrl: location.state?.backUrl,
        songList, // retransmettre la liste pour les swipes suivants
      },
      replace: true, // ne pas empiler dans l'historique pour faciliter le retour
    });
  };

  // ── Gestionnaires de swipe ────────────────────────────────────────────
  const resetSwipe = () => {
    pointerStartX.current = null;
    pointerStartY.current = null;
    setIsSwiping(false);
    setTranslateX(0);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Ignorer si PDF ouvert, pas de liste, ou démarrage trop près du bord gauche
    // (bord gauche réservé au geste "back" natif iOS)
    if ((pdfPages.length > 0 || pdfLoading) || !songList) return;
    if (e.clientX < LEFT_EDGE_MARGIN) return;
    pointerStartX.current = e.clientX;
    pointerStartY.current = e.clientY;
    setIsSwiping(false);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointerStartX.current === null || pointerStartY.current === null) return;
    const deltaX = e.clientX - pointerStartX.current;
    const deltaY = e.clientY - pointerStartY.current;
    // Si le mouvement est plus vertical qu'horizontal → annuler le swipe
    // pour ne pas interférer avec le scroll de la page
    if (!isSwiping && Math.abs(deltaY) > Math.abs(deltaX)) {
      pointerStartX.current = null;
      pointerStartY.current = null;
      return;
    }
    setIsSwiping(true);
    // Capturer le pointer pour recevoir les événements même hors du composant
    e.currentTarget.setPointerCapture(e.pointerId);
    setTranslateX(deltaX);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointerStartX.current === null || !songList) { resetSwipe(); return; }
    const delta = e.clientX - pointerStartX.current;
    resetSwipe();
    if (Math.abs(delta) > SWIPE_THRESHOLD) {
      if (delta < 0 && hasNext) {
        // Swipe gauche → chant suivant : animer vers la gauche puis naviguer
        setTranslateX(-window.innerWidth);
        setTimeout(() => navigateToSong(songList[currentIndex + 1]), 200);
        return;
      } else if (delta > 0 && hasPrev) {
        // Swipe droite → chant précédent : animer vers la droite puis naviguer
        setTranslateX(window.innerWidth);
        setTimeout(() => navigateToSong(songList[currentIndex - 1]), 200);
        return;
      }
    }
    // Swipe insuffisant → retour en position initiale avec animation
    setTranslateX(0);
  };

  const handlePointerCancel = () => resetSwipe();

  // ── Visionneuse PDF ───────────────────────────────────────────────────
  // Rasterise chaque page du PDF en image JPEG via pdfjs-dist
  const handleOpenPdf = async (url: string) => {
    setPdfLoading(true);
    setPdfError(null);
    setPdfPages([]);
    try {
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      const pdf = await pdfjsLib.getDocument(url).promise;
      const pages: string[] = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d')!;
        await page.render({ canvasContext: ctx, viewport }).promise;
        pages.push(canvas.toDataURL('image/jpeg', 0.85));
      }
      setPdfPages(pages);
      // Proposer la sélection audio si des fichiers audio sont disponibles
      if (!audioUrl && files.some((f) => isAudio(f.name))) setPdfAudioReady(true);
    } catch (err: any) {
      setPdfError(`Erreur : ${err.message}`);
    }
    setPdfLoading(false);
  };

  // ── Fichiers ──────────────────────────────────────────────────────────
  // Récupère et trie les fichiers : PDF d'abord, puis audio, alphabétique
  const fetchFiles = async (songTitle?: string, songCode?: string) => {
    const data = await getSongFiles(songId!, songTitle, songCode);
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

  // ── Hashtags ──────────────────────────────────────────────────────────
  // Ajoute un hashtag au chant depuis le champ de saisie rapide
  // Normalise : supprime les accents, met la première lettre en majuscule, préfixe #
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
      await updateSong(song.id, song.title, updatedHashtags, song.code ?? null);
      setSong({ ...song, hashtags: updatedHashtags });
    } catch (err: any) {
      setMessage(`Erreur : ${err.message}`);
    }
    setQuickHashtagInput('');
    setShowHashtagInput(false);
  };

  // ── Upload fichier ────────────────────────────────────────────────────
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
      const ext = file.name.split('.').pop();
      // Nettoyer le nom : supprime accents, ligatures, virgules
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
      await fetchFiles(song?.title, song?.code ?? undefined);
    } catch (err: any) {
      setMessage(`Erreur : ${err.message}`);
    }
    setUploading(false);
  };

  // ── Suppression fichier ───────────────────────────────────────────────
  const handleDeleteFile = async (fileName: string) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer "${fileName}" ?`)) return;
    try {
      await deleteSongFile(songId!, fileName);
      await fetchFiles(song?.title, song?.code ?? undefined);
    } catch (err: any) {
      setMessage(`Erreur lors de la suppression : ${err.message}`);
    }
  };

  // ── Cache fichier individuel ──────────────────────────────────────────
  // Ajoute ou supprime un fichier du cache offline de l'événement mémorisé
  const handleCacheToggle = async (fileName: string) => {
    if (!cachedEventId || fileProgress) return;
    const cachedEvent = getCachedEvent();
    const cachedFile = cachedEvent?.cached_files?.find(
      (f) => String(f.songId) === String(songId) && f.fileName === fileName
    );
    const publicUrl = cachedFile?.url ?? getPublicUrl(fileName);
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
      // Télécharger et mettre en cache
      setFileProgress({ done: 0, total: 1 });
      const response = await fetch(publicUrl);
      const cache = await caches.open(`event-files-${cachedEventId}`);
      await cache.put(publicUrl, response);
      // Mettre à jour cached_files dans le localStorage
      const stored = getStoredEvents();
      setStoredEvents(stored.map((e) =>
        String(e.id) === String(cachedEventId)
          ? { ...e, cached_files: [...(e.cached_files ?? []), { songId: String(songId), fileName, url: publicUrl }]}
          : e
      ));
      // Mettre à jour l'état local
      setDownloadedFiles((prev) => new Set(prev).add(fileName));
      setFileProgress({ done: 1, total: 1 });
      setTimeout(() => setFileProgress(null), 500);
    }
  };

  // ── Utilitaires fichiers ──────────────────────────────────────────────
  // Déterminer l'icône Font Awesome selon l'extension du fichier
  const getIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext || '')) return 'fa-play';
    if (ext === 'pdf') return 'fa-file-lines';
    return 'fa-file';
  };

  // Obtenir l'URL publique d'un fichier dans le bucket
  const getPublicUrl = (fileName: string) => {
    const found = files.find(f => f.name === fileName);
    return found?.url ?? getSongFileUrl(songId!, fileName);
  };

  // Déterminer si fichier audio
  const isAudio = (fileName: string) =>
    ['mp3', 'wav', 'ogg', 'm4a'].includes(fileName.split('.').pop()?.toLowerCase() || '');

  // Déterminer si fichier pdf
  const isPdf = (fileName: string) =>
    fileName.split('.').pop()?.toLowerCase() === 'pdf';

  // Ouvre un fichier : PDF → visionneuse, audio → lecteur
  const handleFileClick = async (fileName: string) => {
    let url: string;
    if (isOffline) {
      const cachedEvent = getCachedEvent();
      const cachedFile = cachedEvent?.cached_files?.find(
        (f) => String(f.songId) === String(songId) && f.fileName === fileName
      );
      const publicUrl = cachedFile?.url ?? getSongFileUrl(songId!, fileName);
      url = (await getCachedFileUrl(String(cachedEvent!.id), publicUrl)) ?? publicUrl;
    } else {
      url = getPublicUrl(fileName);
    }
    if (isPdf(fileName)) {
      handleOpenPdf(url);
    } else if (isAudio(fileName)) {
      setAudioUrl(url);
      setAudioName(fileName.split('.').slice(0, -1).join('.'));
      setPdfAudioReady(false);
    }
  };

  // ── Rendu ─────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Overlay PDF plein écran ───────────────────────────────────────
          Placé EN DEHORS du conteneur swipeable pour que position:fixed
          fonctionne correctement (un transform crée un nouveau contexte
          de positionnement et piège les éléments fixed à l'intérieur) */}
      {(pdfPages.length > 0 || pdfLoading) && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: '#0A1F44', zIndex: 1000,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          {/* Barre de contrôles PDF */}
          <div style={{ display: 'flex', alignItems: 'center', padding: '0.5rem', gap: '0.5rem', flexShrink: 0 }}>
            <button
              onClick={() => { setPdfPages([]); setPdfAudioReady(false); setAudioUrl(null); setAudioName(''); }}
              style={{ padding: '0.4rem 0.8rem', fontSize: '1rem', background: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', whiteSpace: 'nowrap', color: '#044C8D' }}
            >
              ✕ Fermer
            </button>
            {(audioUrl || pdfAudioReady) && (
              <>
                {audioUrl ? (
                  <audio ref={audioRef} controls autoPlay loop src={audioUrl} style={{ flex: 1, height: '35px', minWidth: 0 }} />
                ) : (
                  <span style={{ flex: 1, color: 'white', fontSize: '0.9rem', paddingLeft: '0.5rem' }}>Sélectionnez un audio ↓</span>
                )}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <button onClick={() => setShowAudioSelect(!showAudioSelect)}
                    style={{ height: '35px', width: '35px', borderRadius: '8px', border: 'none', backgroundColor: 'white', color: 'black', fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <i className="fa fa-music"></i>
                  </button>
                  {showAudioSelect && (
                    <div style={{ position: 'absolute', top: '40px', right: 0, backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', overflow: 'hidden', minWidth: '180px', zIndex: 1001 }}>
                      {files.filter((f) => isAudio(f.name)).map((f) => (
                        <div key={f.name}
                          onClick={() => { setAudioUrl(getPublicUrl(f.name)); setAudioName(f.name.split('.').slice(0, -1).join('.')); setPdfAudioReady(false); setShowAudioSelect(false); }}
                          style={{ padding: '0.6rem 1rem', fontSize: '0.9rem', cursor: 'pointer', color: '#222', borderBottom: '1px solid #eee' }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#ddd')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'white')}
                        >{f.name.split('.').slice(0, -1).join('.')}</div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
          {/* Pages PDF */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
            {pdfLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <div className="spinner"></div>
              </div>
            ) : pdfError ? (
              <p style={{ color: '#DA486D', padding: '1rem' }}>{pdfError}</p>
            ) : (
              pdfPages.map((src, i) => (
                <img key={i} src={src} alt={`Page ${i + 1}`} style={{
                  width: '100%', display: 'block',
                  marginBottom: i < pdfPages.length - 1 ? '0.5rem' : 0,
                  borderRadius: '4px',
                }} />
              ))
            )}
          </div>
        </div>
      )}

      {/* ── Lecteur audio flottant ────────────────────────────────────────
          Placé EN DEHORS du conteneur swipeable — même raison que l'overlay PDF */}
      {audioUrl && pdfPages.length === 0 && !pdfLoading && (
        <div style={{ position: 'fixed', bottom: '1rem', right: '1rem', backgroundColor: '#044C8D', color: 'white', borderRadius: '12px', padding: '0.8rem 1rem', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', zIndex: 999, minWidth: '280px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{audioName}</span>
            <button onClick={() => setAudioUrl(null)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
          </div>
          <audio ref={audioRef} controls autoPlay loop src={audioUrl} style={{ width: '100%', height: '35px' }} />
        </div>
      )}

      {/* ── Zone de swipe ────────────────────────────────────────────────
          Wrapper overflow:hidden pour masquer les panneaux adjacents */}
      <div style={{ position: 'relative', overflow: 'hidden' }}>

        {/* Panneau précédent — glisse depuis la gauche lors d'un swipe droite */}
        {hasPrev && (
          <div style={{
            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
            // Se positionne à gauche du panneau courant, suit son déplacement
            transform: `translateX(calc(-100% + ${Math.max(translateX, 0)}px))`,
            // Apparaît progressivement (opacité 0 → 1 sur 120px de déplacement)
            opacity: Math.min(Math.max(translateX, 0) / 120, 1),
            pointerEvents: 'none', // pas d'interaction avec l'aperçu
            backgroundColor: 'white',
            padding: '1rem',
            boxSizing: 'border-box',
          }}>
            <TopBar helpPage="song" helpProfiles={[]} />
            <h2 style={{ marginTop: '1rem', marginLeft: '5rem' }}>
              <i className="fa fa-music" style={{ color: '#DA486D', marginRight: '0.5rem' }}></i>
              {prevTitle}
            </h2>
          </div>
        )}

        {/* Panneau suivant — glisse depuis la droite lors d'un swipe gauche */}
        {hasNext && (
          <div style={{
            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
            transform: `translateX(calc(100% + ${Math.min(translateX, 0)}px))`,
            opacity: Math.min(Math.abs(Math.min(translateX, 0)) / 120, 1),
            pointerEvents: 'none',
            backgroundColor: 'white',
            padding: '1rem',
            boxSizing: 'border-box',
          }}>
            <TopBar helpPage="song" helpProfiles={[]} />
            <h2 style={{ marginTop: '1rem', marginRight: '5rem' }}>
              <i className="fa fa-music" style={{ color: '#DA486D', marginRight: '0.5rem' }}></i>
              {nextTitle}
            </h2>
          </div>
        )}

        {/* ── Panneau courant ───────────────────────────────────────────── */}
        <div
          className="page-container"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          style={{
            userSelect: 'none',
            touchAction: 'pan-y', // laisser le scroll vertical au navigateur
            transform: `translateX(${translateX}px)`,
            transition: isSwiping ? 'none' : 'transform 0.25s ease',
          }}
        >
          <TopBar helpPage="song" helpProfiles={helpProfiles} />

          {loading ? <div className="spinner"></div> : (
            <>
              <h2>
                <i className="fa fa-music" style={{ color: '#DA486D', marginRight: '0.5rem' }}></i>
                {song.title}
                {/* Code du chant — visible uniquement par le propriétaire */}
                {isOwner && song.code && (
                  <span style={{
                    marginLeft: '0.6rem', fontSize: '0.75rem',
                    backgroundColor: '#eee', padding: '0.2rem 0.5rem',
                    borderRadius: '6px', color: '#555',
                  }}>
                    {song.code}
                  </span>
                )}
              </h2>

              {/* Flèches de navigation + indicateur de position X/N */}
              {songList && songList.length > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0.3rem 0 0.8rem 0' }}>
                  <i className="fa fa-chevron-left"
                    onClick={() => hasPrev && navigateToSong(songList[currentIndex - 1])}
                    style={{ fontSize: '1.3rem', color: hasPrev ? '#044C8D' : '#ddd', cursor: hasPrev ? 'pointer' : 'default', padding: '0.3rem 0.6rem' }}
                  />
                  <span style={{ fontSize: '0.85rem', color: '#888' }}>
                    {currentIndex >= 0 ? currentIndex + 1 : '?'} / {songList.length}
                  </span>
                  <i className="fa fa-chevron-right"
                    onClick={() => hasNext && navigateToSong(songList[currentIndex + 1])}
                    style={{ fontSize: '1.3rem', color: hasNext ? '#044C8D' : '#ddd', cursor: hasNext ? 'pointer' : 'default', padding: '0.3rem 0.6rem' }}
                  />
                </div>
              )}

              {/* Hashtags + ajout rapide (propriétaire) + indicateurs commun/favori */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', margin: '0.5rem 0', alignItems: 'center' }}>
                {song.hashtags?.map((tag: string) => (
                  <span key={tag} className="hashtag-pill">{tag}</span>
                ))}
                {isOwner && !showHashtagInput && (
                  <span onClick={() => setShowHashtagInput(true)} style={{
                    backgroundColor: '#DA486D', color: 'white', borderRadius: '20px',
                    padding: '0.3rem 0.8rem', fontSize: '0.85rem', cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: '0.4rem', lineHeight: 1,
                  }}>
                    <i className="fa fa-plus"></i> Ajouter un hashtag
                  </span>
                )}
                {/* Icône note : commun — visible par délégué, modifiable par propriétaire */}
                {(isOwner || isDelegate) && (
                  <i className="fa fa-music"
                    onClick={isOwner ? async () => {
                      try { await toggleCommonSong(song.id, !song.is_common); setSong({ ...song, is_common: !song.is_common }); } catch {}
                    } : undefined}
                    style={{ cursor: isOwner ? 'pointer' : 'default', color: song.is_common ? '#FFB300' : '#ddd', fontSize: '1.4rem', marginLeft: '0.5rem' }}
                  />
                )}
                {/* Icône cœur : favori — visible par délégué, modifiable par propriétaire */}
                {(isOwner || isDelegate) && (
                  <i className="fa fa-heart"
                    onClick={isOwner ? async () => {
                      try { await toggleFavoriteSong(song.id, !song.is_favorite); setSong({ ...song, is_favorite: !song.is_favorite }); } catch {}
                    } : undefined}
                    style={{ cursor: isOwner ? 'pointer' : 'default', color: song.is_favorite ? '#DA486D' : '#ddd', fontSize: '1.4rem', marginLeft: '0.5rem' }}
                  />
                )}
                {/* Champ de saisie hashtag avec autocomplétion */}
                {isOwner && showHashtagInput && (
                  <div style={{ position: 'relative' }}>
                    <input type="text" autoFocus placeholder="Hashtag..."
                      value={quickHashtagInput}
                      onChange={(e) => {
                        setQuickHashtagInput(e.target.value);
                        const search = e.target.value.toLowerCase();
                        setHashtagSuggestions(search.trim().length === 0 ? [] :
                          allHashtags.filter((h) => h.toLowerCase().includes(search) && !song.hashtags?.includes(h))
                        );
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleQuickAddHashtag(quickHashtagInput); setHashtagSuggestions([]); }
                        if (e.key === 'Escape') { setShowHashtagInput(false); setQuickHashtagInput(''); setHashtagSuggestions([]); }
                      }}
                      onBlur={() => {
                        setTimeout(() => {
                          if (clickedSuggestionRef.current) { handleQuickAddHashtag(clickedSuggestionRef.current); clickedSuggestionRef.current = null; }
                          else if (quickHashtagInput.trim().length > 0) { handleQuickAddHashtag(quickHashtagInput); }
                          else { setShowHashtagInput(false); }
                          setHashtagSuggestions([]);
                        }, 150);
                      }}
                      style={{ borderRadius: '20px', padding: '0.3rem 0.8rem', border: '2px solid #DA486D', fontSize: '0.85rem', outline: 'none', width: '130px' }}
                    />
                    {hashtagSuggestions.length > 0 && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.2)', overflow: 'hidden', minWidth: '160px', zIndex: 100 }}>
                        {hashtagSuggestions.map((s) => (
                          <div key={s} onMouseDown={() => { clickedSuggestionRef.current = s; }}
                            style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', cursor: 'pointer', color: '#222', borderBottom: '1px solid #eee' }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#E6F2FF')}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'white')}
                          >{s}</div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Barre de progression cache fichier individuel */}
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

              {/* Liste des fichiers */}
              {files.length === 0 ? (
                <p>Aucun fichier pour ce chant.</p>
              ) : (
                <ul className="list-music">
                  {files.map((f) => (
                    <div key={f.name} className="card-music">
                      <i className={`fa ${getIcon(f.name)} note`} onClick={() => handleFileClick(f.name)} style={{ cursor: 'pointer' }} />
                      <div className="text" onClick={() => handleFileClick(f.name)} style={{ cursor: 'pointer' }}>
                        <strong>{f.name.split('.').slice(0, -1).join('.')}</strong>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}>
                        {/* Icône cache individuel — affiché si le chant est dans l'événement mémorisé */}
                        {cachedEventId && isCacheable(f.name) && (
                          <i className="fa fa-download"
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
                        {/* Icône suppression — propriétaire uniquement, pas pour les fichiers externes */}
                        {isOwner && f.source !== 'external' && (
                          <i className="fa fa-trash trash" style={{ marginLeft: 0 }} onClick={() => handleDeleteFile(f.name)} />
                        )}
                      </div>
                    </div>
                  ))}
                </ul>
              )}

              {/* Formulaire ajout fichier — propriétaire uniquement */}
              {isOwner && (
                <>
                  <form onSubmit={handleUpload}>
                    <div style={{ margin: '0.8rem 0' }}>
                      {/* Input file masqué — déclenché par le bouton */}
                      <input type="file" accept="audio/*,.pdf" ref={fileInputRef}
                        onChange={(e) => {
                          const selected = e.target.files?.[0] || null;
                          setFile(selected);
                          if (selected && !label) setLabel(selected.name.split('.').slice(0, -1).join('.'));
                        }}
                        style={{ display: 'none' }}
                      />
                      <button type="button" className="page-button2" onClick={() => fileInputRef.current?.click()} style={{ marginTop: '1.5rem' }}>
                        Choisir un fichier
                      </button>
                      {file && <p style={{ marginTop: '0.3rem', fontSize: '0.9rem', color: '#555' }}>{file.name}</p>}
                    </div>
                    <input type="text" placeholder="Nom du fichier" value={label}
                      onChange={(e) => setLabel(e.target.value)} required className="page-form-input" />
                    <button className="page-button" type="submit" disabled={uploading}>
                      {uploading ? 'Envoi...' : 'Ajouter'}
                    </button>
                  </form>
                  <div>
                    <button className="page-button pink" onClick={() => navigate(`/edit-song/${song.id}`)} style={{ marginTop: '2.5rem' }}>
                      <i className="fa fa-music"></i> &nbsp; Modifier le chant
                    </button>
                  </div>
                  <div>
                    <button className="page-button pink" onClick={() => navigate(`/delete-song/${song.id}`)} style={{ marginTop: '1.5rem' }}>
                      <i className="fa fa-music"></i> &nbsp; Supprimer le chant
                    </button>
                  </div>
                  {message && <p style={{ color: 'red' }}>{message}</p>}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}