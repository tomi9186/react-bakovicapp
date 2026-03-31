import React, { useEffect, useState } from 'react';
import { Block, Link, List, ListItem, Panel } from 'framework7-react';
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
              <ListItem link="/home/" panelClose title="Početna" />
              <ListItem link="/gradilista/" panelClose title="Gradilišta" />
              <ListItem
                link="/alati/"
                panelClose
                title="Alati"
                after={`${ukupnoKomada} kom`}
              />
              <ListItem
                title="Odjava"
                panelClose
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
        <Link
          panelOpen="left"
          className="floating-action-button color-blue"
          style={{ right: 16, bottom: 16, position: 'fixed', zIndex: 3000 }}
        >
          <i className="icon f7-icons">menu</i>
        </Link>
      )}
    </>
  );
}

export default AppLayout;
