import { DepositData, DepositSigner, SignatureRequest, SignatureType } from "./abstract-signer";

export class DepositPermitSigner extends DepositSigner {

    protected async buildTypes(): Promise<any> {
        const types = {
            EIP712Domain: [
                { name: 'name', type: 'string' },
                { name: 'version', type: 'string' },
                { name: 'chainId', type: 'uint256' },
                { name: 'verifyingContract', type: 'address' },
            ],
            Permit: [
                { name: 'owner', type: 'address' },
                { name: 'spender', type: 'address' },
                { name: 'value', type: 'uint256' },
                { name: 'nonce', type: 'uint256' },
                { name: 'deadline', type: 'uint256' },
                { name: 'salt', type: 'bytes32' }
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
        const nonce = await this.network.getTokenNonce(data.tokenAddress, data.owner);

        const message = {
            owner: data.owner,
            spender: data.spender,
            value: data.amount.toString(),
            nonce,
            deadline: data.deadline.toString(),
            salt: data.nullifier
        };

        return message;
    }

    public async buildSignatureRequest(data: DepositData): Promise<SignatureRequest> {
        return {
            type: SignatureType.TypedDataV4,
            data: {
                types: await this.buildTypes(),
                domain: await this.buildDomain(data),
                primaryType: 'Permit',
                message: await this.buildMessage(data),
            }
        }
    }
    

}