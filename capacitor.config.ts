import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.jonth.frysen',
  appName: 'Frysen',
  webDir: 'dist',
  server: {
    androidScheme: 'file',
  },
};

export default config;
