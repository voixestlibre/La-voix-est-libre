import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getChoirByCode } from '../../infrastructure/storage/choirsService';
import { getEventByCode, getEventsByChoirIds, getEventSongsTitles } from '../../infrastructure/storage/eventsService';
import { getStoredChoirs, setStoredChoirs, getStoredEvents, setStoredEvents } from '../../infrastructure/storage/localStorageService';
import '../../App.css';
import TopBar from '../components/TopBar';
import { type UserProfile } from '../components/helpData';
import { usePageLoader } from '../hooks/usePageLoader';

export default function ChoirJoinPage() {
  const { code } = useParams();
  const [groups, setGroups] = useState<string[]>(['', '', '', '']);
  const [error, setError] = useState('');
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const navigate = useNavigate();
  const [helpProfiles] = useState<UserProfile[]>(['anonymous']);

  // Gestion du spinner et des bandeaux réseau
  // Note : loading démarre à false ici — la page affiche d'emblée le formulaire.
  // Le spinner n'est activé que pendant handleJoinFromCode (vérification du code).
  // Le timer de usePageLoader ne démarre que quand loading passe à true,
  // ce qui évite de déclencher forceOffline pendant l'affichage du formulaire vide.
  const { loading, setLoading, showTimeoutBanner, showOfflineBanner,
    setShowOfflineBanner, forceOffline, cancelled } = usePageLoader();

  // Basculement forcé en mode offline (timeout atteint pendant la vérification du code)
  useEffect(() => {
    if (!forceOffline) return;
    setError('Réseau indisponible — Impossible de vérifier le code.');
  }, [forceOffline]);

  // Initialisation : tester le réseau, puis gérer le code dans l'URL si présent
  // Si un code est passé dans l'URL (ex: /join-choir/12345678), il est automatiquement
  // saisi dans les champs et le join est déclenché sans intervention de l'utilisateur.
  // Cela permet de partager un lien direct pour rejoindre une chorale ou un événement.
  useEffect(() => {
    const init = async () => {
      // Tester la connectivité réseau
      try {
        await fetch('https://www.larminat.fr/lavoixestlibre/favicon.ico', {
          method: 'HEAD', mode: 'no-cors', cache: 'no-store',
        });
      } catch {
        // Déclenchement de la bannière Offline
        setShowOfflineBanner(true);
      }

      // Si un code est passé dans l'URL → auto-remplir et rejoindre
      if (!code) return;
      const cleaned = code.replace(/\D/g, '');
      if (cleaned.length !== 8) return;
      setGroups([
        cleaned.slice(0, 2), cleaned.slice(2, 4),
        cleaned.slice(4, 6), cleaned.slice(6, 8),
      ]);
      await handleJoinFromCode(cleaned);
    };
    init();
    // Le spinner n'est pas démarré ici — le formulaire s'affiche immédiatement
    setLoading(false);
  }, [code]);

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
    const joinCode = groups.join('');
    if (joinCode.length < 8) {
      setError('Veuillez saisir le code complet...');
      return;
    }
    await handleJoinFromCode(joinCode);
  };

  // Recherche de la chorale ou de l'événement par son code et redirection
  // Le code peut désigner une chorale OU un événement — on teste les deux séquentiellement.
  // Priorité : chorale d'abord, événement ensuite.
  // Si le code correspond à une chorale, tous ses événements sont immédiatement stockés en localStorage.
  // Si le code correspond à un événement, seul cet événement est stocké.
  const handleJoinFromCode = async (code: string) => {
    // Si déjà en mode offline (bandeau bleu affiché) → ne pas tenter les appels réseau
    // Note : on vérifie showOfflineBanner via une ref car le state peut ne pas être
    // à jour dans cette closure. On utilise cancelled.current comme proxy :
    // si forceOffline s'est déclenché, cancelled.current est true.
    setLoading(true);
    setError('');

    try {
      // ── Essayer d'abord comme code de chorale ──────────────────────
      try {
        const data = await getChoirByCode(code);

        // Si timeout déclenché
        if (cancelled.current) return;

        // Si aucune chorale trouvée → passer au test code événement
        if (!data) throw new Error('not a choir');

        // Ajouter la chorale dans joined_choirs si pas déjà présente
        const storedChoirs = getStoredChoirs();
        if (!storedChoirs.find((c) => String(c.code) === String(data.code))) {
          setStoredChoirs([...storedChoirs, { code: String(data.code), name: data.name, id: data.id }]);
        }

        // Stocker immédiatement tous les événements de cette chorale dans joined_events
        // pour qu'ils soient accessibles offline dès le premier accès
        try {
          const eventsData = await getEventsByChoirIds([String(data.id)]);
          if (!cancelled.current) {
            const storedEvents = getStoredEvents();
            const updatedEvents = [...storedEvents];
            await Promise.all(eventsData.map(async (ev: any) => {
              if (!updatedEvents.find((e) => String(e.code) === String(ev.code))) {
                let songs: { id: string; title: string }[] = [];
                try { songs = await getEventSongsTitles(String(ev.id)); } catch {}
                updatedEvents.push({ code: String(ev.code), name: ev.name, id: ev.id,
                  choir_id: ev.choir_id, choir_name: data.name, songs });
              }
            }));
            setStoredEvents(updatedEvents);
          }
        } catch {}
        // Erreur silencieuse : les événements seront synchronisés
        // au prochain passage sur MyChoirsPage

        if (!cancelled.current) navigate(`/choir/${data.id}`);
        return;
      } catch (err: any) {
        if (err?.message === 'not a choir') {
          // Pas une chorale, on essaie événement — ne pas afficher de bannière
        } else {
          // Erreur réseau réelle
          if (!cancelled.current) setShowOfflineBanner(true);
          return;
        }
      }

      try {
        const data = await getEventByCode(code);

        // Si timeout déclenché
        if (cancelled.current) return;

        // Ajouter l'événement dans joined_events si pas déjà présent
        const storedEvents = getStoredEvents();
        if (!storedEvents.find((e) => String(e.code) === String(data.code))) {
          let songs: { id: string; title: string }[] = [];
          try { songs = await getEventSongsTitles(String(data.id)); } catch {}
          setStoredEvents([...storedEvents, {
            code: String(data.code), name: data.name, id: data.id,
            choir_id: data.choir_id, choir_name: data.choir ? data.choir.name : null, songs,
          }]);
        }

        if (!cancelled.current) navigate(`/event/${data.id}`);
        return;
      } catch (err: any) {
        if (!cancelled.current) {
          // Distinguer erreur réseau vs code invalide
          if (err?.name === 'TypeError' || err?.message?.includes('fetch')) {
            setShowOfflineBanner(true);
          } else {
            setError('Code invalide...');
          }
        }
      }

    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <TopBar helpPage="choir-join" helpProfiles={helpProfiles}
        showTimeoutBanner={showTimeoutBanner} showOfflineBanner={showOfflineBanner} />

      <h2>Rejoindre une chorale</h2>
      <p>Renseignez le code de la chorale que vous souhaitez rejoindre :</p>

      {loading ? <div className="spinner"></div> : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '1.5rem 0' }}>
            {groups.map((g, index) => (
              <React.Fragment key={index}>
                <input
                  ref={(el) => { inputs.current[index] = el; }}
                  type="text" inputMode="numeric" maxLength={2} value={g}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => {
                    handleKeyDown(index, e);
                    if (e.key === 'Enter' && groups.join('').length === 8) handleJoin();
                  }}
                  style={{ width: '3rem', height: '2.5rem', textAlign: 'center',
                    fontSize: '1.2rem', border: '2px solid #044C8D', borderRadius: '6px' }}
                />
                {index < 3 && <span style={{ fontSize: '1.4rem', color: '#044C8D' }}>-</span>}
              </React.Fragment>
            ))}
          </div>

          {error && <p style={{ color: 'red' }}>{error}</p>}

          {/* Bouton Rejoindre désactivé si offline */}
          <div style={{ margin: '0.5rem 0' }}>
            <button className="page-button" onClick={handleJoin}
              disabled={showOfflineBanner}
              style={{ opacity: showOfflineBanner ? 0.5 : 1 }}>
              Rejoindre
            </button>
          </div>
          <div>
            <button className="page-button2" onClick={() => navigate('/')}>
              Annuler
            </button>
          </div>
        </>
      )}
    </div>
  );
}