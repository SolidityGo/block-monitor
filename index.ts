import { ethers, utils, providers, BigNumber} from "ethers";
import {TransactionResponse} from "@ethersproject/abstract-provider";
import { WebSocketProvider } from '@ethersproject/providers';

const log = console.log;

let websocketProvider: WebSocketProvider;

const WEBSOCKET_URL = 'ws://localhost:9046';
// const WEBSOCKET_URL = 'ws://localhost:8546';

const TARGET_HEIGHT = 21957793
const TOTAL_BLOCKS = 30 * 24 * 3600 / 3;  // block in 30 days

const parseTx = async (tx: TransactionResponse) => {
  const data = tx.data

  try {} catch (e) {

  }
  log(data)
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
    currentHeight--
    const block = await websocketProvider.getBlock(TARGET_HEIGHT);

    if (!block) continue

    log('get block for ', currentHeight)

    const txs = block.transactions
    checkTxs(txs).then()
  }
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
