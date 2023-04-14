import { Signer, ContractFactory, Overrides } from "ethers";
import type { Provider, TransactionRequest } from "@ethersproject/providers";
import type { PromiseOrValue } from "../common";
import type { NonceManager, NonceManagerInterface } from "../NonceManager";
type NonceManagerConstructorParams = [signer?: Signer] | ConstructorParameters<typeof ContractFactory>;
export declare class NonceManager__factory extends ContractFactory {
    constructor(...args: NonceManagerConstructorParams);
    deploy(overrides?: Overrides & {
        from?: PromiseOrValue<string>;
    }): Promise<NonceManager>;
    getDeployTransaction(overrides?: Overrides & {
        from?: PromiseOrValue<string>;
    }): TransactionRequest;
    attach(address: string): NonceManager;
    connect(signer: Signer): NonceManager__factory;
    static readonly bytecode = "0x6080806040523461001657610292908161001c8239f35b600080fdfe604060808152600436101561001357600080fd5b600090813560e01c80630bd28e3b1461011c5780631b2e01b8146100c2576335567e1a1461004057600080fd5b346100be5773ffffffffffffffffffffffffffffffffffffffff7fffffffffffffffffffffffffffffffffffffffffffffffff000000000000000082602094610088366101e5565b9416815280865281812077ffffffffffffffffffffffffffffffffffffffffffffffff8516825286522054918351931b16178152f35b5080fd5b50346100be578060209273ffffffffffffffffffffffffffffffffffffffff6100ea366101e5565b9116825281855277ffffffffffffffffffffffffffffffffffffffffffffffff83832091168252845220549051908152f35b50346100be5760207ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffc3601126100be5760043577ffffffffffffffffffffffffffffffffffffffffffffffff81168091036101e15733835282602052818320908352602052812080547fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff81146101b457600101905580f35b6024837f4e487b710000000000000000000000000000000000000000000000000000000081526011600452fd5b8280fd5b7ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffc60409101126102575760043573ffffffffffffffffffffffffffffffffffffffff81168103610257579060243577ffffffffffffffffffffffffffffffffffffffffffffffff811681036102575790565b600080fdfea2646970667358221220f5e91646805c6b1bb753625885b060195cda747093e5dfefff7a60462a97759864736f6c63430008120033";
    static readonly abi: readonly [{
        readonly inputs: readonly [{
            readonly internalType: "address";
            readonly name: "sender";
            readonly type: "address";
        }, {
            readonly internalType: "uint192";
            readonly name: "key";
            readonly type: "uint192";
        }];
        readonly name: "getNonce";
        readonly outputs: readonly [{
            readonly internalType: "uint256";
            readonly name: "nonce";
            readonly type: "uint256";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "uint192";
            readonly name: "key";
            readonly type: "uint192";
        }];
        readonly name: "incrementNonce";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "address";
            readonly name: "";
            readonly type: "address";
        }, {
            readonly internalType: "uint192";
            readonly name: "";
            readonly type: "uint192";
        }];
        readonly name: "nonceSequenceNumber";
        readonly outputs: readonly [{
            readonly internalType: "uint256";
            readonly name: "";
            readonly type: "uint256";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }];
    static createInterface(): NonceManagerInterface;
    static connect(address: string, signerOrProvider: Signer | Provider): NonceManager;
}
export {};
