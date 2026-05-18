import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 bg-white rounded-lg shadow text-center">
          <h3 className="text-lg font-semibold mb-3">Something went wrong</h3>
          <p className="text-gray-600 mb-4">An error occurred while loading this section.</p>
          <button onClick={this.handleReset} className="px-4 py-2 bg-blue-600 text-white rounded">Try again</button>
        </div>
      );
    }

    return this.props.children;
  }
}