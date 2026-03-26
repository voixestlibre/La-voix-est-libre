import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getCurrentUser } from '../../infrastructure/storage/authService';
import { getSong, deleteSong } from '../../infrastructure/storage/songsService';
import '../../App.css';
import TopBar from '../components/TopBar';
import { type UserProfile } from '../components/helpData';

export default function DeleteSongPage() {
  const { id: songId } = useParams();
  const navigate = useNavigate();
  const [songTitle, setSongTitle] = useState('');
  const [choirId, setChoirId] = useState('');
  const [pageLoading, setPageLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [helpProfiles] = useState<UserProfile[]>(['owner']);

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
        setPageLoading(false);
      } catch {
        // Chant introuvable (supprimé) → redirection
        navigate('/my-choirs', { replace: true });
      }
    };
    fetchSong();
  }, [songId, navigate]);

  const handleDelete = async () => {
    setLoading(true);
    try {
      // Supprimer le chant et tous ses fichiers associés
      await deleteSong(songId!);
      // replace: true pour éviter de revenir sur DeleteSongPage via navigate(-1)
      navigate(`/choir/${choirId}`, { replace: true });
    } catch (err: any) {
      alert(`Erreur : ${err.message}`);
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <TopBar helpPage="song-delete" helpProfiles={helpProfiles} />
      <h2>Supprimer un chant</h2>

      {pageLoading || loading ? <div className="spinner"></div> : (
        <>
          <p>Êtes-vous sûr de vouloir supprimer le chant <strong>{songTitle}</strong> (ainsi que tous les fichiers qui lui sont rattachés) ?</p>
          <div style={{ margin: '0.5rem 0' }}>
            <button className="page-button" onClick={handleDelete}>
              Confirmer
            </button>
          </div>
          <div>
            <button className="page-button2" onClick={() => navigate(-1)}>
              Annuler
            </button>
          </div>
        </>
      )}
    </div>
  );
}