/// Module: usdt
/// Defines a mock USDT token for the game with a free public faucet
module sc_dex_duel::usdt {
    use one::coin::{Self, Coin, TreasuryCap};

    // ==================== Constants ====================

    /// Faucet amount per claim: 100 USDT (6 decimals = 100_000_000)
    const FAUCET_AMOUNT: u64 = 100_000_000;

    // ==================== Structs ====================

    /// The type identifier for the USDT coin
    public struct USDT has drop {}

    /// Shared faucet object — holds TreasuryCap, bebas diklaim siapapun
    public struct Faucet has key {
        id: UID,
        treasury: TreasuryCap<USDT>,
    }

    // ==================== Events ====================

    public struct FaucetClaimed has copy, drop {
        recipient: address,
        amount: u64,
    }

    // ==================== Init ====================

    #[allow(deprecated_usage)]
    fun init(witness: USDT, ctx: &mut TxContext) {
        let (treasury, metadata) = coin::create_currency(
            witness,
            6,                      // 6 decimals
            b"USDT",                // Symbol
            b"Tether USD",          // Name
            b"Mock USDT for Game",  // Description
            option::none(),
            ctx
        );

        transfer::public_freeze_object(metadata);

        // Buat dan share Faucet (berisi TreasuryCap)
        transfer::share_object(Faucet {
            id: object::new(ctx),
            treasury,
        });
    }

    // ==================== Public Functions ====================

    /// Klaim 100 USDT — bebas diklaim berkali-kali oleh siapapun
    public fun claim_faucet(
        faucet: &mut Faucet,
        ctx: &mut TxContext,
    ): Coin<USDT> {
        let recipient = ctx.sender();

        one::event::emit(FaucetClaimed {
            recipient,
            amount: FAUCET_AMOUNT,
        });

        coin::mint(&mut faucet.treasury, FAUCET_AMOUNT, ctx)
    }

    /// Get the faucet amount constant
    public fun faucet_amount(): u64 {
        FAUCET_AMOUNT
    }

    // ==================== Test Only ====================

    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        init(USDT {}, ctx);
    }
}
