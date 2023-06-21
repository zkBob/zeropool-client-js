import { HexStringWriter } from "../utils";
import { TxDepositNonceAlreadyUsed } from "..";
import { DepositData, DepositSigner, SignatureType } from "./abstract-signer";

export class TransferWithAuthSigner extends DepositSigner {

    protected async buildTypes(): Promise<any> {
        const types = {
            EIP712Domain : [
                { name: 'name', type: 'string' },
                { name: 'version', type: 'string' },
                { name: 'verifyingContract', type: 'address' },
                { name: 'salt', type: 'bytes32' },
            ],
            TransferWithAuthorization: [
                { name: 'from', type: 'address' },
                { name: 'to', type: 'address' },
                { name: 'value', type: 'uint256' },
                { name: 'validAfter', type: 'uint256' },
                { name: 'validBefore', type: 'uint256' },
                { name: 'nonce', type: 'bytes32' },
            ],
        };
            
        return types;
    }

    protected async buildDomain(data: DepositData): Promise<any> {
        const tokenName = await this.network.getTokenName(data.tokenAddress);
        const chainId = await this.network.getChainId();
        
        const wr = new HexStringWriter();
        wr.writeNumber(chainId, 32);

        const domain = {
            name: tokenName,
            version: '1',
            verifyingContract: data.tokenAddress,  
            salt: wr.buf,
        };
        
        return domain;
    }

    protected async buildMessage(data: DepositData): Promise<any> {
        const message = {
            from: data.owner,
            to: data.spender,
            value: data.amount.toString(),
            validAfter: '0',
            validBefore: data.deadline.toString(),
            nonce: data.nullifier
        };

        return message;
    }

    public async checkIsDataValid(data: DepositData): Promise<void> {
        await super.checkIsDataValid(data);

        const pointer = await this.network.erc3009AuthState(data.tokenAddress, data.owner, BigInt(data.nullifier));
        if (pointer != 0n) {
            throw new TxDepositNonceAlreadyUsed(data.nullifier, data.tokenAddress);
        }
    }

    public async buildSignatureRequest(data: DepositData): Promise<any> {
        return {
            type: SignatureType.TypedDataV4,
            data: {
                types: await this.buildTypes(),
                domain: await this.buildDomain(data),
                primaryType: 'TransferWithAuthorization',
                message: await this.buildMessage(data),
            }
        }
    }
    

}