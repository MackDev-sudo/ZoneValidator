import React, { useState, useRef } from 'react';
import './FileUpload.css';

interface FileUploadProps {
    onFileUpload: (file: File) => void;
    isLoading: boolean;
    error?: string;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileUpload, isLoading, error }) => {
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
        }
    };

    const handleFile = (file: File) => {
        if (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
            file.type === 'application/vnd.ms-excel' ||
            file.name.endsWith('.xlsx') ||
            file.name.endsWith('.xls')) {
            onFileUpload(file);
        } else {
            alert('Please upload a valid Excel file (.xlsx or .xls)');
        }
    };

    const onButtonClick = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className="file-upload-container">
            <div
                className={`file-upload-area ${dragActive ? 'drag-active' : ''}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={onButtonClick}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    className="file-input"
                    accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                    onChange={handleChange}
                />

                <div className="file-upload-content">
                    {isLoading ? (
                        <div className="loading">
                            <div className="spinner"></div>
                            <p>Processing Excel file...</p>
                        </div>
                    ) : (
                        <>
                            <div className="upload-icon">📁</div>
                            <h3>Upload SAN Fabric Data</h3>
                            <p>
                                Drag and drop your Excel file here, or <span className="click-text">click to browse</span>
                            </p>
                            <small>Supported formats: .xlsx, .xls</small>
                        </>
                    )}
                </div>
            </div>

            {error && (
                <div className="error-message">
                    <span className="error-icon">⚠️</span>
                    {error}
                </div>
            )}

            <div className="upload-info">
                <h4>Expected Excel Format:</h4>
                <div className="format-info">
                    <strong>Required Columns:</strong>
                    <ul>
                        <li><code>Fabric</code> - FAB-A or FAB-B</li>
                        <li><code>Zone Configuration Status</code> - Effective</li>
                        <li><code>Alias</code> - Server name with port (e.g., pv109960_01)</li>
                        <li><code>Alias Type</code> - WWN</li>
                        <li><code>Member WWN / D,P</code> - WWN address</li>
                        <li><code>Logged In</code> - Yes or No</li>
                        <li><code>Vendor</code> - Vendor name</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default FileUpload;