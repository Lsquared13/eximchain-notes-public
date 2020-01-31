# Writing Smart Contracts on Eximchain
New developers writing smart contracts on Eximchain will save themselves a lot of headaches if they know upfront what versions they need of all related softwares.  Specifically, you need **Solidity@`v0.4.11`**, **Truffle@`v3.2.2`**.  You can install Truffle at that version using the regular methods, but Solidity will have to be built from source.  

## Building Solidityv0.4.11 from Source
You can find full instructions on how to build [`v0.4.11`](https://github.com/ethereum/solidity/tree/v0.4.11) from source at the [Solidity Installation docs page](https://solidity.readthedocs.io/en/latest/installing-solidity.html#building-from-source).  First off, don't bother with brew -- it doesn't find dependencies right, so it fails.  Go straight to building from source.  Like it says in the docs:

`git clone --recursive https://github.com/ethereum/solidity.git`

`cd solidity`

`git submodule update --init --recursive`

Then move on to the OS-specific pre-requisites.

Now, if you're building on a Mac, you're probably going to run into an issue at the [External Dependencies](https://solidity.readthedocs.io/en/latest/installing-solidity.html#external-dependencies) section where it says that your version of OS X is unsupported.  Luckily, that is not because something actually failed -- the script just throws an error if you're not on `10.9-12`.  You need to add another case to the version checker in [`scripts/install_deps.sh`](https://github.com/ethereum/solidity/blob/v0.4.11/scripts/install_deps.sh#L74) which looks for `10.13`, then everything will look fine.  Note that I am running on OS X `10.13.6` and everything behaved -- YMMV as OS X updates.

From there, you're basically in the clear.  Just run the final command and you should have Solidity built & installed:
```
#note: this will install binaries solc and soltest at usr/local/bin
./scripts/build.sh
```
