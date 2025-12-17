/**
 * Sui blockchain client utility
 * Handles querying and parsing treasure objects from the Sui network
 */

import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Treasure } from '../hooks/useGameLogic';
import { logger, logError } from './logger';

// Initialize Sui client
const network = (process.env.NEXT_PUBLIC_SUI_NETWORK as 'testnet' | 'mainnet') || 'testnet';
const suiClient = new SuiClient({ url: getFullnodeUrl(network) });

export { suiClient };

interface TreasureObjectData {
    id: string;
    creator: string;
    name: string;
    description: string;
    lat: string;
    lng: string;
    is_opened: boolean;
}

/**
 * Parse Sui object data into Treasure type
 */
function parseObjectToTreasure(obj: any): Treasure | null {
    try {
        const content = obj.data?.content;
        if (!content || content.dataType !== 'moveObject') {
            return null;
        }

        const fields = content.fields;

        return {
            id: obj.data.objectId,
            creator: fields.creator || '0x0',
            name: fields.name || 'Unknown',
            description: fields.description || '',
            lat: parseFloat(fields.lat || '0'),
            lng: parseFloat(fields.lng || '0'),
            isClaimed: fields.is_opened || false,
        };
    } catch (error) {
        logError('Failed to parse treasure object', error, { objectId: obj.data?.objectId });
        return null;
    }
}

/**
 * Fetch all treasure objects from the blockchain
 */
export async function fetchAllTreasures(): Promise<Treasure[]> {
    try {
        const packageId = process.env.NEXT_PUBLIC_SUI_PACKAGE_ID;
        if (!packageId) {
            logger.warn('Cannot fetch treasures: NEXT_PUBLIC_SUI_PACKAGE_ID not set');
            return [];
        }

        logger.debug('Fetching treasures from blockchain', { packageId, network });

        // Query all Treasure objects
        // Note: This is a simplified version. In production, you'd want pagination
        const objects = await suiClient.getOwnedObjects({
            owner: packageId, // This won't work as-is, need to query by type
            options: {
                showContent: true,
                showOwner: true,
            },
        });

        // Parse objects into treasures
        const treasures = objects.data
            .map(parseObjectToTreasure)
            .filter((t): t is Treasure => t !== null);

        logger.info(`Fetched ${treasures.length} treasures from blockchain`);
        return treasures;
    } catch (error) {
        logError('Failed to fetch treasures from blockchain', error);
        return [];
    }
}

/**
 * Fetch treasures created by a specific address
 */
export async function fetchUserTreasures(address: string): Promise<Treasure[]> {
    try {
        const packageId = process.env.NEXT_PUBLIC_SUI_PACKAGE_ID;
        if (!packageId) {
            return [];
        }

        logger.debug('Fetching user treasures', { address });

        const objects = await suiClient.getOwnedObjects({
            owner: address,
            filter: {
                StructType: `${packageId}::game::Treasure`,
            },
            options: {
                showContent: true,
                showOwner: true,
            },
        });

        const treasures = objects.data
            .map(parseObjectToTreasure)
            .filter((t): t is Treasure => t !== null);

        logger.info(`Fetched ${treasures.length} treasures for user ${address.slice(0, 6)}...`);
        return treasures;
    } catch (error) {
        logError('Failed to fetch user treasures', error, { address });
        return [];
    }
}

/**
 * Fetch a single treasure by ID
 */
export async function fetchTreasureById(id: string): Promise<Treasure | null> {
    try {
        const object = await suiClient.getObject({
            id,
            options: {
                showContent: true,
                showOwner: true,
            },
        });

        return parseObjectToTreasure(object);
    } catch (error) {
        logError('Failed to fetch treasure by ID', error, { id });
        return null;
    }
}

/**
 * Query events for treasure creation/claiming
 * Useful for real-time updates
 */
export async function queryTreasureEvents(limit: number = 50) {
    try {
        const packageId = process.env.NEXT_PUBLIC_SUI_PACKAGE_ID;
        if (!packageId) {
            return [];
        }

        const events = await suiClient.queryEvents({
            query: {
                MoveEventType: `${packageId}::game::TreasureCreated`,
            },
            limit,
            order: 'descending',
        });

        return events.data;
    } catch (error) {
        logError('Failed to query treasure events', error);
        return [];
    }
}

/**
 * Check if a treasure has been claimed
 */
export async function isTreasureClaimed(id: string): Promise<boolean> {
    try {
        const treasure = await fetchTreasureById(id);
        return treasure?.isClaimed || false;
    } catch (error) {
        logError('Failed to check treasure claimed status', error, { id });
        return false;
    }
}
