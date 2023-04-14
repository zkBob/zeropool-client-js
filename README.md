# zkbob-client-js

## Example

```typescript
import { ZkBobClient, ClientConfig, AccountConfig,
        ProverMode, TransferRequest, deriveSpendingKeyZkBob
    } from 'zkbob-client-js';


async function zkBobExample(): Promise<void> {
    // Client configuration includes set of pools, chains, parameters and other options
    const clientConfig: ClientConfig = {
      pools: {
          'BOB-sepolia': {
              'chainId': 11155111,
              'poolAddress': '0x3bd088C19960A8B5d72E4e01847791BD0DD1C9E6',
              'tokenAddress': '0x2C74B18e2f84B78ac67428d0c7a9898515f0c46f',
              'relayerUrls': ['https://relayer.thgkjlr.website/'],
              // external service to speed-up proof calculation, optional
              'delegatedProverUrls': [],
              // file with archived pool state
              // (optional, needed to reduce sync time)
              'coldStorageConfigPath': ''
          }
      },
      chains: {
          '11155111': {
              rpcUrls: ['https://rpc.sepolia.org'] // list of available JSON RPC endpoints
          },
      },
      snarkParams: {
          transferParamsUrl: '/path/to/transfer/params',  
          transferVkUrl: '/path/to/transfer/vk'
      },
      supportId: 'unique_string_generated_with_uuidv4',
      forcedMultithreading: undefined // multithreading config will be selected automatically
    };

    // creating a zkBob client without account to be worked on 'BOB-sepolia' pool
    const client = await ZkBobClient.create(clientConfig, 'BOB-sepolia');

    // now you can get relayer fee or pool limits for example
    const relayerFee = await client.atomicTxFee();
    console.log(`Relayer default fee: ${relayerFee} Gwei`);
    console.log(`Pool deposit total limit: ${(await client.getLimits(undefined)).deposit.total} Gwei`);

    // now let's attach account generated from the arbitrary 12-words mnemonic:
    const mnemonic = 'magic trophy foil direct marriage glad bench wash doctor risk end cheap';
    const accountConfig: AccountConfig = {
      // spending key is a byte array which derived from mnemonic
      sk: deriveSpendingKeyZkBob(mnemonic),
      // pool alias which should be activated
      pool: 'BOB-sepolia',
      // the account should have no activity (incoming notes including) before that index
      // you can use -1 value only for newly created account or undefined (or 0) for full state sync
      birthindex: 0,
      // using local prover
      proverMode: ProverMode.Local,
    };
    await client.login(accountConfig);

    // now the client is ready to send transactions, but let's get an account balance first
    // account state will be synced under-the-hood (pass false to getTotalBalance to prevent sync)
    console.log(`Shielded account balance: ${await client.getTotalBalance()} Gwei`);

    // let's generate our zkAddress to request a few tokens from somebody
    console.log(`My zk address: ${await client.generateAddress()}`);

    // and now let's transfer a few tokens inside the pool
    const tx: TransferRequest = {
      destination: 'zkbob_sepolia:HGkddpMXSfbXPEa8hUcttUaXpSPJihwA75q2Gue8QGxZtyDieqzb3iSRecdxS7d',  // shielded address
      amountGwei: BigInt('5000000000'), // 5 BOB
    }
    // returns an array of job ID for every transaction
    // (single transfer may produce several transactions to the pool)
    const jobIds = await client.transferMulti([tx], relayerFee);
    // wait while all transactions will be processed by relayer
    const result = await client.waitJobsTxHashes(jobIds);
    console.log(`${result.map((t) => `job #${t.jobId}: ${t.txHash}]`).join(`\n`)}`);

    // to close all connections to the indexed DBs invoke logout method:
    await client.logout();
}
```
