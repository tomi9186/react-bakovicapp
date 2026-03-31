import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import GradilistaPage from './pages/GradilistaPage';
import GradilisteDetailPage from './pages/GradilisteDetailPage';
import AlatiPage from './pages/AlatiPage';

const routes = [
  {
    path: '/login/',
    component: LoginPage,
  },
  {
    path: '/home/',
    component: HomePage,
  },
  {
    path: '/gradilista/',
    component: GradilistaPage,
  },
  {
    path: '/gradiliste/:id/',
    component: GradilisteDetailPage,
  },
  {
    path: '/alati/',
    component: AlatiPage,
  },
  {
    path: '/',
    redirect: '/login/',
  },
];

export default routes;
