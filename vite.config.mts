/// <reference types="vitest" />
import { defineConfig } from 'vite';
import angular from '@analogjs/vite-plugin-angular';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [angular(), tsconfigPaths()],
  ssr: {
    noExternal: [/@angular/],
  },
  server: {
    deps: {
      inline: [/@angular/],
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/test-setup.ts'],
    include: ['src/**/*.{test,spec}.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'lcov'],
      reportsDirectory: './coverage',
      exclude: [
        'src/main.ts',
        'src/environments/**',
        'src/test-setup.ts',
        '**/*.d.ts',
        '**/*.config.ts',
        '**/*.routes.ts',
      ],
    },
  },
});
