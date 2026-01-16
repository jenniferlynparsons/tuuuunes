import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './renderer/App';

// IPC demo - can be removed later
import './demos/ipc';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

postMessage({ payload: 'removeLoading' }, '*');
