import { app, BrowserWindow } from 'electron';
console.log('ESM: app type:', typeof app);
if (app) app.quit();
