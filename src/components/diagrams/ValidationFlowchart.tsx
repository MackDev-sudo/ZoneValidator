import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import type { ValidationResult } from '../../types';
import './ValidationFlowchart.css';

interface ValidationFlowchartProps {
    data?: ValidationResult[];
}

const ValidationFlowchart: React.FC<ValidationFlowchartProps> = ({ data = [] }) => {
    const diagramRef = useRef<HTMLDivElement>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [diagramId] = useState(() => `flowchart-diagram-${Date.now()}`);

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
        // Small delay to ensure the component is fully mounted
        const timer = setTimeout(() => {
            generateFlowchartDiagram();
        }, 100);

        return () => clearTimeout(timer);
    }, [data, diagramId]);

    const generateFlowchartDiagram = async () => {
        if (!diagramRef.current) return;

        setIsLoading(true);

        try {
            // Generate Mermaid flowchart syntax
            const mermaidSyntax = generateMermaidSyntax();

            // Clear previous diagram
            diagramRef.current.innerHTML = '';

            // Create a unique ID for this render
            const uniqueId = `${diagramId}-${Date.now()}`;

            // Generate new diagram
            const { svg } = await mermaid.render(uniqueId, mermaidSyntax);

            // Only set innerHTML if the component is still mounted and ref exists
            if (diagramRef.current) {
                diagramRef.current.innerHTML = svg;
            }
        } catch (error) {
            console.error('Error generating flowchart diagram:', error);
            if (diagramRef.current) {
                diagramRef.current.innerHTML = '<p class="error">Error generating flowchart diagram</p>';
            }
        } finally {
            setIsLoading(false);
        }
    }; const generateMermaidSyntax = (): string => {
        return `
flowchart TD
    Start([Start Validation]) --> Upload[Upload Excel File]
    Upload --> Parse[Parse Fabric Data]
    Parse --> Validate{Validate Structure?}
    
    Validate -->|Invalid| Error1[Show Error Message]
    Error1 --> End1([End])
    
    Validate -->|Valid| CheckServer{Identify Server Type}
    
    CheckServer -->|AIX| AIXCheck[AIX Validation Rules]
    CheckServer -->|ESXi| ESXiCheck[ESXi Validation Rules]
    CheckServer -->|RHEL| RHELCheck[RHEL Validation Rules]
    CheckServer -->|Other| OtherCheck[Default Validation Rules]
    
    AIXCheck --> AIXRules{2 Logged In + 2 Not Logged In per Fabric?}
    ESXiCheck --> ESXiRules{1 Logged In per Fabric?}
    RHELCheck --> RHELRules{1 Logged In per Fabric?}
    OtherCheck --> OtherRules{Check Login Status}
    
    AIXRules -->|Pass| Pass1[✓ Validation Passed]
    AIXRules -->|Fail| Fail1[✗ Validation Failed]
    
    ESXiRules -->|Pass| Pass2[✓ Validation Passed]
    ESXiRules -->|Fail| Fail2[✗ Validation Failed]
    
    RHELRules -->|Pass| Pass3[✓ Validation Passed]
    RHELRules -->|Fail| Fail3[✗ Validation Failed]
    
    OtherRules -->|Pass| Pass4[✓ Validation Passed]
    OtherRules -->|Fail| Fail4[✗ Validation Failed]
    
    Pass1 --> Report[Generate Report]
    Pass2 --> Report
    Pass3 --> Report
    Pass4 --> Report
    
    Fail1 --> Report
    Fail2 --> Report
    Fail3 --> Report
    Fail4 --> Report
    
    Report --> Export{Export Results?}
    Export -->|Yes| ExportFile[Download Excel Report]
    Export -->|No| Display[Display Results]
    
    ExportFile --> End2([End])
    Display --> End2
    
    classDef startEnd fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef process fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef decision fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef success fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px
    classDef error fill:#ffebee,stroke:#c62828,stroke-width:2px
    
    class Start,End1,End2 startEnd
    class Upload,Parse,Report,ExportFile,Display process
    class Validate,CheckServer,AIXRules,ESXiRules,RHELRules,OtherRules,Export decision
    class Pass1,Pass2,Pass3,Pass4 success
    class Error1,Fail1,Fail2,Fail3,Fail4 error
    class AIXCheck,ESXiCheck,RHELCheck,OtherCheck process
    `;
    };

    const getValidationStats = () => {
        if (data.length === 0) return null;

        const passed = data.filter(r => r.finalValidation === 'Good').length;
        const failed = data.filter(r => r.finalValidation !== 'Good').length;
        const fabABad = data.filter(r => r.finalValidation === 'FAB-A Is BAD').length;
        const fabBBad = data.filter(r => r.finalValidation === 'FAB-B Is BAD').length;
        const bothBad = data.filter(r => r.finalValidation === 'Both FABs Are BAD').length;

        return { passed, failed, fabABad, fabBBad, bothBad, total: data.length };
    };

    const stats = getValidationStats();

    return (
        <div className="validation-flowchart">
            <div className="diagram-header">
                <h2>Validation Status Flowchart</h2>
                <p>Decision tree showing validation logic and rules</p>

                {stats && (
                    <div className="stats-summary">
                        <div className="stat-item success">
                            <span className="stat-value">{stats.passed}</span>
                            <span className="stat-label">Good</span>
                        </div>
                        <div className="stat-item error">
                            <span className="stat-value">{stats.failed}</span>
                            <span className="stat-label">Failed</span>
                        </div>
                        <div className="stat-item warning">
                            <span className="stat-value">{stats.fabABad}</span>
                            <span className="stat-label">FAB-A Bad</span>
                        </div>
                        <div className="stat-item warning">
                            <span className="stat-value">{stats.fabBBad}</span>
                            <span className="stat-label">FAB-B Bad</span>
                        </div>
                        <div className="stat-item total">
                            <span className="stat-value">{stats.total}</span>
                            <span className="stat-label">Total</span>
                        </div>
                    </div>
                )}
            </div>

            <div className="diagram-container">
                {isLoading && (
                    <div className="loading-overlay">
                        <p>Generating validation flowchart...</p>
                    </div>
                )}
                <div ref={diagramRef} className="mermaid-diagram" />
            </div>
        </div>
    );
};

export default ValidationFlowchart;