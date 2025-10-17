import type { FabricData, ValidationResult, HostData, WWNInfo } from '../types';

export class FabricValidator {
    private data: FabricData[];
    private originalDataCount: number;
    private duplicatesRemoved: number;

    constructor(data: FabricData[]) {
        this.originalDataCount = data.length;
        this.data = this.removeDuplicates(data);
        this.duplicatesRemoved = this.originalDataCount - this.data.length;
    }

    /**
     * Remove duplicate entries based on Fabric, Alias, and Member WWN
     */
    private removeDuplicates(data: FabricData[]): FabricData[] {
        const seen = new Set<string>();
        const uniqueData: FabricData[] = [];

        data.forEach(entry => {
            // Create a unique key combining fabric, alias, and WWN
            const key = `${entry.Fabric}|${entry.Alias}|${entry['Member WWN / D,P']}`;

            if (!seen.has(key)) {
                seen.add(key);
                uniqueData.push(entry);
            }
        });

        return uniqueData;
    }    /**
     * Extract host name from alias by removing port suffix (everything after the last underscore)
     * Examples:
     * - easp6adm_1s → easp6adm
     * - aepdbgp1adm_0s → aepdbgp1adm
     * - ohgrodcvm218_1 → ohgrodcvm218
     * - MN01_1-1-A_FE_FC01_PG01 → MN01_1-1-A_FE_FC01
     */
    private extractHostName(alias: string): string {
        return alias.replace(/_[^_]*$/, '');
    }    /**
     * Group data by host name and fabric
     */
    private groupByHost(): Map<string, HostData & { wwns: WWNInfo[] }> {
        const hostMap = new Map<string, HostData & { wwns: WWNInfo[] }>();

        this.data.forEach(entry => {
            const hostName = this.extractHostName(entry.Alias);
            const isLoggedIn = entry['Logged In'].toLowerCase() === 'yes';
            const fabric = entry.Fabric;
            const wwn = entry['Member WWN / D,P'];

            if (!hostMap.has(hostName)) {
                hostMap.set(hostName, {
                    hostName,
                    fabA: { loggedIn: 0, notLoggedIn: 0 },
                    fabB: { loggedIn: 0, notLoggedIn: 0 },
                    wwns: []
                });
            }

            const hostData = hostMap.get(hostName)!;

            // Add WWN with login status if not already present
            const existingWWN = hostData.wwns.find(w => w.wwn === wwn && w.fabric === fabric);
            if (!existingWWN) {
                hostData.wwns.push({
                    wwn,
                    isLoggedIn,
                    fabric
                });
            }

            if (fabric === 'FAB-A') {
                if (isLoggedIn) {
                    hostData.fabA.loggedIn++;
                } else {
                    hostData.fabA.notLoggedIn++;
                }
            } else if (fabric === 'FAB-B') {
                if (isLoggedIn) {
                    hostData.fabB.loggedIn++;
                } else {
                    hostData.fabB.notLoggedIn++;
                }
            }
        });

        return hostMap;
    }

    /**
     * Validate fabric configuration for a host
     * Valid configurations:
     * 1. 2 logged in + 2 not logged in (AIX)
     * 2. 1 logged in (ESXi/RHEL)
     */
    private validateFabric(loggedIn: number, notLoggedIn: number): 'OK' | 'Error' {
        // Valid configurations
        if ((loggedIn === 2 && notLoggedIn === 2) || // AIX configuration
            (loggedIn === 1 && notLoggedIn === 0)) { // ESXi/RHEL configuration
            return 'OK';
        }

        return 'Error';
    }

    /**
     * Determine final validation status
     */
    private getFinalValidation(validationA: 'OK' | 'Error', validationB: 'OK' | 'Error'): ValidationResult['finalValidation'] {
        if (validationA === 'OK' && validationB === 'OK') {
            return 'Good';
        } else if (validationA === 'Error' && validationB === 'Error') {
            return 'Both FABs Are BAD';
        } else if (validationA === 'Error') {
            return 'FAB-A Is BAD';
        } else {
            return 'FAB-B Is BAD';
        }
    }

    /**
     * Perform validation and return results
     */
    public validate(): ValidationResult[] {
        const hostMap = this.groupByHost();
        const results: ValidationResult[] = [];

        hostMap.forEach((hostData, hostName) => {
            const validationA = this.validateFabric(hostData.fabA.loggedIn, hostData.fabA.notLoggedIn);
            const validationB = this.validateFabric(hostData.fabB.loggedIn, hostData.fabB.notLoggedIn);
            const finalValidation = this.getFinalValidation(validationA, validationB);

            results.push({
                host: hostName,
                wwns: hostData.wwns,
                fabA_LoggedInYes: hostData.fabA.loggedIn,
                fabA_LoggedInNo: hostData.fabA.notLoggedIn,
                validationA,
                fabB_LoggedInYes: hostData.fabB.loggedIn,
                fabB_LoggedInNo: hostData.fabB.notLoggedIn,
                validationB,
                finalValidation
            });
        });

        // Sort by host name
        return results.sort((a, b) => a.host.localeCompare(b.host));
    }

    /**
     * Get summary statistics
     */
    public getSummary(results: ValidationResult[]) {
        const total = results.length;
        const good = results.filter(r => r.finalValidation === 'Good').length;
        const fabABad = results.filter(r => r.finalValidation === 'FAB-A Is BAD').length;
        const fabBBad = results.filter(r => r.finalValidation === 'FAB-B Is BAD').length;
        const bothBad = results.filter(r => r.finalValidation === 'Both FABs Are BAD').length;

        return {
            total,
            good,
            fabABad,
            fabBBad,
            bothBad,
            percentageGood: total > 0 ? Math.round((good / total) * 100) : 0,
            originalEntries: this.originalDataCount,
            duplicatesRemoved: this.duplicatesRemoved,
            uniqueEntries: this.data.length
        };
    }

    /**
     * Get duplicate removal statistics
     */
    public getDuplicateInfo() {
        return {
            originalEntries: this.originalDataCount,
            duplicatesRemoved: this.duplicatesRemoved,
            uniqueEntries: this.data.length
        };
    }
}