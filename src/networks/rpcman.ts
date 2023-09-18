import { InternalError } from "../errors";
import promiseRetry from 'promise-retry';

const RPC_ISSUES_THRESHOLD = 50;    // number of errors needed to switch RPC

export interface RpcManagerDelegate {
    setEnabled(enabled: boolean); 
}

export class MultiRpcManager {
    private rpcUrls: string[];
    private curRpcIdx: number;
    private curRpcIssues = 0;
    private badRpcs: number[] = []; // RPC indexes which are considered to be unstable or unavailable
    public delegate?: RpcManagerDelegate;

    constructor(rpcUrls: string[]) {
        if (rpcUrls.length == 0) {
            throw new InternalError(`MultiRpcManager: Unable to initialize without RPC URL`);
        }

        this.rpcUrls = rpcUrls.map((aUrl) => aUrl.endsWith('/') ? aUrl : aUrl += '/' );
        this.curRpcIdx = 0;
    }

    // Performs RPC interaction within several attempts. The errors will registered automatically
    protected commonRpcRetry(closure: () => any, errorPattern: string, retriesCnt: number): Promise<any> {
        return promiseRetry(
            async (retry, attempt) => {
              try {
                  return await closure();
              } catch (e) {
                  console.error(`${errorPattern ?? 'Error occured'} [attempt #${attempt}]: ${e.message}`);
                  this.registerRpcIssue();
                  retry(e)
              }
            },
            {
              retries: retriesCnt,
              minTimeout: 500,
              maxTimeout: 500,
            }
        );
    }

    // ----------------------=========< RPC switching >=========----------------------
    // | Getting current RPC, registering issues, switching between RPCs             |
    // -------------------------------------------------------------------------------

    public curRpcUrl(): string {
        if (this.curRpcIdx < 0) {
            return this.rpcUrls[0];
        } else if (this.curRpcIdx >= this.rpcUrls.length) {
            return this.rpcUrls[this.rpcUrls.length - 1];
        } else {
            return this.rpcUrls[this.curRpcIdx];
        }
    }

    // Call this routine to increase issue counter
    // The RPC will be swiching automatically on threshold
    protected registerRpcIssue() {
        if (++this.curRpcIssues >= RPC_ISSUES_THRESHOLD) {
            if (this.switchRPC(undefined, true)) {
                this.curRpcIssues = 0;
            }
        }
    }

    protected switchRPC(index?: number, markCurrentAsBad: boolean = true): boolean {
        if (markCurrentAsBad && !this.badRpcs.includes(this.curRpcIdx)) {
            this.badRpcs.push(this.curRpcIdx);
            console.log(`[MultiRpcManager]: RPC ${this.curRpcUrl()} marked as bad (${this.curRpcIssues} issues registered)`);
        }


        let newRpcIndex = index ?? this.curRpcIdx;
        if (index === undefined && this.rpcUrls.length > 1) {
            let passesCnt = 0;
            do {
                newRpcIndex = (newRpcIndex + 1) % this.rpcUrls.length;
                if (!this.badRpcs.includes(newRpcIndex) || passesCnt > 0) {
                    break;
                }

                if (newRpcIndex == this.curRpcIdx) {
                    passesCnt++;
                }
            } while(passesCnt < 2)
        }

        if (newRpcIndex != this.curRpcIdx) {
            this.delegate?.setEnabled(false);
            this.curRpcIdx = newRpcIndex;
            this.delegate?.setEnabled(true);
            console.log(`[MultiRpcManager]: RPC was switched to ${this.curRpcUrl()}`);

            return true;
        }

        return false;
    }
}