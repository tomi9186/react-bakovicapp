import React, { useEffect } from 'react';
import {
  Block,
  BlockTitle,
  Button,
  Navbar,
  NavRight,
  NavTitle,
  Page,
} from 'framework7-react';
import { useAuth } from '../context/AuthContext';

function HomePage({ f7router }) {
  const { isAuthenticated, isCheckingAuth, logout, user } = useAuth();

  useEffect(() => {
    if (!isCheckingAuth && !isAuthenticated) {
      f7router.navigate('/login/');
    }
  }, [isAuthenticated, isCheckingAuth, f7router]);

  if (isCheckingAuth || !isAuthenticated) {
    return null;
  }

  return (
    <Page>
      <Navbar>
        <NavTitle className="app-title">BakovicApp</NavTitle>
        <NavRight>
          <Button
            small
            tonal
            onClick={() => {
              logout();
              f7router.navigate('/login/');
            }}
          >
            Odjava
          </Button>
        </NavRight>
      </Navbar>

      <Block strong>
        Dobrodošli, <strong>{user?.username || 'korisniče'}</strong>.
      </Block>
      <BlockTitle>Glavni meni</BlockTitle>
      <Block strong>
        <Button fill large onClick={() => f7router.navigate('/gradilista/')}>
          Gradilišta
        </Button>
        <div style={{ height: 12 }} />
        <Button fill large color="green" onClick={() => f7router.navigate('/alati/')}>
          Alati
        </Button>
      </Block>
    </Page>
  );
}

export default HomePage;
