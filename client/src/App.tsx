import { DirectionProvider } from '@radix-ui/react-direction';
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/features/auth/AuthContext';
import { queryClient } from '@/lib/queryClient';
import { AppRouter } from '@/routes/router';

export default function App() {
  return (
    <DirectionProvider dir="rtl">
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <AppRouter />
            <Toaster position="top-left" dir="rtl" richColors closeButton />
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </DirectionProvider>
  );
}
