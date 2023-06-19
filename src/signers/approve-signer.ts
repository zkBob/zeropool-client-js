import { TxDepositAllowanceTooLow } from "..";
import { DepositData, DepositSigner, SignatureType } from "./abstract-signer";

export class ApproveSigner extends DepositSigner {

    protected async buildTypes(): Promise<any> {            
        return {};
    }

    protected async buildDomain(data: DepositData): Promise<any> {
        return {}
    }

    protected async buildMessage(data: DepositData): Promise<any> {
        return data.nullifier;
    }

    public async checkIsDataValid(data: DepositData): Promise<void> {
        await super.checkIsDataValid(data);

        const curAllowance = await this.network.allowance(data.tokenAddress, data.owner, data.spender);
        if (curAllowance < data.amount) {
            throw new TxDepositAllowanceTooLow(data.amount, curAllowance, data.spender);
        }
    }

    public async buildSignatureRequest(data: DepositData): Promise<any> {
        return {
            type: SignatureType.PersonalSign,
            data: await this.buildMessage(data),
        }
    }
    

}