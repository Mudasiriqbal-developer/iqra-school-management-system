import React, { Component } from 'react';
import { AlertTriangle, GraduationCap } from 'lucide-react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to console
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoToDashboard = () => {
    const token = localStorage.getItem('ihass_token');
    const userStr = localStorage.getItem('ihass_user');

    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user && user.role) {
          if (user.role === 'admin') {
            window.location.href = '/admin-dashboard';
            return;
          } else if (user.role === 'teacher') {
            window.location.href = '/teacher-dashboard';
            return;
          } else if (user.role === 'student' || user.role === 'parent') {
            window.location.href = '/student-dashboard';
            return;
          }
        }
      } catch (error) {
        console.error('Error parsing user data from localStorage:', error);
      }
    }
    window.location.href = '/login';
  };

  render() {
    if (this.state.hasError) {
      const isDev = import.meta.env.DEV;

      return (
        <div className="min-h-screen bg-white text-gray-900 flex flex-col items-center justify-center p-6 select-none">
          {/* Small IHASS logo above the content */}
          <div className="flex items-center space-x-2.5 mb-12">
            <GraduationCap className="h-6 w-6 text-navy-900" />
            <span className="text-xl font-bold tracking-wider text-navy-950">IHASS</span>
          </div>

          <div className="flex flex-col items-center text-center max-w-md w-full">
            {/* lucide-react AlertTriangle icon, navy or amber tone */}
            <div className="p-4 bg-amber-50 rounded-full mb-6">
              <AlertTriangle className="h-16 w-16 text-amber-500" />
            </div>

            {/* Heading */}
            <h1 className="text-3xl font-extrabold text-navy-950 mb-3">
              Something Went Wrong
            </h1>

            {/* Subtext */}
            <p className="text-gray-500 text-sm md:text-base leading-relaxed mb-8">
              An unexpected error occurred. Try reloading the page — if the problem continues, contact your admin.
            </p>

            {/* Two buttons: Reload Page and Go to Dashboard */}
            <div className="flex flex-col sm:flex-row gap-4 w-full justify-center mb-8">
              <button
                onClick={this.handleReload}
                className="bg-navy-900 hover:bg-navy-800 text-white font-semibold py-3 px-6 rounded-full shadow-lg hover:shadow-xl transform active:scale-95 transition-all duration-200 flex-1 sm:flex-initial"
              >
                Reload Page
              </button>
              <button
                onClick={this.handleGoToDashboard}
                className="bg-white border-2 border-navy-900 text-navy-900 hover:bg-gray-50 font-semibold py-3 px-6 rounded-full shadow hover:shadow-md transform active:scale-95 transition-all duration-200 flex-1 sm:flex-initial"
              >
                Go to Dashboard
              </button>
            </div>

            {/* Dev error trace details */}
            {isDev && this.state.error && (
              <div className="w-full text-left bg-gray-50 border border-gray-200 rounded-lg p-4 font-mono text-xs overflow-auto max-h-60 mt-4 select-text">
                <details className="cursor-pointer">
                  <summary className="font-bold text-red-600 focus:outline-none mb-2">
                    Debug Information (Developer Only)
                  </summary>
                  <div className="whitespace-pre-wrap text-gray-700">
                    <p className="font-bold text-gray-900 mb-1">Error:</p>
                    {this.state.error.toString()}
                    {this.state.errorInfo && (
                      <>
                        <p className="font-bold text-gray-900 mt-3 mb-1">Component Stack:</p>
                        {this.state.errorInfo.componentStack}
                      </>
                    )}
                  </div>
                </details>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
