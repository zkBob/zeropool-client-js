import { InternalError } from "../errors";

const ATTEMPT_RETRIES_CNT = 5;
const RPC_ISSUES_THRESHOLD = 20;    // number of errors needed to switch RPC

export interface RpcManagerDelegate {
    setEnabled(enabled: boolean);
    getBlockNumber(): Promise<number>;
    getBlockNumberFrom(rpcurl: string): Promise<number>;
}

export class MultiRpcManager {
    private rpcUrls: string[];
    private curRpcIdx: number;
    private curRpcIssues = 0;
    private badRpcs: number[] = []; // RPC indexes which are considered to be unstable or unavailable
    protected switchingAttempts = 0;
    public delegate?: RpcManagerDelegate;

    constructor(rpcUrls: string[]) {
        if (rpcUrls.length == 0) {
            throw new InternalError(`MultiRpcManager: Unable to initialize without RPC URL`);
        }

        this.rpcUrls = rpcUrls;
        this.curRpcIdx = 0;
    }

    // Performs RPC interaction within several attempts. The errors will registered automatically
    protected async commonRpcRetry(closure: () => any, errorPattern: string, disableRetries: boolean = false): Promise<any> {
        let totalAttempts = 0;
        const attemptMinDelayMs = 500;
        const startAttemptsCnt = this.switchingAttempts;
        do {
            let cnt = 0;
            do {
                const startTs = Date.now();
                try {
                    return await closure();
                } catch (e) {
                    console.error(`${errorPattern ?? 'Error occured'} [attempt #${totalAttempts + 1}]: ${e.message}`);
                    this.registerRpcIssue();

                    const delay = Date.now() - startTs;
                    if (delay < attemptMinDelayMs) {
                        await new Promise(f => setTimeout(f, attemptMinDelayMs - delay));
                    }
                }
                totalAttempts++;
            } while (!disableRetries && ++cnt < ATTEMPT_RETRIES_CNT);
        } while (!disableRetries && (this.switchingAttempts - startAttemptsCnt) < this.rpcUrls.length);
        
        throw new InternalError(`MultRpcManager: ${disableRetries ? 'RPC interaction error' : 'all RPCs are unavailable'}`)
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

        this.switchingAttempts++;

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
            this.curRpcIssues = 0;
            console.log(`[MultiRpcManager]: RPC was switched to ${this.curRpcUrl()}`);

            return true;
        }

        return false;
    }

    protected async switchToTheBestRPC(): Promise<boolean> {
        if (this.rpcUrls.length - this.badRpcs.length > 1) {
            const blockNums = await Promise.all(this.rpcUrls.map(async (rpcurl, index) => {
                if (this.badRpcs.includes(index) == false) {
                    const latestBlock = await this.delegate?.getBlockNumberFrom(rpcurl).catch(() => 0);
                    return {index, latestBlock: latestBlock ?? 0};
                }

                return {index, latestBlock: 0};
            }));

            const curRpc = blockNums.find((val) => val.index == this.curRpcIdx);
            const bestRpc = blockNums.reduce((prev, cur) => (prev && prev.latestBlock > cur.latestBlock) ? prev : cur);
            if (bestRpc.index != curRpc?.index && bestRpc.latestBlock > (curRpc?.latestBlock ?? 0)) {
                return this.switchRPC(bestRpc.index, false);
            }
        }

        return false;
    }
}