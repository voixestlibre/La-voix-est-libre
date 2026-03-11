import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getCurrentUser, getUserParam } from '../../infrastructure/storage/authService';
import { getOwnedChoirs, getChoirsByCodes } from '../../infrastructure/storage/choirsService';
import { getEventsByCodes, getEventsByChoirIds, getEventSongsTitles } from '../../infrastructure/storage/eventsService';
import { getStoredChoirs, setStoredChoirs, getStoredEvents, setStoredEvents } from '../../infrastructure/storage/localStorageService';
import '../../App.css';

export default function MyChoirsPage() {
  const [user, setUser] = useState<any>(null);
  // Chorales rejointes ou possédées explicitement
  const [choirs, setChoirs] = useState<any[]>([]);
  // Chorales fantômes : chorales de rattachement d'événements rejoints directement,
  // que l'utilisateur n'a pas rejointes explicitement.
  // Elles apparaissent dans la liste mais sans code ni icône d'action,
  // et ne sont jamais stockées dans joined_choirs.
  const [ghostChoirs, setGhostChoirs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [canCreate, setCanCreate] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      // Récupérer l'utilisateur connecté (peut être null si non connecté)
      const currentUser = await getCurrentUser();

      // Lire les chorales mémorisées dans le localStorage
      // Format : [{ id, code: '12345678', name: 'Ma chorale' }, ...]
      const joined = getStoredChoirs();

      // Extraire uniquement les codes pour les requêtes Supabase
      const joinedCodes = joined.map((c) => c.code);

      // Redirection si l'utilisateur n'a que des événements (pas de chorales explicites)
      if (joined.length === 0 && getStoredEvents().length > 0 && !currentUser) {
        navigate('/my-events');
        return;
      }

      // Contiendra toutes les chorales chargées depuis Supabase,
      // utilisé à la fin pour synchroniser les événements en localStorage
      // et calculer les chorales fantômes
      let allLoadedChoirs: any[] = [];

      if (currentUser) {
        // ── CAS 1 : Utilisateur connecté ──────────────────────────────
        setUser(currentUser);
        try {
          // Récupérer le quota de chorales autorisées pour cet utilisateur
          const param = await getUserParam(currentUser.email!);

          // Récupérer les chorales dont l'utilisateur est propriétaire depuis Supabase
          const choirData = await getOwnedChoirs(currentUser.id);

          // Déterminer si l'utilisateur peut encore créer une chorale
          // (nombre de chorales possédées < quota autorisé)
          if (param) {
            setCanCreate(choirData.length < param.choirs_nb);
          }

          // Synchroniser les chorales propriétaires dans le localStorage :
          // on part des chorales Supabase (source de vérité) et on complète
          // avec les chorales rejointes déjà en localStorage.
          // Le nom est toujours pris depuis Supabase pour rester à jour.
          const updated = choirData.map((c) => ({ code: String(c.code), name: c.name, id: c.id }));
          joined.forEach((existing) => {
            // Ajouter les chorales rejointes (non propriétaires) si pas déjà présentes
            if (!updated.find((u) => String(u.code) === String(existing.code))) {
              updated.push(existing);
            }
          });

          if (joinedCodes.length > 0) {
            // Vérifier en base que les chorales rejointes via localStorage existent toujours
            const joinedData = await getChoirsByCodes(joinedCodes);

            // Construire la liste des codes valides :
            // chorales rejointes qui existent encore en base + chorales propriétaires
            const validCodes = [
              ...joinedData.map((c) => String(c.code)),
              ...choirData.map((c) => String(c.code)),
            ];

            // Purger le localStorage : supprimer les chorales qui n'existent plus en base
            setStoredChoirs(updated.filter((c) => validCodes.includes(String(c.code))));

            // Fusionner chorales propriétaires + chorales rejointes sans doublons
            const merged = [...choirData];
            joinedData.forEach((c) => {
              if (!merged.find((existing) => existing.id === c.id)) {
                merged.push(c);
              }
            });
            setChoirs(merged);
            allLoadedChoirs = merged;
          } else {
            // Pas de chorales rejointes via localStorage :
            // sauvegarder et afficher uniquement les chorales propriétaires
            setStoredChoirs(updated);
            setChoirs(choirData);
            allLoadedChoirs = choirData;
          }
        } catch {
          // Fallback offline : Supabase inaccessible
          // Reconstituer des objets minimalistes depuis le localStorage pour l'affichage
          const fallback = joined.map((c) => ({ id: c.id, name: c.name, code: c.code }));
          setChoirs(fallback);
          allLoadedChoirs = fallback;
        }

      } else {
        // ── CAS 2 : Utilisateur non connecté ──────────────────────────
        if (joinedCodes.length > 0) {
          try {
            // Vérifier en base que les chorales rejointes via localStorage existent toujours
            const joinedData = await getChoirsByCodes(joinedCodes);

            // Purger le localStorage : supprimer les chorales qui n'existent plus en base
            const validCodes = joinedData.map((c) => String(c.code));
            setStoredChoirs(joined.filter((c) => validCodes.includes(String(c.code))));

            setChoirs(joinedData);
            allLoadedChoirs = joinedData;
          } catch {
            // Fallback offline : Supabase inaccessible
            const fallback = joined.map((c) => ({ id: c.id, name: c.name, code: c.code }));
            setChoirs(fallback);
            allLoadedChoirs = fallback;
          }
        } else {
          // Pas de chorales en localStorage : rien à afficher
          setChoirs([]);
        }
      }

      // ── Synchroniser les événements en localStorage ──────────────────
      // Cette étape s'exécute que l'utilisateur soit connecté ou non,
      // tant que Supabase est accessible (pas dans un bloc catch).
      // Elle met aussi à jour les chorales fantômes.
      try {
        // PARTIE 1 : récupérer tous les événements des chorales chargées
        const choirIds = allLoadedChoirs.map((c: any) => String(c.id)).filter(Boolean);
        const eventsFromChoirs = choirIds.length > 0
          ? await getEventsByChoirIds(choirIds)
          : [];

        // PARTIE 2 : vérifier les événements rejoints directement via un code
        // (ceux dont la chorale de rattachement n'est pas dans allLoadedChoirs)
        const existingEvents = getStoredEvents();

        // Identifier les codes d'événements qui ne font PAS partie
        // des chorales qu'on vient de charger (rejoints directement via un code)
        const directEventCodes = existingEvents
          .map((e) => String(e.code))
          .filter((code) => !eventsFromChoirs.find((ev: any) => String(ev.code) === code));

        // Vérifier en base que ces événements directs existent toujours
        const eventsFromCodes = directEventCodes.length > 0
          ? await getEventsByCodes(directEventCodes)
          : [];

        // PARTIE 3 : fusionner les deux sources sans doublons
        // eventsFromChoirs = tous les événements des chorales connues
        // eventsFromCodes = événements directs encore valides en base
        const allValidEvents = [...eventsFromChoirs];
        eventsFromCodes.forEach((ev: any) => {
          if (!allValidEvents.find((e: any) => String(e.code) === String(ev.code))) {
            allValidEvents.push(ev);
          }
        });

        // PARTIE 4 : sauvegarder en localStorage
        // Les événements supprimés de Supabase sont automatiquement exclus.
        // Pour chaque événement, on enrichit avec les infos de la chorale :
        // - depuis allLoadedChoirs si la chorale est connue
        // - sinon depuis le localStorage existant (fallback pour les événements directs)
        const updatedEvents = await Promise.all(allValidEvents.map(async (ev: any) => {
          const choir = allLoadedChoirs.find((c: any) => String(c.id) === String(ev.choir_id));
          const existingEvent = existingEvents.find((e) => String(e.code) === String(ev.code));
          
          // Récupérer les chants de l'événement pour le cache offline
          let songs: { id: string; title: string }[] = [];
          try {
            songs = await getEventSongsTitles(String(ev.id));
          } catch {
            // En cas d'erreur, conserver les chants déjà en cache
            songs = existingEvent?.songs ?? [];
          }
        
          return {
            code: String(ev.code),
            name: ev.name,
            id: ev.id,
            choir_id: ev.choir_id,
            choir_name: choir ? choir.name : (existingEvent?.choir_name ?? null),
            songs,
          };
        }));
        setStoredEvents(updatedEvents);
        
        // PARTIE 5 : calculer les chorales fantômes
        // Une chorale fantôme = chorale de rattachement d'un événement direct
        // dont la chorale n'est PAS dans allLoadedChoirs (non rejointe explicitement).
        // Ces chorales apparaissent dans la liste pour donner accès à l'événement,
        // mais sans code visible et sans possibilité de les rejoindre/quitter.
        const ghosts = updatedEvents
          .filter((e) =>
            e.choir_id &&
            e.choir_name &&
            !allLoadedChoirs.find((c: any) => String(c.id) === String(e.choir_id))
          )
          .reduce((acc: any[], e) => {
            // Dédoublonner par choir_id (plusieurs événements peuvent avoir la même chorale)
            if (!acc.find((c) => String(c.id) === String(e.choir_id))) {
              acc.push({
                id: e.choir_id,
                name: e.choir_name,
                code: null,   // code masqué pour empêcher de rejoindre la chorale
                ghost: true,  // marqueur utilisé dans le rendu pour adapter l'affichage
              });
            }
            return acc;
          }, []);
        setGhostChoirs(ghosts);

      } catch {
        // Offline ou erreur Supabase : on conserve le localStorage tel quel.
        // On calcule quand même les chorales fantômes depuis le localStorage existant.
        const existingEvents = getStoredEvents();
        const ghosts = existingEvents
          .filter((e) =>
            e.choir_id &&
            e.choir_name &&
            !allLoadedChoirs.find((c: any) => String(c.id) === String(e.choir_id))
          )
          .reduce((acc: any[], e) => {
            if (!acc.find((c) => String(c.id) === String(e.choir_id))) {
              acc.push({ id: e.choir_id, name: e.choir_name, code: null, ghost: true });
            }
            return acc;
          }, []);
        setGhostChoirs(ghosts);
      }

      setLoading(false);
    };

    fetchData();
  }, []);

  // Formater le code en groupes de 2 chiffres séparés par des tirets
  // Ex : "51056723" → "51-05-67-23"
  const formatCode = (code: string) => code.match(/.{1,2}/g)?.join('-') ?? code;

  // Fusionner chorales normales + fantômes pour l'affichage
  // Les fantômes apparaissent en fin de liste
  const allDisplayedChoirs = [...choirs, ...ghostChoirs];

  return (
    <div className="page-container">
      <div className="top-bar">
        <Link to="/" className="navigation">
          <i className="fa fa-chevron-left"></i>
        </Link>
        {/* Lien déconnexion visible uniquement si connecté */}
        {user && (
          <Link to="/login" className="navigation">
            <i className="fa fa-right-from-bracket"></i>
          </Link>
        )}
      </div>
      <h2>Mes chorales</h2>

      {loading ? (
        <div className="spinner"></div>
      ) : allDisplayedChoirs.length === 0 ? (
        <p>Vous n'avez aucune chorale.</p>
      ) : (
        <ul className="list-music">
          {allDisplayedChoirs.map((c) => (
            <div key={c.id} className="card-music orange">
              <i className="fa fa-users note"></i>
              {/* Clic sur le nom → page de la chorale */}
              <div className="text" onClick={() => navigate(`/choir/${c.id}`)} style={{ cursor: 'pointer' }}>
                <strong>{c.name}</strong>
                {/* Masquer le code pour les chorales fantômes :
                    l'utilisateur ne doit pas pouvoir les rejoindre */}
                {!c.ghost && <span>Code : {formatCode(c.code)}</span>}
              </div>
              {/* Pas d'icône d'action pour les chorales fantômes :
                  l'utilisateur ne peut ni les supprimer ni les quitter */}
              {!c.ghost && (
                user && c.owner_id === user.id ? (
                  // Propriétaire → icône suppression
                  <i
                    className="fa fa-trash trash"
                    onClick={() => navigate(`/delete-choir/${c.id}`)}
                  ></i>
                ) : (
                  // Non propriétaire → icône quitter
                  <i
                    className="fa fa-sign-out trash"
                    onClick={() => navigate(`/leave-choir/${c.id}`)}
                  ></i>
                )
              )}
            </div>
          ))}
        </ul>
      )}

      {/* Bouton création visible uniquement si le quota n'est pas atteint */}
      {canCreate && (
        <div>
          <button
            className="page-button"
            onClick={() => navigate('/create-choir')}
            style={{ marginBottom: '0.5rem' }}
          >
            <i className="fa fa-users"></i> &nbsp;
            Créer une chorale
          </button>
        </div>
      )}
    </div>
  );
}