export class BobError extends Error {
    constructor(message: string) {
        super(message);
        this.name = this.constructor.name;
        Error.captureStackTrace(this);
    }
}

export class InternalError extends BobError {
    constructor(message: string) {
        super(message);
    }
}

export class TxSmallAmount extends BobError {
    public amount: bigint;
    public minAmount: bigint;

    constructor(amount, minAmount) {
        super(`Transaction amount is too small (${amount.toString()} < ${minAmount.toString()})`);
        this.amount = amount;
        this.minAmount = minAmount;
    }
}

export class TxLimitError extends BobError {
    public amount: bigint;
    public limitAvailable: bigint;

    constructor(amount, limitAvailable) {
        super(`Transaction exceed current limit (${amount.toString()} > ${limitAvailable.toString()})`);
        this.amount = amount;
        this.limitAvailable = limitAvailable;
    }
}

export class TxProofError extends BobError {
    constructor() {
        super(`Transaction proof incorrect`);
        this.name = 'TxSmallAmount';
    }
}

export class TxInvalidArgumentError extends BobError {
    constructor(message: string) {
        super(message);
        this.name = 'TxSmallAmount';
    }
}

export class TxDepositDeadlineExpiredError extends BobError {
    public deadline: number;
    constructor(deadline: number) {
        super(`Deposit permit deadline is about to be expired`);
        this.deadline = deadline;
    }
}

export class TxInsufficientFundsError extends BobError {
    public needed: bigint;
    public available: bigint;
    constructor(needed: bigint, available: bigint) {
        super(`Insufficient funds for transaction (needed ${needed.toString()}, available ${available.toString()})`);
        this.needed = needed;
        this.available = available;
    }
}

export class RelayerError extends BobError {
    public code: number;
    constructor(code: number, message: string) {
        super(`Relayer response incorrect (code ${code}): ${message}`);
        this.code = code;
    }
}

export class NetworkError extends BobError {
    constructor(cause?: Error) {
        super(`It's seems the network is unavailable (${cause?.message})`);
    }
}

export class RelayerJobError extends BobError {
    public jobId: number;
    public reason: string;
    constructor(jobId: number, reason: string) {
        super(`Job ${jobId} failed with reason: ${reason}`);
        this.jobId = jobId;
        this.reason = reason;
    }
}