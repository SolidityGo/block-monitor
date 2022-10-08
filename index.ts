import { ethers, utils, providers, BigNumber} from "ethers";
import {TransactionResponse} from "@ethersproject/abstract-provider";
import { WebSocketProvider } from '@ethersproject/providers';

const log = console.log;

let websocketProvider: WebSocketProvider;

const WEBSOCKET_URL = 'ws://localhost:9046';
// const WEBSOCKET_URL = 'ws://localhost:8546';

const TARGET_HEIGHT = 21957793
const TOTAL_BLOCKS = 30 * 24 * 3600 / 3;  // block in 30 days

const iFace = new utils.Interface([
  // "function exactInputSingle(tuple(address tokenIn, address tokenOut, uint25624 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint256160 sqrtPriceLimitX96) calldata) external payable returns (uint256 amountOut)",
  // "function removeLiquidityETH(address token, uint256 liquidity, uint256 amountTokenMin, uint256 amountETHMin, address to, uint256 deadline) external returns (uint256 amountToken, uint256 amountETH)",

  "function addLiquidity(address tokenA, address tokenB, uint256 amountADesired, uint256 amountBDesired, uint256 amountAMin, uint256 amountBMin, address to, uint256 deadline) external returns (uint256 amountA, uint256 amountB, uint256 liquidity)",
  "function handlePackage(bytes calldata payload, bytes calldata proof, uint64 height, uint64 packageSequence, uint8 channelId) external",
])

const targetSigHash = iFace.getSighash("handlePackage")

const parseTx = async (tx: TransactionResponse) => {
  const data = tx.data
  if (!data || data.length < 8) return
  if (data.indexOf(targetSigHash) < 0) return

    let parsedTx = iFace.parseTransaction(tx)
    const bcHeight = parsedTx.args[2] as BigNumber

    log(parsedTx.name, "height of BC", bcHeight.toNumber())
    const txUrl = `https://bscscan.com/tx/${tx.hash}`;
    log(txUrl)
}

const checkTxs = async (txs: string[]) => {
  for (let i = 0; i < txs.length; i++) {
    const txHash = txs[i]
    if (!txHash) continue

    const tx = await websocketProvider.getTransaction(txHash)
    if (!tx) continue
    
    await parseTx(tx)
  }
}

const main = async () => {
  websocketProvider = new providers.WebSocketProvider(WEBSOCKET_URL);

  let currentHeight = TARGET_HEIGHT
  while (currentHeight > TARGET_HEIGHT - TOTAL_BLOCKS) {
    try {
      currentHeight--
      const block = await websocketProvider.getBlock(currentHeight);
      if (!block) continue
      const txs = block.transactions
      log('get block for ', currentHeight, "txs", txs.length)

      checkTxs(txs).then()
    } catch (e) {
      log('error', e)
      await sleepMS(2000)
    }
  }
};

const sleepMS = async (ms: number) => {
  await new Promise((resolve) => setTimeout(resolve, ms));
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
