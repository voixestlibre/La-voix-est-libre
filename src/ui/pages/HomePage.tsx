import { useNavigate } from 'react-router-dom';
import logo from '../../assets/logo.png';
import '../../App.css';

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="page-container">
      <div style={{ margin: '30px 0' }}>
        <img
          src={logo}
          alt="La voix est libre"
          className="page-logo"
        />
      </div>

      {/* Boutons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
        <button
          className="page-button"
          style={{ width: '270px' }}
          onClick={() => navigate('/create')}
        >
          Créer une chorale
        </button>

        <button
          className="page-button"
          style={{ width: '270px' }}
          onClick={() => navigate('/singer')}
        >
          Rejoindre une chorale
        </button>
      </div>
    </div>
  );
}