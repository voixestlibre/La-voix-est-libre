import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../infrastructure/storage/supabaseClient';
import logo from '../../assets/logo.png';
import { getStoredChoirs, getStoredEvents } from '../../infrastructure/storage/localStorageService';
import { getSongsByChoirIds } from '../../infrastructure/storage/songsService';
import { getOwnedChoirs } from '../../infrastructure/storage/choirsService';
import '../../App.css';

export default function HomePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [hasChoirs, setHasChoirs] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [allSongs, setAllSongs] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearch, setShowSearch] = useState(false);

  const [logoSrc, setLogoSrc] = useState(logo);

  // Gestion du logo (offline / online)
  useEffect(() => {
    const handleOffline = () => {
      const cached = localStorage.getItem('app_logo_b64');
      if (cached) setLogoSrc(cached);
    };
    if (!navigator.onLine) handleOffline();
    window.addEventListener('offline', handleOffline);
    return () => window.removeEventListener('offline', handleOffline);
  }, []);  

  // Vérifie si un utilisateur est connecté
  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      const currentUser = data.user || null;
      setUser(currentUser);

      // Afficher "Mes chorales" si :
      // - l'utilisateur est connecté et peut créer des chorales
      // - OU il a des chorales rejointes dans le localStorage
      // - OU il a des événements rejoints (chorales fantômes)
      const hasStoredChoirs = getStoredChoirs().length > 0;
      const hasStoredEvents = getStoredEvents().length > 0;
      let canCreateChoir = false;
      if (currentUser) {
        try {
          const { getUserParam } = await import('../../infrastructure/storage/authService');
          const param = await getUserParam(currentUser.email!);
          canCreateChoir = !!(param && param.choirs_nb > 0);
        } catch {}
      }
      setHasChoirs(canCreateChoir || hasStoredChoirs || hasStoredEvents);      

      // Charger les chants accessibles pour la recherche
      try {
        const accessibleSongs: any[] = [];

        // 1. Chants des chorales propriétaires (si connecté) → tous les chants
        if (currentUser) {
          const owned = await getOwnedChoirs(currentUser.id);
          const ownedIds = owned.map((c: any) => String(c.id));
          if (ownedIds.length > 0) {
            const songs = await getSongsByChoirIds(ownedIds);
            accessibleSongs.push(...songs);
          }
        }

        // 2. Chants accessibles via événements rejoints (membres + fantômes)
        // → uniquement les chants présents dans storedEvents[].songs
        const storedEventsForSearch = getStoredEvents();
        storedEventsForSearch.forEach((e) => {
          // Ne pas inclure les chants des événements inactifs dans la recherche
          if (e.active === false) return;
          e.songs?.forEach((s: any) => {
            if (!accessibleSongs.some((a) => a.id === s.id)) {
              accessibleSongs.push({ id: s.id, title: s.title, choir_id: e.choir_id, hashtags: [] });
            }
          });
        });

        setAllSongs(accessibleSongs);
      } catch {
        // Offline : pas de recherche disponible
      }
    };
    getUser();
  }, []);

  const normalize = (str: string) =>
    str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/,/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();

  const handleSearch = (value: string) => {
  setSearchQuery(value);
  if (value.trim().length === 0) {
    setSearchResults([]);
    return;
  }
  const q = normalize(value.trim());
  setSearchResults(
    allSongs.filter((s) =>
      normalize(s.title).includes(q) ||
      s.hashtags?.some((h: string) => normalize(h).includes(q))
    )
  );
  };

  return (
    <div className="page-container">
  
      {/* Barre du haut avec icône loupe */}
      <div className="top-bar" style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: 0 }}>
        {allSongs.length > 0 && !showSearch && (
          <i
            className="fa fa-search navigation"
            style={{ marginLeft: 'auto', cursor: 'pointer' }}
            onClick={() => setShowSearch(true)}
          ></i>
        )}
      </div>

      {/* Champ de recherche déroulant */}
      {showSearch && allSongs.length > 0 && (
        <div style={{ position: 'relative', width: '100%', maxWidth: '5500px', margin: '0 auto 0.5rem auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input
            type="text"
            placeholder="Rechercher un chant..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            autoFocus
            className="page-form-input"
            style={{ flex: 1, margin: 0, width: '100%', maxWidth: 'none', display: 'inline-block' }}
          />          
          <i
            className="fa fa-xmark navigation"
            style={{ color: '#044C8D', cursor: 'pointer', fontSize: '1.3rem', flexShrink: 0 }}
            onClick={() => {
              setShowSearch(false);
              setSearchQuery('');
              setSearchResults([]);
            }}
          ></i>

          {searchResults.length > 0 && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: '2rem',
              backgroundColor: 'white', borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
              overflow: 'hidden', zIndex: 100,
              maxHeight: '60vh', overflowY: 'auto',
            }}>
              {searchResults.map((s) => (
                <div
                  key={s.id}
                  onClick={() => navigate(`/song/${s.id}`, { state: { backUrl: '/' } })}
                  style={{
                    padding: '0.6rem 1rem', fontSize: '0.9rem',
                    cursor: 'pointer', color: '#222',
                    borderBottom: '1px solid #eee',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#E6F2FF')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'white')}
                >
                  <strong>{s.title}</strong>
                  {s.hashtags?.length > 0 && (
                    <div style={{ fontSize: '0.75rem', color: '#888', marginTop: '0.2rem' }}>
                      {s.hashtags.join(' ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Logo */}
      <div style={{ margin: '30px 0' }}>
        <img src={logoSrc} alt="La voix est libre" className="page-logo" />
      </div>
  
      {/* Boutons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
        {hasChoirs && (
          <button className="page-button" style={{ width: '270px' }} onClick={() => navigate('/my-choirs')}>
            Mes chorales
          </button>
        )}
        <button className="page-button" style={{ width: '270px' }} onClick={() => navigate('/join-choir')}>
          Rejoindre une chorale
        </button>
        <button className="page-button2" style={{ width: '270px' }} onClick={() => navigate('/login')}>
          {user ? 'Se déconnecter' : 'Se connecter'}
        </button>
      </div>
    </div>
  );

}