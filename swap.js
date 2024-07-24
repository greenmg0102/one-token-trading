require('dotenv').config()
const { Connection, PublicKey, Keypair, Transaction, SystemProgram, ComputeBudgetProgram } = require('@solana/web3.js');
const { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, createCloseAccountInstruction, createSyncNativeInstruction, getAssociatedTokenAddressSync } = require('@solana/spl-token');
const { Liquidity } = require('@raydium-io/raydium-sdk');
const { bs58 } = require('@coral-xyz/anchor/dist/cjs/utils/bytes');


async function swapTokenRapid(tokenAddress,poolKeys_,amount=0.0001,buySol=false) {

  // If buySol is false, the function will buy the specified token using SOL.
  // If buySol is true, the function will buy SOL using the specified token.
  
  var poolKeys=poolKeys_;
  for(var oneKey of Object.keys(poolKeys_)){
    if(typeof poolKeys_[oneKey]=='string') poolKeys[oneKey]=new PublicKey(poolKeys_[oneKey]);
  }

  const connection = new Connection(process.env.RPC_API);
  
  const SOL_MINT_ADDRESS = 'So11111111111111111111111111111111111111112';
  const MYTOKEN_MINT_ADDRESS = tokenAddress; // Replace with your token's mint address

  const SOL_MINT_PUBKEY=new PublicKey(SOL_MINT_ADDRESS)
  const MYTOKEN_MINT_PUBKEY=new PublicKey(MYTOKEN_MINT_ADDRESS)

  const PRIVATE_KEY = Uint8Array.from(bs58.decode(process.env.PRIVATE_KEY));

  const wallet = Keypair.fromSecretKey(PRIVATE_KEY);

  var amountIn=BigInt(amount*(10**9))
  
  const txObject = new Transaction();

  const solATA = await getAssociatedTokenAddress(
    SOL_MINT_PUBKEY,
    wallet.publicKey,
  );
  
  if(buySol)
    txObject.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: Number(30000)}));
  else txObject.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: Number(30000)}));
  const accountInfo = await connection.getAccountInfo(solATA);

  if(!accountInfo)
  txObject.add(createAssociatedTokenAccountInstruction(
    wallet.publicKey,
    solATA,
    wallet.publicKey,
    SOL_MINT_PUBKEY,
    TOKEN_PROGRAM_ID
  ));

  if (!buySol) {
    txObject.add(SystemProgram.transfer({
      fromPubkey: wallet.publicKey,
      toPubkey: solATA,
      lamports: amountIn,
    }));
  }

  txObject.add(
    createSyncNativeInstruction(
      solATA,
      TOKEN_PROGRAM_ID
    ),
  );

  const tokenAta = getAssociatedTokenAddressSync(
    MYTOKEN_MINT_PUBKEY,
    wallet.publicKey,
  );

  const tokenAccountInfo = await connection.getAccountInfo(tokenAta);

  if(buySol){
    try {
      const myBalance=await connection.getTokenAccountBalance(tokenAta,"processed");
      amountIn=BigInt(myBalance?.value?.amount)
    } catch (error) {
      amountIn=BigInt(1)
    } 
  }

  if (!tokenAccountInfo) {
    txObject.add(
      createAssociatedTokenAccountInstruction(
        wallet.publicKey,
        tokenAta,
        wallet.publicKey,
        MYTOKEN_MINT_PUBKEY,
        TOKEN_PROGRAM_ID
      ),
    );
  }
  
  const { tokenAccountIn, tokenAccountOut } = buySol
    ? { tokenAccountIn: tokenAta, tokenAccountOut: solATA }
    : { tokenAccountIn: solATA, tokenAccountOut: tokenAta };

  const txn = Liquidity.makeSwapFixedInInstruction({
    connection: connection,
    poolKeys: poolKeys,
    userKeys: {
      tokenAccountIn,
      tokenAccountOut,
      owner: wallet.publicKey,
    },
    amountIn: amountIn,
    minAmountOut: '0',
  }, 4);
  for (let i = 0; i < txn.innerTransaction.instructions.length; i++) {
    txObject.add(txn.innerTransaction.instructions[i]);
  }

  const jito_tip_accounts=[
    "96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5",
    "HFqU5x63VTqvQss8hp11i4wVV8bD44PvwucfZ2bU7gRe",
    "Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY",
    "ADaUMid9yfUytqMBgopwjb2DTLSokTSzL1zt6iGPaS49",
    "DfXygSm4jCyNCybVYYK6DwvWqjKee8pbDmJGcLWNDXjh",
    "ADuUkR4vqLUMWXxW9gh6D6L8pMSawimctcNZ5pGwDcEt",
    "DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL",
    "3AVi9Tg9Uo68tJfuvoKvqKNWKkC5wPdSSdeBnizKZ6jT"
  ]
  const jito_tip_amount=BigInt(Number(200000))
  const jito_tip_index=(Math.round(Math.random()*10))%8;
  const jito_tip_account=new PublicKey(jito_tip_accounts[jito_tip_index]);
  txObject.add(
    SystemProgram.transfer({
      fromPubkey:wallet.publicKey,
      toPubkey:jito_tip_account,
      lamports:jito_tip_amount
    })
  )

  txObject.add(
    createCloseAccountInstruction(
      solATA,
      wallet.publicKey,
      wallet.publicKey,
      [wallet],
      TOKEN_PROGRAM_ID
    ),
  );
  
  txObject.feePayer = wallet.publicKey;
  const latestBlock=await connection.getLatestBlockhash("confirmed");
  txObject.recentBlockhash=latestBlock.blockhash;
  txObject.partialSign(wallet);
  const serialized=bs58.encode(txObject.serialize());
  let payload = {
    jsonrpc: "2.0",
    id: 1,
    method: "sendBundle",
    params: [[serialized]]
  };
  // https://jito-labs.gitbook.io/mev/searcher-resources/json-rpc-api-reference/url
  const jito_endpoints = [
    'https://ny.mainnet.block-engine.jito.wtf/api/v1/bundles',
    'https://mainnet.block-engine.jito.wtf/api/v1/bundles',
    'https://amsterdam.mainnet.block-engine.jito.wtf/api/v1/bundles',
    'https://frankfurt.mainnet.block-engine.jito.wtf/api/v1/bundles',
    'https://tokyo.mainnet.block-engine.jito.wtf/api/v1/bundles',
  ];
  var result=false;
  for(var endpoint of jito_endpoints){
    
    try {
      let res = await fetch(`${endpoint}`, {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' }
      });
      const responseData=await res.json();
      if(!responseData.error) {
        console.log(`----------${endpoint}-------------`)
        console.log(responseData)
        console.log(`${buySol?"Selling":"Buying"} Tokens is successful!!!`)
        console.log(`-----------------------------------`)
        result=true;
        // if(!buySol)
          // break;
      }else {
        console.log(`----------${endpoint}-------------`)
        console.log(responseData)
        console.log(`${buySol?"Selling":"Buying"} Tokens is failed!!!`)
        console.log(`-----------------------------------`)
      }
    } catch (error) {
      console.log(`----------${endpoint}-------------`)
      console.log(error)
      console.log(`${buySol?"Selling":"Buying"} Tokens is successful!!!`)
      console.log(`-----------------------------------`)
    }
  }
  if(!result) return false;
  return true;
}

module.exports={
  swapTokenRapid,
}