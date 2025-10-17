import React, { useState } from 'react';
import HomePage from '../pages/HomePage';
import { TopologyDiagram, ValidationFlowchart, ConnectionMatrix, StorageMapping } from './diagrams';
import type { ValidationResult, FabricData } from '../types';
import './TabNavigation.css';

type TabType = 'validation' | 'topology' | 'flowchart' | 'matrix' | 'storage';

interface Tab {
    id: TabType;
    label: string;
    icon: string;
}

const tabs: Tab[] = [
    {
        id: 'validation',
        label: 'Validation',
        icon: '📊'
    },
    {
        id: 'topology',
        label: 'SAN Topology',
        icon: '🌐'
    },
    {
        id: 'flowchart',
        label: 'Validation Flow',
        icon: '📋'
    },
    {
        id: 'matrix',
        label: 'Connection Matrix',
        icon: '🔗'
    },
    {
        id: 'storage',
        label: 'Storage Mapping',
        icon: '💾'
    }
];

const TabNavigation: React.FC = () => {
    const [activeTab, setActiveTab] = useState<TabType>('validation');
    const [validationData, setValidationData] = useState<ValidationResult[] | null>(null);
    const [summaryData, setSummaryData] = useState<any>(null);
    const [rawFabricData, setRawFabricData] = useState<FabricData[] | null>(null);

    const handleDataUpdate = (results: ValidationResult[], summary: any, fabricData?: FabricData[]) => {
        setValidationData(results);
        setSummaryData(summary);
        if (fabricData) {
            setRawFabricData(fabricData);
        }
    };

    const handleDataReset = () => {
        setValidationData(null);
        setSummaryData(null);
        setRawFabricData(null);
    };

    const renderActiveComponent = () => {
        switch (activeTab) {
            case 'validation':
                return (
                    <HomePage
                        onDataUpdate={handleDataUpdate}
                        onDataReset={handleDataReset}
                        initialResults={validationData}
                        initialSummary={summaryData}
                    />
                );
            case 'topology':
                return <TopologyDiagram data={validationData || []} />;
            case 'flowchart':
                return <ValidationFlowchart data={validationData || []} />;
            case 'matrix':
                return <ConnectionMatrix data={validationData || []} />;
            case 'storage':
                return <StorageMapping data={rawFabricData || []} />;
            default:
                return <HomePage onDataUpdate={handleDataUpdate} onDataReset={handleDataReset} />;
        }
    };

    return (
        <div className="tab-navigation">
            <nav className="tab-nav">
                <div className="tab-nav-container">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            <span className="tab-icon">{tab.icon}</span>
                            <span className="tab-label">{tab.label}</span>
                            {tab.id !== 'validation' && (
                                (tab.id === 'storage' ? rawFabricData && rawFabricData.length > 0 : validationData && validationData.length > 0) && (
                                    <span className="data-indicator">●</span>
                                )
                            )}
                        </button>
                    ))}
                </div>
            </nav>

            <div className="tab-content">
                {renderActiveComponent()}
            </div>
        </div>
    );
};

export default TabNavigation;