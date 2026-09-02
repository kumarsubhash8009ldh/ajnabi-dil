import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App Error Caught by Boundary:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.hash = '#/';
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-3xl bg-pink-600/20 border border-pink-500/40 flex items-center justify-center mb-4 shadow-lg shadow-pink-600/20 text-2xl">
            ??
          </div>
          <h2 className="text-lg font-black text-white">Ajnabi Dil</h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xs">
            App ko smooth rakhne ke liye auto-recovery enable hai.
          </p>
          <button
            onClick={this.handleReload}
            className="mt-6 px-6 py-2.5 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white text-xs font-black rounded-2xl shadow-lg shadow-pink-600/30 active:scale-95 transition-all"
          >
            Refresh & Open Feed
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
