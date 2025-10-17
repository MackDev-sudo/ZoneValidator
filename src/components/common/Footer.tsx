import React from 'react';
import './Footer.css';

const Footer: React.FC = () => {
    return (
        <footer className="footer">
            <div className="footer-container">
                <div className="footer-content">
                    {/* Left side - Copyright */}
                    <div className="footer-copyright">
                        <p>
                            © 2025 <span className="brand">VALCOMM</span>. All rights reserved.
                        </p>
                    </div>

                    {/* Right side - Developer info */}
                    <div className="footer-developer">
                        <p>
                            Designed and developed by{' '}
                            <span className="team">Mackdev INC.</span>{' '}
                            <span className="heart">♥</span>
                        </p>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;