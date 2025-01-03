# SSTORE2 On-Chain Storage Cost Calculator

A web-based calculator for comparing on-chain storage costs across different blockchains using the SSTORE2 pattern.

## Features

### File Size Input

- Drag & drop file support for automatic size calculation
- Manual size input option
- No file upload - size is calculated client-side for privacy
- Automatic detection and handling of files exceeding single contract size limit (24,576 bytes)

### Chain Support

- Pre-configured support for major chains:
  - L1s: Ethereum, BSC, Avalanche, Solana
  - L2s: Arbitrum, Optimism, Base, Blast
  - ZK Rollups: Polygon zkEVM, Scroll, Linea
  - Sidechains: Polygon
  - Other: Moonbeam (Polkadot)
- Custom chain support with configurable parameters
- Solana included as a non-EVM comparison baseline

### Cost Calculation

- Accurate gas calculations including:
  - Base contract deployment costs
  - Per-byte storage costs
  - L2-specific costs (data availability, compression)
  - Polygon checkpoint costs
  - Solana rent-exempt storage
- Automatic contract splitting for large files
- Real-time price data from CoinGecko (default) or CoinMarketCap (optional - see gear icon)
- USD conversion for easy comparison

## Technical Details

### SSTORE2 Implementation

- Contract Creation: ~32k gas overhead
- Data Storage: ~200 gas per byte
- Size Limit: 24kb per contract
- Automatic chunking for files > 24kb

## Usage

1. Input file size (drag & drop or manual entry)
2. Select chains to compare
3. Adjust gas prices if needed
4. Click "Compute Storage Costs"
5. Review the comparison table showing costs across all selected chains

The calculator will display:

- Number of contracts/transactions needed
- Gas costs and fees
- Native token costs
- USD equivalent costs
- Highlighting of most economical option
