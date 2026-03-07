import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { supabase } from '../../infrastructure/storage/supabaseClient';
import '../../App.css';

export default function DeleteChoirPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [choirName, setChoirName] = useState('');
  const [songsCount, setSongsCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchChoir = async () => {
      // Vérifier que l'utilisateur est connecté
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) { navigate('/'); return; }

      // Récupérer la chorale et vérifier qu'elle appartient à l'utilisateur
      const { data } = await supabase
        .from('choirs')
        .select('name, owner_id')
        .eq('id', id)
        .single();
      if (!data || data.owner_id !== userData.user.id) { navigate('/'); return; }
      setChoirName(data.name);

      // Compter les chants rattachés à la chorale
      const { count } = await supabase
        .from('songs')
        .select('*', { count: 'exact', head: true })
        .eq('choir_id', id);
      setSongsCount(count ?? 0);
    };
    fetchChoir();
  }, [id, navigate]);

  const handleDelete = async () => {
    setLoading(true);

    // Supprimer les chants rattachés à la chorale
    await supabase.from('songs').delete().eq('choir_id', id);

    // Supprimer la chorale
    const { error } = await supabase.from('choirs').delete().eq('id', id);
    if (error) {
      alert(`Erreur : ${error.message}`);
    } else {
      navigate('/my-choirs');
    }
    setLoading(false);
  };

  // Message de confirmation selon le nombre de chants
  const confirmMessage = songsCount === 0
    ? <>Êtes-vous sûr de vouloir supprimer la chorale <strong>{choirName}</strong> ?</>
    : songsCount === 1
    ? <>Êtes-vous sûr de vouloir supprimer la chorale <strong>{choirName}</strong> (ainsi que <strong>le chant</strong> qui lui est rattaché) ?</>
    : <>Êtes-vous sûr de vouloir supprimer la chorale <strong>{choirName}</strong> (ainsi que <strong>les {songsCount} chants</strong> qui lui sont rattachés) ?</>;

  return (
    <div className="page-container">
      <div className="top-bar">
        <Link to="/my-choirs" className="navigation">←</Link>
        <Link to="/login" className="navigation">⎋</Link>
      </div>
      <h2>Supprimer une chorale</h2>
      <p>{confirmMessage}</p>
      <div style={{ margin: '0.5rem 0' }}>
        <button className="page-button" onClick={handleDelete} disabled={loading}>
          {loading ? 'Suppression...' : 'Confirmer'}
        </button>
      </div>
      <div>
        <button className="page-button2" onClick={() => navigate('/my-choirs')}>
          Annuler
        </button>
      </div>
    </div>
  );
}