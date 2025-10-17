export interface FabricData {
    Fabric: string;
    'Zone Configuration'?: string;
    'Zone Configuration Status': string;
    'Zone'?: string;
    'Zone Type'?: string;
    Alias: string;
    'Alias Type': string;
    'Member WWN / D,P': string;
    'Peer Zone Member Type'?: string;
    'Port Role'?: string;
    'Logged In': string;
    Vendor: string;
    'Slot/Port #'?: string;
}

export interface StorageMapping {
    host: string;
    storageWWN: string;
    fabric: string;
    zone?: string;
    zoneConfiguration?: string;
    loggedIn: boolean;
    vendor: string;
    portRole?: string;
    slotPort?: string;
}

export interface WWNInfo {
    wwn: string;
    isLoggedIn: boolean;
    fabric: string;
}

export interface ValidationResult {
    host: string;
    wwns: WWNInfo[]; // Updated to include login status and fabric info
    fabA_LoggedInYes: number;
    fabA_LoggedInNo: number;
    validationA: 'OK' | 'Error';
    fabB_LoggedInYes: number;
    fabB_LoggedInNo: number;
    validationB: 'OK' | 'Error';
    finalValidation: 'Good' | 'FAB-A Is BAD' | 'FAB-B Is BAD' | 'Both FABs Are BAD';
}

export interface HostData {
    hostName: string;
    fabA: {
        loggedIn: number;
        notLoggedIn: number;
    };
    fabB: {
        loggedIn: number;
        notLoggedIn: number;
    };
}