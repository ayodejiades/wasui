module contracts::game {
    use std::string::{Self, String};
    use sui::object::{Self, UID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::dynamic_field;
    use sui::random::{Self, Random};


    const EAlreadyOpened: u64 = 0;

    struct AdminCap has key { id: UID }

    struct Treasure has key, store {
        id: UID,
        name: String,
        description: String,
        is_opened: bool,
    }

    struct LootMetadata has store, drop {
        rarity: String,
        power_level: u8,
    }

    fun init(ctx: &mut TxContext) {
        transfer::transfer(AdminCap { id: object::new(ctx) }, tx_context::sender(ctx));
    }

    public fun create_treasure(
        _: &AdminCap, 
        name: vector<u8>, 
        desc: vector<u8>, 
        recipient: address, 
        ctx: &mut TxContext
    ) {
        let treasure = Treasure {
            id: object::new(ctx),
            name: string::utf8(name),
            description: string::utf8(desc),
            is_opened: false,
        };
        transfer::transfer(treasure, recipient);
    }

    entry fun open_treasure(
        treasure: &mut Treasure, 
        r: &Random, 
        ctx: &mut TxContext
    ) {
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
}