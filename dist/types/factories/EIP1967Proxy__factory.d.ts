import { Signer, ContractFactory, PayableOverrides, BytesLike } from "ethers";
import type { Provider, TransactionRequest } from "@ethersproject/providers";
import type { PromiseOrValue } from "../common";
import type { EIP1967Proxy, EIP1967ProxyInterface } from "../EIP1967Proxy";
type EIP1967ProxyConstructorParams = [signer?: Signer] | ConstructorParameters<typeof ContractFactory>;
export declare class EIP1967Proxy__factory extends ContractFactory {
    constructor(...args: EIP1967ProxyConstructorParams);
    deploy(_logic: PromiseOrValue<string>, _data: PromiseOrValue<BytesLike>, overrides?: PayableOverrides & {
        from?: PromiseOrValue<string>;
    }): Promise<EIP1967Proxy>;
    getDeployTransaction(_logic: PromiseOrValue<string>, _data: PromiseOrValue<BytesLike>, overrides?: PayableOverrides & {
        from?: PromiseOrValue<string>;
    }): TransactionRequest;
    attach(address: string): EIP1967Proxy;
    connect(signer: Signer): EIP1967Proxy__factory;
    static readonly bytecode = "0x60806040526102a180380380610014816101d0565b92833981016040828203126101cb578151906001600160a01b0382168083036101cb5760208481015190946001600160401b0382116101cb570182601f820112156101cb57805161006c6100678261020b565b6101d0565b938185528682840101116101cb57859160005b8281106101b857505090600091840101521561015a57817f360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc558051806100ce575b604051607a90816102278239f35b60009284849301905af43d15610155573d6100eb6100678261020b565b9081526000833d92013e5b15610103578080806100c0565b6084906040519062461bcd60e51b82526004820152602560248201527f4549503139363750726f78793a20636f6e7374727563746f722063616c6c2066604482015264185a5b195960da1b6064820152fd5b6100f6565b60405162461bcd60e51b815260048101849052603060248201527f4549503139363750726f78793a20696d706c656d656e746174696f6e2069732060448201526f746865207a65726f206164647265737360801b6064820152608490fd5b818101840151868201850152830161007f565b600080fd5b6040519190601f01601f191682016001600160401b038111838210176101f557604052565b634e487b7160e01b600052604160045260246000fd5b6001600160401b0381116101f557601f01601f19166020019056fe60806040527f360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc546000808092368280378136915af43d82803e156040573d90f35b3d90fdfea26469706673582212209948b743a5ccb1f5e820fbb65e9a6337db1d35e4a2bfd8a54e275a67eddea0b164736f6c63430008120033";
    static readonly abi: readonly [{
        readonly inputs: readonly [{
            readonly internalType: "address";
            readonly name: "_logic";
            readonly type: "address";
        }, {
            readonly internalType: "bytes";
            readonly name: "_data";
            readonly type: "bytes";
        }];
        readonly stateMutability: "payable";
        readonly type: "constructor";
    }, {
        readonly stateMutability: "payable";
        readonly type: "fallback";
    }];
    static createInterface(): EIP1967ProxyInterface;
    static connect(address: string, signerOrProvider: Signer | Provider): EIP1967Proxy;
}
export {};
