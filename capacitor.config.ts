import type { CapacitorConfig } from '@capacitor/cli';

// iOS and Android currently have separate product identifiers. Use the
// platform-specific sync scripts so each embedded config receives its own ID.
const nativeTarget = process.env.COSMORA_NATIVE_TARGET ?? 'ios';
if (nativeTarget !== 'ios' && nativeTarget !== 'android') {
  throw new Error('COSMORA_NATIVE_TARGET must be ios or android.');
}

const config: CapacitorConfig = {
  appId: nativeTarget === 'android' ? 'com.kreluna.cosmora' : 'it.kreluna.cosmora',
  appName: 'COSMORA',
  webDir: 'dist/mobile',
  backgroundColor: '#050617',
  ios: {
    backgroundColor: '#050617',
    contentInset: 'never',
    preferredContentMode: 'mobile',
  },
};

export default config;
