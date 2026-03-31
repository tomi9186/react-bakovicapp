import React from 'react';
import { App as F7App, View } from 'framework7-react';
import routes from './routes';
import { AuthProvider } from './context/AuthContext';
import AppLayout from './components/AppLayout';
import './App.css';

const f7params = {
  name: 'BakovicApp',
  id: 'com.bakovicapp.mobile',
  theme: 'auto',
  routes,
};

function App() {
  return (
    <AuthProvider>
      <F7App {...f7params}>
        <AppLayout>
          <View main url="/login/" browserHistory />
        </AppLayout>
      </F7App>
    </AuthProvider>
  );
}

export default App;
