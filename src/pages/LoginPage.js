import React, { useEffect, useState } from 'react';
import {
  BlockFooter,
  Button,
  List,
  ListInput,
  Navbar,
  NavTitle,
  Page,
} from 'framework7-react';
import { useAuth } from '../context/AuthContext';

function LoginPage({ f7router }) {
  const { isAuthenticated, isCheckingAuth, login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isCheckingAuth && isAuthenticated) {
      f7router.navigate('/home/');
    }
  }, [isAuthenticated, isCheckingAuth, f7router]);

  if (isCheckingAuth) {
    return (
      <Page>
        <Navbar>
          <NavTitle className="app-title">BakovicApp</NavTitle>
        </Navbar>
        <BlockFooter>Provjera prijave...</BlockFooter>
      </Page>
    );
  }

  const onSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      await login(username, password);
      f7router.navigate('/home/');
    } catch (error) {
      // eslint-disable-next-line no-alert
      alert('Neuspješna prijava. Provjerite korisničko ime i lozinku.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Page loginScreen>
      <Navbar>
        <NavTitle className="app-title">BakovicApp - Prijava</NavTitle>
      </Navbar>
      <form onSubmit={onSubmit}>
        <List inset>
          <ListInput
            name="username"
            label="Korisničko ime"
            type="text"
            placeholder="Upišite korisničko ime"
            autoComplete="username"
            required
            value={username}
            onInput={(event) => setUsername(event.target.value)}
          />
          <ListInput
            name="password"
            label="Lozinka"
            type="password"
            placeholder="Upišite lozinku"
            autoComplete="current-password"
            required
            value={password}
            onInput={(event) => setPassword(event.target.value)}
          />
        </List>
        <List inset>
          <Button fill round type="submit" disabled={loading}>
            {loading ? 'Prijava u tijeku...' : 'Prijavi se'}
          </Button>
        </List>
      </form>
      <BlockFooter>Aplikacija koristi WordPress JWT autentifikaciju.</BlockFooter>
    </Page>
  );
}

export default LoginPage;
