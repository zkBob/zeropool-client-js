import { TxDepositNonceAlreadyUsed } from "..";
import { DepositData, DepositSigner, SignatureType } from "./abstract-signer";

export class TransferWithAuthSigner extends DepositSigner {

    protected async buildTypes(): Promise<any> {
        const types = {
            EIP712Domain : [
                { name: 'name', type: 'string' },
                { name: 'version', type: 'string' },
                { name: 'chainId', type: 'uint256' },
                { name: 'verifyingContract', type: 'address' },
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

        const domain = {
            name: tokenName,
            version: '1',
            chainId: chainId,
            verifyingContract: data.tokenAddress,  
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

        const wordPos = BigInt(data.nullifier) >> 8n;
        const bitPos = BigInt(data.nullifier) & 0xFFn
        const pointer = await this.network.erc3009AuthState(data.tokenAddress, data.owner, BigInt(data.nullifier));
        if (pointer & (1n << bitPos)) {
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