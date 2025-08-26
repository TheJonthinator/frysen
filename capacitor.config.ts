import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.jonth.frysen',
  appName: 'Frysen',
  webDir: 'dist',
  server: {
    androidScheme: 'file',
  },
  plugins: {
    StatusBar: {
      style: 'dark',
      backgroundColor: '#1565c0',
      overlaysWebView: false,
    },
  },
};

export default config;
