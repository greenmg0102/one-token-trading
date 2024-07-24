require("dotenv").config();
const { getSwapMarket, getTokenAsset } = require("./utils");
const { swapTokenRapid } = require("./swap");

let executionCount = 0;
const targetToken = "2hdsVWL83gUXQs28fXsSNXd5BmwvvVdtxvrLajutpump";

const bettingBalance = 0.025 // solana token unit
const basePrice = 0.0008469      // solana token unit
const gettingRate = 0.2      // 20%
const losingRate = 0.1       // 10%

let burnt_token_price_list = {}

const runFunction = async () => {
  try {
    
    const swapMarket = await getSwapMarket(targetToken);
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
        tokenPrice > basePrice * (1 + gettingRate) &&
        tokenPrice < basePrice * (1 - losingRate)
      ){

        await swapTokenRapid(targetToken, swapMarket.poolKeys, bettingBalance, true);
        burnt_token_price_list[tokenAsset.result.id] = tokenPrice

        delete burnt_token_price_list[tokenAsset.result.id]

      } 
      
    }else{
      if( !isFrozon ){
        console.log("isFrozon:", isFrozon, ", isBurnt:", isBurnt, ", token price", tokenPrice);

        if(tokenPrice <= basePrice){
          await swapTokenRapid(targetToken, swapMarket.poolKeys, bettingBalance, false);
          burnt_token_price_list[tokenAsset.result.id] = tokenPrice
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
