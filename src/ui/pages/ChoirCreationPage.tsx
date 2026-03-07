import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import type { FormEvent } from 'react';
import { getCurrentUser, getUserParam } from '../../infrastructure/storage/authService';
import { createChoir, countOwnedChoirs } from '../../infrastructure/storage/choirsService';
import '../../App.css';

export default function CreationPage() {
  const [choraleName, setChoraleName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [user, setUser] = useState<any>(null);
  const [canCreate, setCanCreate] = useState(true);
  const navigate = useNavigate();

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
      const existing = JSON.parse(localStorage.getItem('joined_choirs') || '[]')
        .filter((c: any) => c !== null);
      existing.push({ code: choir.code, name: choraleName });
      localStorage.setItem('joined_choirs', JSON.stringify(existing));

      // Rediriger vers la liste des chorales
      navigate(`/choir/${choir.id}`);
    } catch (err: any) {
      setMessage(`Erreur : ${err.message}`);
    }

    setLoading(false);
  };

  return (
    <div className="page-container">
      <div className="top-bar">
        <Link to="/my-choirs" className="navigation">←</Link>
        <Link to="/login" className="navigation">⎋</Link>
      </div>
      <h2>Créer une chorale</h2>

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
          <button className="page-button" type="submit" disabled={loading}>
            {loading ? 'Création...' : 'Créer'}
          </button>
        </form>
      )}

      {!message && !canCreate && (
        <p>Vous avez atteint le nombre maximum de chorales autorisées.</p>
      )}

      {message && <p>{message}</p>}
    </div>
  );
}