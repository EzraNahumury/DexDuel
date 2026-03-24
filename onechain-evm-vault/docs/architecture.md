# Architecture: EVM Vault for OneChain

This vault serves as the bridge for assets used in the OneChain no-loss prediction game. It manages ERC20 tokens on Base (EVM) while mirroring accounting for users on OneChain.

## OneChain User Key Encoding

Relayer converts OneChain address string into bytes32 using:

`bytes32 key = keccak256(abi.encodePacked(onechainAddressString))`

The same encoding must always be used for:
- `depositFor`
- `refund`
- `payPrize`
- `payBoosterPrize`

### OneChain User Key Format

Vault key = `keccak256("onechain:<address>")`

Example:
`onechain:demo-user-1` -> `0x1cb0aa8d9239324dbe4658891e090cf2a13fdf603212b901ae8a1c8b320c18dc`

## Base Sepolia Deployment

MockUSDC:
0x3b052259376DD36A12D7C9fb26BA1aEb4dd6c438

Vault:
0x37188e3c7cf6B3606f27869Fa5Bb7F7E0dE5Da64

## Core Components

### 1. Vault Contract (`src/Vault.sol`)
- **Mirror Accounting**: Tracks user deposits from OneChain.
- **Operator Access**: Only a trusted relayer (operator) can record deposits and trigger payouts.
- **Principal Safety**: Principal is locked and only refundable to Base addresses upon OneChain events.
- **Booster System**: Separate balance for external prize funding.
- **Recovery**: `rescueToken` allows owner to recover non-primary tokens sent by mistake.

### 2. Relayer (External)
- Monitors OneChain events.
- Maps OneChain identities to Base addresses.
- Calls Vault API functions to synchronize state.

## Security Model
- **Ownable**: Administrative functions (setting operator, funding booster).
- **OnlyOperator**: Operational game functions.
- **ReentrancyGuard**: Applied to all token transfer functions.
- **Input Validation**: Zero-address and zero-amount guards enforced.
