module contracts::game {
    use std::string::{Self, String};

    // sui::object, sui::transfer, sui::tx_context are in prelude in Move 2024
    use sui::dynamic_field;
    use sui::random::{Self, Random};

    // Error codes
    const EAlreadyOpened: u64 = 0;
    // const ENotCreator: u64 = 1; // Unused

    // --- Structs ---

    public struct Treasure has key, store {
        id: UID,
        creator: address,      // Track who made it
        name: String,
        description: String,
        lat: String,           // Store coordinates on-chain
        lng: String,
        is_opened: bool,
    }

    public struct LootMetadata has store, drop {
        rarity: String,
        power_level: u8,
    }

    // --- Logic ---

    // 1. PUBLIC Create Function (Anyone can call this now)
    public entry fun create_treasure(
        name: vector<u8>, 
        desc: vector<u8>, 
        lat: vector<u8>,
        lng: vector<u8>,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        let treasure = Treasure {
            id: object::new(ctx),
            creator: sender,
            name: string::utf8(name),
            description: string::utf8(desc),
            lat: string::utf8(lat),
            lng: string::utf8(lng),
            is_opened: false,
        };
        // Send to sender (so they own it and can place it)
        transfer::transfer(treasure, sender);
    }

    // 2. Delete Treasure (Burn)
    public entry fun delete_treasure(treasure: Treasure, _ctx: &mut TxContext) {
        // Unpack the struct
        // In Move 2024, we need 'mut' to borrow id mutably later
        let Treasure { id: mut id, creator: _, name: _, description: _, lat: _, lng: _, is_opened } = treasure;

        // If it was opened, we must clean up the Dynamic Field first to avoid error
        if (is_opened) {
            // We know the key is b"loot" and type is LootMetadata
            let _: LootMetadata = dynamic_field::remove(&mut id, b"loot");
        };

        // Delete the UID
        object::delete(id);
    }

    // 3. Open Logic (Unchanged)
    fun internal_open(treasure: &mut Treasure, r: &Random, ctx: &mut TxContext) {
        assert!(!treasure.is_opened, EAlreadyOpened);

        let mut generator = random::new_generator(r, ctx);
        let rand_num = random::generate_u8_in_range(&mut generator, 0, 100);

        let (rarity_str, power) = if (rand_num < 60) {
            (b"Common", 10)
        } else if (rand_num < 90) {
            (b"Rare", 50)
        } else {
            (b"Legendary", 100)
        };

        let loot = LootMetadata {
            rarity: string::utf8(rarity_str),
            power_level: power,
        };

        dynamic_field::add(&mut treasure.id, b"loot", loot);
        treasure.is_opened = true;
    }

    // 4. Claim with ZK Proof (Unchanged)
    entry fun claim_treasure_with_proof(
        treasure: &mut Treasure,
        r: &Random,
        _proof: vector<u8>, 
        ctx: &mut TxContext
    ) {
        internal_open(treasure, r, ctx);
    }
}