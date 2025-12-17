'use client';

import { Component, ReactNode } from 'react';
import { logger } from '../utils/logger';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
    errorInfo?: string;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: any) {
        logger.error('ErrorBoundary caught error', error, {
            component: 'ErrorBoundary',
            errorInfo: errorInfo.componentStack,
        });

        this.setState({
            errorInfo: errorInfo.componentStack,
        });
    }

    handleReload = () => {
        window.location.reload();
    };

    handleReset = () => {
        this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="flex items-center justify-center min-h-screen bg-black text-white p-6">
                    <div className="max-w-md w-full text-center">
                        {/* Error Icon */}
                        <div className="mb-6">
                            <div className="w-20 h-20 mx-auto rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center">
                                <span className="text-4xl">⚠️</span>
                            </div>
                        </div>

                        {/* Error Message */}
                        <h1 className="text-2xl font-black text-red-400 mb-4 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]">
                            Something Went Wrong
                        </h1>

                        <p className="text-gray-400 mb-2">
                            {this.state.error?.message || 'An unexpected error occurred'}
                        </p>

                        {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                            <details className="mt-4 text-left">
                                <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-300">
                                    Error Details (Development Only)
                                </summary>
                                <pre className="mt-2 p-4 bg-black/50 rounded-lg text-xs text-red-300 overflow-auto max-h-48">
                                    {this.state.errorInfo}
                                </pre>
                            </details>
                        )}

                        {/* Action Buttons */}
                        <div className="mt-8 flex gap-3 justify-center">
                            <button
                                onClick={this.handleReset}
                                className="px-6 py-3 bg-gray-800 text-white rounded-xl border border-gray-600 hover:bg-gray-700 transition-all font-semibold"
                            >
                                Try Again
                            </button>
                            <button
                                onClick={this.handleReload}
                                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl font-bold shadow-[0_0_20px_rgba(0,200,255,0.4)] hover:shadow-[0_0_30px_rgba(0,200,255,0.6)] transition-all"
                            >
                                Reload App
                            </button>
                        </div>

                        {/* Help Text */}
                        <p className="mt-6 text-xs text-gray-500">
                            If this problem persists, please refresh the page or contact support.
                        </p>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
