import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import type { ValidationResult } from '../../types';
import './TopologyDiagram.css';

interface TopologyDiagramProps {
    data?: ValidationResult[];
}

const TopologyDiagram: React.FC<TopologyDiagramProps> = ({ data = [] }) => {
    const diagramRef = useRef<HTMLDivElement>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [diagramId] = useState(() => `topology-diagram-${Date.now()}`);

    useEffect(() => {
        // Initialize Mermaid only once
        mermaid.initialize({
            startOnLoad: false,
            theme: 'neutral',
            flowchart: {
                useMaxWidth: true,
                htmlLabels: true,
                curve: 'basis'
            },
            securityLevel: 'loose'
        });
    }, []);

    useEffect(() => {
        if (data.length > 0) {
            // Small delay to ensure the component is fully mounted
            const timer = setTimeout(() => {
                generateTopologyDiagram();
            }, 100);

            return () => clearTimeout(timer);
        } else {
            // Clear diagram when no data
            if (diagramRef.current) {
                diagramRef.current.innerHTML = '';
            }
        }
    }, [data, diagramId]);

    const generateTopologyDiagram = async () => {
        if (!diagramRef.current) return;

        setIsLoading(true);

        try {
            // Generate Mermaid diagram syntax for SAN topology
            const mermaidSyntax = generateMermaidSyntax(data);

            // Clear previous diagram
            diagramRef.current.innerHTML = '';

            // Create a unique ID for this render
            const uniqueId = `${diagramId}-${Date.now()}`;

            // Generate new diagram with unique ID
            const { svg } = await mermaid.render(uniqueId, mermaidSyntax);

            // Only set innerHTML if the component is still mounted and ref exists
            if (diagramRef.current) {
                diagramRef.current.innerHTML = svg;
            }
        } catch (error) {
            console.error('Error generating topology diagram:', error);
            if (diagramRef.current) {
                diagramRef.current.innerHTML = '<p class="error">Error generating topology diagram</p>';
            }
        } finally {
            setIsLoading(false);
        }
    };

    const generateMermaidSyntax = (results: ValidationResult[]): string => {
        const fabrics = new Set<string>();
        const servers = new Set<string>();

        // Extract unique fabrics and servers
        results.forEach(result => {
            result.wwns.forEach(wwn => {
                if (wwn.fabric) fabrics.add(wwn.fabric);
            });
            servers.add(result.host);
        });

        // Fallback for empty data
        if (fabrics.size === 0 || servers.size === 0) {
            return `
graph TB
    NoData[No Fabric Data Available]
    classDef nodata fill:#f3f4f6,stroke:#d1d5db,color:#6b7280
    class NoData nodata
            `;
        }

        let syntax = 'graph TB\n';

        // Add fabric nodes
        Array.from(fabrics).forEach(fabric => {
            const cleanFabric = fabric.replace(/[^a-zA-Z0-9]/g, '');
            syntax += `    ${cleanFabric}[${fabric} Fabric]\n`;
            syntax += `    ${cleanFabric} --> SW_${cleanFabric}[Switch ${fabric}]\n`;
        });

        // Add server connections (simplified for large datasets)
        const serverArray = Array.from(servers);
        const maxServersToShow = Math.min(serverArray.length, 15); // Reduced for better readability

        for (let i = 0; i < maxServersToShow; i++) {
            const server = serverArray[i];
            const serverResult = results.find(r => r.host === server);

            if (serverResult) {
                const serverFabrics = new Set(serverResult.wwns.map(w => w.fabric).filter(Boolean));
                const cleanServer = server.replace(/[^a-zA-Z0-9]/g, '_');
                syntax += `    ${cleanServer}[${server}]\n`;

                Array.from(serverFabrics).forEach(fabric => {
                    const cleanFabric = fabric.replace(/[^a-zA-Z0-9]/g, '');
                    const loggedInWwns = serverResult.wwns.filter(w => w.fabric === fabric && w.isLoggedIn);
                    syntax += `    SW_${cleanFabric} --> ${cleanServer}\n`;

                    // Add connection status
                    if (loggedInWwns.length > 0) {
                        syntax += `    ${cleanServer} -.-> ${cleanServer}_OK[Connected]\n`;
                    } else {
                        syntax += `    ${cleanServer} -.-> ${cleanServer}_ERR[Disconnected]\n`;
                    }
                });
            }
        }

        if (serverArray.length > maxServersToShow) {
            syntax += `    MORE[... ${serverArray.length - maxServersToShow} more servers]\n`;
        }

        // Add styling
        syntax += '\n    classDef fabric fill:#e1f5fe\n';
        syntax += '    classDef switch fill:#f3e5f5\n';
        syntax += '    classDef server fill:#e8f5e8\n';
        syntax += '    classDef connected fill:#4ade80\n';
        syntax += '    classDef disconnected fill:#ef4444\n';

        return syntax;
    };

    return (
        <div className="topology-diagram">
            <div className="diagram-header">
                <h2>SAN Fabric Topology</h2>
                <p>Network topology showing fabric connections and server status</p>
                {data.length > 20 && (
                    <div className="info-banner">
                        <span>📊 Showing simplified view for {data.length} servers</span>
                    </div>
                )}
            </div>

            {data.length === 0 ? (
                <div className="no-data">
                    <p>Upload Excel file to generate topology diagram</p>
                </div>
            ) : (
                <div className="diagram-container">
                    {isLoading && (
                        <div className="loading-overlay">
                            <p>Generating topology diagram...</p>
                        </div>
                    )}
                    <div ref={diagramRef} className="mermaid-diagram" />
                </div>
            )}
        </div>
    );
};

export default TopologyDiagram;