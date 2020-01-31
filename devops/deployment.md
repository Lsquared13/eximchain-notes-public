# Deployment

## Summary

This runbook describes how to perform a deployment on the eximchain main network or eximchain gamma test network. This process brings the software running on the network up to date with the master branch of [terraform-aws-quorum-cluster](https://github.com/Eximchain/terraform-aws-quorum-cluster) and the software versions installed by the packer build.

If at any point you are instructed to "Escalate Immediately", you should send a telegram message to Louis describing the situation which caused you to escalate.

## Prerequisites

This runbook assumes you have the following permissions:

* SSH and sudo access to instances in the network via Foxpass
* Access to the deployment AWS credentials
* GitHub permissions to merge branches in `terraform-aws-quorum-cluster`
* Read access to the `deployment-scripts` repository

If you lack any of these permissions, you will need to escalate for help when you reach the points where you need these permissions.

### ssh-to

You will need to have the tool [ssh-to](https://github.com/Comcast/ssh-to) installed. If you do not have it installed, do the following (on OSX) to install it:

```sh
brew tap comcast/opensource https://github.com/Comcast/homebrew-opensource.git
brew install ssh-to
```

## Networks

This information will be referenced below. This runbook only covers deploying to these networks. Other networks we simply destroy and recreate.

Both the main network and the gamma test network use network id `1`

**WORKSPACES REDACTED**

## Procedure

### Clone deployment-scripts

If you don't yet have the deployment-scripts repository cloned, open a terminal window and clone it.

Via SSH:

```sh
git clone git@github.com:Eximchain/deployment-scripts.git
```

Via HTTPS:

```sh
git clone https://github.com/Eximchain/deployment-scripts.git
```

Open the directory up and sync from master

```sh
cd deployment-scripts
git checkout master
git pull --rebase
rm *servers.json
```

Configure this directory for using `ssh-to` and the deployment scripts

```sh
$ export AWS_ACCESS_KEY_ID=<AWS Access Key ID for account that is being deployed to>
$ export AWS_SECRET_ACCESS_KEY=<AWS Secret Access Key for account that is being deployed to>
$ SSH_USER=<Foxpass username to use for SSH purposes>

$ export SSH_OPTS=-oStrictHostKeyChecking=no
```

Leave this window open and available for the duration of the deployment.

### Merge master into deployment-gate

This step fixes the version of the code that will be deployed so that commits may still be made to `master`.

* Navigate to the [terraform-aws-quorum-cluster](https://github.com/Eximchain/terraform-aws-quorum-cluster) repository
* Merge the branch `master` into `deployment-gate`

### Trigger backup in each region

Run the following commands to generate an `ssh-to` config containing one node from each region to perform a backup:

```sh
$ python3 aws-create-config-for-backup.py --ssh-user $SSH_USER
$ cp backup-servers.json servers.json
```

Now use ssh-to to trigger a backup in each region:

```sh
$ ssh-to --loop backup 'python /opt/quorum/bin/backup-chain-data.py backup'
```

Escalate if this process encounters any errors.

### Prepare local repository version

In any local directory that does not already have the `terraform-aws-quorum-cluster` repository checked out, do:

```sh
git clone https://github.com/Eximchain/terraform-aws-quorum-cluster.git
cd terraform-aws-quorum-cluster
git checkout deployment-gate
cd packer
```

### Build packer images

Now spawn two more terminals from that terminal so you have three terminals in the `packer` directory of the repository you just cloned.  You will run one packer build in each terminal.

#### Set up credentials

In each of the three terminals, configure the AWS Credentials:

```sh
export AWS_ACCESS_KEY_ID=<Access Key ID>
export AWS_SECRET_ACCESS_KEY=<Secret Access Key>
```

#### Terminal 1: Build Quorum

In the first terminal, build AMIs for quorum

```sh
packer build quorum.json
```

#### Terminal 2: Build Bootnodes

In the second terminal, build AMIs for bootnodes

```sh
packer build bootnode.json
```

#### Terminal 3: Build Vault

If this is a deployment to gamma, build the non-enterprise version of vault

```sh
packer build vault-consul.json
```

If this is a main network deployment, build the enterprise version

```sh
packer build -var-file=enterprise-vault-secrets.json vault-enterprise.json
```

#### Wait for builds

Wait for all builds to finish successfully. If any builds fail, restart them. If they continue to fail, escalate immediately. Include a screenshot of the packer logs preceding the error.

### Update Terraform Enterprise Variables

Go to the network's [Terraform Enterprise workspace](#Networks) and select the 'Variables' tab. Find the following variables, and replace their values with the AMI IDs that were produced by the packer builds.

* `vault_consul_ami`
* `bootnode_amis`
* `quorum_amis`

**TODO: Automate with TFE pushvars CLI command**

If the deployment issue instructs you to change any variables in the workspace, do so now.

### Merge network branch to begin deployment

* Navigate to the [terraform-aws-quorum-cluster](https://github.com/Eximchain/terraform-aws-quorum-cluster) repository
* If deploying to gamma: Merge the branch `deployment-gate` into `eximchain-gamma-test-network`
* If deploying to main-network: Merge the branch `deployment-gate` into `eximchain-main-network`

This merge should trigger a new run in the Terraform Enterprise workspace

### Validate and approve the deployment run

#### Open the new run

Go to the network's [Terraform Enterprise workspace](#Networks) and select the 'Runs' tab. Verify that there is only one run queued (it should be the run that was triggered by the merge) and select that run.

If there are runs queued ahead of your run, escalate immediately.

#### Validate the plan

Let the plan run and look it over.  If the plan fails, escalate immediately.

Verify that all actions are expected. The deployment issue should provide a high level overview on what to expect. In particular, verify that the plan does not involve destroying and recreating the `aws_autoscaling_group` resources that include our nodes (we expect it to change the ASG, but not recreate it).

If you are unsure whether you should approve the plan, escalate immediately to get another opinion.

Note that we currently expect BackupLambda to redownload as well. We hope to resolve this issue in the near future.

#### Apply the plan

Click the 'Confirm & Apply' button to apply the plan. In the comment box, paste a link to the GitHub deployment issue for the deployment you are performing,

Wait for the plan to finish applying. If applying the plan fails, escalate immediately.

### Reboot Instances with new AMIs

This section uses the [ssh-to](https://github.com/Comcast/ssh-to) tool to replace instances with new ones running the new AMI. Each role is split into two groups, `a` and `b`, of roughly even size. The high-level process for each role is as follows:

1. Shut down all nodes in group `a` and allow the ASG to replace them
2. Health check the new nodes in group `a` and wait until they are running
3. Shut down all nodes in group `b` and allow the ASG to replace them
4. Health check the new nodes in group `b` and wait until they are running
5. Check all new nodes and ensure they are running the updated AMI

After this is done for all roles, you will finish the deployment by verifying that the network is still producing blocks.

**This section should be performed in the deployment-scripts terminal that was opened at the beginning of the deployment**

#### Setup

Configure with initial `servers.json`

```sh
python3 aws-create-ssh-config.py --ssh-user $SSH_USER
cp initial-servers.json servers.json
```

#### Vault

**ONLY PERFORM THIS STEP IF THERE WAS AN UPDATE TO THE VAULT-CONSUL AMI**

##### Group A

Shut down the nodes in group `a`

```sh
$ ssh-to --loop vault-a "sudo init 0"
```

Run this script to wait for the ASGs to replace the previous instances and populate a new server list:

```sh
$ python3 aws-refresh-ssh-config.py --ssh-user $SSH_USER --refresh-group vault-a
$ cp temp-servers.json servers.json
```

**MAIN NETWORK**

Now health check the replacement instances. Run the following command:

```sh
$ ssh-to --loop vault-a "vault status"
```

Expect the following from each node. If you don't get the expected result the first time, you'll need to determine whether to wait and retry (e.g. a node that is still syncing), or whether the situation will not resolve itself and therefore needs to be escalated.

- Expect `Sealed: false` to be one of the key-value pairs output. If some nodes report being sealed, escalate and provide the address of any sealed nodes so they can be unsealed.

**GAMMA NETWORK**

You must unseal the vault servers in gamma now. Run the following commands:

```sh
$ UNSEAL_KEY=<Unseal Key>
$ ssh-to --loop vault-a "vault unseal $UNSEAL_KEY"
```

##### Group B

Now we repeat the process for group `b`. Shut down the nodes in group `b`

```sh
$ cp initial-servers.json servers.json
$ ssh-to --loop vault-b "sudo init 0"
```

Run this script to wait for the ASGs to replace the previous instances and populate a new server list:

```sh
$ python3 aws-refresh-ssh-config.py --ssh-user $SSH_USER --refresh-group vault-b
$ cp temp-servers.json servers.json
```

**MAIN NETWORK**

Now health check the replacement instances. Run the following command:

```sh
$ ssh-to --loop vault-b "vault status"
```

Expect the following from each node. If you don't get the expected result the first time, you'll need to determine whether to wait and retry (e.g. a node that is still syncing), or whether the situation will not resolve itself and therefore needs to be escalated.

- Expect `Sealed: false` to be one of the key-value pairs output. If some nodes report being sealed, escalate and provide the address of any sealed nodes so they can be unsealed.

**GAMMA NETWORK**

You must unseal the vault servers in gamma now. Run the following commands (assuming 3 unseal keys):

```sh
$ UNSEAL_KEY=<Unseal Key>
$ ssh-to --loop vault-a "vault unseal $UNSEAL_KEY"
```

#### Consul

**ONLY PERFORM THIS STEP IF THERE WAS AN UPDATE TO THE VAULT-CONSUL AMI**

##### Group A

Shut down the nodes in group `a`

```sh
$ cp initial-servers.json servers.json
$ ssh-to --loop consul-a "sudo init 0"
```

Run this script to wait for the ASGs to replace the previous instances and populate a new server list:

```sh
$ python3 aws-refresh-ssh-config.py --ssh-user $SSH_USER --refresh-group consul-a
$ cp temp-servers.json servers.json
```

Now health check the replacement instances. Run the following command:

```sh
$ ssh-to --loop consul-a "consul members"
```

Expect the following from each node. If you don't get the expected result the first time, you'll need to determine whether to wait and retry (e.g. a node that is still syncing), or whether the situation will not resolve itself and therefore needs to be escalated.

- Expect all nodes are listed by each call and have `Status: alive`

##### Group B

Now we repeat the process for group `b`. Shut down the nodes in group `b`

```sh
$ cp initial-servers.json servers.json
$ ssh-to --loop consul-b "sudo init 0"
```

Run this script to wait for the ASGs to replace the previous instances and populate a new server list:

```sh
$ python3 aws-refresh-ssh-config.py --ssh-user $SSH_USER --refresh-group consul-b
$ cp temp-servers.json servers.json
```

Now health check the replacement instances. Run the following command:

```sh
$ ssh-to --loop consul-b "consul members"
```

Expect the following from each node. If you don't get the expected result the first time, you'll need to determine whether to wait and retry (e.g. a node that is still syncing), or whether the situation will not resolve itself and therefore needs to be escalated.

- Expect all nodes are listed by each call and have `Status: alive`

#### Bootnodes

##### Group A

Shut down the nodes in group `a`

```sh
$ cp initial-servers.json servers.json
$ ssh-to --loop bootnode-a "sudo init 0"
```

Run this script to wait for the ASGs to replace the previous instances and populate a new server list:

```sh
$ python3 aws-refresh-ssh-config.py --ssh-user $SSH_USER --refresh-group bootnode-a
$ cp temp-servers.json servers.json
```

Now health check the replacement instances. Run the following commands:

```sh
$ ssh-to --loop bootnode-a 'ls /opt/quorum/log'
$ ssh-to --loop bootnode-a "tail /opt/quorum/log/bootnode-error.log"
```

Expect the following from each node. If you don't get the expected result the first time, you'll need to determine whether to wait and retry (e.g. a node that is still syncing), or whether the situation will not resolve itself and therefore needs to be escalated.

- Expect no ERROR logs in the tail output

##### Group B

Now we repeat the process for group `b`. Shut down the nodes in group `b`

```sh
$ cp initial-servers.json servers.json
$ ssh-to --loop bootnode-b "sudo init 0"
```

Run this script to wait for the ASGs to replace the previous instances and populate a new server list:

```sh
$ python3 aws-refresh-ssh-config.py --ssh-user $SSH_USER --refresh-group bootnode-b
$ cp temp-servers.json servers.json
```

Now health check the replacement instances. Run the following command:

```sh
$ ssh-to --loop bootnode-b 'ls /opt/quorum/log'
$ ssh-to --loop bootnode-b "tail /opt/quorum/log/bootnode-error.log"
```

Expect the following from each node. If you don't get the expected result the first time, you'll need to determine whether to wait and retry (e.g. a node that is still syncing), or whether the situation will not resolve itself and therefore needs to be escalated.

- Expect no ERROR logs in the tail output

#### Node Reboot

Now we must reboot all the nodes before replacing them so the new bootnodes can learn about the nodes in the network

```sh
ssh-to --loop maker-a "sudo supervisorctl stop quorum && sudo supervisorctl start quorum"
ssh-to --loop maker-b "sudo supervisorctl stop quorum && sudo supervisorctl start quorum"
ssh-to --loop validator-a "sudo supervisorctl stop quorum && sudo supervisorctl start quorum"
ssh-to --loop validator-b "sudo supervisorctl stop quorum && sudo supervisorctl start quorum"
ssh-to --loop observer-a "sudo supervisorctl stop quorum && sudo supervisorctl start quorum"
ssh-to --loop observer-b "sudo supervisorctl stop quorum && sudo supervisorctl start quorum"
```

#### Makers

##### Group A

Shut down the nodes in group `a`

```sh
$ cp initial-servers.json servers.json
$ ssh-to --loop maker-a "sudo init 0"
```

Run this script to wait for the ASGs to replace the previous instances and populate a new server list:

```sh
$ python3 aws-refresh-ssh-config.py --ssh-user $SSH_USER --refresh-group maker-a
$ cp temp-servers.json servers.json
```

Now health check the replacement instances. Run the following command:

```sh
# Check for logs to ensure quorum is running
$ ssh-to --loop maker-a 'ls /opt/quorum/log'
# Ensure node has peers
$ ssh-to --loop maker-a 'curl -s -XPOST -H "Content-Type: application/json" -d"{\"jsonrpc\":\"2.0\",\"method\":\"admin_peers\",\"id\":1}" $(curl -s http://169.254.169.254/latest/meta-data/public-hostname):22000 | jq -r .result'
# Check block number
$ ssh-to --loop maker-a 'curl -s -XPOST -H "Content-Type: application/json" -d"{\"jsonrpc\":\"2.0\",\"method\":\"eth_blockNumber\",\"id\":1}" $(curl -s http://169.254.169.254/latest/meta-data/public-hostname):22000 | jq -r .result'
# Check if node is syncing
$ ssh-to --loop maker-a 'curl -s -XPOST -H "Content-Type: application/json" -d"{\"jsonrpc\":\"2.0\",\"method\":\"eth_syncing\",\"id\":1}" $(curl -s http://169.254.169.254/latest/meta-data/public-hostname):22000 | jq -r .result'
```

Expect the following from each node. If you don't get the expected result the first time, you'll need to determine whether to wait and retry (e.g. a node that is still syncing), or whether the situation will not resolve itself and therefore needs to be escalated.

- Expect the block numbers to all be roughly the same and nonzero. The number should be at least 4 digits in hex.
- Expect nodes to return `false` for the syncing call

##### Group B

Now we repeat the process for group `b`. Shut down the nodes in group `b`

```sh
$ cp initial-servers.json servers.json
$ ssh-to --loop maker-b "sudo init 0"
```

Run this script to wait for the ASGs to replace the previous instances and populate a new server list:

```sh
$ python3 aws-refresh-ssh-config.py --ssh-user $SSH_USER --refresh-group maker-b
$ cp temp-servers.json servers.json
```

Now health check the replacement instances. Run the following command:

```sh
# Check for logs to ensure quorum is running
$ ssh-to --loop maker-b 'ls /opt/quorum/log'
# Ensure node has peers
$ ssh-to --loop maker-b 'curl -s -XPOST -H "Content-Type: application/json" -d"{\"jsonrpc\":\"2.0\",\"method\":\"admin_peers\",\"id\":1}" $(curl -s http://169.254.169.254/latest/meta-data/public-hostname):22000 | jq -r .result'
# Check block number
$ ssh-to --loop maker-b 'curl -s -XPOST -H "Content-Type: application/json" -d"{\"jsonrpc\":\"2.0\",\"method\":\"eth_blockNumber\",\"id\":1}" $(curl -s http://169.254.169.254/latest/meta-data/public-hostname):22000 | jq -r .result'
# Check if node is syncing
$ ssh-to --loop maker-b 'curl -s -XPOST -H "Content-Type: application/json" -d"{\"jsonrpc\":\"2.0\",\"method\":\"eth_syncing\",\"id\":1}" $(curl -s http://169.254.169.254/latest/meta-data/public-hostname):22000 | jq -r .result'
```

Expect the following from each node. If you don't get the expected result the first time, you'll need to determine whether to wait and retry (e.g. a node that is still syncing), or whether the situation will not resolve itself and therefore needs to be escalated.

- Expect the block numbers to all be roughly the same and nonzero. The number should be at least 4 digits in hex.
- Expect nodes to return `false` for the syncing call

#### Validators

##### Group A

Shut down the nodes in group `a`

```sh
$ cp initial-servers.json servers.json
$ ssh-to --loop validator-a "sudo init 0"
```

Run this script to wait for the ASGs to replace the previous instances and populate a new server list:

```sh
$ python3 aws-refresh-ssh-config.py --ssh-user $SSH_USER --refresh-group validator-a
$ cp temp-servers.json servers.json
```

Now health check the replacement instances. Run the following command:

```sh
# Check for logs to ensure quorum is running
$ ssh-to --loop validator-a 'ls /opt/quorum/log'
# Ensure node has peers
$ ssh-to --loop validator-a 'curl -s -XPOST -H "Content-Type: application/json" -d"{\"jsonrpc\":\"2.0\",\"method\":\"admin_peers\",\"id\":1}" $(curl -s http://169.254.169.254/latest/meta-data/public-hostname):22000 | jq -r .result'
# Check block number
$ ssh-to --loop validator-a 'curl -s -XPOST -H "Content-Type: application/json" -d"{\"jsonrpc\":\"2.0\",\"method\":\"eth_blockNumber\",\"id\":1}" $(curl -s http://169.254.169.254/latest/meta-data/public-hostname):22000 | jq -r .result'
# Check if node is syncing
$ ssh-to --loop validator-a 'curl -s -XPOST -H "Content-Type: application/json" -d"{\"jsonrpc\":\"2.0\",\"method\":\"eth_syncing\",\"id\":1}" $(curl -s http://169.254.169.254/latest/meta-data/public-hostname):22000 | jq -r .result'
```

Expect the following from each node. If you don't get the expected result the first time, you'll need to determine whether to wait and retry (e.g. a node that is still syncing), or whether the situation will not resolve itself and therefore needs to be escalated.

- Expect the block numbers to all be roughly the same and nonzero. The number should be at least 4 digits in hex.
- Expect nodes to return `false` for the syncing call

##### Group B

Now we repeat the process for group `b`. Shut down the nodes in group `b`

```sh
$ cp initial-servers.json servers.json
$ ssh-to --loop validator-b "sudo init 0"
```

Run this script to wait for the ASGs to replace the previous instances and populate a new server list:

```sh
$ python3 aws-refresh-ssh-config.py --ssh-user $SSH_USER --refresh-group validator-b
$ cp temp-servers.json servers.json
```

Now health check the replacement instances. Run the following command:

```sh
# Check for logs to ensure quorum is running
$ ssh-to --loop validator-b 'ls /opt/quorum/log'
# Ensure node has peers
$ ssh-to --loop validator-b 'curl -s -XPOST -H "Content-Type: application/json" -d"{\"jsonrpc\":\"2.0\",\"method\":\"admin_peers\",\"id\":1}" $(curl -s http://169.254.169.254/latest/meta-data/public-hostname):22000 | jq -r .result'
# Check block number
$ ssh-to --loop validator-b 'curl -s -XPOST -H "Content-Type: application/json" -d"{\"jsonrpc\":\"2.0\",\"method\":\"eth_blockNumber\",\"id\":1}" $(curl -s http://169.254.169.254/latest/meta-data/public-hostname):22000 | jq -r .result'
# Check if node is syncing
$ ssh-to --loop validator-b 'curl -s -XPOST -H "Content-Type: application/json" -d"{\"jsonrpc\":\"2.0\",\"method\":\"eth_syncing\",\"id\":1}" $(curl -s http://169.254.169.254/latest/meta-data/public-hostname):22000 | jq -r .result'
```

Expect the following from each node. If you don't get the expected result the first time, you'll need to determine whether to wait and retry (e.g. a node that is still syncing), or whether the situation will not resolve itself and therefore needs to be escalated.

- Expect the block numbers to all be roughly the same and nonzero. The number should be at least 4 digits in hex.
- Expect nodes to return `false` for the syncing call

#### Observers

##### Group A

Shut down the nodes in group `a`

```sh
$ cp initial-servers.json servers.json
$ ssh-to --loop observer-a "sudo init 0"
```

Run this script to wait for the ASGs to replace the previous instances and populate a new server list:

```sh
$ python3 aws-refresh-ssh-config.py --ssh-user $SSH_USER --refresh-group observer-a
$ cp temp-servers.json servers.json
```

Now health check the replacement instances. Run the following command:

```sh
# Check for logs to ensure quorum is running
$ ssh-to --loop observer-a 'ls /opt/quorum/log'
# Ensure node has peers
$ ssh-to --loop observer-a 'curl -s -XPOST -H "Content-Type: application/json" -d"{\"jsonrpc\":\"2.0\",\"method\":\"admin_peers\",\"id\":1}" $(curl -s http://169.254.169.254/latest/meta-data/public-hostname):22000 | jq -r .result'
# Check block number
$ ssh-to --loop observer-a 'curl -s -XPOST -H "Content-Type: application/json" -d"{\"jsonrpc\":\"2.0\",\"method\":\"eth_blockNumber\",\"id\":1}" $(curl -s http://169.254.169.254/latest/meta-data/public-hostname):22000 | jq -r .result'
# Check if node is syncing
$ ssh-to --loop observer-a 'curl -s -XPOST -H "Content-Type: application/json" -d"{\"jsonrpc\":\"2.0\",\"method\":\"eth_syncing\",\"id\":1}" $(curl -s http://169.254.169.254/latest/meta-data/public-hostname):22000 | jq -r .result'
```

Expect the following from each node. If you don't get the expected result the first time, you'll need to determine whether to wait and retry (e.g. a node that is still syncing), or whether the situation will not resolve itself and therefore needs to be escalated.

- Expect the block numbers to all be roughly the same and nonzero. The number should be at least 4 digits in hex.
- Expect nodes to return `false` for the syncing call

##### Group B

Now we repeat the process for group `b`. Shut down the nodes in group `b`

```sh
$ cp initial-servers.json servers.json
$ ssh-to --loop observer-b "sudo init 0"
```

Run this script to wait for the ASGs to replace the previous instances and populate a new server list:

```sh
$ python3 aws-refresh-ssh-config.py --ssh-user $SSH_USER --refresh-group observer-b
$ cp temp-servers.json servers.json
```

Now health check the replacement instances. Run the following command:

```sh
# Check for logs to ensure quorum is running
$ ssh-to --loop observer-b 'ls /opt/quorum/log'
# Ensure node has peers
$ ssh-to --loop observer-b 'curl -s -XPOST -H "Content-Type: application/json" -d"{\"jsonrpc\":\"2.0\",\"method\":\"admin_peers\",\"id\":1}" $(curl -s http://169.254.169.254/latest/meta-data/public-hostname):22000 | jq -r .result'
# Check block number
$ ssh-to --loop observer-b 'curl -s -XPOST -H "Content-Type: application/json" -d"{\"jsonrpc\":\"2.0\",\"method\":\"eth_blockNumber\",\"id\":1}" $(curl -s http://169.254.169.254/latest/meta-data/public-hostname):22000 | jq -r .result'
# Check if node is syncing
$ ssh-to --loop observer-b 'curl -s -XPOST -H "Content-Type: application/json" -d"{\"jsonrpc\":\"2.0\",\"method\":\"eth_syncing\",\"id\":1}" $(curl -s http://169.254.169.254/latest/meta-data/public-hostname):22000 | jq -r .result'
```

Expect the following from each node. If you don't get the expected result the first time, you'll need to determine whether to wait and retry (e.g. a node that is still syncing), or whether the situation will not resolve itself and therefore needs to be escalated.

- Expect the block numbers to all be roughly the same and nonzero. The number should be at least 4 digits in hex.
- Expect nodes to return `false` for the syncing call

#### Final Version Check

Run this command to create a final list of the new servers:

```sh
$ python3 aws-create-ssh-config.py --ssh-user $SSH_USER --final
$ cp final-servers.json servers.json
```

SSH all the nodes and check the deployment token.

```sh
$ ssh-to --loop all-servers "cat /opt/deployment-token.txt"
$ ssh-to --loop all-quorum 'curl -s -XPOST -H "Content-Type: application/json" -d"{\"jsonrpc\":\"2.0\",\"method\":\"eth_blockNumber\",\"id\":1}" $(curl -s http://169.254.169.254/latest/meta-data/public-hostname):22000 | jq -r .result'
```

Ensure it is the expected token for this deployment (the same as the name of the deployment). If you see an unexpected token, escalate and include details on the nodes that do not show the expected token.

Once you verify all nodes are running the correct AMI, the deployment is complete.