// Constants for EVM calculations
const CODE_SIZE_LIMIT = 24576; // 24 KB EVM code limit
const BASE_CONTRACT_OVERHEAD_GAS = 32000; // Rough overhead for creation
const GAS_PER_BYTE = 200; // Rough code deposit cost

// Chain types for specific calculations
const CHAIN_TYPES = {
  L1: "L1",
  OPTIMISTIC_ROLLUP: "OPTIMISTIC_ROLLUP",
  ZK_ROLLUP: "ZK_ROLLUP",
  SIDECHAIN: "SIDECHAIN",
  POLKADOT: "POLKADOT"
};

// Default chains configuration
const defaultChains = [
  {
    name: "Ethereum",
    symbol: "ETH",
    defaultGasPrice: 20,
    enabled: true,
    isEVM: true,
    chainType: CHAIN_TYPES.L1,
    rpcUrl: "https://eth.llamarpc.com",
  },
  {
    name: "Polygon",
    symbol: "POL",
    defaultGasPrice: 40,
    enabled: true,
    isEVM: true,
    chainType: CHAIN_TYPES.SIDECHAIN,
    rpcUrl: "https://polygon.llamarpc.com",
    checkpointCost: {
      ethPerCheckpoint: 0.02,
      txsPerCheckpoint: 120000, // 1500 blocks × 80 tx/block
      l1GasPrice: 20 // Same as Ethereum's gas price
    }
  },
  {
    name: "BSC",
    symbol: "BNB",
    defaultGasPrice: 5,
    enabled: false,
    isEVM: true,
    chainType: CHAIN_TYPES.L1,
    rpcUrl: "https://binance.llamarpc.com",
  },
  {
    name: "Arbitrum",
    symbol: "ETH",
    defaultGasPrice: 0.1,
    enabled: false,
    isEVM: true,
    chainType: CHAIN_TYPES.OPTIMISTIC_ROLLUP,
    l1GasPrice: 20,
    l1GasPerByte: 16,
    compressionFactor: 0.4,
    rpcUrl: "https://arbitrum.llamarpc.com",
  },
  {
    name: "Avalanche",
    symbol: "AVAX",
    defaultGasPrice: 25,
    enabled: false,
    isEVM: true,
    chainType: CHAIN_TYPES.L1,
    rpcUrl: "https://avalanche.public-rpc.com",
  },
  {
    name: "Base",
    symbol: "ETH",
    defaultGasPrice: 0.001,
    enabled: false,
    isEVM: true,
    chainType: CHAIN_TYPES.OPTIMISTIC_ROLLUP,
    l1GasPrice: 20,
    l1GasPerByte: 16,
    compressionFactor: 0.4,
    rpcUrl: "https://mainnet.base.org",
  },
  {
    name: "Optimism",
    symbol: "ETH",
    defaultGasPrice: 0.001,
    enabled: false,
    isEVM: true,
    chainType: CHAIN_TYPES.OPTIMISTIC_ROLLUP,
    l1GasPrice: 20,
    l1GasPerByte: 16,
    compressionFactor: 0.4,
    rpcUrl: "https://mainnet.optimism.io",
  },
  {
    name: "Blast",
    symbol: "ETH",
    defaultGasPrice: 0.001,
    enabled: false,
    isEVM: true,
    chainType: CHAIN_TYPES.OPTIMISTIC_ROLLUP,
    l1GasPrice: 20,
    l1GasPerByte: 16,
    compressionFactor: 0.4,
    rpcUrl: "https://rpc.blast.io",
  },
  {
    name: "Linea",
    symbol: "ETH",
    defaultGasPrice: 0.05,
    enabled: false,
    isEVM: true,
    chainType: CHAIN_TYPES.ZK_ROLLUP,
    l1GasPrice: 20,
    l1GasPerByte: 12,
    compressionFactor: 0.3,
    rpcUrl: "https://rpc.linea.build",
  },
  {
    name: "Scroll",
    symbol: "ETH",
    defaultGasPrice: 0.05,
    enabled: false,
    isEVM: true,
    chainType: CHAIN_TYPES.ZK_ROLLUP,
    l1GasPrice: 20,
    l1GasPerByte: 12,
    compressionFactor: 0.3,
    rpcUrl: "https://rpc.scroll.io",
  },
  {
    name: "Moonbeam",
    symbol: "GLMR",
    defaultGasPrice: 100,
    enabled: false,
    isEVM: true,
    chainType: CHAIN_TYPES.POLKADOT,
    rpcUrl: "https://rpc.api.moonbeam.network",
  },
  {
    name: "Polygon zkEVM",
    symbol: "ETH",
    defaultGasPrice: 0.05,
    enabled: false,
    isEVM: true,
    chainType: CHAIN_TYPES.ZK_ROLLUP,
    l1GasPrice: 20,
    l1GasPerByte: 12,
    compressionFactor: 0.3,
    rpcUrl: "https://zkevm-rpc.com",
  },
  {
    name: "Solana",
    symbol: "SOL",
    defaultGasPrice: 0,
    enabled: false,
    isEVM: false,
    chainType: CHAIN_TYPES.L1,
    rpcUrl: "https://api.mainnet-beta.solana.com",
    lamportsPerByte: 0.0023,
    rentEpochDuration: 365,
    rentExemptionMultiplier: 2
  }
];

// Cache management
const CACHE_DURATION = 2 * 60 * 60 * 1000; // 2 hours
const STORAGE_KEY = 'sstore2_calculator_state';

// State management
let state = {
  chainPricesUSD: {},
  lastPriceUpdate: null,
  customApiKey: '',
  customRpcUrls: {},
  showSettings: false
};

// Load state from localStorage
function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      state = { ...state, ...parsed };
      
      // Restore custom RPC URLs to chains
      defaultChains.forEach(chain => {
        if (state.customRpcUrls[chain.name]) {
          chain.rpcUrl = state.customRpcUrls[chain.name];
        }
      });

      // Update UI based on loaded state
      const settingsModal = document.getElementById('settingsModal');
      if (state.showSettings) {
        settingsModal.classList.add('visible');
      }
    } catch (e) {
      console.error('Failed to load saved state:', e);
    }
  }
}

// Save state to localStorage
function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// DOM references
const fileInput = document.getElementById("fileInput");
const fileDropZone = document.getElementById("fileDropZone");
const manualSizeInput = document.getElementById("manualSize");
const splitNotice = document.getElementById("splitNotice");
const computeBtn = document.getElementById("computeBtn");
const chainChecklistDiv = document.getElementById("chainChecklist");
const addCustomChainBtn = document.getElementById("addCustomChainBtn");
const resultsTableBody = document.querySelector("#resultsTable tbody");
const settingsToggle = document.getElementById("settingsToggle");
const settingsModal = document.getElementById("settingsModal");
const closeSettings = document.getElementById("closeSettings");
const calcLink = document.getElementById("calcLink");
const faqLink = document.getElementById("faqLink");
const calculatorContent = document.getElementById("calculatorContent");
const faqContent = document.getElementById("faqContent");

// Navigation handling
function updateNavigation(showFaq) {
  if (showFaq) {
    calculatorContent.classList.add("hidden");
    faqContent.classList.add("visible");
    faqLink.classList.add("active");
    calcLink.classList.remove("active");
  } else {
    calculatorContent.classList.remove("hidden");
    faqContent.classList.remove("visible");
    calcLink.classList.add("active");
    faqLink.classList.remove("active");
  }
}

calcLink.addEventListener("click", (e) => {
  e.preventDefault();
  updateNavigation(false);
  window.history.pushState({}, '', '#calculator');
});

faqLink.addEventListener("click", (e) => {
  e.preventDefault();
  updateNavigation(true);
  window.history.pushState({}, '', '#faq');
});

// Handle browser back/forward
window.addEventListener('popstate', () => {
  updateNavigation(window.location.hash === '#faq');
});

// Settings modal handling
settingsToggle.addEventListener("click", () => {
  state.showSettings = true;
  settingsModal.classList.add('visible');
  saveState();
});

closeSettings.addEventListener("click", () => {
  state.showSettings = false;
  settingsModal.classList.remove('visible');
  saveState();
});

// Close modal when clicking outside
settingsModal.addEventListener("click", (e) => {
  if (e.target === settingsModal) {
    state.showSettings = false;
    settingsModal.classList.remove('visible');
    saveState();
  }
});

// Initialize chain checklist UI with RPC customization
function initChainChecklist() {
  chainChecklistDiv.innerHTML = "";

  // Add chain rows
  defaultChains.forEach((chain, idx) => {
    const row = document.createElement("tr");
    
    // Chain Name + Checkbox cell
    const nameCell = document.createElement("td");
    const nameDiv = document.createElement("div");
    
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = chain.enabled;
    checkbox.dataset.index = idx;
    checkbox.addEventListener('change', (e) => {
      chain.enabled = e.target.checked;
      defaultChains[idx].enabled = e.target.checked;
      updateToggleButtonStates();
    });
    
    const nameSpan = document.createElement("span");
    nameSpan.textContent = chain.name;
    
    nameDiv.appendChild(checkbox);
    nameDiv.appendChild(nameSpan);
    nameCell.appendChild(nameDiv);
    row.appendChild(nameCell);

    // Chain Type cell
    const typeCell = document.createElement("td");
    const typeSpan = document.createElement("span");
    const typeClass = getChainTypeClass(chain.chainType);
    typeSpan.className = `chain-type ${typeClass}`;
    typeSpan.textContent = getChainTypeLabel(chain.chainType);
    typeCell.appendChild(typeSpan);
    row.appendChild(typeCell);

    // Gas Price cell
    const gasPriceCell = document.createElement("td");
    if (chain.isEVM) {
      const gasInput = document.createElement("input");
      gasInput.type = "number";
      gasInput.step = "0.001";
      gasInput.value = chain.defaultGasPrice;
      gasInput.dataset.index = idx;
      gasInput.addEventListener("input", () => {
        chain.defaultGasPrice = parseFloat(gasInput.value) || 0;
      });
      gasPriceCell.appendChild(gasInput);
    } else {
      gasPriceCell.textContent = "N/A";
    }
    row.appendChild(gasPriceCell);

    // RPC URL cell
    const rpcCell = document.createElement("td");
    if (chain.rpcUrl) {
      const rpcInput = document.createElement("input");
      rpcInput.type = "text";
      rpcInput.value = chain.rpcUrl;
      rpcInput.placeholder = "Custom RPC URL";
      rpcInput.addEventListener("change", () => {
        chain.rpcUrl = rpcInput.value;
        state.customRpcUrls[chain.name] = rpcInput.value;
        saveState();
      });
      rpcCell.appendChild(rpcInput);
    } else {
      rpcCell.textContent = "N/A";
    }
    row.appendChild(rpcCell);

    chainChecklistDiv.appendChild(row);
  });

  updateToggleButtonStates();
}

// Helper functions for chain types
function getChainTypeClass(chainType) {
  switch (chainType) {
    case CHAIN_TYPES.L1: return 'l1';
    case CHAIN_TYPES.OPTIMISTIC_ROLLUP: return 'optimistic';
    case CHAIN_TYPES.ZK_ROLLUP: return 'zk';
    case CHAIN_TYPES.SIDECHAIN: return 'sidechain';
    case CHAIN_TYPES.POLKADOT: return 'polkadot';
    default: return '';
  }
}

function getChainTypeLabel(chainType) {
  switch (chainType) {
    case CHAIN_TYPES.L1: return 'L1';
    case CHAIN_TYPES.OPTIMISTIC_ROLLUP: return 'Optimistic L2';
    case CHAIN_TYPES.ZK_ROLLUP: return 'ZK L2';
    case CHAIN_TYPES.SIDECHAIN: return 'Sidechain';
    case CHAIN_TYPES.POLKADOT: return 'Polkadot';
    default: return 'Unknown';
  }
}

// File handling
function handleFileSelect() {
  if (fileInput.files && fileInput.files.length > 0) {
    const file = fileInput.files[0];
    manualSizeInput.value = file.size;
  }
}

fileInput.addEventListener("change", handleFileSelect);
fileDropZone.addEventListener("dragover", (evt) => {
  evt.preventDefault();
  evt.stopPropagation();
});
fileDropZone.addEventListener("drop", (evt) => {
  evt.preventDefault();
  evt.stopPropagation();
  if (evt.dataTransfer.files?.length > 0) {
    fileInput.files = evt.dataTransfer.files;
    handleFileSelect();
  }
});
fileDropZone.addEventListener("click", () => fileInput.click());

// Price fetching with fallbacks
async function fetchPrices(symbols) {
  if (!symbols?.length) return {};
  
  // Check cache first
  const now = Date.now();
  if (state.lastPriceUpdate && (now - state.lastPriceUpdate < CACHE_DURATION)) {
    const cachedPrices = Object.keys(state.chainPricesUSD)
      .filter(sym => symbols.includes(sym))
      .reduce((acc, sym) => {
        acc[sym] = state.chainPricesUSD[sym];
        return acc;
      }, {});
    
    if (Object.keys(cachedPrices).length === symbols.length) {
      return cachedPrices;
    }
  }

  // Try CoinMarketCap if API key is available
  if (state.customApiKey) {
    try {
      const response = await fetch(
        `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=${symbols.join(',')}`,
        {
          headers: {
            'X-CMC_PRO_API_KEY': state.customApiKey
          }
        }
      );
      const data = await response.json();
      
      if (data.data) {
        const prices = {};
        Object.entries(data.data).forEach(([symbol, info]) => {
          prices[symbol] = info.quote.USD.price;
        });
        
        // Update cache
        state.chainPricesUSD = { ...state.chainPricesUSD, ...prices };
        state.lastPriceUpdate = now;
        saveState();
        
        return prices;
      }
    } catch (e) {
      console.warn('CMC API failed:', e);
    }
  }

  // Fallback to CoinGecko (free, no API key needed)
  try {
    const cgIds = {
      'ETH': 'ethereum',
      'POL': 'matic-network',
      'BNB': 'binancecoin',
      'ARB': 'arbitrum',
      'AVAX': 'avalanche-2',
      'GLMR': 'moonbeam',
      'SOL': 'solana'
    };
    
    const validIds = symbols
      .map(sym => cgIds[sym])
      .filter(Boolean)
      .join(',');
    
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${validIds}&vs_currencies=usd`
    );
    const data = await response.json();
    
    const prices = {};
    symbols.forEach(sym => {
      const cgId = cgIds[sym];
      if (cgId && data[cgId]) {
        prices[sym] = data[cgId].usd;
      }
    });

    // Update cache
    state.chainPricesUSD = { ...state.chainPricesUSD, ...prices };
    state.lastPriceUpdate = now;
    saveState();
    
    return prices;
  } catch (e) {
    console.warn('CoinGecko API failed:', e);
    return {};
  }
}

// Cost calculation with L2 specifics
function computeChainCost(chain, fileSize) {
  if (chain.isEVM) {
    const numberOfContracts = Math.ceil(fileSize / CODE_SIZE_LIMIT);
    const bytesPerContract = Math.min(fileSize, CODE_SIZE_LIMIT);
    
    // Gas calculation for execution
    const gasPerContract = BASE_CONTRACT_OVERHEAD_GAS + (bytesPerContract * GAS_PER_BYTE);
    const totalGas = gasPerContract * numberOfContracts;
    
    // L2-specific calculations
    let l2DataFee = 0;
    if (chain.chainType === CHAIN_TYPES.OPTIMISTIC_ROLLUP || chain.chainType === CHAIN_TYPES.ZK_ROLLUP) {
      // Calculate L1 data fee for rollups
      const totalBytes = fileSize + (numberOfContracts * 32);
      const compressedBytes = Math.ceil(totalBytes * (chain.compressionFactor || 1));
      l2DataFee = (compressedBytes * chain.l1GasPerByte * chain.l1GasPrice) / 1e9;
    } else if (chain.name === "Polygon" && chain.checkpointCost) {
      // Calculate Polygon's checkpoint cost share
      const ethPerTx = chain.checkpointCost.ethPerCheckpoint / chain.checkpointCost.txsPerCheckpoint;
      const ethPrice = state.chainPricesUSD['ETH'] || 0;
      const polPrice = state.chainPricesUSD['POL'] || 0;
      if (ethPrice && polPrice) {
        // Convert ETH cost to MATIC
        l2DataFee = (ethPerTx * ethPrice) / polPrice;
      }
    }
    
    // Cost in native token
    const l2Fee = (totalGas * chain.defaultGasPrice) / 1e9;
    const costInNative = l2Fee + l2DataFee;

    // Cost in USD
    const nativePriceUSD = state.chainPricesUSD[chain.symbol];
    const totalCostUSD = nativePriceUSD ? (costInNative * nativePriceUSD) : 0;

    return {
      numberOfContracts,
      gasUsed: totalGas,
      costInNative,
      l2DataFee,
      nativePriceUSD,
      totalCostUSD,
      chainType: chain.chainType,
      compressedBytes: chain.chainType === CHAIN_TYPES.OPTIMISTIC_ROLLUP || chain.chainType === CHAIN_TYPES.ZK_ROLLUP ? 
        Math.ceil((fileSize + (numberOfContracts * 32)) * (chain.compressionFactor || 1)) : 
        fileSize
    };
  } else if (chain.name === "Solana") {
    // Solana storage cost calculation
    // 1. Calculate rent-exempt balance needed (this is a deposit, not a cost)
    const rentExemptLamports = Math.ceil(fileSize * chain.lamportsPerByte * chain.rentExemptionMultiplier);
    
    // 2. Calculate transaction fees for storing the data
    // Solana can store about 10KB per transaction
    const maxDataPerTx = 10 * 1024; // 10KB in bytes
    const numberOfTx = Math.ceil(fileSize / maxDataPerTx);
    const txFeeInLamports = 5000; // Base fee per tx
    const totalTxFees = numberOfTx * txFeeInLamports;
    
    // Total cost in SOL
    const costInNative = (rentExemptLamports + totalTxFees) / 1e9; // Convert lamports to SOL
    
    // Cost in USD
    const nativePriceUSD = state.chainPricesUSD[chain.symbol];
    const totalCostUSD = nativePriceUSD ? (costInNative * nativePriceUSD) : 0;

    return {
      numberOfContracts: numberOfTx, // Using this field to show number of transactions
      gasUsed: totalTxFees, // Using this field to show total lamports used
      costInNative,
      nativePriceUSD,
      totalCostUSD,
      isRentExempt: true,
      rentExemptDeposit: rentExemptLamports / 1e9 // in SOL
    };
  }
  
  return null;
}

// Main computation
async function computeCosts() {
  const fileSize = parseInt(manualSizeInput.value) || 0;
  if (!fileSize) {
    alert('Please enter a valid file size');
    return;
  }

  const needSplitting = fileSize > CODE_SIZE_LIMIT;
  splitNotice.style.display = needSplitting ? "block" : "none";

  // Get selected chains
  const selectedChains = defaultChains.filter((_, idx) => {
    const checkbox = chainChecklistDiv.querySelector(
      `input[type='checkbox'][data-index='${idx}']`
    );
    return checkbox?.checked;
  });

  if (!selectedChains.length) {
    alert('Please select at least one chain');
    return;
  }

  // Fetch prices
  const symbols = selectedChains.map(c => c.symbol);
  await fetchPrices(symbols);

  // Calculate and display results
  resultsTableBody.innerHTML = "";
  const results = [];

  selectedChains.forEach(chain => {
    const costData = computeChainCost(chain, fileSize);
    if (!costData) return;

    const row = document.createElement("tr");
    
    // Gas/fee display based on chain type
    let gasDisplay, gasPrice, costInNative;
    
    if (chain.isEVM) {
      gasDisplay = `${costData.gasUsed.toLocaleString()} gas`;
      if (costData.chainType !== CHAIN_TYPES.L1 && costData.chainType !== CHAIN_TYPES.SIDECHAIN) {
        gasDisplay += `<br><small>+${Math.ceil(fileSize * chain.l1GasPerByte).toLocaleString()} L1 gas</small>`;
      }
      
      gasPrice = `${chain.defaultGasPrice} Gwei`;
      if (costData.l2DataFee || chain.name === "Polygon") {
        const l1GasPrice = chain.l1GasPrice || chain.checkpointCost?.l1GasPrice || 20; // Default to 20 if not specified
        gasPrice += `<br><small>L1: ${l1GasPrice} Gwei</small>`;
      }
      
      costInNative = costData.costInNative.toFixed(6);
      if (costData.l2DataFee) {
        const l2Fee = (costData.costInNative - costData.l2DataFee).toFixed(6);
        costInNative = `${l2Fee}<br><small>+${costData.l2DataFee.toFixed(6)} L1 fee</small>`;
      }
    } else {
      // Solana display
      gasDisplay = `${(costData.gasUsed / 1e3).toFixed(2)}k lamports`;
      gasPrice = "N/A";
      costInNative = `${costData.costInNative.toFixed(6)}<br><small>(${costData.rentExemptDeposit.toFixed(6)} deposit)</small>`;
    }

    const chainTypeLabel = getChainTypeLabel(chain.chainType);
    const chainTypeClass = getChainTypeClass(chain.chainType);

    row.innerHTML = `
      <td>${chain.name}<br><small class="chain-type ${chainTypeClass}">${chainTypeLabel}</small></td>
      <td>${fileSize.toLocaleString()}</td>
      <td>${chain.isEVM ? (needSplitting ? costData.numberOfContracts : 1) : `${costData.numberOfContracts} tx`}</td>
      <td>${gasDisplay}</td>
      <td>${gasPrice}</td>
      <td>${costInNative}</td>
      <td>${costData.nativePriceUSD ? '$' + costData.nativePriceUSD.toFixed(2) : '--'}</td>
      <td>${costData.totalCostUSD ? '$' + costData.totalCostUSD.toFixed(2) : '--'}</td>
    `;
    
    results.push({ row, costData });
    resultsTableBody.appendChild(row);
  });

  // Highlight min/max costs
  if (results.length > 1) {
    const validResults = results.filter(r => r.costData.totalCostUSD > 0);
    if (validResults.length) {
      const minCost = validResults.reduce((min, curr) => 
        curr.costData.totalCostUSD < min.costData.totalCostUSD ? curr : min
      );
      const maxCost = validResults.reduce((max, curr) => 
        curr.costData.totalCostUSD > max.costData.totalCostUSD ? curr : max
      );
      
      minCost.row.classList.add("highlight-min");
      maxCost.row.classList.add("highlight-max");
    }
  }
}

// Initialize
loadState();
initChainChecklist();
computeBtn.addEventListener("click", computeCosts);

// Check initial URL hash
updateNavigation(window.location.hash === '#faq');

// Add custom chain functionality
addCustomChainBtn.addEventListener("click", () => {
  const name = prompt("Enter chain name:");
  if (!name) return;
  
  const symbol = prompt("Enter token symbol (for price lookup):");
  if (!symbol) return;
  
  const rpcUrl = prompt("Enter RPC URL:");
  if (!rpcUrl) return;
  
  const defaultGasPrice = parseFloat(prompt("Enter default gas price in Gwei:", "10"));
  if (isNaN(defaultGasPrice)) return;

  defaultChains.push({
    name,
    symbol,
    defaultGasPrice,
    enabled: true,
    isEVM: true,
    rpcUrl
  });

  initChainChecklist();
});

// Chain toggle handlers
function updateToggleButtonStates() {
  const allBtn = document.getElementById('toggleAll');
  const l1sBtn = document.getElementById('toggleL1s');
  const optimisticBtn = document.getElementById('toggleOptimistic');
  const zkBtn = document.getElementById('toggleZK');
  const noneBtn = document.getElementById('toggleNone');

  // Remove all active states
  [allBtn, l1sBtn, optimisticBtn, zkBtn, noneBtn].forEach(btn => {
    if (btn) btn.classList.remove('active');
  });

  // Check current state
  const total = defaultChains.length;
  const checked = defaultChains.filter(chain => chain.enabled).length;

  if (checked === total) {
    allBtn.classList.add('active');
  } else if (checked === 0) {
    noneBtn.classList.add('active');
  }
}

// Toggle handlers
document.getElementById('toggleAll').addEventListener('click', () => {
  const shouldCheck = !defaultChains.every(chain => chain.enabled);
  defaultChains.forEach(chain => chain.enabled = shouldCheck);
  initChainChecklist();
});

document.getElementById('toggleNone').addEventListener('click', () => {
  defaultChains.forEach(chain => chain.enabled = false);
  initChainChecklist();
});

document.getElementById('toggleL1s').addEventListener('click', () => {
  const l1Chains = defaultChains.filter(chain => chain.chainType === CHAIN_TYPES.L1);
  const allL1sEnabled = l1Chains.every(chain => chain.enabled);
  
  defaultChains.forEach(chain => {
    if (chain.chainType === CHAIN_TYPES.L1) {
      chain.enabled = !allL1sEnabled;
    }
  });
  
  initChainChecklist();
});

document.getElementById('toggleOptimistic').addEventListener('click', () => {
  const optimisticChains = defaultChains.filter(chain => chain.chainType === CHAIN_TYPES.OPTIMISTIC_ROLLUP);
  const allOptimisticEnabled = optimisticChains.every(chain => chain.enabled);
  
  defaultChains.forEach(chain => {
    if (chain.chainType === CHAIN_TYPES.OPTIMISTIC_ROLLUP) {
      chain.enabled = !allOptimisticEnabled;
    }
  });
  initChainChecklist();
});

document.getElementById('toggleZK').addEventListener('click', () => {
  const zkChains = defaultChains.filter(chain => chain.chainType === CHAIN_TYPES.ZK_ROLLUP);
  const allZKEnabled = zkChains.every(chain => chain.enabled);
  
  defaultChains.forEach(chain => {
    if (chain.chainType === CHAIN_TYPES.ZK_ROLLUP) {
      chain.enabled = !allZKEnabled;
    }
  });
  initChainChecklist();
});
