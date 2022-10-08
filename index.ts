import { ethers, utils, providers, BigNumber} from "ethers";
const log = console.log;

let websocketProvider;

const WEBSOCKET_URL = 'ws://localhost:9046';
// const WEBSOCKET_URL = 'ws://localhost:8546';

const TARGET_HEIGHT = 21957793
const TOTAL_BLOCKS = 30 * 24 * 3600 / 3;  // block in 30 days

const main = async () => {
  websocketProvider = new providers.WebSocketProvider(WEBSOCKET_URL);

  let currentHeight = TARGET_HEIGHT
  while (currentHeight < TARGET_HEIGHT - TOTAL_BLOCKS) {
    currentHeight--
    const block = await websocketProvider.getBlock(TARGET_HEIGHT);
    const txs = block.transactions
    log(txs)
  }

};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
