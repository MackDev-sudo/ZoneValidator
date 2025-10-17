import React, { useState, useMemo } from 'react';
import type { ValidationResult } from '../types';
import { ExcelUtils } from '../utils/excelUtils';
import './ValidationResults.css';

interface ValidationResultsProps {
    results: ValidationResult[];
    summary: {
        total: number;
        good: number;
        fabABad: number;
        fabBBad: number;
        bothBad: number;
        percentageGood: number;
        originalEntries: number;
        duplicatesRemoved: number;
        uniqueEntries: number;
    };
    onReset: () => void;
}const ValidationResults: React.FC<ValidationResultsProps> = ({ results, summary, onReset }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [fabAFilter, setFabAFilter] = useState<string>('all');
    const [fabBFilter, setFabBFilter] = useState<string>('all');
    const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
    const [expandedWWNs, setExpandedWWNs] = useState<Set<string>>(new Set());

    const toggleWWNExpansion = (hostName: string) => {
        const newExpanded = new Set(expandedWWNs);
        if (newExpanded.has(hostName)) {
            newExpanded.delete(hostName);
        } else {
            newExpanded.add(hostName);
        }
        setExpandedWWNs(newExpanded);
    };

    const getServerType = (wwnCount: number): string => {
        if (wwnCount >= 8) return 'AIX';
        if (wwnCount >= 2) return 'RHEL/ESXi';
        return 'Unknown';
    };

    const handleExport = () => {
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        const dataToExport = selectedRows.size > 0
            ? filteredResults.filter((_, index) => selectedRows.has(index))
            : filteredResults;
        ExcelUtils.exportToExcel(dataToExport, `fabric_validation_report_${timestamp}.xlsx`);
    };

    const handleSelectAll = () => {
        if (selectedRows.size === filteredResults.length) {
            setSelectedRows(new Set());
        } else {
            setSelectedRows(new Set(filteredResults.map((_, index) => index)));
        }
    };

    const handleRowSelect = (index: number) => {
        const newSelectedRows = new Set(selectedRows);
        if (newSelectedRows.has(index)) {
            newSelectedRows.delete(index);
        } else {
            newSelectedRows.add(index);
        }
        setSelectedRows(newSelectedRows);
    };

    const filteredResults = useMemo(() => {
        return results.filter(result => {
            // Search filter
            const matchesSearch = result.host.toLowerCase().includes(searchTerm.toLowerCase());

            // Status filter
            let matchesStatus = true;
            if (statusFilter === 'errors') {
                // Show all configurations with errors (partial or complete)
                matchesStatus = result.finalValidation !== 'Good';
            } else if (statusFilter !== 'all') {
                matchesStatus = result.finalValidation === statusFilter;
            }

            // FAB-A filter
            const matchesFabA = fabAFilter === 'all' || result.validationA === fabAFilter;

            // FAB-B filter
            const matchesFabB = fabBFilter === 'all' || result.validationB === fabBFilter;

            return matchesSearch && matchesStatus && matchesFabA && matchesFabB;
        });
    }, [results, searchTerm, statusFilter, fabAFilter, fabBFilter]);

    const clearFilters = () => {
        setSearchTerm('');
        setStatusFilter('all');
        setFabAFilter('all');
        setFabBFilter('all');
        setSelectedRows(new Set());
        setExpandedWWNs(new Set());
    }; const getStatusColor = (status: ValidationResult['finalValidation']) => {
        switch (status) {
            case 'Good':
                return 'status-good';
            case 'FAB-A Is BAD':
            case 'FAB-B Is BAD':
                return 'status-warning';
            case 'Both FABs Are BAD':
                return 'status-error';
            default:
                return '';
        }
    };

    const getValidationColor = (validation: 'OK' | 'Error') => {
        return validation === 'OK' ? 'validation-ok' : 'validation-error';
    };

    return (
        <div className="validation-results">
            <div className="results-header">
                <h2>Validation Results</h2>
                <div className="header-actions">
                    {selectedRows.size > 0 && (
                        <span className="selection-info">
                            {selectedRows.size} selected
                        </span>
                    )}
                    <button className="btn btn-secondary" onClick={onReset}>
                        Upload New File
                    </button>
                    <button className="btn btn-primary" onClick={handleExport}>
                        📥 Export {selectedRows.size > 0 ? 'Selected' : 'All'}
                    </button>
                </div>
            </div>

            <div className="summary-cards">
                <div className="summary-card total">
                    <div className="card-content">
                        <div className="card-number">{summary.total}</div>
                        <div className="card-label">Total Hosts</div>
                    </div>
                </div>

                <div className="summary-card good">
                    <div className="card-content">
                        <div className="card-number">{summary.good}</div>
                        <div className="card-label">Good Configuration</div>
                        <div className="card-percentage">{summary.percentageGood}%</div>
                    </div>
                </div>

                <div className="summary-card warning">
                    <div className="card-content">
                        <div className="card-number">{summary.fabABad + summary.fabBBad}</div>
                        <div className="card-label">Partial Issues</div>
                    </div>
                </div>

                <div className="summary-card error">
                    <div className="card-content">
                        <div className="card-number">{summary.bothBad}</div>
                        <div className="card-label">Both FABs Bad</div>
                    </div>
                </div>

                {summary.duplicatesRemoved > 0 && (
                    <div className="summary-card info">
                        <div className="card-content">
                            <div className="card-number">{summary.duplicatesRemoved}</div>
                            <div className="card-label">Duplicates Removed</div>
                            <div className="card-info">
                                {summary.originalEntries} → {summary.uniqueEntries} entries
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="filters-section">
                <div className="filters-header">
                    <h3>Filter Results</h3>
                    <button className="btn btn-clear" onClick={clearFilters}>
                        Clear Filters
                    </button>
                </div>

                <div className="filters-container">
                    <div className="filter-group">
                        <label htmlFor="search">Search Host:</label>
                        <input
                            id="search"
                            type="text"
                            placeholder="Enter host name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="filter-input"
                        />
                    </div>

                    <div className="filter-group">
                        <label htmlFor="status-filter">Final Status:</label>
                        <select
                            id="status-filter"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="filter-select"
                        >
                            <option value="all">All Statuses</option>
                            <option value="errors">⚠️ All Errors</option>
                            <option value="Good">Good</option>
                            <option value="FAB-A Is BAD">FAB-A Is BAD</option>
                            <option value="FAB-B Is BAD">FAB-B Is BAD</option>
                            <option value="Both FABs Are BAD">Both FABs Are BAD</option>
                        </select>
                    </div>

                    <div className="filter-group">
                        <label htmlFor="faba-filter">FAB-A Status:</label>
                        <select
                            id="faba-filter"
                            value={fabAFilter}
                            onChange={(e) => setFabAFilter(e.target.value)}
                            className="filter-select"
                        >
                            <option value="all">All</option>
                            <option value="OK">OK</option>
                            <option value="Error">Error</option>
                        </select>
                    </div>

                    <div className="filter-group">
                        <label htmlFor="fabb-filter">FAB-B Status:</label>
                        <select
                            id="fabb-filter"
                            value={fabBFilter}
                            onChange={(e) => setFabBFilter(e.target.value)}
                            className="filter-select"
                        >
                            <option value="all">All</option>
                            <option value="OK">OK</option>
                            <option value="Error">Error</option>
                        </select>
                    </div>
                </div>

                <div className="filter-results-count">
                    Showing {filteredResults.length} of {results.length} results
                    {selectedRows.size > 0 && (
                        <span className="selection-summary">
                            • {selectedRows.size} selected
                        </span>
                    )}
                </div>

                {selectedRows.size > 0 && (
                    <div className="bulk-actions">
                        <div className="bulk-actions-info">
                            <strong>{selectedRows.size}</strong> rows selected
                        </div>
                        <div className="bulk-actions-buttons">
                            <button
                                className="btn btn-secondary"
                                onClick={() => setSelectedRows(new Set())}
                            >
                                Clear Selection
                            </button>
                            <button className="btn btn-primary" onClick={handleExport}>
                                📥 Export Selected ({selectedRows.size})
                            </button>
                        </div>
                    </div>
                )}
            </div>            <div className="results-table-container">
                {filteredResults.length > 0 ? (
                    <table className="results-table">
                        <thead>
                            <tr>
                                <th className="select-column">
                                    <input
                                        type="checkbox"
                                        checked={selectedRows.size === filteredResults.length && filteredResults.length > 0}
                                        onChange={handleSelectAll}
                                        className="select-checkbox"
                                    />
                                </th>
                                <th>Host</th>
                                <th>WWNs</th>
                                <th>FAB-A Logged In</th>
                                <th>FAB-A Not Logged In</th>
                                <th>FAB-A Status</th>
                                <th>FAB-B Logged In</th>
                                <th>FAB-B Not Logged In</th>
                                <th>FAB-B Status</th>
                                <th>Final Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredResults.map((result, index) => (
                                <tr key={index} className={getStatusColor(result.finalValidation)}>
                                    <td className="select-column">
                                        <input
                                            type="checkbox"
                                            checked={selectedRows.has(index)}
                                            onChange={() => handleRowSelect(index)}
                                            className="select-checkbox"
                                        />
                                    </td>
                                    <td className="host-cell">
                                        <strong>{result.host}</strong>
                                    </td>
                                    <td className="wwn-cell">
                                        <div className="wwn-container">
                                            <div className="wwn-header" onClick={() => toggleWWNExpansion(result.host)}>
                                                <div className="wwn-preview">
                                                    {result.wwns.length > 0 && (
                                                        <span
                                                            className={`wwn-item ${result.wwns[0].isLoggedIn ? 'logged-in' : 'not-logged-in'}`}
                                                            title={`${result.wwns[0].fabric} - ${result.wwns[0].isLoggedIn ? 'Logged In' : 'Not Logged In'}`}
                                                        >
                                                            {result.wwns[0].wwn}
                                                            <span className="fabric-indicator">{result.wwns[0].fabric}</span>
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="wwn-info">
                                                    <span className="wwn-count">
                                                        {result.wwns.length} WWN{result.wwns.length !== 1 ? 's' : ''}
                                                    </span>
                                                    <span className="server-type">
                                                        ({getServerType(result.wwns.length)})
                                                    </span>
                                                    {result.wwns.length > 1 && (
                                                        <button className="wwn-toggle">
                                                            {expandedWWNs.has(result.host) ? '▼' : '▶'}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            {expandedWWNs.has(result.host) && result.wwns.length > 1 && (
                                                <div className="wwn-expanded">
                                                    {result.wwns.slice(1).map((wwnInfo, wwnIndex) => (
                                                        <span
                                                            key={wwnIndex + 1}
                                                            className={`wwn-item ${wwnInfo.isLoggedIn ? 'logged-in' : 'not-logged-in'}`}
                                                            title={`${wwnInfo.fabric} - ${wwnInfo.isLoggedIn ? 'Logged In' : 'Not Logged In'}`}
                                                        >
                                                            {wwnInfo.wwn}
                                                            <span className="fabric-indicator">{wwnInfo.fabric}</span>
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="number-cell">{result.fabA_LoggedInYes}</td>
                                    <td className="number-cell">{result.fabA_LoggedInNo}</td>
                                    <td className={`validation-cell ${getValidationColor(result.validationA)}`}>
                                        {result.validationA}
                                    </td>
                                    <td className="number-cell">{result.fabB_LoggedInYes}</td>
                                    <td className="number-cell">{result.fabB_LoggedInNo}</td>
                                    <td className={`validation-cell ${getValidationColor(result.validationB)}`}>
                                        {result.validationB}
                                    </td>
                                    <td className={`status-cell ${getStatusColor(result.finalValidation)}`}>
                                        {result.finalValidation}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="no-results">
                        <div className="no-results-icon">🔍</div>
                        <h3>No results found</h3>
                        <p>Try adjusting your filters or search term to find results.</p>
                        <button className="btn btn-secondary" onClick={clearFilters}>
                            Clear All Filters
                        </button>
                    </div>
                )}
            </div>

            <div className="validation-legend">
                <h3>Configuration Rules:</h3>
                <div className="legend-items">
                    <div className="legend-item">
                        <span className="legend-dot good"></span>
                        <strong>Valid Configurations:</strong>
                        <ul>
                            <li>2 ports logged in + 2 ports not logged in per fabric (AIX servers)</li>
                            <li>1 port logged in + 0 ports not logged in per fabric (ESXi/RHEL servers)</li>
                        </ul>
                    </div>
                    <div className="legend-item">
                        <span className="legend-dot error"></span>
                        <strong>Invalid:</strong> Any other configuration
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ValidationResults;