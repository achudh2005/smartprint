// Polyfill modern ES features for cross-browser / mobile engine / PDF.js compatibility
if (typeof Promise.withResolvers === 'undefined') {
  Promise.withResolvers = function () {
    let resolve, reject;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}

if (typeof Promise.try !== 'function') {
  Promise.try = function (fn, ...args) {
    return new Promise((resolve) => {
      resolve(fn(...args));
    });
  };
}

if (typeof Iterator === 'undefined') {
  globalThis.Iterator = class Iterator {};
}

if (typeof ArrayBuffer.prototype.transferToFixedLength === 'undefined') {
  ArrayBuffer.prototype.transferToFixedLength = function (newByteLength) {
    const len = newByteLength === undefined ? this.byteLength : newByteLength;
    const copy = new ArrayBuffer(len);
    const minLen = Math.min(this.byteLength, len);
    new Uint8Array(copy, 0, minLen).set(new Uint8Array(this, 0, minLen));
    return copy;
  };
}

if (typeof ArrayBuffer.prototype.transfer === 'undefined') {
  ArrayBuffer.prototype.transfer = function (newByteLength) {
    return this.transferToFixedLength(newByteLength);
  };
}

if (typeof Uint8Array.prototype.toHex === 'undefined') {
  Uint8Array.prototype.toHex = function () {
    let hex = '';
    for (let i = 0; i < this.length; i++) {
      hex += this[i].toString(16).padStart(2, '0');
    }
    return hex;
  };
}

import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
        <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#fff',
            color: '#1e293b',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
            fontSize: '14px',
          },
          success: { iconTheme: { primary: '#16a34a', secondary: '#fff' } },
          error:   { iconTheme: { primary: '#dc2626', secondary: '#fff' } },
        }}
      />
    </BrowserRouter>
  </ErrorBoundary>
  </React.StrictMode>,
)
