import { defineConfig } from 'vite';

export default defineConfig({
  base: '/',
  build: {
    outDir: 'dist',
    target: 'es2022',
    sourcemap: false,
    rollupOptions: {
      output: {
        // Separate immutable library bundles from author-written app/game
        // code. Browser caching can retain them between future V releases.
        // No runtime dependency, physics store or rendering engine is copied.
        manualChunks(id) {
          const file=id.replaceAll('\\','/');
          if(file.includes('/node_modules/three/')){
            return file.includes('/examples/jsm/')?'three-addons':'three-engine';
          }
          if(file.includes('/node_modules/@react-three/fiber/'))return 'r3f-runtime';
          if(/\/node_modules\/(react|react-dom|react-reconciler|scheduler|use-sync-external-store)\//.test(file))
            return 'react-runtime';
          return undefined;
        },
      },
    },
  },
});
