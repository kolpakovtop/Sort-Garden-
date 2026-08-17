import { defineConfig } from '@playwright/test';

// Two projects: the vite dev server and the built dist served statically.
export default defineConfig({
  testDir: './specs',
  outputDir: './.artifacts',
  timeout: 60000,
  expect: { timeout: 8000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: { viewport: { width: 1280, height: 900 }, actionTimeout: 8000 },
  projects: [
    { name: 'dev', use: { baseURL: 'http://127.0.0.1:5178' } },
    { name: 'dist', use: { baseURL: 'http://127.0.0.1:5179' } }
  ],
  webServer: [
    {
      command: 'npm --prefix .. run dev -- --port 5178 --strictPort',
      url: 'http://127.0.0.1:5178',
      reuseExistingServer: true,
      timeout: 60000
    },
    {
      command: 'npm --prefix .. run build && npx --yes vite preview --outDir ../dist --port 5179 --strictPort',
      url: 'http://127.0.0.1:5179',
      reuseExistingServer: true,
      timeout: 120000
    }
  ]
});
