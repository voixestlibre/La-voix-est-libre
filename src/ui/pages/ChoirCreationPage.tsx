import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { FormEvent } from 'react';
import { getCurrentUser, getUserParam } from '../../infrastructure/storage/authService';
import { createChoir, countOwnedChoirs } from '../../infrastructure/storage/choirsService';
import { getStoredChoirs, setStoredChoirs } from '../../infrastructure/storage/localStorageService';
import '../../App.css';
import TopBar from '../components/TopBar';
import { type UserProfile } from '../components/helpData';

export default function CreationPage() {
  const [choraleName, setChoraleName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [user, setUser] = useState<any>(null);
  const [canCreate, setCanCreate] = useState(true);
  const [pageLoading, setPageLoading] = useState(true);
  const navigate = useNavigate();
  const [helpProfiles] = useState<UserProfile[]>(['owner']);

  useEffect(() => {
    const init = async () => {
      // Vérifier que l'utilisateur est connecté, sinon redirection
      const currentUser = await getCurrentUser();
      if (!currentUser) { navigate('/'); return; }
      setUser(currentUser);

      // Récupérer le quota de chorales autorisées
      const param = await getUserParam(currentUser.email!);

      // Compter les chorales existantes
      const count = await countOwnedChoirs(currentUser.id);

      // Désactiver la création si le quota est atteint
      if (param && count >= param.choirs_nb) {
        setCanCreate(false);
      }
      setPageLoading(false);
    };
    init();
  }, [navigate]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
  
    try {
      // Créer la chorale en base
      const choir = await createChoir(choraleName, user.id);
  
      // Stocker la chorale dans le localStorage
      // (id inclus pour permettre la correspondance avec joined_events)
      const stored = getStoredChoirs();
      setStoredChoirs([...stored, { id: choir.id, code: String(choir.code), name: choraleName }]);
  
      // Rediriger vers la page de la chorale (en supprimant la page de création de l'historique)
      navigate(`/choir/${choir.id}`, { replace: true });
    } catch (err: any) {
      setMessage(`Erreur : ${err.message}`);
    }
  
    setLoading(false);
  };  

  return (
    <div className="page-container">
      <TopBar helpPage="choir-creation" helpProfiles={helpProfiles} />
      <h2>Créer une chorale</h2>

      {pageLoading || loading ? <div className="spinner"></div> : (
        <>
          {!message && canCreate && (
            <form onSubmit={handleSubmit}>
              <input
                type="text"
                placeholder="Nom de la chorale"
                value={choraleName}
                onChange={(e) => setChoraleName(e.target.value)}
                required
                className="page-form-input"
              />
              <button className="page-button" type="submit">
                Créer
              </button>
            </form>
          )}

          {!message && !canCreate && (
            <p>Vous avez atteint le nombre maximum de chorales autorisées.</p>
          )}

          {message && <p>{message}</p>}
        </>
      )}

    </div>
  );
}