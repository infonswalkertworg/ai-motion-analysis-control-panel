import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './Src/App.jsx';
import './public/index.css'; // 如果你沒有 index.css，可以先刪掉這行

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
