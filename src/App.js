import React from 'react';
import { App as F7App, View } from 'framework7-react';
import routes from './routes';
import { AuthProvider } from './context/AuthContext';
import AppLayout from './components/AppLayout';
import UpdateNotificationModal from './components/UpdateNotificationModal';
import { useUpdateNotification } from './hooks/useUpdateNotification';
import './App.css';

const f7params = {
  name: 'BakovicApp',
  id: 'com.bakovicapp.mobile',
  theme: 'auto',
  routes,
};

function App() {
  const { updateAvailable, handleUpdate } = useUpdateNotification();

  return (
    <AuthProvider>
      <F7App {...f7params}>
        <UpdateNotificationModal isOpen={updateAvailable} onUpdate={handleUpdate} />
        <AppLayout>
          <View
            main
            url="/"
            browserHistory
            browserHistoryRoot="/react-bakovicapp/"
          />
        </AppLayout>
      </F7App>
    </AuthProvider>
  );
}

export default App;
