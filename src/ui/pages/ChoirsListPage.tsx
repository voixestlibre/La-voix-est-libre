import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../infrastructure/storage/supabaseClient';
import '../../App.css';

export default function MyChoirsPage() {
  const [user, setUser] = useState<any>(null);
  const [choirs, setChoirs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [canCreate, setCanCreate] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      // Récupérer l'utilisateur connecté (peut être null si non connecté)
      const { data: userData } = await supabase.auth.getUser();

      // Lire les chorales rejointes depuis le localStorage
      // Format : [{ code: '12345678', name: 'Ma chorale' }, ...]
      const joined = JSON.parse(localStorage.getItem('joined_choirs') || '[]')
        .filter((c: any) => c !== null);
      const joinedCodes = joined.map((c: any) => c.code);

      if (userData.user) {
        // ── CAS 1 : Utilisateur connecté ──────────────────────────────
        setUser(userData.user);
        try {
          // Récupérer le quota de chorales autorisées pour cet utilisateur
          const { data: param } = await supabase
            .from('users_param')
            .select('choirs_nb')
            .eq('email', userData.user.email)
            .single();

          // Récupérer les chorales dont l'utilisateur est propriétaire
          const { data: choirData, error } = await supabase
            .from('choirs')
            .select('*')
            .eq('owner_id', userData.user.id);

          // Déterminer si l'utilisateur peut encore créer une chorale
          if (param) {
            setCanCreate((choirData?.length ?? 0) < param.choirs_nb);
          }

          if (error) {
            console.error(error);
            setChoirs([]);
          } else {
            // Synchroniser les chorales propriétaires dans le localStorage
            const current = JSON.parse(localStorage.getItem('joined_choirs') || '[]')
              .filter((c: any) => c !== null);
            const updated = [...current];
            choirData?.forEach((c) => {
              if (!updated.find((existing: any) => String(existing.code) === String(c.code))) {
                updated.push({ code: String(c.code), name: c.name });
              }
            });

            if (joinedCodes.length > 0) {
              // Récupérer en base les chorales rejointes via localStorage
              const { data: joinedData } = await supabase
                .from('choirs')
                .select('*')
                .in('code', joinedCodes);

              // Purger en gardant les chorales rejointes valides ET les chorales propriétaires
              const validCodes = [
                ...(joinedData?.map((c) => String(c.code)) ?? []),
                ...(choirData?.map((c) => String(c.code)) ?? []),
              ];
              localStorage.setItem('joined_choirs', JSON.stringify(
                updated.filter((c: any) => validCodes.includes(String(c.code)))
              ));

              // Fusionner les chorales propres + les chorales rejointes (sans doublons)
              const allChoirs = [...(choirData || [])];
              joinedData?.forEach((c) => {
                if (!allChoirs.find((existing) => existing.id === c.id)) {
                  allChoirs.push(c);
                }
              });
              setChoirs(allChoirs);
            } else {
              // Pas de chorales rejointes : sauvegarder et afficher uniquement les chorales propres
              localStorage.setItem('joined_choirs', JSON.stringify(updated));
              setChoirs(choirData || []);
            }
          }
        } catch {
          // Fallback offline : Supabase inaccessible, afficher le localStorage
          setChoirs(joined.map((c: any) => ({ id: c.code, name: c.name, code: c.code })));
        }
      } else {
        // ── CAS 2 : Utilisateur non connecté ──────────────────────────
        if (joinedCodes.length > 0) {
          try {
            // Récupérer en base les chorales rejointes via localStorage
            const { data: joinedData } = await supabase
              .from('choirs')
              .select('*')
              .in('code', joinedCodes);

            // Purger le localStorage : supprimer les chorales qui n'existent plus en base
            const validCodes = joinedData?.map((c) => String(c.code)) ?? [];
            localStorage.setItem('joined_choirs', JSON.stringify(
              joined.filter((c: any) => validCodes.includes(String(c.code)))
            ));

            setChoirs(joinedData || []);
          } catch {
            // Fallback offline : Supabase inaccessible, afficher le localStorage
            setChoirs(joined.map((c: any) => ({ id: c.code, name: c.name, code: c.code })));
          }
        }
      }

      setLoading(false);
    };

    fetchData();
  }, []);

  // Formater le code en groupes de 2 chiffres séparés par des tirets
  // Ex : "51056723" → "51-05-67-23"
  const formatCode = (code: string) => code.match(/.{1,2}/g)?.join('-') ?? code;

  return (
    <div className="page-container">
      <div className="top-bar">
        <Link to="/" className="navigation">←</Link>
        {/* Lien déconnexion visible uniquement si connecté */}
        {user && <Link to="/login" className="navigation">⎋</Link>}
      </div>
      <h2>Mes chorales</h2>

      {loading ? (
        <p>Chargement...</p>
      ) : choirs.length === 0 ? (
        <p>Vous n'avez aucune chorale.</p>
      ) : (
        <ul className="list-music">
          {choirs.map((c) => (
            <div key={c.id} className="card-music orange">
              <i className="fa fa-music note"></i>
              {/* Clic sur le texte → page de la chorale */}
              <div className="text" onClick={() => navigate(`/choir/${c.id}`)} style={{ cursor: 'pointer' }}>
                <strong>{c.name}</strong>
                <span>Code : {formatCode(c.code)}</span>
              </div>
              {user && c.owner_id === user.id ? (
                // Propriétaire → supprimer la chorale
                <i
                  className="fa fa-trash trash"
                  onClick={() => navigate(`/delete-choir/${c.id}`)}
                ></i>
              ) : (
                // Non propriétaire (ou non connecté) → quitter la chorale
                <i
                  className="fa fa-sign-out trash"
                  onClick={() => navigate(`/leave-choir/${c.id}`)}
                ></i>
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
            Créer une chorale
          </button>
        </div>
      )}

      <div>
        <button
          className="page-button"
          onClick={() => navigate('/join-choir')}
        >
          Rejoindre une chorale
        </button>
      </div>
    </div>
  );
}