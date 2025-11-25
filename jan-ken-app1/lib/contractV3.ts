/**
 * JankenSignatureV3 Contract ABI and Address
 */

export const CONTRACT_ADDRESS_V3 = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS_V3 || '';

export const CONTRACT_ABI_V3 = [
  {
    inputs: [],
    name: 'deposit',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'withdraw',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'player', type: 'address' },
      { internalType: 'string', name: 'gameId', type: 'string' },
      { internalType: 'uint8', name: 'move', type: 'uint8' },
      { internalType: 'uint256', name: 'timestamp', type: 'uint256' },
      { internalType: 'bytes32', name: 'salt', type: 'bytes32' },
      { internalType: 'bytes', name: 'signature', type: 'bytes' },
    ],
    name: 'verify',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'pure',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'string', name: 'gameId', type: 'string' },
      { internalType: 'address', name: 'playerA', type: 'address' },
      { internalType: 'address', name: 'playerB', type: 'address' },
      { internalType: 'uint256', name: 'betAmount', type: 'uint256' },
      { internalType: 'uint8', name: 'moveA', type: 'uint8' },
      { internalType: 'uint256', name: 'tsA', type: 'uint256' },
      { internalType: 'bytes32', name: 'saltA', type: 'bytes32' },
      { internalType: 'bytes', name: 'sigA', type: 'bytes' },
      { internalType: 'uint8', name: 'moveB', type: 'uint8' },
      { internalType: 'uint256', name: 'tsB', type: 'uint256' },
      { internalType: 'bytes32', name: 'saltB', type: 'bytes32' },
      { internalType: 'bytes', name: 'sigB', type: 'bytes' },
    ],
    name: 'settleGame',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'player', type: 'address' },
    ],
    name: 'getPlayerBalance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'string', name: 'gameId', type: 'string' },
    ],
    name: 'getGameResult',
    outputs: [
      {
        components: [
          { internalType: 'address', name: 'playerA', type: 'address' },
          { internalType: 'address', name: 'playerB', type: 'address' },
          { internalType: 'enum JankenSignatureV3.Move', name: 'moveA', type: 'uint8' },
          { internalType: 'enum JankenSignatureV3.Move', name: 'moveB', type: 'uint8' },
          { internalType: 'address', name: 'winner', type: 'address' },
          { internalType: 'uint256', name: 'prize', type: 'uint256' },
          { internalType: 'bool', name: 'finalized', type: 'bool' },
          { internalType: 'uint256', name: 'timestamp', type: 'uint256' },
        ],
        internalType: 'struct JankenSignatureV3.GameResult',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getContractBalance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: '', type: 'address' },
    ],
    name: 'balances',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'string', name: '', type: 'string' },
    ],
    name: 'games',
    outputs: [
      { internalType: 'address', name: 'playerA', type: 'address' },
      { internalType: 'address', name: 'playerB', type: 'address' },
      { internalType: 'uint8', name: 'moveA', type: 'uint8' },
      { internalType: 'uint8', name: 'moveB', type: 'uint8' },
      { internalType: 'address', name: 'winner', type: 'address' },
      { internalType: 'uint256', name: 'prize', type: 'uint256' },
      { internalType: 'bool', name: 'finalized', type: 'bool' },
      { internalType: 'uint256', name: 'timestamp', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'TAX',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'MIN_BET',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'MAX_BET',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'owner',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'paused',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'p', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'Deposited',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'p', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'Withdrawn',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'string', name: 'gameId', type: 'string' },
      { indexed: true, internalType: 'address', name: 'winner', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'prize', type: 'uint256' },
    ],
    name: 'GameSettled',
    type: 'event',
  },
] as const;


