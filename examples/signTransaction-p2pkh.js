'use strict';

const Logger = require('blgr');
const {Coin, MTX, KeyRing, Script} = require('hsd');
const util = require('../test/utils/fund');
const {USB, LedgerHSD, LedgerInput} = require('../lib/hsd-ledger');
const {Device} = USB;

(async () => {
  const logger = new Logger({
    console: true,
    level: 'debug'
  });

  await logger.open();

  // Get first device available.
  const device = await Device.requestDevice();

  device.set({
    timeout: 15000, // optional (default is 5000ms)
    logger: logger  // optional
  });

  await device.open();

  const ledger = new LedgerHSD({
    device: device,
    network: 'regtest',
    logger: logger // optional
  });

  // Creating a test transaction using testing utils.
  // '../test/e2e/index.js' has examples using an `hsd` full node.
  const mtx = new MTX();
  const pubkey = await ledger.getPublicKey('m/44\'/5355\'/0\'/0/0');
  const ring = await KeyRing.fromPublic(pubkey);
  const addr = ring.getAddress();
  const {coins, txs} = await util.fundAddress(addr, 1);

  mtx.addOutput({
    address: KeyRing.generate().getAddress(),
    value: 10000000
  });

  await mtx.fund(coins, {
    changeAddress: ring.getAddress(),
    subtractFee: true
  });

  const ledgerInput = new LedgerInput({
    coin: Coin.fromTX(txs[0], 0, -1),
    input: mtx.inputs[0],
    index: 0,
    path: 'm/44\'/5355\'/0\'/0/0',
    publicKey: pubkey,
    type: Script.hashType.ANYONECANPAY | Script.hashType.NONE
  });

  logger.info(`TXID: ${mtx.txid()}`);

  const signed = await ledger.signTransaction(mtx, [ledgerInput]);

  logger.info(`Result of TX.verify(): ${signed.verify()}.`);

  await device.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
