  import { useState, useEffect } from 'react';
  import { useNavigate } from 'react-router-dom';
  import { getCurrentUser, getUserDelegations, getUserParamId } from '../../infrastructure/storage/authService';
  import { getEventsByChoirIds, getEventsByCodes } from '../../infrastructure/storage/eventsService';
  import { getOwnedChoirs } from '../../infrastructure/storage/choirsService';
  import { getStoredChoirs, getStoredEvents, setStoredEvents, getCachedEvent, setCachedEventId, clearCachedEventId } from '../../infrastructure/storage/localStorageService';
  import { cacheEventFiles, clearEventCache } from '../../infrastructure/storage/cacheService';
  import { getSongFiles, getSongFileUrl } from '../../infrastructure/storage/songsService';
  import { isCacheable } from '../../infrastructure/storage/cacheService';
  import '../../App.css';
  import TopBar from '../components/TopBar';

  type ConfirmBanner = {
    newEventId: string;
    newEventName: string;
    newSongIds: string[];
    replacingName: string | null; // null = premier enregistrement
  };

  export default function MyEventsPage() {
    const [events, setEvents] = useState<any[]>([]);
    const [ownedChoirIds, setOwnedChoirIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [confirmBanner, setConfirmBanner] = useState<ConfirmBanner | null>(null);
    const [downloading, setDownloading] = useState(false);
    const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
    const navigate = useNavigate();

    const [userParamId, setUserParamId] = useState<number | null>(null);
    const [delegatedChoirIds, setDelegatedChoirIds] = useState<string[]>([]);
    const [explicitChoirIds, setExplicitChoirIds] = useState<string[]>([]);

    useEffect(() => {
      const fetchData = async () => {
        const currentUser = await getCurrentUser();
        if (currentUser) {
          const paramId = await getUserParamId(currentUser.email!);
          setUserParamId(paramId);
          const delegations = await getUserDelegations(currentUser.email!);
          setDelegatedChoirIds(delegations);
        }
        const storedChoirs = getStoredChoirs();
        setExplicitChoirIds(storedChoirs.map((c) => String(c.id)));        
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
              is_cached: existing?.is_cached ?? false,
              cached_files: existing?.cached_files ?? [],
            };
          }));

          // Nettoyage : si l'événement mémorisé n'existe plus dans la liste valide → supprimer le cache
          const cachedEvent = getCachedEvent();
          if (cachedEvent && !allValidEvents.find((ev) => String(ev.id) === String(cachedEvent.id))) {
            await clearEventCache(String(cachedEvent.id));
            clearCachedEventId();
          }

          // Trier par date décroissante
          allValidEvents.sort((a, b) =>
            new Date(b.event_date ?? 0).getTime() - new Date(a.event_date ?? 0).getTime()
          );

          setEvents(allValidEvents);
        } catch {
          setEvents(storedEvents);
        }

        setLoading(false);
      };

      fetchData();
    }, []);

    // Clic sur l'icône download → afficher la bannière de confirmation
    const handleOfflineClick = (eventId: string, eventName: string, songIds: string[]) => {
      const alreadyCached = getCachedEvent();

      // Si cet événement est déjà mémorisé → désactiver (avec confirmation)
      if (alreadyCached && String(alreadyCached.id) === String(eventId)) {
        setConfirmBanner({
          newEventId: eventId,
          newEventName: eventName,
          newSongIds: songIds,
          replacingName: eventName, // on réutilise replacingName pour signaler "désactiver"
        });
        return;
      }

      setConfirmBanner({
        newEventId: eventId,
        newEventName: eventName,
        newSongIds: songIds,
        replacingName: alreadyCached?.name ?? null,
      });
    };

    const handleConfirm = async () => {
      if (!confirmBanner) return;
      const { newEventId, newEventName, newSongIds } = confirmBanner;
      const alreadyCached = getCachedEvent();
      const isDeactivating = alreadyCached && String(alreadyCached.id) === String(newEventId);

      setConfirmBanner(null);

      if (isDeactivating) {
        await clearEventCache(newEventId);
        clearCachedEventId();
        // Rafraîchir l'affichage
        setEvents((prev) => [...prev]);
        return;
      }

      // Supprimer l'ancien cache si nécessaire
      if (alreadyCached) {
        await clearEventCache(String(alreadyCached.id));
        clearCachedEventId();
      }

      // Lancer le téléchargement
      setDownloading(true);
      setProgress({ done: 0, total: 0 });

      try {
        const allFiles: { name: string; url: string; songId: string }[] = [];
        for (const songId of newSongIds) {
          const files = await getSongFiles(songId);
          for (const f of files) {
            if (isCacheable(f.name)) {
              allFiles.push({ name: f.name, url: getSongFileUrl(songId, f.name), songId });
            }
          }
        }

        setProgress({ done: 0, total: allFiles.length });

        await cacheEventFiles(newEventId, allFiles, (done, total) => {
          setProgress({ done, total });
        });

        setCachedEventId(newEventId);

        // Sauvegarder les noms de fichiers dans le localStorage
        const stored = getStoredEvents();
        setStoredEvents(stored.map((e) =>
          String(e.id) === String(newEventId)
            ? { ...e, cached_files: allFiles.map((f) => ({ songId: f.songId, fileName: f.name })) }
            : e
        ));        
      } catch {
        // Échec silencieux — l'icône restera grise
      }

      setDownloading(false);
      setProgress(null);
      // Rafraîchir l'affichage pour mettre à jour les icônes
      setEvents((prev) => [...prev]);
    };

    const handleCancel = () => setConfirmBanner(null);

    const formatCode = (code: string) => code.match(/.{1,2}/g)?.join('-') ?? code;

    const isDeactivating = (eventId: string) => {
      const alreadyCached = getCachedEvent();
      return alreadyCached && String(alreadyCached.id) === String(eventId);
    };

    return (
      <div className="page-container">
        <TopBar />
        <h2>Mes événements</h2>

        {/* Bannière de confirmation inline */}
        {confirmBanner && (
          <div style={{
            backgroundColor: '#FDE8ED', border: '1px solid #DA486D',
            borderRadius: '8px', padding: '0.8rem 1rem', marginBottom: '1rem',
          }}>
            <p style={{ margin: '0 0 0.6rem 0', fontSize: '0.95rem' }}>
              {isDeactivating(confirmBanner.newEventId)
                ? <>Souhaitez-vous supprimer les fichiers mémorisés de <strong>{confirmBanner.newEventName}</strong> ?</>
                : confirmBanner.replacingName
                ? <>Souhaitez-vous mémoriser les fichiers de <strong>{confirmBanner.newEventName}</strong> (en remplacement de ceux de <strong>{confirmBanner.replacingName}</strong>) pour une utilisation hors ligne ?</>
                : <>Souhaitez-vous mémoriser les fichiers de <strong>{confirmBanner.newEventName}</strong> pour une utilisation hors ligne ?</>
              }
            </p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="page-button pink" style={{ padding: '0.3rem 0.8rem', fontSize: '0.9rem' }} onClick={handleConfirm}>
                Confirmer
              </button>
              <button className="page-button2 pink" style={{ padding: '0.3rem 0.8rem', fontSize: '0.9rem' }} onClick={handleCancel}>
                Annuler
              </button>
            </div>
          </div>
        )}

        {/* Barre de progression */}
        {downloading && progress && (
          <div style={{ marginBottom: '1rem' }}>
            <p style={{ fontSize: '0.9rem', color: '#DA486D', margin: '0 0 0.3rem 0' }}>
              Téléchargement : {progress.done} / {progress.total} fichiers
            </p>
            <div style={{ height: '6px', backgroundColor: '#FDE8ED', borderRadius: '4px' }}>
              <div style={{
                height: '100%', borderRadius: '4px', backgroundColor: '#DA486D',
                width: progress.total > 0 ? `${Math.round((progress.done / progress.total) * 100)}%` : '0%',
                transition: 'width 0.2s',
              }} />
            </div>
          </div>
        )}

        {loading ? (
          <div className="spinner"></div>
        ) : events.length === 0 ? (
          <p>Vous n'avez aucun événement.</p>
        ) : (
          <ul className="list-music">
            {events.map((e) => {
              const isCached = getStoredEvents().find(
                (se) => String(se.id) === String(e.id)
              )?.is_cached ?? false;
              const songIds = (getStoredEvents().find(
                (se) => String(se.id) === String(e.id)
              )?.songs ?? []).map((s) => s.id);

              return (
                <div key={e.id} className="card-music pink">
                  <i className="fa fa-calendar-days note"></i>
                  <div
                    className="text"
                    onClick={() => navigate(`/event/${e.id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <strong>{e.name}</strong>
                    <div style={{ paddingLeft: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.1rem', marginTop: '0.2rem' }}>
                      {e.choir_name && <span style={{ fontSize: '0.85rem' }}>Chorale : {e.choir_name}</span>}
                      {e.event_date && <span style={{ fontSize: '0.85rem' }}>Date : {new Date(e.event_date).toLocaleDateString('fr-FR')}</span>}
                      <span style={{ fontSize: '0.85rem' }}>Code : {formatCode(String(e.code))}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}>
                    {/* Icône selon le profil :
                      - propriétaire ou délégué → poubelle
                      - rejoint directement → quitter
                      - membre explicite chorale → rien */}
                    {(() => {
                      const isOwner = ownedChoirIds.includes(String(e.choir_id));
                      const isDelegate = delegatedChoirIds.includes(String(e.choir_id));
                      const isCreator = userParamId !== null && e.created_by === userParamId;
                      const isFullMember = isOwner || explicitChoirIds.includes(String(e.choir_id));

                      if (isOwner) {
                        return <i className="fa fa-trash trash" style={{ marginLeft: 0 }} onClick={() => navigate(`/delete-event/${e.id}`)}></i>;
                      }
                      if (isDelegate && isCreator) {
                        return <i className="fa fa-trash trash" style={{ marginLeft: 0 }} onClick={() => navigate(`/delete-event/${e.id}`)}></i>;
                      }
                      if (!isFullMember) {
                        return <i className="fa fa-sign-out trash" style={{ marginLeft: 0 }} onClick={() => navigate(`/leave-event/${e.id}`)}></i>;
                      }
                      return null;
                    })()}

                    {/* Icône offline — toujours affichée */}
                    <i
                      className="fa fa-download"
                      onClick={() => handleOfflineClick(String(e.id), e.name, songIds)}
                      style={{
                        fontSize: '1.1rem',
                        color: isCached ? '#044C8D' : '#ccc',
                        cursor: downloading ? 'default' : 'pointer',
                        marginLeft: '0.5rem',
                        pointerEvents: downloading ? 'none' : 'auto',
                      }}
                    />
                  </div>

                </div>
              );
            })}
          </ul>
        )}
      </div>
    );
  }