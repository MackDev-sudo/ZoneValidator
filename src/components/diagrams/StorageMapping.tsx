import React, { useMemo, useState } from 'react';
import type { FabricData } from '../../types';
import './StorageMapping.css';

interface StorageMappingProps {
    data?: FabricData[];
}

interface GroupedMapping {
    server: string;
    storages: Set<string>;
    zones: Set<string>;
    ports: Set<string>;
    portsLoggedInStatus: Map<string, boolean>; // Track login status per port
    vendors: Set<string>;
    wwns: Array<{ wwn: string; isLoggedIn: boolean }>;
    fabrics: Set<string>;
    totalPorts: number;
    loggedInPorts: number;
    health: 'OK' | 'ERROR';
    notLoggedInCount: number;
}

const StorageMapping: React.FC<StorageMappingProps> = ({ data = [] }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterFabric, setFilterFabric] = useState<string>('all');
    const [filterHealth, setFilterHealth] = useState<string>('all');
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    const [showConnectivityModal, setShowConnectivityModal] = useState(false);
    const [selectedServerForFlow, setSelectedServerForFlow] = useState<string>('');

    // Extract server name from zone name
    // Example: wamrpgp1_2_gpibox01_pg01 → wamrpgp1
    const extractServerFromZone = (zone: string): string => {
        if (!zone) return 'Unknown';
        // Take everything before _\d+_ pattern
        const match = zone.match(/^([^_]+)(?:_\d+_|$)/);
        return match ? match[1] : zone.split('_')[0];
    };

    // Extract storage name from alias
    // Example: gpibox01_n1fc1 → gpibox01
    const extractStorageFromAlias = (alias: string): string => {
        if (!alias) return 'Unknown';
        // Take everything before _n\d or _\d pattern at the end
        const match = alias.match(/^([^_]+?)(?:_n\d|_\d|_[^_]*)?$/);
        return match ? match[1] : alias.split('_')[0];
    };

    // Process and group data by server
    const groupedMappings = useMemo(() => {
        const groups = new Map<string, GroupedMapping>();

        data.forEach(entry => {
            const wwn = entry['Member WWN / D,P'];

            // Filter only storage WWNs (starting with 5)
            if (wwn && wwn.startsWith('5')) {
                const server = extractServerFromZone(entry.Zone || '');
                const storage = extractStorageFromAlias(entry.Alias);
                const isLoggedIn = entry['Logged In']?.toLowerCase() === 'yes';
                const port = entry.Alias;

                if (!groups.has(server)) {
                    groups.set(server, {
                        server,
                        storages: new Set(),
                        zones: new Set(),
                        ports: new Set(),
                        portsLoggedInStatus: new Map(),
                        vendors: new Set(),
                        wwns: [],
                        fabrics: new Set(),
                        totalPorts: 0,
                        loggedInPorts: 0,
                        health: 'OK',
                        notLoggedInCount: 0
                    });
                }

                const group = groups.get(server)!;
                group.storages.add(storage);
                if (entry.Zone) group.zones.add(entry.Zone);

                // Track port and its login status
                if (port) {
                    group.ports.add(port);
                    // Update port status - if ANY entry for this port is logged in, mark it as logged in
                    const currentStatus = group.portsLoggedInStatus.get(port);
                    if (currentStatus === undefined || !currentStatus) {
                        group.portsLoggedInStatus.set(port, isLoggedIn);
                    }
                }

                if (entry.Vendor) group.vendors.add(entry.Vendor);
                group.wwns.push({ wwn, isLoggedIn });
                group.fabrics.add(entry.Fabric);

                // Track health status - if any path is not logged in, mark as ERROR
                if (!isLoggedIn) {
                    group.health = 'ERROR';
                    group.notLoggedInCount++;
                }
            }
        });

        // Calculate final port counts based on unique ports
        groups.forEach(group => {
            group.totalPorts = group.ports.size;
            group.loggedInPorts = Array.from(group.portsLoggedInStatus.values()).filter(status => status).length;
        });

        // Convert to array and sort by server name
        return Array.from(groups.values()).sort((a, b) =>
            a.server.localeCompare(b.server)
        );
    }, [data]);

    // Filter mappings based on search and fabric filter
    const filteredMappings = useMemo(() => {
        return groupedMappings.filter(mapping => {
            // Search filter
            const searchLower = searchTerm.toLowerCase();
            const matchesSearch = !searchTerm ||
                mapping.server.toLowerCase().includes(searchLower) ||
                Array.from(mapping.storages).some(s => s.toLowerCase().includes(searchLower)) ||
                Array.from(mapping.vendors).some(v => v.toLowerCase().includes(searchLower));

            // Fabric filter
            const matchesFabric = filterFabric === 'all' || mapping.fabrics.has(filterFabric);

            // Health filter
            const matchesHealth = filterHealth === 'all' ||
                (filterHealth === 'errors' && mapping.health === 'ERROR');

            return matchesSearch && matchesFabric && matchesHealth;
        });
    }, [groupedMappings, searchTerm, filterFabric, filterHealth]);

    // Get unique fabrics for filter
    const uniqueFabrics = useMemo(() => {
        const fabrics = new Set<string>();
        groupedMappings.forEach(m => {
            m.fabrics.forEach(f => fabrics.add(f));
        });
        return Array.from(fabrics).sort();
    }, [groupedMappings]);

    // Get statistics
    const stats = useMemo(() => {
        const totalServers = groupedMappings.length;
        const totalStorages = new Set<string>();
        const totalPaths = groupedMappings.reduce((sum, m) => sum + m.totalPorts, 0);
        const healthyServers = groupedMappings.filter(m => m.health === 'OK').length;
        const unhealthyServers = groupedMappings.filter(m => m.health === 'ERROR').length;

        groupedMappings.forEach(m => {
            m.storages.forEach(s => totalStorages.add(s));
        });

        return {
            totalServers,
            totalStorages: totalStorages.size,
            totalPaths,
            healthyServers,
            unhealthyServers
        };
    }, [groupedMappings]);

    // Export to CSV
    const handleExport = () => {
        const headers = ['Server', 'Path Status', 'Health', 'Storages', 'Zones', 'Ports', 'Vendors', 'Storage WWNs', 'Fabrics'];
        const rows = filteredMappings.map(m => [
            m.server,
            `${m.loggedInPorts}/${m.totalPorts}`,
            m.health,
            Array.from(m.storages).join(', '),
            Array.from(m.zones).join(', '),
            Array.from(m.ports).join(', '),
            Array.from(m.vendors).join(', '),
            m.wwns.map(w => w.wwn).join(', '),
            Array.from(m.fabrics).join(', ')
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        // Download
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `storage-mapping-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    // Handle Connectivity Flow button click
    const handleConnectivityFlow = () => {
        const serverName = prompt('Enter server name:');
        if (serverName) {
            const normalizedInput = serverName.trim().toLowerCase();
            const matchingServer = groupedMappings.find(
                m => m.server.toLowerCase() === normalizedInput
            );

            if (matchingServer) {
                setSelectedServerForFlow(matchingServer.server);
                setShowConnectivityModal(true);
            } else {
                alert(`Server "${serverName}" not found. Please check the server name and try again.`);
            }
        }
    };

    // Generate Mermaid diagram for server connectivity
    const generateConnectivityDiagram = (serverName: string): string => {
        const mapping = groupedMappings.find(m => m.server === serverName);
        if (!mapping) return '';

        let diagram = 'graph LR\n';
        diagram += `    Server["🖥️ ${serverName}"]:::server\n\n`;

        // Group WWNs by storage and fabric
        const storageConnections = new Map<string, Map<string, Array<{ wwn: string; isLoggedIn: boolean; port: string }>>>();

        data.forEach(entry => {
            const wwn = entry['Member WWN / D,P'];
            if (wwn && wwn.startsWith('5')) {
                const server = extractServerFromZone(entry.Zone || '');
                if (server === serverName) {
                    const storage = extractStorageFromAlias(entry.Alias);
                    const fabric = entry.Fabric;
                    const port = entry.Alias;
                    const isLoggedIn = entry['Logged In']?.toLowerCase() === 'yes';

                    if (!storageConnections.has(storage)) {
                        storageConnections.set(storage, new Map());
                    }
                    const fabricMap = storageConnections.get(storage)!;
                    if (!fabricMap.has(fabric)) {
                        fabricMap.set(fabric, []);
                    }
                    fabricMap.get(fabric)!.push({ wwn, isLoggedIn, port });
                }
            }
        });

        // Add storage nodes and connections
        let storageIdx = 0;
        storageConnections.forEach((fabricMap, storage) => {
            const storageId = `Storage${storageIdx}`;
            diagram += `    ${storageId}["💾 ${storage}"]:::storage\n`;

            fabricMap.forEach((wwns, fabric) => {
                const fabricId = `Fabric${storageIdx}_${fabric.replace(/[^a-zA-Z0-9]/g, '')}`;
                const loggedInCount = wwns.filter(w => w.isLoggedIn).length;
                const totalCount = wwns.length;
                const status = loggedInCount === totalCount ? '✓' : '✗';
                const pathInfo = `${fabric}: ${loggedInCount}/${totalCount} ${status}`;

                diagram += `    ${fabricId}["⚡ ${pathInfo}"]:::${loggedInCount === totalCount ? 'fabricOk' : 'fabricError'}\n`;
                diagram += `    Server --> ${fabricId}\n`;
                diagram += `    ${fabricId} --> ${storageId}\n`;
            });

            storageIdx++;
        });

        // Add styling
        diagram += '\n    classDef server fill:#dbeafe,stroke:#3b82f6,stroke-width:3px,color:#1e40af\n';
        diagram += '    classDef storage fill:#dcfce7,stroke:#16a34a,stroke-width:2px,color:#166534\n';
        diagram += '    classDef fabricOk fill:#d1fae5,stroke:#10b981,stroke-width:2px,color:#065f46\n';
        diagram += '    classDef fabricError fill:#fee2e2,stroke:#ef4444,stroke-width:2px,color:#991b1b\n';

        return diagram;
    };

    // Close modal
    const closeConnectivityModal = () => {
        setShowConnectivityModal(false);
        setSelectedServerForFlow('');
    };

    // Render mermaid diagram in modal
    React.useEffect(() => {
        if (showConnectivityModal && selectedServerForFlow) {
            const initMermaid = async () => {
                try {
                    const mermaid = (await import('mermaid')).default;
                    mermaid.initialize({
                        startOnLoad: true,
                        theme: 'default',
                        securityLevel: 'loose',
                        flowchart: {
                            useMaxWidth: true,
                            htmlLabels: true,
                            curve: 'basis'
                        }
                    });

                    const diagramCode = generateConnectivityDiagram(selectedServerForFlow);
                    const diagramId = `connectivity-${selectedServerForFlow}-${Date.now()}`;
                    const element = document.getElementById('connectivity-diagram-container');

                    if (element && diagramCode) {
                        element.innerHTML = `<div class="mermaid" id="${diagramId}">${diagramCode}</div>`;

                        setTimeout(async () => {
                            try {
                                await mermaid.run({ nodes: [document.getElementById(diagramId)!] });
                            } catch (error) {
                                console.error('Mermaid rendering error:', error);
                            }
                        }, 100);
                    }
                } catch (error) {
                    console.error('Failed to load Mermaid:', error);
                }
            };

            initMermaid();
        }
    }, [showConnectivityModal, selectedServerForFlow]);

    // Helper to toggle row expansion
    const toggleRowExpansion = (server: string) => {
        setExpandedRows(prev => {
            const newSet = new Set(prev);
            if (newSet.has(server)) {
                newSet.delete(server);
            } else {
                newSet.add(server);
            }
            return newSet;
        });
    };

    // Helper to render expandable list
    const renderExpandableList = (server: string, items: string[], limit: number = 1) => {
        const itemArray = Array.from(items);
        const isExpanded = expandedRows.has(server);

        if (itemArray.length <= limit) {
            return <span>{itemArray.join(', ')}</span>;
        }

        if (isExpanded) {
            return (
                <>
                    <span>{itemArray.join(', ')}</span>
                    <button
                        className="expand-button"
                        onClick={() => toggleRowExpansion(server)}
                    >
                        ▲ Show Less
                    </button>
                </>
            );
        }

        return (
            <>
                <span>{itemArray.slice(0, limit).join(', ')}</span>
                <button
                    className="expand-button"
                    onClick={() => toggleRowExpansion(server)}
                >
                    +{itemArray.length - limit} more
                </button>
            </>
        );
    };

    // Helper to render WWNs with color coding
    const renderWWNList = (server: string, wwns: Array<{ wwn: string; isLoggedIn: boolean }>, limit: number = 1) => {
        const isExpanded = expandedRows.has(server);
        const displayWWNs = isExpanded ? wwns : wwns.slice(0, limit);

        return (
            <>
                {displayWWNs.map((item, idx) => (
                    <span
                        key={idx}
                        className={item.isLoggedIn ? 'wwn-logged-in' : 'wwn-not-logged-in'}
                        style={{ marginRight: '4px' }}
                    >
                        {item.wwn}
                        {idx < displayWWNs.length - 1 && ', '}
                    </span>
                ))}
                {wwns.length > limit && (
                    <button
                        className="expand-button"
                        onClick={() => toggleRowExpansion(server)}
                    >
                        {isExpanded ? '▲ Show Less' : `+${wwns.length - limit} more`}
                    </button>
                )}
            </>
        );
    };

    if (data.length === 0) {
        return (
            <div className="storage-mapping">
                <div className="diagram-header">
                    <h2>Host to Storage Mapping</h2>
                    <p>Storage device connections and mappings per host</p>
                </div>
                <div className="no-data">
                    <p>Upload Excel file to view storage mappings</p>
                </div>
            </div>
        );
    }

    return (
        <div className="storage-mapping">
            <div className="diagram-header">
                <h2>Host to Storage Mapping</h2>
                <p>Storage device connections and mappings per host</p>

                {/* Statistics */}
                <div className="stats-summary">
                    <div className="stat-item">
                        <span className="stat-value">{stats.totalServers}</span>
                        <span className="stat-label">Servers</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-value">{stats.totalStorages}</span>
                        <span className="stat-label">Storage Devices</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-value">{stats.totalPaths}</span>
                        <span className="stat-label">Total Paths</span>
                    </div>
                    <div className="stat-item success">
                        <span className="stat-value">{stats.healthyServers}</span>
                        <span className="stat-label">Healthy</span>
                    </div>
                    <div className="stat-item error">
                        <span className="stat-value">{stats.unhealthyServers}</span>
                        <span className="stat-label">Unhealthy</span>
                    </div>
                </div>

                {/* Filters */}
                <div className="filters-container">
                    <div className="filter-group">
                        <input
                            type="text"
                            placeholder="Search server, storage, or vendor..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="search-input"
                        />
                    </div>
                    <div className="filter-group">
                        <select
                            value={filterFabric}
                            onChange={(e) => setFilterFabric(e.target.value)}
                            className="filter-select"
                        >
                            <option value="all">All Fabrics</option>
                            {uniqueFabrics.map(fabric => (
                                <option key={fabric} value={fabric}>{fabric}</option>
                            ))}
                        </select>
                    </div>
                    <div className="filter-group">
                        <select
                            value={filterHealth}
                            onChange={(e) => setFilterHealth(e.target.value)}
                            className="filter-select"
                        >
                            <option value="all">All Status</option>
                            <option value="errors">Errors Only</option>
                        </select>
                    </div>
                    <button onClick={handleExport} className="export-button">
                        📥 Export to CSV
                    </button>
                    <button onClick={handleConnectivityFlow} className="connectivity-button">
                        🔗 Connectivity Flow
                    </button>
                </div>
            </div>

            {/* Mappings Table */}
            <div className="mappings-container">
                {filteredMappings.length === 0 ? (
                    <div className="no-results">
                        <p>No mappings match your filters</p>
                    </div>
                ) : (
                    <div className="table-wrapper">
                        <table className="grouped-mappings-table">
                            <thead>
                                <tr>
                                    <th>Server</th>
                                    <th>Path Status</th>
                                    <th>Health</th>
                                    <th>Storages</th>
                                    <th>Zones</th>
                                    <th>Ports</th>
                                    <th>Vendors</th>
                                    <th>Storage WWNs</th>
                                    <th>Fabrics</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredMappings.map((mapping, idx) => (
                                    <tr key={idx} className={mapping.health === 'ERROR' ? 'row-error' : 'row-ok'}>
                                        <td className="server-cell">
                                            <strong>{mapping.server}</strong>
                                            <span className="connection-count">
                                                ({mapping.totalPorts} ports)
                                            </span>
                                        </td>
                                        <td className="path-status-cell">
                                            <span className={`path-status ${mapping.health === 'OK' ? 'path-ok' : 'path-error'}`}>
                                                {mapping.loggedInPorts}/{mapping.totalPorts}
                                            </span>
                                        </td>
                                        <td className="health-cell">
                                            <span className={`health-badge ${mapping.health === 'OK' ? 'health-ok' : 'health-error'}`}>
                                                {mapping.health === 'OK' ? '✓ OK' : `✗ ERROR (${mapping.notLoggedInCount} not logged in)`}
                                            </span>
                                        </td>
                                        <td className="list-cell">
                                            {renderExpandableList(mapping.server, Array.from(mapping.storages), 1)}
                                        </td>
                                        <td className="list-cell">
                                            {renderExpandableList(`${mapping.server}-zones`, Array.from(mapping.zones), 1)}
                                        </td>
                                        <td className="list-cell">
                                            {renderExpandableList(`${mapping.server}-ports`, Array.from(mapping.ports), 1)}
                                        </td>
                                        <td className="list-cell">
                                            {Array.from(mapping.vendors).join(', ')}
                                        </td>
                                        <td className="wwn-list-cell">
                                            {renderWWNList(`${mapping.server}-wwns`, mapping.wwns, 1)}
                                        </td>
                                        <td className="fabric-cell">
                                            {Array.from(mapping.fabrics).map(fabric => (
                                                <span key={fabric} className="fabric-badge">
                                                    {fabric}
                                                </span>
                                            ))}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Connectivity Flow Modal */}
            {showConnectivityModal && (
                <div className="modal-overlay" onClick={closeConnectivityModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>🔗 Connectivity Flow: {selectedServerForFlow}</h3>
                            <button className="modal-close" onClick={closeConnectivityModal}>✕</button>
                        </div>
                        <div className="modal-body">
                            <div id="connectivity-diagram-container" className="diagram-container"></div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StorageMapping;