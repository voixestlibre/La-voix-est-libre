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
  const [canCreate, setCanCreate] = useState(true);

  const navigate = useNavigate();

  // Vérifier que l'utilisateur est connecté ...
  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        navigate('/');       // ... sinon redirection immédiate
      } else {
        setUser(data.user);

        // Récupérer choirs_nb depuis users_param
        const { data: param } = await supabase
        .from('users_param')
        .select('choirs_nb')
        .eq('email', data.user.email)
        .single();

        // Compter les chorales existantes
        const { count } = await supabase
          .from('choirs')
          .select('*', { count: 'exact', head: true })
          .eq('owner_id', data.user.id);

        if (param && count !== null && count >= param.choirs_nb) {
          setCanCreate(false);
        }          
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
      const choir = await createChoir(choraleName, user.id);
      // Stockage deans local storage
      const existing = JSON.parse(localStorage.getItem('joined_choirs') || '[]')
        .filter((c: any) => c !== null);
      existing.push({ code: choir.code, name: choraleName });
      localStorage.setItem('joined_choirs', JSON.stringify(existing));  
      // Renvoi vers liste des chorales    
      navigate('/my-choirs');
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