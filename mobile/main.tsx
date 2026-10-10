/// <reference types="vite/client" />
import { Component, lazy, Suspense, useEffect, useLayoutEffect, type ComponentType, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { I18nProvider, useI18n } from '@/components/i18n-provider';
import { NativeAppClass } from '@/components/native-app-class';
import { NativeAuthCallback } from '@/components/native-auth-callback';
import { TermsConsentGate } from '@/components/auth/terms-consent-gate';
import { BlockFeedback } from '@/components/block-feedback';
import Loading from '@/app/loading';
import NotFound from '@/app/not-found';
import { pageRoute } from './route-path';
import '@/app/globals.css';
import './mobile.css';

const pages = import.meta.glob<{ default: ComponentType }>(['../app/**/page.tsx', '!../app/community/create/page.tsx']);
const screens = Object.entries(pages).map(([file, load]) => ({ path: pageRoute(file), Screen: lazy(load) }));

function ErrorScreen() {
  const { locale } = useI18n();
  const copy = {
    it: ['Impossibile aprire questa schermata.', 'Torna alla home'],
    en: ['Unable to open this screen.', 'Back to home'],
    fr: ['Impossible d’ouvrir cet écran.', 'Retour à l’accueil'],
    de: ['Dieser Bildschirm konnte nicht geöffnet werden.', 'Zur Startseite'],
    es: ['No se puede abrir esta pantalla.', 'Volver al inicio'],
  }[locale];
  return <main className="flex min-h-dvh flex-col items-center justify-center gap-6 p-6 text-center"><p role="alert">{copy[0]}</p><a href="/" className="rounded-xl bg-violet-600 px-5 py-3">{copy[1]}</a></main>;
}

class ScreenBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <ErrorScreen /> : this.props.children; }
}

function MobileRoutes() {
  const location = useLocation();
  const navigate = useNavigate();
  useLayoutEffect(() => { window.scrollTo(0, 0); }, [location.pathname, location.search]);
  useEffect(() => {
    if (Capacitor.getPlatform() !== 'android') return;
    const listener = App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) void navigate(-1);
      else if (location.pathname !== '/') void navigate('/', { replace: true });
      else void App.exitApp();
    });
    return () => { void listener.then((handle) => handle.remove()); };
  }, [navigate, location.pathname]);
  return <><NativeAuthCallback /><TermsConsentGate><ScreenBoundary key={location.pathname}>
    <Suspense fallback={<Loading />}><Routes>
      {screens.map(({ path, Screen }) => <Route key={path} path={path} element={<Screen />} />)}
      <Route path="/community/create" element={<Navigate to="/sell" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes></Suspense>
  </ScreenBoundary><BlockFeedback /></TermsConsentGate></>;
}

createRoot(document.getElementById('root')!).render(
  <I18nProvider><NativeAppClass /><BrowserRouter><MobileRoutes /></BrowserRouter></I18nProvider>,
);
