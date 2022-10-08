import { ethers, utils, providers, BigNumber} from "ethers";
import {TransactionResponse} from "@ethersproject/abstract-provider";
import { WebSocketProvider } from '@ethersproject/providers';
import fs from "fs";

export interface MonitorConfig {
  targetFunction: string;

  fromBlock: number;
  endBlock: number;

  currentBlock: number;
  currentBCHeight: number;

  result: any[];
}

const log = console.log;

let websocketProvider: WebSocketProvider;

const WEBSOCKET_URL = 'ws://localhost:9046';
// const WEBSOCKET_URL = 'ws://localhost:8546';

const TARGET_HEIGHT = 21957793
const TOTAL_BLOCKS = 30 * 24 * 3600 / 3;  // block in 30 days

let currentBcHeight: number = 0

const iFace = new utils.Interface([
  "function handlePackage(bytes calldata payload, bytes calldata proof, uint64 height, uint64 packageSequence, uint8 channelId) external",
])

const targetFunction = "handlePackage"
const targetSigHash = iFace.getSighash(targetFunction)
const file = __dirname + '/monitor-' + targetFunction + '.json';

let config: MonitorConfig = {
  targetFunction,

  fromBlock: TARGET_HEIGHT,
  endBlock: TARGET_HEIGHT - TOTAL_BLOCKS,

  currentBlock: TARGET_HEIGHT - 1,
  currentBCHeight: 0,

  result: [],
}

const parseTx = async (tx: TransactionResponse) => {
  const data = tx.data
  if (!data || data.length < 8) return
  if (data.indexOf(targetSigHash) < 0) return

    let parsedTx = iFace.parseTransaction(tx)
    const bcHeight = (parsedTx.args[2] as BigNumber).toNumber()
    if (config.currentBCHeight == 0) {
      config.currentBCHeight = bcHeight
    }

    log(parsedTx.name, "height of BC", bcHeight)

    const txUrl = `https://bscscan.com/tx/${tx.hash}`;

    if (config.currentBCHeight - bcHeight > 5_000) {
      config.result.push({
        bcHeight,
        txUrl,
        args: parsedTx.args
      })
    } else {
      config.currentBCHeight = bcHeight
    }

    log('config.currentBCHeight', config.currentBCHeight)
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

const init = async () => {
  websocketProvider = new providers.WebSocketProvider(WEBSOCKET_URL);

  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify(config, null, 2))
  }

  config = require(file) as MonitorConfig
}

const main = async () => {
  await init()

  let currentHeight = config.currentBlock > 0 ? config.currentBlock : TARGET_HEIGHT

  while (currentHeight > TARGET_HEIGHT - TOTAL_BLOCKS) {
    try {
      currentHeight--
      const block = await websocketProvider.getBlock(currentHeight);
      if (!block) continue
      const txs = block.transactions

      await checkTxs(txs)

      config.currentBlock = currentHeight
      if (currentHeight % 100 === 0) {
        log('get block for ', currentHeight, "txs", txs.length)
        fs.writeFileSync(file, JSON.stringify(config, null, 2))
      }

    } catch (e) {
      log('error', e)

      fs.writeFileSync(file, JSON.stringify(config, null, 2))
      await sleepMS(2000)
    }
  }
};

const sleepMS = async (ms: number) => {
  await new Promise((resolve) => setTimeout(resolve, ms));
};

main()
  .then(() => {
    fs.writeFileSync(file, JSON.stringify(config, null, 2))
    return process.exit(0)
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
