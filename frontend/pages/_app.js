import '@/styles/globals.css';
import { useEffect } from 'react';
import { useAuthStore } from '@/lib/store';
import Navbar from '@/components/common/Navbar';

function MyApp({ Component, pageProps }) {
  useEffect(() => {
    // Hydrate auth store on app load
    useAuthStore.getState().hydrate();
  }, []);

  return (
    <>
      <Navbar />
      <Component {...pageProps} />
    </>
  );
}

export default MyApp;
