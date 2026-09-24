import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: unknown) { console.error(error); }
  render() {
    if (!this.state.failed) return this.props.children;
    return <main className="app-error" role="alert">
      <h1>Something went off the map.</h1>
      <p>Elsewhere hit an unexpected problem. Your saved items and draft day are stored in this browser and should still be there.</p>
      <button className="button" onClick={() => location.reload()}>Reload Elsewhere</button>
    </main>;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><ErrorBoundary><App /></ErrorBoundary></React.StrictMode>,
);
