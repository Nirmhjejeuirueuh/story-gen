import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {Loader2} from 'lucide-react';
import App from './App.tsx';
import {AuthProvider, useAuth} from './auth/AuthContext.tsx';
import LoginScreen from './components/LoginScreen.tsx';
import './index.css';

/**
 * Gates the app on authentication: shows a spinner while auth state resolves, the login
 * screen when signed out, and the full app once signed in.
 */
function AuthGate() {
  const {user, loading} = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return user ? <App /> : <LoginScreen />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  </StrictMode>,
);
