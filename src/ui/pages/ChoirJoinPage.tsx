import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getCurrentUser } from '../../infrastructure/storage/authService';
import { getChoirByCode } from '../../infrastructure/storage/choirsService';
import { getEventByCode, getEventsByChoirIds, getEventSongsTitles } from '../../infrastructure/storage/eventsService';
import { getStoredChoirs, setStoredChoirs, getStoredEvents, setStoredEvents } from '../../infrastructure/storage/localStorageService';
import '../../App.css';

export default function ChoirJoinPage() {
  const [groups, setGroups] = useState<string[]>(['', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const navigate = useNavigate();

  // Vérifier si l'utilisateur est connecté au chargement
  useEffect(() => {
    getCurrentUser().then((currentUser) => {
      if (currentUser) setUser(currentUser);
    });
  }, []);

  // Gestion de la saisie : chiffres uniquement, passage auto au groupe suivant
  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newGroups = [...groups];
    newGroups[index] = value.slice(0, 2);
    setGroups(newGroups);
    if (value.length === 2 && index < 3) inputs.current[index + 1]?.focus();
  };

  // Retour au groupe précédent si Backspace sur un groupe vide
  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !groups[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  // Recherche de la chorale ou de l'événement par son code et redirection
  const handleJoin = async () => {
    const code = groups.join('');
    if (code.length < 8) {
      setError('Veuillez saisir le code complet...');
      return;
    }
    setLoading(true);
    setError('');

    try {
      // ── Essayer d'abord comme code de chorale ──────────────────────
      try {
        const data = await getChoirByCode(code);

        // Ajouter la chorale dans joined_choirs si pas déjà présente
        const storedChoirs = getStoredChoirs();
        if (!storedChoirs.find((c) => String(c.code) === String(data.code))) {
          setStoredChoirs([...storedChoirs, { code: String(data.code), name: data.name, id: data.id }]);
        }

        // Stocker immédiatement tous les événements de cette chorale dans joined_events
        // pour qu'ils soient accessibles offline dès le premier accès
        try {
          const eventsData = await getEventsByChoirIds([String(data.id)]);
          const storedEvents = getStoredEvents();
          const updatedEvents = [...storedEvents];
          
          for (const ev of eventsData) {
            if (!updatedEvents.find((e) => String(e.code) === String(ev.code))) {
              // Récupérer les chants de chaque événement pour le cache offline
              let songs: { id: string; title: string }[] = [];
              try { songs = await getEventSongsTitles(String(ev.id)); } catch {}
              updatedEvents.push({
                code: String(ev.code),
                name: ev.name,
                id: ev.id,
                choir_id: ev.choir_id,
                choir_name: data.name,
                songs,
              });
            }
          }
          setStoredEvents(updatedEvents);
        } catch {}
        // Erreur silencieuse : les événements seront synchronisés
        // au prochain passage sur MyChoirsPage

        navigate(`/choir/${data.id}`);
        return;
      } catch {}

      // ── Sinon essayer comme code d'événement ───────────────────────
      try {
        const data = await getEventByCode(code);

        // Ajouter l'événement dans joined_events si pas déjà présent
        const storedEvents = getStoredEvents();
        if (!storedEvents.find((e) => String(e.code) === String(data.code))) {
          let songs: { id: string; title: string }[] = [];
          try { songs = await getEventSongsTitles(String(data.id)); } catch {}
          
          setStoredEvents([...storedEvents, {
            code: String(data.code),
            name: data.name,
            id: data.id,
            choir_id: data.choir_id,
            // choir_code volontairement omis : l'utilisateur ne doit pas
            // pouvoir découvrir le code de la chorale via les DevTools
            choir_name: data.choir ? data.choir.name : null,
            songs,
          }]);
        }

        navigate(`/event/${data.id}`);
        return;
      } catch {}

      // Aucun résultat trouvé ni comme chorale ni comme événement
      setError('Code invalide...');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="top-bar">
        <Link to="/" className="navigation">
          <i className="fa fa-chevron-left"></i>
        </Link>
        {user && (
          <Link to="/login" className="navigation">
            <i className="fa fa-right-from-bracket"></i>
          </Link>
        )}
      </div>

      <h2>Rejoindre une chorale</h2>
      <p>Renseignez le code de la chorale que vous souhaitez rejoindre :</p>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '1.5rem 0' }}>
        {groups.map((g, index) => (
          <React.Fragment key={index}>
            <input
              ref={(el) => { inputs.current[index] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={2}
              value={g}
              onChange={(e) => handleChange(index, e.target.value)}

              onKeyDown={(e) => {
                handleKeyDown(index, e);
                // Valider avec Enter si le code est complet (8 chiffres)
                if (e.key === 'Enter' && groups.join('').length === 8) {
                  handleJoin();
                }
              }}

              style={{
                width: '3rem', height: '2.5rem',
                textAlign: 'center', fontSize: '1.2rem',
                border: '2px solid #044C8D', borderRadius: '6px',
              }}
            />
            {index < 3 && <span style={{ fontSize: '1.4rem', color: '#044C8D' }}>-</span>}
          </React.Fragment>
        ))}
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <div style={{ margin: '0.5rem 0' }}>
        <button className="page-button" onClick={handleJoin} disabled={loading}>
          {loading ? 'Recherche...' : 'Rejoindre'}
        </button>
      </div>
      <div>
        <button className="page-button2" onClick={() => navigate('/')}>
          Annuler
        </button>
      </div>
    </div>
  );
}