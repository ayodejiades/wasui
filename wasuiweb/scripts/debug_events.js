
const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');

const PACKAGE_ID = '0x677f2135b774815116b6ffeb373abe331c2bd33ddbe823284fcfeb641e40143b';
const NETWORK = 'testnet';

async function main() {
    console.log(`Debug: Connecting to ${NETWORK}...`);
    const client = new SuiClient({ url: getFullnodeUrl(NETWORK) });

    try {
        const txs = await client.queryTransactionBlocks({
            filter: {
                MoveFunction: {
                    package: PACKAGE_ID,
                    module: 'game',
                    function: 'create_treasure'
                }
            },
            options: {
                showObjectChanges: true,
            },
            limit: 1,
            order: 'descending'
        });

        if (txs.data.length > 0) {
            const tx = txs.data[0];
            console.log('--- Object Changes ---');
            console.log(JSON.stringify(tx.objectChanges, null, 2));
        } else {
            console.log('No transactions found.');
        }

    } catch (err) {
        console.error('Error:', err);
    }
}

main();
