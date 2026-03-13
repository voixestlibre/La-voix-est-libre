// src/ui/components/TopBar.tsx
import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../infrastructure/storage/supabaseClient';
import { getStoredChoirs, getStoredEvents } from '../../infrastructure/storage/localStorageService';

interface TopBarProps {
  backUrl?: string;
}

export default function TopBar({ backUrl }: TopBarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<any>(null);
  const [hasChoirs, setHasChoirs] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const currentUser = data.session?.user ?? null;
      setUser(currentUser);
      const hasStoredChoirs = getStoredChoirs().length > 0;
      const hasStoredEvents = getStoredEvents().length > 0;
      setHasChoirs(!!currentUser || hasStoredChoirs || hasStoredEvents);
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
    { label: 'Home',                  icon: 'fa-house',              path: '/',            always: true  },
    { label: 'Mes chorales',          icon: 'fa-people-group',       path: '/my-choirs',   always: false },
    { label: 'Rejoindre une chorale', icon: 'fa-circle-plus',   path: '/join-choir',  always: true  },
  ].filter(item => item.always || hasChoirs);

  return (
    <div className="top-bar">
      {/* Gauche : Maison (menu déroulant) puis < */}
      <div style={{ display: 'flex', gap: '0.2rem', position: 'relative' }} ref={menuRef}>
        <span className="navigation" style={{ fontSize: '1.4rem' }} onClick={() => setMenuOpen(!menuOpen)}>
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

      {/* Droite : Connexion / Déconnexion */}
      <span className="navigation" style={{ fontSize: '1.4rem' }} onClick={() => navigate('/login')}>
        <i className={user ? 'fa fa-right-from-bracket' : 'fa fa-right-to-bracket'}></i>
      </span>
    </div>
  );
}