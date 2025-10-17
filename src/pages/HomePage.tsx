import { useState, useEffect } from 'react';
import './HomePage.css';
import FileUpload from '../components/FileUpload';
import ValidationResults from '../components/ValidationResults';
import { ExcelUtils } from '../utils/excelUtils';
import { FabricValidator } from '../utils/fabricValidator';
import type { FabricData, ValidationResult } from '../types';

interface HomePageProps {
    onDataUpdate?: (results: ValidationResult[], summary: any, fabricData?: FabricData[]) => void;
    onDataReset?: () => void;
    initialResults?: ValidationResult[] | null;
    initialSummary?: any;
}

const HomePage = ({
    onDataUpdate,
    onDataReset,
    initialResults = null,
    initialSummary = null
}: HomePageProps) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string>('');
    const [results, setResults] = useState<ValidationResult[] | null>(initialResults);
    const [summary, setSummary] = useState<any>(initialSummary);

    // Update local state when initial props change
    useEffect(() => {
        setResults(initialResults);
        setSummary(initialSummary);
    }, [initialResults, initialSummary]);

    const handleFileUpload = async (file: File) => {
        setIsLoading(true);
        setError('');
        setResults(null);
        setSummary(null);

        try {
            // Read and parse Excel file
            const fabricData: FabricData[] = await ExcelUtils.readExcelFile(file);

            // Validate file structure
            const validation = ExcelUtils.validateExcelStructure(fabricData);
            if (!validation.isValid) {
                throw new Error(validation.errors.join(', '));
            }

            // Perform fabric validation
            const validator = new FabricValidator(fabricData);
            const validationResults = validator.validate();
            const summaryData = validator.getSummary(validationResults);

            setResults(validationResults);
            setSummary(summaryData);

            // Notify parent component of data update (including raw fabric data)
            if (onDataUpdate) {
                onDataUpdate(validationResults, summaryData, fabricData);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    const handleReset = () => {
        setResults(null);
        setSummary(null);
        setError('');

        // Notify parent component of data reset
        if (onDataReset) {
            onDataReset();
        }
    };

    return (
        <div className="home-page">
            {/* Main content area */}
            <main className="home-main">
                <div className="home-container">
                    {/* Main content */}
                    {!results ? (
                        <FileUpload
                            onFileUpload={handleFileUpload}
                            isLoading={isLoading}
                            error={error}
                        />
                    ) : (
                        <ValidationResults
                            results={results}
                            summary={summary}
                            onReset={handleReset}
                        />
                    )}
                </div>
            </main>
        </div>
    );
};

export default HomePage;