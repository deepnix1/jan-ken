# Environment Variables for Commit-Reveal Game

Add these to your `.env.local` file:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://iophfhfnctqufqsmunyz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Contract
NEXT_PUBLIC_CONTRACT_ADDRESS_COMMIT_REVEAL=0xb36b83A3a8367e3A9A336a9004993F0BD6278818
CONTRACT_ADDRESS_COMMIT_REVEAL=0xb36b83A3a8367e3A9A336a9004993F0BD6278818

# RPC
NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
RPC_URL=https://sepolia.base.org

# Relayer (optional - for backend operations)
RELAYER_PRIVATE_KEY=0x... # Private key for relayer wallet (only if needed)
```

## Notes

- `SUPABASE_SERVICE_ROLE_KEY`: Required for API routes that need to bypass RLS
- `RELAYER_PRIVATE_KEY`: Only needed if you want backend to create matches on-chain (not recommended - players should create matches directly)
- Contract address should be the deployed `JankenCommitReveal` contract address

