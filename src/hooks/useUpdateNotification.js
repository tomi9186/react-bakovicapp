import { useEffect, useState } from 'react';

export function useUpdateNotification() {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    let registration = null;
    let checkInterval = null;

    // Registracija Service Workera
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js', { scope: '/' })
        .then((reg) => {
          registration = reg;
          console.log('Service Worker registered successfully');

          // Praćenje install eventa
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            console.log('New Service Worker found');

            newWorker?.addEventListener('statechange', () => {
              console.log('Service Worker state:', newWorker.state);
              
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // Postoji controller što znači da je stara verzija bila aktivna
                // Sada su dostupne nove datoteke
                console.log('New version available!');
                setUpdateAvailable(true);
              }
            });
          });

          // Inicijalna provjera
          reg.update().catch((e) => console.error('Update check failed:', e));

          // Periodička provjera za update svaki put kako korisnik koristi aplikaciju
          checkInterval = setInterval(() => {
            reg.update().catch((e) => console.error('Periodic update check failed:', e));
          }, 60000); // Provjera svakih 60 sekundi kada je aplikacija aktivna

        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
        });
    }

    return () => {
      if (checkInterval) {
        clearInterval(checkInterval);
      }
    };
  }, []);

  const handleUpdate = () => {
    console.log('Update button clicked');
    
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          const newWorker = registration.installing || registration.waiting;
          
          if (newWorker) {
            // Pošalji poruku novom workeru da se aktivira
            newWorker.postMessage({ type: 'SKIP_WAITING' });
          }
        });

        // Slušaj controllerchange event i osvježi stranicu
        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (!refreshing) {
            refreshing = true;
            console.log('New Service Worker activated, reloading page...');
            window.location.reload();
          }
        });
      });
    }
  };

  return {
    updateAvailable,
    handleUpdate,
  };
}

