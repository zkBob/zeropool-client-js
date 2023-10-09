import { NetworkBackend } from "../networks";
import { InternalError, TxDepositDeadlineExpiredError, TxInsufficientFundsError } from "..";
import { addHexPrefix, hexToBuf } from "../utils";


export interface DepositData {
    tokenAddress: string,
    owner: string,  // depositer's 0x address
    spender: string,    // 
    amount: bigint,
    deadline: bigint,
    nullifier: string
}

export enum SignatureType {
    PersonalSign, // signature for deposit-via approve
    TypedDataV4,  // permit deposit scheme
}
  
export interface SignatureRequest {
    type: SignatureType,
    data: any,  // an string for personal sign, object for typed signatures
}
  

export abstract class DepositSigner {
    protected domainSeparators: { [tokenAddress: string]: string } = {};
    constructor(protected network: NetworkBackend) {}

    protected async getDomainSeparator(tokenAddress: string): Promise<string> {
        let separator = await this.domainSeparators[tokenAddress];
        if (!separator) {
            separator = await this.network.getDomainSeparator(tokenAddress);
            this.domainSeparators[tokenAddress] = separator;
        }

        return separator;
    }

    protected abstract buildTypes(): Promise<any>;
    protected abstract buildDomain(data: DepositData): Promise<any>;
    protected abstract buildMessage(data: DepositData): Promise<any>;

    public abstract buildSignatureRequest(data: DepositData): Promise<SignatureRequest>;

    // override it in final class to check specific fields
    public async checkIsDataValid(data: DepositData): Promise<void> {
        if (!data.tokenAddress || !data.owner) {
            throw new InternalError(`DepositSigner: deposit data incorrect`);
        }

        const tokenBalance = await this.network.getTokenBalance(data.tokenAddress, data.owner);
        if (tokenBalance < data.amount) {
            throw new TxInsufficientFundsError(data.amount, tokenBalance);
        }

        if (Math.floor(Date.now() / 1000) >= data.deadline) {
            throw new TxDepositDeadlineExpiredError(Number(data.deadline));
        }
    }
    
    public async signRequest(privateKey: string, request: SignatureRequest): Promise<string> {
        if (privateKey) {
            let signature;
            try {
                switch (request.type) {
                case SignatureType.TypedDataV4:
                        signature = this.network.signTypedData(request.data, privateKey);
                        break;

                case SignatureType.PersonalSign:
                    signature = this.network.sign(request.data, privateKey);
                    break;

                default:
                    throw new InternalError(`Unsupported signature type: ${request.type}`)

                }
            } catch (err) {
                throw new InternalError(`Cannot sign typed data: ${err}`);
            }

            return signature;
        } else {
            throw new InternalError(`Cannot sign typed data: no private key provided`);
        }
    }

    public async recoverAddress(data: DepositData, signature: string): Promise<string> {
        const request = await this.buildSignatureRequest(data);
        let signerAddress;
        try {
            switch (request.type) {
            case SignatureType.TypedDataV4:
                signerAddress = this.network.recoverSignerTypedData(request.data, signature);
                break;

            case SignatureType.PersonalSign:
                signerAddress = this.network.recoverSigner(request.data, signature);
                break;

            default:
                throw new InternalError(`Unsupported signature type: ${request.type}`)

            }
        } catch (err) {
            throw new InternalError(`Cannot sign typed data: ${err}`);
        }

        return signerAddress;
    }

}