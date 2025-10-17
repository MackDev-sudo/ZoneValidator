import React from 'react';
import './Header.css';

interface HeaderProps {
    onRefresh?: () => void;
    onInfo?: () => void;
    onGuidelines?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onRefresh, onInfo, onGuidelines }) => {
    return (
        <header className="header">
            <div className="header-container">
                <div className="header-content">
                    {/* Left side - Logo and brand */}
                    <div className="header-brand">
                        <div className="header-logo">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div className="header-brand-info">
                            <h1>VALCOMM</h1>
                            <p>Automate your validations</p>
                        </div>
                    </div>

                    {/* Right side - Action buttons */}
                    <div className="header-actions">
                        <button
                            onClick={onInfo}
                            className="header-button"
                            title="Information"
                        >
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </button>

                        <button
                            onClick={onRefresh}
                            className="header-button"
                            title="Refresh"
                        >
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        </button>

                        <button
                            onClick={onGuidelines}
                            className="header-button"
                            title="Guidelines"
                        >
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;