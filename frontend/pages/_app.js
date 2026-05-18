import '@/styles/globals.css';
import { useEffect } from 'react';
import { useAuthStore } from '@/lib/store';
import Navbar from '@/components/common/Navbar';

function MyApp({ Component, pageProps }) {
  useEffect(() => {
    useAuthStore.getState().checkAuth();
  }, []);

  return (
    <>
      <Navbar />
      <Component {...pageProps} />
    </>
  );
}

export default MyApp;