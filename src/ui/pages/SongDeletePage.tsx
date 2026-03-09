import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { getCurrentUser } from '../../infrastructure/storage/authService';
import { getSong, deleteSong } from '../../infrastructure/storage/songsService';
import '../../App.css';

export default function DeleteSongPage() {
  const { id: songId } = useParams();
  const navigate = useNavigate();
  const [songTitle, setSongTitle] = useState('');
  const [choirId, setChoirId] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchSong = async () => {
      // Vérifier que l'utilisateur est connecté
      const currentUser = await getCurrentUser();
      if (!currentUser) { navigate('/'); return; }

      // Récupérer le chant
      try {
        const data = await getSong(songId!);
        setSongTitle(data.title);
        setChoirId(data.choir_id);
      } catch {
        navigate('/');
        return;
      }
    };
    fetchSong();
  }, [songId, navigate]);

  const handleDelete = async () => {
    setLoading(true);
    try {
      // Supprimer le chant et tous ses fichiers associés
      await deleteSong(songId!);
      navigate(`/choir/${choirId}`);
    } catch (err: any) {
      alert(`Erreur : ${err.message}`);
    }
    setLoading(false);
  };

  return (
    <div className="page-container">
      <div className="top-bar">
        <Link to={`/song/${songId}`} className="navigation">
          <i className="fa fa-chevron-left"></i>
        </Link>
        <Link to="/login" className="navigation">
          <i className="fa fa-right-from-bracket"></i>
        </Link>
      </div>
      <h2>Supprimer un chant</h2>
      <p>Êtes-vous sûr de vouloir supprimer le chant <strong>{songTitle}</strong> (ainsi que tous les fichiers qui lui sont rattachés) ?</p>
      <div style={{ margin: '0.5rem 0' }}>
        <button className="page-button" onClick={handleDelete} disabled={loading}>
          {loading ? 'Suppression...' : 'Confirmer'}
        </button>
      </div>
      <div>
        <button className="page-button2" onClick={() => navigate(`/song/${songId}`)}>
          Annuler
        </button>
      </div>
    </div>
  );
}