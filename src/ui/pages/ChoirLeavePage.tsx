import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { supabase } from '../../infrastructure/storage/supabaseClient';
import '../../App.css';

export default function LeaveChoirPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [choirName, setChoirName] = useState('');
  const [choirCode, setChoirCode] = useState('');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Vérifier si l'utilisateur est connecté
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUser(data.user);
    });

    const fetchChoir = async () => {
      const { data, error } = await supabase
        .from('choirs')
        .select('name, code')
        .eq('id', id)
        .single();

      if (error || !data) {
        // Fallback offline : chercher dans le localStorage
        const joined = JSON.parse(localStorage.getItem('joined_choirs') || '[]')
          .filter((c: any) => c !== null);
        const found = joined.find((c: any) => c.code === id);
        if (found) {
          setChoirName(found.name);
          setChoirCode(found.code);
        } else {
          navigate('/my-choirs');
        }
        return;
      }
      setChoirName(data.name);
      setChoirCode(String(data.code));
    };
    fetchChoir();
  }, [id, navigate]);

  const handleLeave = () => {
    // Supprimer la chorale du localStorage
    const joined = JSON.parse(localStorage.getItem('joined_choirs') || '[]')
      .filter((c: any) => c !== null && String(c.code) !== choirCode);
    localStorage.setItem('joined_choirs', JSON.stringify(joined));
    navigate('/my-choirs');
  };

  return (
    <div className="page-container">
      <div className="top-bar">
        <Link to="/my-choirs" className="navigation">←</Link>
        {user && <Link to="/login" className="navigation">⎋</Link>}
      </div>
      <h2>Quitter une chorale</h2>
      <p>Êtes-vous sûr de vouloir quitter la chorale <strong>{choirName}</strong> ?</p>
      <div style={{ margin: '0.5rem 0' }}>
        <button className="page-button" onClick={handleLeave}>
          Confirmer
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