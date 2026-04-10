// src/ui/components/TopBar.tsx 
import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../infrastructure/storage/supabaseClient';
import { getStoredChoirs, getStoredEvents } from '../../infrastructure/storage/localStorageService';
import { isCurrentUserAdmin } from '../../infrastructure/storage/authService';
import HelpPopover from './HelpPopover';
import { type UserProfile } from './helpData';
import { getOwnedChoirs } from '../../infrastructure/storage/choirsService';
import { getSongsByChoirIds } from '../../infrastructure/storage/songsService';

interface TopBarProps {
  backUrl?: string;
  helpPage?: string;
  helpProfiles?: UserProfile[];
  showTimeoutBanner?: boolean;
  showOfflineBanner?: boolean;
}

export default function TopBar({ backUrl, helpPage, helpProfiles,
  showTimeoutBanner = false, showOfflineBanner = false }: TopBarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<any>(null);
  const [hasChoirs, setHasChoirs] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);  
  const menuRef = useRef<HTMLDivElement>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Moteur de recherche
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [allSongs, setAllSongs] = useState<any[]>([]);  
  const searchRef = useRef<HTMLDivElement>(null);

  // Système d'aide automatique : si l'utilisateur reste inactif 7,5 secondes
  // sur une page ayant une aide configurée (helpPage défini), le popover d'aide
  // s'ouvre automatiquement — mais une seule fois par page (mémorisé dans localStorage).
  // Toute interaction (clic, scroll, toucher, mouvement souris) remet le timer à zéro.
  // Une fois le popover ouvert manuellement ou automatiquement, la page est marquée
  // comme "vue" dans localStorage['helpSeen'] et ne s'ouvrira plus automatiquement.
  useEffect(() => {
    if (!helpPage || helpOpen) return;
  
    let timeout: any;  
    const resetTimer = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        const viewed = JSON.parse(localStorage.getItem('helpSeen') || '[]');
        if (!viewed.includes(helpPage)) {
          setHelpOpen(true);
          // marquer comme vu
          viewed.push(helpPage);
          localStorage.setItem('helpSeen', JSON.stringify(viewed));
        }
      }, 7500);  // 7000 = 7 secondes 
    };
  
    const events = ['click', 'scroll', 'keydown', 'touchstart', 'mousemove'];
    events.forEach(event => window.addEventListener(event, resetTimer));
    resetTimer(); 
    return () => {
      clearTimeout(timeout);
      events.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [helpPage, helpOpen]);

  // hasChoirs détermine la visibilité des éléments de menu "Mes chorales" et "Mes évènements"
  // Note : la condition !!currentUser est volontairement conservée ici pour le menu TopBar
  // (différent de HomePage qui vérifie le quota)
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const currentUser = data.session?.user ?? null;
      setUser(currentUser);
      const hasStoredChoirs = getStoredChoirs().length > 0;
      const hasStoredEvents = getStoredEvents().length > 0;
      setHasChoirs(!!currentUser || hasStoredChoirs || hasStoredEvents);
      if (currentUser) {
        const admin = await isCurrentUserAdmin();
        setIsAdmin(admin);
      }

      // Charger les chants pour la recherche
      try {
        const accessibleSongs: any[] = [];
        // 1. Chants des chorales propriétaires (si connecté)
        if (currentUser) {
          try {
            const owned = await getOwnedChoirs(currentUser.id);
            const ownedIds = owned.map((c: any) => String(c.id));
            if (ownedIds.length > 0) {
              const songs = await getSongsByChoirIds(ownedIds);
              accessibleSongs.push(...songs);
            }
          } catch {}
        }
        // 2. Chants des événements rejoints (depuis localStorage)
        getStoredEvents().forEach((e) => {
          if (e.active === false) return;
          e.songs?.forEach((s: any) => {
            if (!accessibleSongs.some((a) => a.id === s.id)) {
              accessibleSongs.push({ id: s.id, title: s.title, hashtags: [] });
            }
          });
        });
        setAllSongs(accessibleSongs);
      } catch {}
    });
  }, []);

  // useEffect pour détecter les clics à l'extérieur du champ de recherche
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchResults([]); // masque seulement les résultats
      }
    };
    if (searchOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [searchOpen]);  

  // Normalisation pour la recherche de chants
  const normalize = (str: string) =>
    str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/,/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();

  // Fermer le menu si clic en dehors
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const effectiveBackUrl = backUrl ?? location.state?.backUrl;

  const handleNavigate = (path: string) => {
    setMenuOpen(false);
    navigate(path);
  };

  const menuItems = [
    { label: 'Accueil',               icon: 'fa-house',         path: '/',             always: true  },
    { label: 'Mes chorales',          icon: 'fa-people-group',  path: '/my-choirs',    always: false },
    { label: 'Mes évènements',        icon: 'fa-calendar-days', path: '/my-events',    always: false },
    { label: 'Rejoindre une chorale', icon: 'fa-circle-plus',   path: '/join-choir',   always: true  },
    { label: 'Créer un utilisateur',  icon: 'fa-user-plus',     path: '/create-user',  always: false, adminOnly: true },
  ].filter(item => (item.always || hasChoirs) && (!item.adminOnly || isAdmin));

  // Afficher le bouton aide uniquement si helpPage est défini et présent dans helpContent
  const showHelp = !!helpPage && !!helpProfiles && helpProfiles.length > 0;

  return (
    <>    
      {/* Bandeau réseau lent — cliquable pour recharger */}
      {showTimeoutBanner && (
        <div
          onClick={() => window.location.reload()}
          style={{
            backgroundColor: '#FFF3CD', borderTop: '1px solid #FFB300',
            borderBottom: '1px solid #FFB300', padding: '0.5rem 1rem',
            fontSize: '0.85rem', color: '#856404', marginBottom: '0.85rem',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem',
          }}
        >
          <i className="fa fa-triangle-exclamation" style={{ flexShrink: 0 }} />
          <span>Chargement incomplet (réseau lent) — Appuyez pour recharger.</span>
          <i className="fa fa-rotate-right" style={{ marginLeft: 'auto', flexShrink: 0 }} />
        </div>
      )}

      {/* Bandeau mode offline */}
      {showOfflineBanner && (
        <div
          style={{
            backgroundColor: '#E8F4FD', borderTop: '1px solid #044C8D',
            borderBottom: '1px solid #044C8D', padding: '0.5rem 1rem',
            fontSize: '0.85rem', color: '#044C8D', marginBottom: '0.85rem',
            display: 'flex', alignItems: 'center', gap: '0.5rem',
          }}
        >
          <i className="fa fa-wifi" style={{ flexShrink: 0 }} />
          <span>Mode hors-ligne — Affichage des données sauvegardées lors de votre dernière visite.</span>
        </div>
      )}

      <div className="top-bar">
        {/* Gauche : Maison (menu déroulant) puis < */}
        <div style={{ display: 'flex', gap: '0.2rem', position: 'relative' }} ref={menuRef}>
          <span className="navigation" style={{ fontSize: '1.4rem' }} onClick={() => menuOpen ? navigate('/') : setMenuOpen(true)}>
            <i className="fa fa-house"></i>
          </span>
          <span className="navigation" style={{ fontSize: '1.4rem' }} onClick={() => effectiveBackUrl ? navigate(effectiveBackUrl, { state: {} }) : navigate(-1)}>
            <i className="fa fa-chevron-left"></i>
          </span>

          {/* Menu déroulant */}
          {menuOpen && (
            <div style={{
              position: 'absolute', top: '2.2rem', left: 0,
              backgroundColor: 'white', borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
              overflow: 'hidden', minWidth: '220px', zIndex: 200,
            }}>
              {menuItems.map(item => (
                <div key={item.path} onClick={() => handleNavigate(item.path)} style={{
                  display: 'flex', alignItems: 'center', gap: '0.7rem',
                  padding: '0.7rem 1rem', fontSize: '0.95rem',
                  cursor: 'pointer', color: '#222',
                  borderBottom: '1px solid #eee',
                }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#E6F2FF')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'white')}
                >
                  <i className={`fa ${item.icon}`} style={{ width: '1.2rem', textAlign: 'center', color: '#044C8D' }}></i>
                  {item.label}
                </div>
              ))}
              <div onClick={() => handleNavigate('/login')} style={{
                display: 'flex', alignItems: 'center', gap: '0.7rem',
                padding: '0.7rem 1rem', fontSize: '0.95rem',
                cursor: 'pointer', color: '#222',
              }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#E6F2FF')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'white')}
              >
                <i className={`fa ${user ? 'fa-right-from-bracket' : 'fa-right-to-bracket'}`} style={{ width: '1.2rem', textAlign: 'center', color: '#044C8D' }}></i>
                {user ? 'Se déconnecter' : 'Se connecter'}
              </div>
            </div>
          )}
        </div>

        {/* Droite : aide + connexion */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>

          {/* Loupe pour rechercher les chants — masquée en mode offline ou edge */}
          {!showOfflineBanner && !showTimeoutBanner && (
            <span className="navigation" style={{ fontSize: '1.4rem' }}
              onClick={() => { setSearchOpen(!searchOpen); setSearchQuery(''); setSearchResults([]); }}>
              <i className="fa fa-magnifying-glass"></i>
            </span>
          )}

          {/* Bouton aide — visible uniquement si helpPage défini */}
          {showHelp && (
            <span className="navigation" style={{ fontSize: '1.4rem' }} 
              onClick={() => {
                if (helpPage) {
                  const viewed = JSON.parse(localStorage.getItem('helpSeen') || '[]');
                  if (!viewed.includes(helpPage)) {
                    viewed.push(helpPage);
                    localStorage.setItem('helpSeen', JSON.stringify(viewed));
                  }
                }
                setHelpOpen(true);
              }} >
              <i className="fa fa-circle-question"></i>
            </span>
          )}
          <span className="navigation" style={{ fontSize: '1.4rem' }} onClick={() => navigate('/login')}>
            <i className={user ? 'fa fa-right-from-bracket' : 'fa fa-right-to-bracket'}></i>
          </span>
        </div>
      </div>

      {/* Ligne de recherche — visible uniquement si searchOpen */}
      {searchOpen && (
        <div ref={searchRef} style={{
          padding: '0.4rem 0rem 0.4rem 0rem',        
          position: 'relative',
        }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: '5500px', margin: '0 auto 0.5rem auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              autoFocus
              type="text"
              placeholder="Rechercher un chant..."
              value={searchQuery}
              onChange={(e) => {
                const q = e.target.value;
                setSearchQuery(q);
                if (q.trim().length === 0) { setSearchResults([]); return; }
                const qNorm = normalize(q.trim());
                setSearchResults(
                  allSongs.filter(s =>
                    normalize(s.title).includes(qNorm) ||
                    s.hashtags?.some((h: string) => normalize(h).includes(qNorm))
                  ).slice(0, 8)
                );
              }}
              onFocus={() => {
                if (searchQuery.trim().length === 0) return;
                const qNorm = normalize(searchQuery.trim());
                setSearchResults(
                  allSongs.filter(s =>
                    normalize(s.title).includes(qNorm) ||
                    s.hashtags?.some((h: string) => normalize(h).includes(qNorm))
                  ).slice(0, 8)
                );
              }}
              className="page-form-input"
              style={{ flex: 1, margin: 0, width: '100%', maxWidth: 'none', display: 'inline-block', fontSize: '16px', border: '2px solid #044C8D', borderRadius: '8px' }}
            />
            <i
              className="fa fa-xmark navigation"
              style={{ color: '#044C8D', cursor: 'pointer', fontSize: '1.3rem', flexShrink: 0 }}
              onClick={() => { setSearchOpen(false); setSearchQuery(''); setSearchResults([]); }}
            />
          </div>

          {/* Résultats */}
          {searchResults.length > 0 && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0,
              backgroundColor: 'white', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              zIndex: 200, maxHeight: '60vh', overflowY: 'auto',
              borderRadius: '0 0 8px 8px',
            }}>
              {searchResults.map((s) => (
                <div key={s.id}
                  onClick={() => { navigate(`/song/${s.id}`); setSearchOpen(false); setSearchQuery(''); setSearchResults([]); }}
                  style={{ padding: '0.6rem 1rem', borderBottom: '1px solid #eee', cursor: 'pointer', color: '#222' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#E6F2FF')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'white')}
                >
                  <strong>{s.title}</strong>
                  {/* Hashtags sous le titre, comme dans HomePage */}
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

      {/* Popover aide */}
      {helpOpen && helpPage && helpProfiles && (
        <HelpPopover
          helpPage={helpPage}
          helpProfiles={helpProfiles}
          onClose={() => setHelpOpen(false)}
        />
      )}
    </>
  );
}