// src/ui/components/TopBar.tsx 
import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../infrastructure/storage/supabaseClient';
import { getStoredChoirs, getStoredEvents } from '../../infrastructure/storage/localStorageService';
import { isCurrentUserAdmin } from '../../infrastructure/storage/authService';
import HelpPopover from './HelpPopover';
import { type UserProfile } from './helpData';

interface TopBarProps {
  backUrl?: string;
  helpPage?: string;
  helpProfiles?: UserProfile[];
}

export default function TopBar({ backUrl, helpPage, helpProfiles }: TopBarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<any>(null);
  const [hasChoirs, setHasChoirs] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);  
  const menuRef = useRef<HTMLDivElement>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Gestion du timer pour ouvrir automatiquement l'aide
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
    });
  }, []);

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