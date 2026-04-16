
'use client';

import React, { useMemo } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { firebaseConfig } from './config';
import { FirebaseProvider } from './provider';

export function FirebaseClientProvider({ children }: { children: React.ReactNode }) {
  const { app, db, auth } = useMemo(() => {
    const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    let db;
    try {
      // Improves connectivity in networks that block WebChannel/WebSocket transport.
      db = initializeFirestore(app, {
        experimentalAutoDetectLongPolling: true,
        useFetchStreams: false,
      });
    } catch {
      // Firestore may already be initialized during HMR or fast refresh.
      db = getFirestore(app);
    }
    const auth = getAuth(app);
    return { app, db, auth };
  }, []);

  return (
    <FirebaseProvider firebaseApp={app} firestore={db} auth={auth}>
      {children}
    </FirebaseProvider>
  );
}
