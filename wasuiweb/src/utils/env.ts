/**
 * Environment validation utility
 * Validates required environment variables on app startup
 */

interface EnvValidationResult {
    isValid: boolean;
    missing: string[];
    warnings: string[];
}

const REQUIRED_ENV_VARS = [
    'NEXT_PUBLIC_MAPBOX_TOKEN',
    'NEXT_PUBLIC_SUI_PACKAGE_ID',
] as const;

const OPTIONAL_ENV_VARS = [
    'NEXT_PUBLIC_GA_ID',
    'NEXT_PUBLIC_SENTRY_DSN',
] as const;

export function validateEnvironment(): EnvValidationResult {
    const missing: string[] = [];
    const warnings: string[] = [];

    // Check required variables
    for (const varName of REQUIRED_ENV_VARS) {
        const value = process.env[varName];

        if (!value) {
            missing.push(varName);
        } else if (value.includes('your_') || value.includes('...')) {
            warnings.push(`${varName} appears to be a placeholder value`);
        }
    }

    // Check Mapbox token format
    const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (mapboxToken && !mapboxToken.startsWith('pk.')) {
        warnings.push('NEXT_PUBLIC_MAPBOX_TOKEN should start with "pk."');
    }

    // Check Sui package ID format
    const packageId = process.env.NEXT_PUBLIC_SUI_PACKAGE_ID;
    if (packageId && !packageId.startsWith('0x')) {
        warnings.push('NEXT_PUBLIC_SUI_PACKAGE_ID should start with "0x"');
    }

    return {
        isValid: missing.length === 0,
        missing,
        warnings,
    };
}

export function getEnvVar(name: string, fallback?: string): string {
    const value = process.env[name];
    if (!value && !fallback) {
        throw new Error(`Environment variable ${name} is required but not set`);
    }
    return value || fallback || '';
}

export function logEnvironmentStatus(): void {
    const result = validateEnvironment();

    if (result.isValid) {
        console.log('✅ Environment validation passed');
        if (result.warnings.length > 0) {
            console.warn('⚠️ Environment warnings:', result.warnings);
        }
    } else {
        console.error('❌ Environment validation failed');
        console.error('Missing required variables:', result.missing);
        if (result.warnings.length > 0) {
            console.warn('Additional warnings:', result.warnings);
        }
    }
}
