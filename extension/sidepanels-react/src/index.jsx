import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// Create root element
const container = document.getElementById('root');
const root = createRoot(container);

// Render the app
root.render(<App />); 