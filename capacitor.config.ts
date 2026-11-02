import type { CapacitorConfig } from '@capacitor/cli';

// The APK is a thin native shell around the deployed website, so every
// server update reaches installed devices without rebuilding the app.
// Replace the URL below with your production domain once deployed.
const config: CapacitorConfig = {
  appId: 'ph.tindahan.pos',
  appName: 'TindahanPOS',
  webDir: 'public',
  server: {
    url: 'https://sari-sari-pos-amber.vercel.app',
  },
};

export default config;
