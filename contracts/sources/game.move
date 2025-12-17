#[allow(lint(self_transfer))]
module contracts::game {
    use std::string::{Self, String};

    // sui::object, sui::transfer, sui::tx_context are in prelude in Move 2024
    use sui::dynamic_field;
    use sui::random::{Self, Random};
    use sui::balance::{Self, Balance};
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;

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
        reward: Balance<SUI>,  // NEW: Store SUI reward
    }

    public struct LootMetadata has store, drop {
        rarity: String,
        power_level: u8,
    }

    // --- Logic ---

    // 1. PUBLIC Create Function (Now accepts payment)
    public entry fun create_treasure(
        name: vector<u8>, 
        desc: vector<u8>, 
        lat: vector<u8>,
        lng: vector<u8>,
        payment: Coin<SUI>, // NEW: Payment argument
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
            reward: coin::into_balance(payment), // Store payment
        };
        // Send to sender (so they own it and can place it)
        transfer::transfer(treasure, sender);
    }

    // 2. Delete Treasure (Burn & Refund)
    public entry fun delete_treasure(treasure: Treasure, ctx: &mut TxContext) {
        // Unpack the struct
        let Treasure { id: mut id, creator: _, name: _, description: _, lat: _, lng: _, is_opened, reward } = treasure;

        // Refund any reward to the destroyer (usually creator)
        let val = balance::value(&reward);
        if (val > 0) {
            let coin = coin::from_balance(reward, ctx);
            transfer::public_transfer(coin, tx_context::sender(ctx));
        } else {
            balance::destroy_zero(reward);
        };

        // If it was opened, we must clean up the Dynamic Field first to avoid error
        if (is_opened) {
            // We know the key is b"loot" and type is LootMetadata
            let _: LootMetadata = dynamic_field::remove(&mut id, b"loot");
        };

        // Delete the UID
        object::delete(id);
    }

    // 3. Open Logic (Payout Reward)
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

        // NEW: Payout Reward
        let reward_val = balance::value(&treasure.reward);
        if (reward_val > 0) {
            let payout = balance::split(&mut treasure.reward, reward_val);
            let coin = coin::from_balance(payout, ctx);
            transfer::public_transfer(coin, tx_context::sender(ctx));
        };

        dynamic_field::add(&mut treasure.id, b"loot", loot);
        treasure.is_opened = true;
    }

    // 4. Claim with ZK Proof (Unchanged interface)
    entry fun claim_treasure_with_proof(
        treasure: &mut Treasure,
        r: &Random,
        _proof: vector<u8>, 
        ctx: &mut TxContext
    ) {
        internal_open(treasure, r, ctx);
    }
}