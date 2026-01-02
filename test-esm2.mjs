import electron from 'electron';
console.log('Type of electron:', typeof electron);
console.log('electron.app:', typeof electron.app);
if (electron.app) electron.app.quit();
