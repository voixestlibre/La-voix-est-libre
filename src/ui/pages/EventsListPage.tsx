import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getCurrentUser } from '../../infrastructure/storage/authService';
import { getEventsByChoirIds, getEventsByCodes } from '../../infrastructure/storage/eventsService';
import { getOwnedChoirs } from '../../infrastructure/storage/choirsService';
import { getStoredEvents, setStoredEvents } from '../../infrastructure/storage/localStorageService';
import '../../App.css';

export default function MyEventsPage() {
  const [user, setUser] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [ownedChoirIds, setOwnedChoirIds] = useState<string[]>([]);
  const [directEventCodes, setDirectEventCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      const currentUser = await getCurrentUser();
      if (currentUser) setUser(currentUser);

      const storedEvents = getStoredEvents();
      const storedCodes = storedEvents.map((e) => String(e.code));

      try {
        const allValidEvents: any[] = [];
        let ownedIds: string[] = [];

        // PARTIE 1 : événements des chorales propriétaires (si connecté)
        if (currentUser) {
          const ownedChoirs = await getOwnedChoirs(currentUser.id);
          ownedIds = ownedChoirs.map((c: any) => String(c.id));
          setOwnedChoirIds(ownedIds);

          if (ownedIds.length > 0) {
            const ownedEvents = await getEventsByChoirIds(ownedIds);
            ownedEvents.forEach((ev: any) => {
              if (!allValidEvents.find((e) => String(e.code) === String(ev.code))) {
                const choir = ownedChoirs.find((c: any) => String(c.id) === String(ev.choir_id));
                allValidEvents.push({ ...ev, choir_name: choir?.name ?? null });
              }
            });
          }
        }

        // PARTIE 2 : événements rejoints directement via un code
        const remainingCodes = storedCodes.filter(
          (code) => !allValidEvents.find((e) => String(e.code) === code)
        );
        if (remainingCodes.length > 0) {
          const directEvents = await getEventsByCodes(remainingCodes);
          directEvents.forEach((ev: any) => {
            if (!allValidEvents.find((e) => String(e.code) === String(ev.code))) {
              const stored = storedEvents.find((e) => String(e.code) === String(ev.code));
              allValidEvents.push({ ...ev, choir_name: stored?.choir_name ?? null });
            }
          });
        }

        // Les codes d'événements rejoints directement (pas via propriété)
        // = storedCodes qui ne sont pas dans les chorales propriétaires
        setDirectEventCodes(
          storedCodes.filter((code) =>
            !allValidEvents.find((e) =>
              String(e.code) === code && ownedIds.includes(String(e.choir_id))
            )
          )
        );

        // Mettre à jour le localStorage
        setStoredEvents(allValidEvents.map((ev) => {
          const existing = storedEvents.find((e) => String(e.code) === String(ev.code));
          return {
            id: String(ev.id),
            code: String(ev.code),
            name: ev.name,
            choir_id: ev.choir_id,
            choir_name: ev.choir_name,
            songs: existing?.songs ?? [],
          };
        }));

        // Trier par date décroissante
        allValidEvents.sort((a, b) =>
          new Date(b.event_date ?? 0).getTime() - new Date(a.event_date ?? 0).getTime()
        );

        setEvents(allValidEvents);
      } catch {
        // Fallback offline
        setEvents(storedEvents);
        setDirectEventCodes(storedCodes);
      }

      setLoading(false);
    };

    fetchData();
  }, []);

  const formatCode = (code: string) => code.match(/.{1,2}/g)?.join('-') ?? code;

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
      <h2>Mes événements</h2>

      {loading ? (
        <div className="spinner"></div>
      ) : events.length === 0 ? (
        <p>Vous n'avez aucun événement.</p>
      ) : (
        <ul className="list-music">
          {events.map((e) => (
            <div key={e.id} className="card-music pink">
              <i className="fa fa-calendar-days note"></i>
              <div
                className="text"
                onClick={() => navigate(`/event/${e.id}`)}
                style={{ cursor: 'pointer' }}
              >
                <strong>{e.name}</strong>
                {e.choir_name && <span>{e.choir_name}</span>}
                <span>Code : {formatCode(String(e.code))}</span>
              </div>

              {/* Icône selon le profil :
                  - propriétaire → poubelle
                  - rejoint directement → quitter
                  - membre explicite chorale → rien */}
              {ownedChoirIds.includes(String(e.choir_id)) ? (
                <i
                  className="fa fa-trash trash"
                  onClick={() => navigate(`/delete-event/${e.id}`)}
                ></i>
              ) : directEventCodes.includes(String(e.code)) ? (
                <i
                  className="fa fa-sign-out trash"
                  onClick={() => navigate(`/leave-event/${e.id}`)}
                ></i>
              ) : null}
            </div>
          ))}
        </ul>
      )}
    </div>
  );
}