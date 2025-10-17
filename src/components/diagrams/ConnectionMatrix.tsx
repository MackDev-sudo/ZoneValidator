import React, { useMemo } from 'react';
import type { ValidationResult } from '../../types';
import './ConnectionMatrix.css';

interface ConnectionMatrixProps {
    data?: ValidationResult[];
}

const ConnectionMatrix: React.FC<ConnectionMatrixProps> = ({ data = [] }) => {
    const matrixData = useMemo(() => {
        if (data.length === 0) return null;

        // Extract unique fabrics
        const fabrics = new Set<string>();
        data.forEach(result => {
            result.wwns.forEach(wwn => {
                if (wwn.fabric) fabrics.add(wwn.fabric);
            });
        });

        const fabricArray = Array.from(fabrics).sort();

        // Build matrix data
        const matrix = data.map(result => {
            const row: any = {
                host: result.host,
                finalValidation: result.finalValidation,
                fabrics: {}
            };

            fabricArray.forEach(fabric => {
                const fabricWwns = result.wwns.filter(w => w.fabric === fabric);
                const loggedInCount = fabricWwns.filter(w => w.isLoggedIn).length;
                const totalCount = fabricWwns.length;

                row.fabrics[fabric] = {
                    loggedIn: loggedInCount,
                    total: totalCount,
                    status: loggedInCount > 0 ? 'connected' : 'disconnected',
                    wwns: fabricWwns
                };
            });

            return row;
        });

        return { matrix, fabrics: fabricArray };
    }, [data]);

    const getStatusClass = (status: string, finalValidation: string) => {
        if (finalValidation !== 'Good') return 'cell-error';
        return status === 'connected' ? 'cell-connected' : 'cell-disconnected';
    };

    const getValidationClass = (validation: string) => {
        switch (validation) {
            case 'Good': return 'validation-good';
            case 'FAB-A Is BAD': return 'validation-fab-a-bad';
            case 'FAB-B Is BAD': return 'validation-fab-b-bad';
            case 'Both FABs Are BAD': return 'validation-both-bad';
            default: return 'validation-unknown';
        }
    };

    if (!matrixData || matrixData.matrix.length === 0) {
        return (
            <div className="connection-matrix">
                <div className="diagram-header">
                    <h2>Host Connection Matrix</h2>
                    <p>Matrix view showing host-fabric connection status</p>
                </div>
                <div className="no-data">
                    <p>Upload Excel file to generate connection matrix</p>
                </div>
            </div>
        );
    }

    const { matrix, fabrics } = matrixData;

    return (
        <div className="connection-matrix">
            <div className="diagram-header">
                <h2>Host Connection Matrix</h2>
                <p>Matrix view showing host-fabric connection status for {matrix.length} servers</p>

                <div className="legend">
                    <div className="legend-item">
                        <span className="legend-color connected"></span>
                        <span>Connected (Logged In)</span>
                    </div>
                    <div className="legend-item">
                        <span className="legend-color disconnected"></span>
                        <span>Disconnected (Not Logged In)</span>
                    </div>
                    <div className="legend-item">
                        <span className="legend-color error"></span>
                        <span>Validation Error</span>
                    </div>
                </div>
            </div>

            <div className="matrix-container">
                <div className="matrix-table-wrapper">
                    <table className="matrix-table">
                        <thead>
                            <tr>
                                <th className="host-header">Host</th>
                                <th className="validation-header">Status</th>
                                {fabrics.map(fabric => (
                                    <th key={fabric} className="fabric-header">
                                        {fabric}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {matrix.map((row, index) => (
                                <tr key={index} className="matrix-row">
                                    <td className="host-cell" title={row.host}>
                                        {row.host}
                                    </td>
                                    <td className={`validation-cell ${getValidationClass(row.finalValidation)}`}>
                                        <span className="validation-text">
                                            {row.finalValidation === 'Good' ? '✓' : '✗'}
                                        </span>
                                        <span className="validation-label">
                                            {row.finalValidation}
                                        </span>
                                    </td>
                                    {fabrics.map(fabric => {
                                        const fabricData = row.fabrics[fabric];
                                        return (
                                            <td
                                                key={fabric}
                                                className={`fabric-cell ${getStatusClass(fabricData.status, row.finalValidation)}`}
                                                title={`${fabricData.loggedIn}/${fabricData.total} logged in`}
                                            >
                                                <div className="cell-content">
                                                    <span className="connection-status">
                                                        {fabricData.status === 'connected' ? '●' : '○'}
                                                    </span>
                                                    <span className="connection-count">
                                                        {fabricData.loggedIn}/{fabricData.total}
                                                    </span>
                                                </div>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="matrix-summary">
                <div className="summary-stats">
                    <div className="summary-item">
                        <span className="summary-label">Total Hosts:</span>
                        <span className="summary-value">{matrix.length}</span>
                    </div>
                    <div className="summary-item">
                        <span className="summary-label">Fabrics:</span>
                        <span className="summary-value">{fabrics.length}</span>
                    </div>
                    <div className="summary-item">
                        <span className="summary-label">Good:</span>
                        <span className="summary-value good">
                            {matrix.filter(r => r.finalValidation === 'Good').length}
                        </span>
                    </div>
                    <div className="summary-item">
                        <span className="summary-label">Issues:</span>
                        <span className="summary-value error">
                            {matrix.filter(r => r.finalValidation !== 'Good').length}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConnectionMatrix;