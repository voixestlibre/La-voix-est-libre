import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { supabase } from '../../infrastructure/storage/supabaseClient';
import '../../App.css';

export default function AddSongPage() {
  const { choirId } = useParams();  // Récupérer l'id de la chorale depuis l'URL
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const checkOwner = async () => {
      // Vérifier que l'utilisateur est connecté
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) { navigate('/'); return; }

      // Vérifier que l'utilisateur est bien propriétaire de la chorale
      const { data } = await supabase
        .from('choirs')
        .select('owner_id')
        .eq('id', choirId)
        .single();
      if (!data || data.owner_id !== userData.user.id) { navigate('/'); return; }
    };
    checkOwner();
  }, [choirId, navigate]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      // Créer le chant en base et récupérer son id pour la redirection
      const { data, error } = await supabase
        .from('songs')
        .insert([{ choir_id: choirId, title }])
        .select()
        .single();
      if (error) throw error;

      // Rediriger vers la page du chant nouvellement créé
      navigate(`/song/${data.id}`);
    } catch (err: any) {
      setMessage(`Erreur : ${err.message}`);
    }
    setLoading(false);
  };

  return (
    <div className="page-container">
      <div className="top-bar">
        <Link to={`/choir/${choirId}`} className="navigation">←</Link>
        <Link to="/login" className="navigation">⎋</Link>
      </div>
      <h2>Ajouter un chant</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Titre du chant"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="page-form-input"
        />
        <button className="page-button" type="submit" disabled={loading}>
          {loading ? 'Création...' : 'Créer'}
        </button>
      </form>
      {message && <p style={{ color: 'red' }}>{message}</p>}
    </div>
  );
}