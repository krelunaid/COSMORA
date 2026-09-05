import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kreluna.cosmora',
  appName: 'COSMORA',
  webDir: 'dist/client',
  backgroundColor: '#050617',
  server: {
    url: 'https://cosmora-app.andreagadducci.chatgpt.site/?appBuild=19',
    cleartext: false,
    allowNavigation: ['cosmora-app.andreagadducci.chatgpt.site'],
  },
  ios: {
    backgroundColor: '#050617',
    contentInset: 'never',
    preferredContentMode: 'mobile',
  },
};

export default config;
