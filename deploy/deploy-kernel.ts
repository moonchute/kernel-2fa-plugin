import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'

const deployKernel: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const entrypoint = "0x0576a174D229E3cFA37253523E645A78A0C91B57";
    const { deployments, ethers } = hre;
    const { deploy } = deployments;
    const [deployer] = await ethers.getSigners();
  console.log("Deployer address: ", await deployer.getAddress());
    const deployerAddress = await deployer.getAddress();

    await deploy('KernelFactory', {
        from: deployerAddress,
        args: [entrypoint],
        log: true,
        deterministicDeployment: true
    });

  await deploy('ZeroDevSessionKeyPlugin', {
    from: deployerAddress,
    log: true,
    deterministicDeployment: true
  });
}

export default deployKernel
deployKernel.tags = ['ZeroDev']
