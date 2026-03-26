import { useEffect } from 'react';
import { helpContent, profilePriority, type UserProfile } from './helpData';

interface HelpPopoverProps {
  helpPage: string;
  helpProfiles: UserProfile[];
  onClose: () => void;
}

export default function HelpPopover({ helpPage, helpProfiles, onClose }: HelpPopoverProps) {
  const pageHelp = helpContent[helpPage];

  useEffect(() => {
    const scrollY = window.scrollY;
  
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
  
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.width = '';
  
      window.scrollTo(0, scrollY);
    };
  }, []);
  
  if (!pageHelp) return null;

  const allSections = pageHelp['all']?.sections ?? [];
  const activeProfile = profilePriority.find(p => helpProfiles.includes(p));
  const profileSections = activeProfile ? (pageHelp[activeProfile]?.sections ?? []) : [];
  const sections = [...allSections, ...profileSections];
  if (sections.length === 0) return null;

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.3)',
          zIndex: 300,
        }}
      />
      <div style={{
        position: 'fixed', top: '4.3rem', left: '1rem', right: '1rem',
        maxWidth: '750px',
        margin: '0 auto',
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
        zIndex: 301,
        maxHeight: 'calc(100dvh - 5rem)',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        overscrollBehavior: 'contain',
        touchAction: 'pan-y',
        padding: '1rem',
      }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: '0.8rem',
          borderBottom: '1px solid #eee',
          paddingBottom: '0.6rem',
        }}>
          <span style={{ fontWeight: 'bold', color: '#044C8D', fontSize: '1rem' }}>
            <i className="fa fa-circle-question" style={{ marginRight: '0.5rem' }}></i>
            Aide
          </span>
          <i
            className="fa fa-xmark"
            onClick={onClose}
            style={{ fontSize: '1.2rem', cursor: 'pointer', color: '#888' }}
          />
        </div>
        {sections.map((section, i) => (
          <div key={i} style={{
            marginBottom: i < sections.length - 1 ? '1rem' : 0,
            paddingBottom: i < sections.length - 1 ? '1rem' : 0,
            borderBottom: i < sections.length - 1 ? '1px solid #f0f0f0' : 'none',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              marginBottom: '0.3rem',
            }}>
              {section.icon && (
                <i className={`fa ${section.icon}`} style={{ color: '#DA486D', width: '1.1rem', textAlign: 'center' }} />
              )}
              <strong style={{ fontSize: '0.95rem', color: '#222' }}>{section.title}</strong>
            </div>
            <div style={{ margin: 0, fontSize: '0.875rem', color: '#555', lineHeight: 1.5, paddingLeft: section.icon ? '1.6rem' : 0 }}>
              {section.content}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}