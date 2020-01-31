# eximchain-notes
Private repository for shared notes and Issues that don't fit into other repositories.  Best place to keep documentation about processes or frequently asked questions.

## Table of Contents
* [Key Documents](#key-documents)
   * [Infrastructure](#infrastructure)
   * [Product](#product)
* [Eximchain Repository Overview](#eximchain-repository-overview)
   * [Infrastructure](#infrastructure-1)
      * [Core Network Infrastructure](#core-network-infrastructure)
      * [Client Infrastructure](#client-infrastructure)
   * [Product](#product-1)
      * [Eximchain Network &amp; Utilities](#eximchain-network--utilities)
      * [Vault Guardian](#vault-guardian)
      * [Passport App](#passport-app)
      * [ABI Conversion Tools](#abi-conversion-tools)
   * [Unknown Status](#unknown-status)

Created by [gh-md-toc](https://github.com/ekalinin/github-markdown-toc)

## Key Documents

### Infrastructure
- [Cleaning out the Dev Account](/runbooks/clean-dev.md)
- Eximchain Network
   - [Deploying](/runbooks/deployment.md)
   - [Health Checking](/runbooks/health-check.md)
   - [Removing Nodes](/runbooks/node-removal.md)

### Product
- [Redux Primer](/redux-primer.md)
- [Static Serverless Apps on AWS](/runbooks/simple-static-aws.md)
- [Configuring CORS (on above infra)](/runbooks/how-to-cors.md)

## Eximchain Repository Overview

Eximchain software can be broadly classified first by whether it supports Eximchain network infrastructure or a product.  Repos which are responsible for setting up a product's infrastructure are grouped along with the products.

### Infrastructure

Infrastructure software is Eximchain software that supports either the running of the core network, or connecting to the core network as a client. Infrastructure software is intended to be used by technical users.

#### Core Network Infrastructure

- [terraform-aws-quorum-cluster](https://github.com/Eximchain/terraform-aws-quorum-cluster): The top-level repository for launching an Eximchain network from scratch.  This repository uses [packer](https://www.packer.io) and [terraform](https://www.terraform.io) to launch all the infrastructure and software to run a network. All other core network infrastructure software is installed on infrastructure launched by this system or otherwise supports the infrastructure launched by this repository.

- [go-ethereum](https://github.com/Eximchain/go-ethereum): The Eximchain fork of [the original geth repository](https://github.com/ethereum/go-ethereum). Our fork includes private transactions (based on [quorum](https://github.com/jpmorganchase/quorum)), a new hybrid Proof-of-Work and Proof-of-Authority 'weyl' consensus mechanism, and the ability to load account passwords in-memory from [vault](https://www.vaultproject.io). This software runs on both the core Eximchain network, and the nodes that are run by the client.

- [constellation](https://github.com/Eximchain/constellation): A Peer-to-Peer encrypted messaging layer. Used by geth for private transactions. Has not been modified by Eximchain.

- [quorum-genesis](https://github.com/Eximchain/quorum-genesis): A tool written in [node.js](https://nodejs.org/en/) to generate Eximchain genesis blocks. This tool has been updated to work with our version of geth and includes compiled bytecode for the 'block voting' contract (address `0x0000000000000000000000000000000000000020`) and the 'weyl governance' contract (address `0x000000000000000000000000000000000000002a`)

- [SoftwareUpgrade](https://github.com/Eximchain/SoftwareUpgrade): A tool written in Go to handle upgrading the software on running nodes by SSHing into them to install software. This tool uses a config file, which can be generated from terraform outputs or from the AWS CLI, to determine which nodes to upgrade. This repository also includes a tool that can be used to build a graph of the network to examine the connectivity of the network.

- [UpgradeLambda](https://github.com/Eximchain/UpgradeLambda): Go code intended to be run as an [AWS Lambda](https://aws.amazon.com/lambda/) function. This handles ensuring that instances that are replaced by an Autoscaling Group run the right software upon being relaunched, despite running on an AMI that uses the old version of software.

- [BackupLambda](https://github.com/Eximchain/BackupLambda): Go code intended to be run as an [AWS Lambda](https://aws.amazon.com/lambda/) function. This enables us to perform network backups from a single instance in each region at regular time intervals.

#### Client Infrastructure

- [terraform-aws-eximchain-node](https://github.com/Eximchain/terraform-aws-eximchain-node): The core component of a client connection to the Eximchain network and one of two possible top-level repositories for connecting to the network. This repository uses packer and terraform to launch a node which runs the Eximchain forks of [go-ethereum](https://github.com/Eximchain/go-ethereum) and [constellation](https://github.com/Eximchain/constellation) and downloads the genesis block and list of bootnodes from the [eximchain-network-data](https://github.com/Eximchain/eximchain-network-data) repository. This repository is capable of launching multiple nodes behind a load balancer for horizontal scaling of read requests.

- [terraform-aws-tx-executor](https://github.com/Eximchain/terraform-aws-eximchain-tx-executor): The other possible top-level repository for connecting to the network. This uses [packer](https://www.packer.io) and [terraform](https://www.terraform.io) to launch the infrastructure for an [eximchain-transaction-executor](https://github.com/Eximchain/eximchain-transaction-executor) in front of a node. This exposes an [ethconnect](https://github.com/kaleido-io/ethconnect) asynchronous API on port `8088` in addition to an RPC proxy microservice that accepts [ethereum JSON-RPC](https://github.com/ethereum/wiki/wiki/JSON-RPC) calls on port `8080`. This infrastructure also uses a separate vault cluster, in contrast to the standalone node which runs a vault process locally on the node.

- [eximchain-transaction-executor](https://github.com/Eximchain/eximchain-transaction-executor): A Go microservice written using [gokit](https://gokit.io/). This exposes an RPC proxy that simply forwards requests to the node, but each method is separate so it can be extended with further load balancing improvements specific to each RPC call. We currently want to use the [ethconnect](https://github.com/kaleido-io/ethconnect) API where possible.

- [eximchain-network-data](https://github.com/Eximchain/eximchain-network-data): A repository containing genesis blocks and bootnode lists for active Eximchain networks. Client infrastructure downloads the data from this repository upon connecting to an Eximchain network.

### Product
- [DappBot](/dappbot/README.md): There are many interconnected repos for this product, take a look at its README for a breakdown.
- [terraform-aws-static-website](https://github.com/Eximchain/terraform-aws-static-website): Generalized Terraform config which deploys a `create-react-app` SPA to a given domain, following the client infra from [simple-static-aws](/runbooks/simple-static-aws.md).

#### Eximchain Network & Utilities
- [Eximchain Wallet](https://github.com/Eximchain/EximchainWallet): Our own dedicated wallet for connecting to the Eximchain network, originally forked from MyCrypto and now quite customized.  Included the user interface for interacting with the governance contract.

#### Vault Guardian
- [vault-guardian-plugin](https://github.com/Eximchain/terraform-aws-vault-guardian): Guardian's Go plugin which is built into a binary that then mounts to Vault.
- [terraform-aws-vault-guardian](https://github.com/Eximchain/terraform-aws-vault-guardian): Full Guardian infrastructure which creates a Vault, mounts the plugin, and hooks it all up with the network infra required to meet our security guarantees.
- [vault-guardian-js-client](https://github.com/Eximchain/vault-guardian-js-client): Javascript client used to interact with Guardian, designed to run in either the browser or node.js.
- [vault-guardian-design](https://github.com/Eximchain/vault-guardian-design): Early version of Guardian, preserved because it includes design discussion and some network diagrams.

#### ABI Conversion Tools
- [dappsmith](https://github.com/Eximchain/abi2api): Crown jewel of our ABI codegen.  Given an ABI and some config parameters, outputs a full `create-react-app` application with a GUI that lets you interact with the contract using either Metamask or Guardian.  Heavily dependent on `abi2reducks`.
- [abi2reducks](https://github.com/Eximchain/abi2reducks): Given an ABI & some config, generate a standalone Redux store which manages form state for sending transactions to the network.  May eventually also include code required to load transaction/event/block history.
- [abi2api](https://github.com/Eximchain/abi2api): Uses `abi2lib`, `abi2oas`, and `swagger-codegen` to convert an ABI into a Swagger-powered nodejs server.
- [abi2lib](https://github.com/Eximchain/abi2lib): Given an ABI & some config, generate Javascript functions which are named according to Open API Spec conventions.  Essentially implements the functions spec'd by `abi2oas`.
- [abi2oas](https://github.com/Eximchain/abi2oas): Converts an ABI into an Open API Specification (i.e. Swagger) JSON.