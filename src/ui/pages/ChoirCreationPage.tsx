import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import '../../App.css';
import type { FormEvent } from 'react';
import { createChoir } from '../../infrastructure/storage/choirsService';
import { supabase } from '../../infrastructure/storage/supabaseClient';

export default function CreationPage() {
  const [choraleName, setChoraleName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [user, setUser] = useState<any>(null);

  const navigate = useNavigate();

  // Vérifier que l'utilisateur est connecté ...
  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        navigate('/');       // ... sinon redirection immédiate
      } else {
        setUser(data.user);
      }
    };
    getUser();
  }, [navigate]);

  // Validation du formulaire de création
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      await createChoir(choraleName, user.id);
      setMessage('Chorale créée avec succès !');
      setChoraleName('');
    } catch (err: any) {
      setMessage(`Erreur : ${err.message}`);
    }

    setLoading(false);
  };

  return (
    <div className="page-container">
      <div className="top-bar">
        <Link to="/" className="navigation">←</Link>
        <Link to="/login" className="navigation">⎋</Link>
      </div>
      <h2>Créer une nouvelle chorale</h2>

      {!message && (
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

      {message && <p>{message}</p>}
    </div>
  );
}