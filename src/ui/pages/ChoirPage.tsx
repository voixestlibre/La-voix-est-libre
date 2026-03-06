import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { supabase } from '../../infrastructure/storage/supabaseClient';
import '../../App.css';

export default function ChoirPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [choir, setChoir] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChoir = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        navigate('/');
        return;
      }

      const { data } = await supabase
        .from('choirs')
        .select('*')
        .eq('id', id)
        .single();

      if (!data || data.owner_id !== userData.user.id) {
        navigate('/');
        return;
      }

      setChoir(data);
      setLoading(false);
    };
    fetchChoir();
  }, [id, navigate]);

  const formatCode = (code: string) => code.match(/.{1,2}/g)?.join('-') ?? code;

  return (
    <div className="page-container">
      <div className="top-bar">
        <Link to="/my-choirs" className="navigation">←</Link>
        <Link to="/login" className="navigation">⎋</Link>
      </div>
      {loading ? (
        <p>Chargement...</p>
      ) : (
        <>
          <h2>{choir.name}</h2>
          <p>Code : {formatCode(choir.code)}</p>
        </>
      )}
    </div>
  );
}