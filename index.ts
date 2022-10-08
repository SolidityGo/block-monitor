import { ethers, utils, providers, BigNumber} from "ethers";
const log = console.log;

let websocketProvider;

const WEBSOCKET_URL = 'ws://localhost:9046';
const TARGET_HEIGHT = 21957793

const main = async () => {


  websocketProvider = new providers.WebSocketProvider(WEBSOCKET_URL);
  const block = await websocketProvider.getBlock(21721518);
  log(block);
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
