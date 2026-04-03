import React, { useEffect, useState } from 'react';
import { Block, List, ListItem, Panel } from 'framework7-react';
import { useAuth } from '../context/AuthContext';
import { fetchAlati } from '../services/api';

function AppLayout({ children }) {
  const { isAuthenticated, logout } = useAuth();
  const [ukupnoKomada, setUkupnoKomada] = useState(0);

  useEffect(() => {
    const loadTotal = async () => {
      if (!isAuthenticated) {
        setUkupnoKomada(0);
        return;
      }
      try {
        const alati = await fetchAlati();
        const suma = alati.reduce((acc, item) => acc + Number(item.brojKomada || 0), 0);
        setUkupnoKomada(suma);
      } catch (error) {
        setUkupnoKomada(0);
      }
    };

    loadTotal();
    window.addEventListener('bakovicapp:alati-updated', loadTotal);
    return () => window.removeEventListener('bakovicapp:alati-updated', loadTotal);
  }, [isAuthenticated]);

  return (
    <>
      {isAuthenticated && (
        <Panel left cover>
          <Block style={{ margin: 0 }}>
            <List strong inset>
              <ListItem title="Glavni meni" />
              <ListItem link="/home/" title="Početna" />
              <ListItem link="/gradilista/" title="Gradilišta" />
              <ListItem
                link="/alati/"
                title="Alati"
                after={`${ukupnoKomada} kom`}
              />
              <ListItem
                title="Odjava"
                onClick={() => {
                  logout();
                }}
              />
            </List>
          </Block>
        </Panel>
      )}
      {children}
      {isAuthenticated && (
        <button
          type="button"
          onClick={() => {
            const panel = document.querySelector('.panel-left');
            if (panel) {
              panel.classList.add('panel-in');
            }
          }}
          className="floating-action-button color-blue"
          style={{ right: 16, bottom: 16, position: 'fixed', zIndex: 3000, cursor: 'pointer', padding: 0, border: 'none', background: 'none' }}
        >
          <i className="icon f7-icons">menu</i>
        </button>
      )}
    </>
  );
}

export default AppLayout;
