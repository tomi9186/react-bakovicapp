import React from 'react';
import { Button } from 'framework7-react';

function UpdateNotificationModal({ isOpen, onUpdate }) {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10001,
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '32px 24px',
          maxWidth: '350px',
          width: '90%',
          textAlign: 'center',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
        }}
      >
        <div
          style={{
            fontSize: '36px',
            marginBottom: '16px',
          }}
        >
          ✨
        </div>
        
        <h2 style={{ marginTop: 0, marginBottom: 12, fontSize: '20px' }}>
          Dostupna je nova verzija
        </h2>
        
        <p style={{ color: '#666', marginBottom: 24, lineHeight: '1.5' }}>
          Izašla je nova verzija aplikacije sa poboljšanjima i ispravkama. Molimo vas ažurirajte aplikaciju da biste nastavili sa radom.
        </p>

        <Button
          fill
          onClick={onUpdate}
          style={{
            width: '100%',
          }}
        >
          Ažuriraj sada
        </Button>
      </div>
    </div>
  );
}

export default UpdateNotificationModal;
