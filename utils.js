require('dotenv').config()
const { Connection, PublicKey } = require('@solana/web3.js');
const { LIQUIDITY_STATE_LAYOUT_V4, MARKET_STATE_LAYOUT_V3, Market} = require('@raydium-io/raydium-sdk');

const getTokenAsset=async (tokenAddress)=>{
  try {
    const response = await fetch(`${process.env.HELIUS_RPC}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'my-id',
        method: 'getAsset',
        params: {
          id: tokenAddress
        },
      }),
    });
    const asset = await response.json();
    return asset;
  } catch (error) {
    return null;
  }
  
}
const getSwapMarket=async (tokenAddress)=>{
    const connection = new Connection(process.env.RPC_API);
  
    const SOL_MINT_ADDRESS = 'So11111111111111111111111111111111111111112';
    const TOKEN_MINT_ADDRESS = tokenAddress; // Replace with your token's mint address
    const raydium_program_id=new PublicKey(process.env.RAYDIUM_OPENBOOK_AMM);
    const raydium_auth=new PublicKey(process.env.RAYDIUM_AUTHORITY);
    var accounts=await connection.getProgramAccounts(
        raydium_program_id,
        {
          commitment: 'confirmed',
          filters: [
            { dataSize: LIQUIDITY_STATE_LAYOUT_V4.span },
            {
              memcmp: {
                offset: LIQUIDITY_STATE_LAYOUT_V4.offsetOf('baseMint'),
                bytes: SOL_MINT_ADDRESS,
              },
            },
            {
              memcmp: {
                offset: LIQUIDITY_STATE_LAYOUT_V4.offsetOf('quoteMint'),
                bytes: TOKEN_MINT_ADDRESS,
              },
            },
          ],
        },
    );
    if(accounts.length==0)
        accounts=await connection.getProgramAccounts(
            raydium_program_id,
            {
              commitment: 'confirmed',
              filters: [
                { dataSize: LIQUIDITY_STATE_LAYOUT_V4.span },
                {
                  memcmp: {
                    offset: LIQUIDITY_STATE_LAYOUT_V4.offsetOf('baseMint'),
                    bytes: TOKEN_MINT_ADDRESS,
                  },
                },
                {
                  memcmp: {
                    offset: LIQUIDITY_STATE_LAYOUT_V4.offsetOf('quoteMint'),
                    bytes: SOL_MINT_ADDRESS,
                  },
                },
              ],
            },
        );
    const poolInfo=LIQUIDITY_STATE_LAYOUT_V4.decode(accounts[0].account.data);
    const marketAccountInfo = await connection.getAccountInfo(poolInfo.marketId);
    if (!marketAccountInfo) {
        return false;
    }
    const marketInfo= MARKET_STATE_LAYOUT_V3.decode(marketAccountInfo.data);
    const poolKeys = {
        poolId: accounts[0].pubkey,
        baseMint: poolInfo.baseMint,
        quoteMint: poolInfo.quoteMint,
        lpMint: poolInfo.lpMint,
        baseDecimals: poolInfo.baseDecimal.toNumber(),
        quoteDecimals: poolInfo.quoteDecimal.toNumber(),
        lpDecimals: 9,
        version: 4,
        programId: raydium_program_id,
        openOrders: poolInfo.openOrders,
        targetOrders: poolInfo.targetOrders,
        baseVault: poolInfo.baseVault,
        quoteVault: poolInfo.quoteVault,
        withdrawQueue: poolInfo.withdrawQueue,
        lpVault: poolInfo.lpVault,
        marketVersion: 3,
        authority: raydium_auth,
        marketId: poolInfo.marketId,
        marketProgramId: poolInfo.marketProgramId,
        marketAuthority: Market.getAssociatedAuthority({ programId: poolInfo.marketProgramId, marketId: poolInfo.marketId }).publicKey,
        marketBaseVault: marketInfo.baseVault,
        marketQuoteVault: marketInfo.quoteVault,
        marketBids: marketInfo.bids,
        marketAsks: marketInfo.asks,
        marketEventQueue: marketInfo.eventQueue,
        // baseReserve: poolInfo.baseReserve,
        // quoteReserve: poolInfo.quoteReserve,
        // lpReserve: poolInfo.lpReserve,
        // openTime: poolInfo.openTime,
    };

    const id = poolKeys.poolId;
    delete poolKeys.poolId;
    poolKeys.id = id;
    // const poolInfoJson=poolKeys2JsonInfo(poolInfo)
    // console.log(poolKeys)
    return {poolInfo,marketInfo,poolKeys};
}

module.exports={
    getSwapMarket,
    getTokenAsset,
}