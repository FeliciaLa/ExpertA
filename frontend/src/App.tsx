// React is used for JSX transformation even if not explicitly referenced
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import AppRoutes from './routes';
import { SnackbarProvider } from 'notistack';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SnackbarProvider>
          <AppRoutes />
        </SnackbarProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
