import { ethers, utils, providers, BigNumber} from "ethers";
import {TransactionResponse} from "@ethersproject/abstract-provider";
import {JsonRpcProvider, WebSocketProvider} from '@ethersproject/providers';
// @ts-ignore
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

// let websocketProvider: WebSocketProvider;
let rpcProviders: JsonRpcProvider[];
let rpcProvider: JsonRpcProvider;

// const WEBSOCKET_URL = 'ws://localhost:9046';
// const WEBSOCKET_URL = 'ws://data-seed-prebsc-2-s3.binance.org:8545/';
// const WEBSOCKET_URL = 'ws://localhost:8546';
const WEBSOCKET_URL = 'ws://data-seed-prebsc-1-s1.binance.org:8545/';
const RPC_URLs = [
  'https://data-seed-prebsc-1-s1.binance.org:8545/',
  'https://data-seed-prebsc-2-s1.binance.org:8545/',
  'https://data-seed-prebsc-1-s3.binance.org:8545/',
]

const TARGET_HEIGHT = 23474117
const TOTAL_BLOCKS = 90 * 24 * 3600 / 3;  // block in 30 days

let currentBcHeight: number = 0

const iFace = new utils.Interface([
  "function handlePackage(bytes calldata payload, bytes calldata proof, uint64 height, uint64 packageSequence, uint8 channelId) external",
])

const targetFunction = "handlePackage"
const targetSigHash = iFace.getSighash(targetFunction)
const file = __dirname + '/testnet-monitor-' + targetFunction + '.json';

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

  // log(parsedTx.name, "height of BC", bcHeight)

  const txUrl = `https://testnet.bscscan.com/tx/${tx.hash}`;

  if (config.currentBCHeight - bcHeight > 5_000) {
    config.result.push({
      bcHeight,
      txUrl,
    })

    console.log('------------', 'found result on bcHeight', bcHeight)
  } else {
    config.currentBCHeight = bcHeight
  }

  // log('config.currentBCHeight', config.currentBCHeight)
  // log(txUrl)
}
const checkTxs = async (txs: string[]) => {
  for (let i = 0; i < txs.length; i++) {
    const txHash = txs[i]
    if (!txHash) continue

    rpcProvider = rpcProviders[i % rpcProviders.length]
    const tx = await rpcProvider.getTransaction(txHash)


    if (!tx) {
      log("ERROR get this tx", i, txHash)
      continue
    }
    
    await parseTx(tx)
    await sleepMS(10)
  }
}

const init = async () => {
  // websocketProvider = new providers.WebSocketProvider(WEBSOCKET_URL);
  rpcProviders = RPC_URLs.map(url => new JsonRpcProvider(url))
  rpcProvider = rpcProviders[0]

  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify(config, null, 2))
  }

  config = require(file) as MonitorConfig

  log('current config', JSON.stringify(config, null, 2))
}

const main = async () => {
  await init()

  let currentHeight = config.currentBlock > 0 ? config.currentBlock : TARGET_HEIGHT

  while (currentHeight > TARGET_HEIGHT - TOTAL_BLOCKS) {
    try {
      currentHeight--
      const block = await rpcProvider.getBlock(currentHeight);
      if (!block) {
        log('can not get block', currentHeight)
        continue
      }
      const txs = block.transactions

      await checkTxs(txs)

      config.currentBlock = currentHeight
      if (currentHeight % 100 === 0) {
        let timeStr = new Date().toLocaleString();

        const blockTimeStr = new Date(block.timestamp * 1000).toLocaleString()
        log(timeStr, 'get block for ', currentHeight, "txs", txs.length, "block time is: ", blockTimeStr)

        fs.writeFileSync(file, JSON.stringify(config, null, 2))
      }

      await sleepMS(200)
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
