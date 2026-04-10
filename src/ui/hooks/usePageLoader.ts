// src/ui/hooks/usePageLoader.ts
import { useState, useEffect, useRef } from 'react';

export function usePageLoader(timeoutMs = 3000) {
  const [loading, setLoading] = useState(true);
  const [showTimeoutBanner, setShowTimeoutBanner] = useState(false);
  const [showOfflineBanner, setShowOfflineBanner] = useState(false);
  const [forceOffline, setForceOffline] = useState(false);
  const cancelled = useRef(false);
  // Ref qui reflète la valeur courante de showOfflineBanner
  // pour être lisible depuis le callback du timer (closure)
  const offlineBannerRef = useRef(false);

  // Synchroniser la ref à chaque changement de showOfflineBanner
  useEffect(() => {
    offlineBannerRef.current = showOfflineBanner;
  }, [showOfflineBanner]);

  useEffect(() => {
    if (!loading) return;
    cancelled.current = false;

    const timer = setTimeout(() => {
      // Ne pas déclencher le bandeau jaune si le bandeau bleu est déjà affiché
      if (offlineBannerRef.current) return;
      // Le timer expire avant que le réseau réponde → réseau lent → bandeau jaune
      cancelled.current = true;
      setShowTimeoutBanner(true);
      setForceOffline(true);
    }, timeoutMs);

    return () => clearTimeout(timer);
  }, [loading, timeoutMs]);

  const reset = () => {
    setShowTimeoutBanner(false);
    setShowOfflineBanner(false);
    setForceOffline(false);
    cancelled.current = false;
    setLoading(false);
  };

  return {
    loading,
    setLoading,
    showTimeoutBanner,
    setShowTimeoutBanner,
    showOfflineBanner,
    setShowOfflineBanner,
    forceOffline,
    cancelled,
    reset,
  };
}