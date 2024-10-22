require("dotenv").config();
const { getSwapMarket, getTokenAsset } = require("./utils");
const { swapTokenRapid } = require("./swap");

//geyser client
const Client=require("@triton-one/yellowstone-grpc");

const client =new Client.default("https://grpc.solanavibestation.com",undefined,undefined);

let executionCount = 0;
const targetToken = "6P3dgBzEo3ihXGn6xZZRSNff8ZmTNmxJVz4rfboTpump";

const bettingBalance = 0.02 // solana token unit
let basePrice = 0.0003768      // solana token unit
const gettingRate = 0.4     // 20%
const losingRate = 0.9       // 10%

let burnt_token_price_list = {}

// client.getVersion()
//   .then(async version=>{
//     console.log("version", version)
//   })



const runFunction = async () => {
  try {
    
    // const swapMarket = await getSwapMarket(targetToken);
    const tokenAsset = await getTokenAsset(targetToken);

    let isFrozon = tokenAsset.result.ownership.frozen
    let isBurnt = tokenAsset.result.burnt
    let tokenId = tokenAsset.result.id
    let tokenPrice = tokenAsset.result.token_info.price_info.price_per_token

    if(tokenId in burnt_token_price_list){
      
      let previousTokenPrice = burnt_token_price_list[tokenAsset.result.id]
      let currentTokenPrice = tokenPrice
      
      console.log("previousTokenPrice;", previousTokenPrice, "currentTokenPrice;", currentTokenPrice);

      if( 
        tokenPrice > basePrice * (1 + gettingRate)
      ){

        // await swapTokenRapid(targetToken, swapMarket.poolKeys, bettingBalance * (1 + gettingRate - 0.05), true);
        burnt_token_price_list[tokenAsset.result.id] = tokenPrice

        delete burnt_token_price_list[tokenAsset.result.id]

      } else if(
        tokenPrice < basePrice * (1 - losingRate)
      ){
        // await swapTokenRapid(targetToken, swapMarket.poolKeys, bettingBalance * (1 - losingRate + 0.05), true);
        burnt_token_price_list[tokenAsset.result.id] = tokenPrice

        delete burnt_token_price_list[tokenAsset.result.id]
      }
      
    }else{
      console.log("isFrozon:", isFrozon, ", isBurnt:", isBurnt, ", token price", tokenPrice);
      if( !isFrozon ){

        if(tokenPrice <= basePrice){
          // await swapTokenRapid(targetToken, swapMarket.poolKeys, bettingBalance, false);
          burnt_token_price_list[tokenAsset.result.id] = tokenPrice
          basePrice=tokenPrice
        }  
      }
    }
    
  } catch (error) {
    console.error("Error in runFunction:", error);
    executionCount = 172801
  }
};

const runMultipleFunctions = async () => {
  const promises = [];
  promises.push(runFunction());
  await Promise.all(promises);
};

const intervalId = setInterval(async () => {
  executionCount += 1;
  await runMultipleFunctions();
  if (executionCount >= 172800) {
    clearInterval(intervalId);
  }
}, 10000); 
