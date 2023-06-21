import { TxDepositAllowanceTooLow, TxDepositNonceAlreadyUsed } from "..";
import { DepositData, DepositSigner, SignatureRequest, SignatureType } from "./abstract-signer";

export const PERMIT2_CONTRACT = '0x000000000022D473030F116dDEE9F6B43aC78BA3';

export class DepositPermit2Signer extends DepositSigner {

    protected async buildTypes(): Promise<any> {
        const types = {
            EIP712Domain: [
                { name: 'name', type: 'string' },
                { name: 'chainId', type: 'uint256' },
                { name: 'verifyingContract', type: 'address' },
            ],
            TokenPermissions: [
                { name: 'token', type: 'address' },
                { name: 'amount', type: 'uint256' },
            ],
            PermitTransferFrom: [
                { name: 'permitted', type: 'TokenPermissions' },
                { name: 'spender', type: 'address' },
                { name: 'nonce', type: 'uint256' },
                { name: 'deadline', type: 'uint256' },
            ],
        };
            
        return types;
    }

    protected async buildDomain(data: DepositData): Promise<any> {
        const chainId = await this.network.getChainId();

        const domain = {
            name: 'Permit2',
            chainId: chainId,
            verifyingContract: PERMIT2_CONTRACT,
        };
        
        return domain;
    }

    protected async buildMessage(data: DepositData): Promise<any> {
        const message = {
            permitted: {
                token: data.tokenAddress,
                amount: data.amount.toString()
            },
            spender: data.spender,
            nonce: data.nullifier,
            deadline: data.deadline.toString(),
        };

        return message;
    }

    public async checkIsDataValid(data: DepositData): Promise<void> {
        await super.checkIsDataValid(data);

        const curAllowance = await this.network.allowance(data.tokenAddress, data.owner, PERMIT2_CONTRACT);
        if (curAllowance < data.amount) {
            throw new TxDepositAllowanceTooLow(data.amount, curAllowance, PERMIT2_CONTRACT);
        }

        const wordPos = BigInt(data.nullifier) >> 8n;
        const bitPos = BigInt(data.nullifier) & 0xFFn
        const pointer = await this.network.permit2NonceBitmap(PERMIT2_CONTRACT, data.owner, wordPos);
        if (pointer & (1n << bitPos)) {
            throw new TxDepositNonceAlreadyUsed(data.nullifier, PERMIT2_CONTRACT);
        }
    }

    public async buildSignatureRequest(data: DepositData): Promise<SignatureRequest> {
        return {
            type: SignatureType.TypedDataV4,
            data: {
                types: await this.buildTypes(),
                domain: await this.buildDomain(data),
                primaryType: 'PermitTransferFrom',
                message: await this.buildMessage(data),
            }
        }
    }
}