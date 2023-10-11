import { Account, IWithdrawData, SnarkProof } from "libzkbob-rs-wasm-web";
import { Pool } from "./config";
import { NetworkBackend, PreparedTransaction } from "./networks";
import { ZkBobState, ZERO_OPTIMISTIC_STATE } from "./state";
import { ZkBobSubgraph } from "./subgraph";
import { InternalError } from "./errors";
import { keccak256 } from "web3-utils";
import { addHexPrefix, bufToHex } from "./utils";

export enum ForcedExitState {
    NotStarted = 0,
    Commited,
    Completed,
    Canceled,
  }

export interface ForcedExit {
    nullifier: bigint;
    operator: string;
    to: string;
    amount: bigint;
}

export interface ForcedExitRequest extends ForcedExit {
    index: number;
    out_commit: bigint;
    tx_proof: SnarkProof;
}

export interface CommittedForcedExit extends ForcedExit {
    exitStart: number;
    exitEnd: number;
}


export class ForcedExitProcessor {
    protected network: NetworkBackend;
    protected subgraph?: ZkBobSubgraph;
    protected state: ZkBobState;

    protected tokenAddress: string;
    protected poolAddress: string;

    
    constructor(pool: Pool, network: NetworkBackend, state: ZkBobState, subgraph?: ZkBobSubgraph) {
        this.network = network;
        this.subgraph = subgraph;
        this.state = state;
        this.tokenAddress = pool.tokenAddress;
        this.poolAddress = pool.poolAddress;
    }

    public async isForcedExitSupported(): Promise<boolean> {
        return this.network.isSupportForcedExit(this.poolAddress);
    }

    // state MUST be synced before at the top level
    public async forcedExitState(): Promise<ForcedExitState> {
        
        const nullifier = await this.getCurrentNullifier();
        const nullifierValue = await this.network.nullifierValue(this.poolAddress, BigInt(nullifier));
        if (nullifierValue == 0n) {
          const commitedForcedExit = await this.network.committedForcedExitHash(this.poolAddress, BigInt(nullifier));
          if (commitedForcedExit != 0n) {
            // TODO: check is forced exit canceled
            return ForcedExitState.Commited;
          }
    
          return ForcedExitState.NotStarted;
        } else {
          // nullifier value doesn't equal zero: analyze it
          const deadSignature = BigInt('0xdeaddeaddeaddeaddeaddeaddeaddeaddeaddeaddeaddead0000000000000000');
          const deadSignMask  = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffff0000000000000000');
    
          if ((nullifierValue & deadSignMask) == deadSignature) {
            return ForcedExitState.Completed;
          }
    
          throw new InternalError('The nullifier is not last for that account');
        }
    }

    public async getActiveForcedExit(): Promise<CommittedForcedExit | undefined> {
      const  curState = await this.forcedExitState();
      if (curState == ForcedExitState.Commited) {
        return this.network.committedForcedExit(this.poolAddress, BigInt(await this.getCurrentNullifier()))
      }

      return undefined;
    }

    public async requestForcedExit(
        executerAddress: string, // who will send emergency exit execute transaction
        toAddress: string,     // which address should receive funds
        sendTxCallback: (tx: PreparedTransaction) => Promise<string>,  // callback to send transaction 
        proofTxCallback: (pub: any, sec: any) => Promise<any>,
      ): Promise<CommittedForcedExit> {
        // getting available amount to emergency withdraw
        const accountBalance = await this.state.accountBalance();
        const notes = await this.state.usableNotes();
        const txNotesSum: bigint = notes.slice(0, 3).reduce((acc, cur) => acc + BigInt(cur[1].b), 0n);
        const requestedAmount = accountBalance + txNotesSum;

        console.log(`Latest nullifier: ${await this.getCurrentNullifier()}`);

        // create regular withdraw tx
        const oneTx: IWithdrawData = {
            amount: requestedAmount.toString(),
            fee: '0',
            to: this.network.addressToBytes(toAddress),
            native_amount: '0',
            energy_amount: '0',
        };
        const oneTxData = await this.state.createWithdrawalOptimistic(oneTx, ZERO_OPTIMISTIC_STATE);

        // customize memo field in the public part (pool contract know nothing about real memo)
        const customMemo = addHexPrefix(bufToHex(oneTx.to));
        const customMemoHash = BigInt(keccak256(customMemo));
        const R = BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617');
        oneTxData.public.memo = (customMemoHash % R).toString(10);

        // calculate transaction proof
        const txProof = await proofTxCallback(oneTxData.public, oneTxData.secret);

        // create an internal object to request
        const request: ForcedExitRequest = {
            nullifier: oneTxData.public.nullifier,
            operator: executerAddress,
            to: toAddress,
            amount: requestedAmount,
            index: oneTxData.parsed_delta.index,
            out_commit: oneTxData.public.out_commit,
            tx_proof: txProof.proof,
        }

        // getting raw transaction
        const commitTransaction = await this.network.createCommitForcedExitTx(this.poolAddress, request);
        // ...and bringing it back to the application to send it
        const txHash = await sendTxCallback(commitTransaction);

        // Assume tx was sent, try to figure out the result and retrieve a commited forced exit
        // TODO
        const result: CommittedForcedExit = {
            nullifier: request.nullifier,
            operator: request.operator,
            to: request.to,
            amount: request.amount,
            exitStart: 0,
            exitEnd: 0,
        }

        return result; 
    }

    public async executeForcedExit(sendTxCallback: (tx: PreparedTransaction) => Promise<string>): Promise<boolean> {
        // TODO: get an actual committed forced exit object
        const committed: CommittedForcedExit = {
            nullifier: 0n,
            operator: '0x0000000000000000000000000000000000000000',
            to: '0x0000000000000000000000000000000000000000',
            amount: 0n,
            exitStart: 0,
            exitEnd: 0,
        }

        // getting raw transaction
        const commitTransaction = await this.network.createExecuteForcedExitTx(this.poolAddress, committed);
        // ...and bring it back to the application to send it
        const txHash = await sendTxCallback(commitTransaction);

        throw new InternalError('unimplemented')
    }

    public async cancelForcedExit(sendTxCallback: (tx: PreparedTransaction) => Promise<string>): Promise<boolean> {
        throw new InternalError('unimplemented')
    }


    // TODO: implement getting the last account in the wasm lib
    private async getCurrentNullifier(): Promise<string> {
        
        const rawState = await this.state.rawState();
    
        let maxAccIdx = -1;
        let lastAccount: Account | undefined;
        for (const [index, tx] of rawState.txs) {
          if (tx['Account'] !== undefined && index > maxAccIdx) {
            maxAccIdx = index;
            lastAccount = tx['Account'];
          }
        }
    
        if (maxAccIdx == -1 || lastAccount === undefined) {
          // TODO: get zero account in that case
          throw new InternalError(`The account has no own transactions`);
        }
    
        return this.state.calcNullifier(maxAccIdx, lastAccount);
      }
}