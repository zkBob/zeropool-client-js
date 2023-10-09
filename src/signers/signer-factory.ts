import { DepositType, InternalError } from "..";
import { NetworkBackend } from "../networks";
import { DepositSigner } from "./abstract-signer";
import { ApproveSigner } from "./approve-signer";
import { DepositPermitSigner } from "./permit-signer";
import { DepositPermit2Signer } from "./permit2-signer";
import { USDCSigner, PolygonUSDCSigner } from "./usdc-signer";

export class DepositSignerFactory {
    static createSigner(network: NetworkBackend, type: DepositType): DepositSigner {
        switch (type) {
            case DepositType.Approve:
                return new ApproveSigner(network);

            case DepositType.SaltedPermit:
                return new DepositPermitSigner(network);

            case DepositType.PermitV2:
                return new DepositPermit2Signer(network);

            case DepositType.AuthUSDC:
                return new USDCSigner(network);

            case DepositType.AuthPolygonUSDC:
                return new PolygonUSDCSigner(network);
            
            default:
                throw new InternalError(`The deposit type \'${type}\' is not supported yet`);
        }
    }
}