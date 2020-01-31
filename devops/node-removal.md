# Node Removal

## Summary

This runbook describes how to remove a node from service. The anticipated use case is to remove a maker node which has been voted out in a governance cycle, though it is not limited to that.

Let `X` be the node to be removed and `N` be the final node in the that region and role (The final node in the internal terraform node). The Procedure will go into more detail on how to determine which node `N` is.

At a high level, we replace nodes in four steps:

1. Stop Quorum on both nodes `N` and `X`
2. Use the move-vault-data.sh script to move the credentials for node `N` into the slot for node `X`
3. Terminate node `X`. Because step 2 was completed, it will be replaced with a node `N'`, which uses the credentials that node `N` used
4. Reduce the value of the appropriate count variable in the Terraform Enterprise workspace and apply the configuration, causing Terraform to remove the old node `N`

## Prerequisites

This runbook assumes you have the following permissions:

* SSH and sudo access to instances in the network via Foxpass
* Permission to terminate instances in the network
* Write access to the Terraform Enterprise workspace for the network

It also assumes you have the following installed

* jq
    * On OSX using Homebrew, you can install jq with `brew install jq`

## Networks

This information will be referenced below. If you are not operating the main network or gamma test network, you will need to determine these values yourself.

Both the main network and the gamma test network use network id `1`

**WORKSPACES REDACTED**

## Procedure

### Determine what nodes you are working with

You need the `Index` and `Public IP` of each node, the `Instance Id` for `X`, and the `Region` of both nodes (they will be in the same Region).

WARNING: This does not completely handle the index conversion for non-maker nodes. If you are not removing a maker node, have Juan or Louis double check the index calculation.

#### Determining X

Set the Eth Address you need to remove as a variable

```sh
ETH_ADDR=<Address to be removed e.g. from Governance Smart Contract>
```

Scan the regions for the node in question

```sh
REGIONS=(us-east-1 us-east-2 us-west-1 us-west-2 eu-central-1 eu-west-1 eu-west-2 ap-south-1 ap-northeast-1 ap-northeast-2 ap-southeast-1 ap-southeast-2 ca-central-1 sa-east-1)
for region in ${REGIONS[@]}
do NUM_INSTANCES=$(aws ec2 --region $region describe-instances --filters "Name=tag:EthAddress,Values=$ETH_ADDR" "Name=instance-state-name,Values=running" | jq -r '.Reservations | length')
if [ $NUM_INSTANCES -ne 0 ]
then REGION=$region
fi
echo "Searched $region"
done

# Display the region the instance was found in, stored in variable $REGION
echo "Node found in $REGION"
```

Get relevant data for the instance

```sh
DESCRIBE_X_RESULT=$(aws ec2 --region $REGION describe-instances --filters "Name=tag:EthAddress,Values=$ETH_ADDR" "Name=instance-state-name,Values=running")

# Confirm there is one instance
echo $DESCRIBE_X_RESULT | jq '.Reservations | length'

# Extract data from the result
PUBLIC_DNS_X=$(echo $DESCRIBE_X_RESULT | jq -r '.Reservations[0].Instances[0].PublicDnsName')
INSTANCE_ID_X=$(echo $DESCRIBE_X_RESULT | jq -r '.Reservations[0].Instances[0].InstanceId')
INDEX_X=$(echo $DESCRIBE_X_RESULT | jq -r '.Reservations[0].Instances[0].Tags | map(select(.Key == "RoleIndex"))' | jq '.[0].Value | tonumber')

echo "Region: $REGION"
echo "Node X - Public DNS: $PUBLIC_DNS_X"
echo "Node X - Instance Id: $INSTANCE_ID_X"
echo "Node X - Index: $INDEX_X"
```

Note that if this is not a maker node, you need to add the original number of makers and/or validators to convert to an overall index

#### Determining N

```sh
ROLE="Maker" # Set to "Validator" or "Observer" as appropriate if X is not a Maker
NETWORK_ID=<The Network ID of the network X and N belong to>

ASG_NAME=$(aws autoscaling --region $REGION describe-auto-scaling-groups --query "AutoScalingGroups[?contains(Tags[?Key==\`Role\`].Value, \`$ROLE\`)] | [?contains(Tags[?Key==\`NetworkId\`].Value,\`\"$NETWORK_ID\"\`)] | [?contains(Tags[?Key==\`FinalRoleNode\`].Value,\`\"Yes\"\`)].AutoScalingGroupName" | jq -r .[0])

DESCRIBE_N_RESULT=$(aws ec2 --region $REGION describe-instances --filters "Name=tag:aws:autoscaling:groupName,Values=$ASG_NAME" "Name=instance-state-name,Values=running")

# Confirm there is one instance
echo $DESCRIBE_N_RESULT | jq '.Reservations | length'

# Extract data from the result
PUBLIC_DNS_N=$(echo $DESCRIBE_N_RESULT | jq -r '.Reservations[0].Instances[0].PublicDnsName')
INDEX_N=$(echo $DESCRIBE_N_RESULT | jq -r '.Reservations[0].Instances[0].Tags | map(select(.Key == "RoleIndex"))' | jq '.[0].Value | tonumber')

echo "Node N - Public DNS: $PUBLIC_DNS_N"
echo "Node N - Index: $INDEX_N"
```

### Stop Quorum

SSH both nodes `X` and `N` and stop quorum.

```sh
FOXPASS_USER=<Your Foxpass username. e.g. 'louis'>

ssh $FOXPASS_USER@$PUBLIC_DNS_X 'sudo supervisorctl stop quorum'
ssh $FOXPASS_USER@$PUBLIC_DNS_N 'sudo supervisorctl stop quorum'
```

### Move Vault Data

SSH any vault instance and move the vault data for `N` to the slot for `X`

```sh
VAULT_IP=<Public IP of the Vault node>

ssh $FOXPASS_USER@$VAULT_IP
```

In the vault SSH terminal, login:

**LOGIN MECHANISM REDACTED**

From your own terminal, run the command to move the vault data

```sh
ssh $FOXPASS_USER@$VAULT_IP "sudo /opt/vault/bin/move-vault-data.sh --region $REGION --from-index $INDEX_N --to-index $INDEX_X"
```

### Terminate X to reboot it as N'

```sh
aws ec2 terminate-instances --instance-ids $INSTANCE_ID_X
```

### Edit and apply Terraform Configuration

First you need to check that the workspace is in the expected state:

* Log into Terraform Enterprise and access the workspace for the network the nodes belong to
* Check the run status, displayed directly underneath the run ID

Determine whether the status is appropriate based on the following table:

| Status               | Expected?  | Meaning                                    | Action                   |
| -------------------- | ---------- | ------------------------------------------ | ------------------------ |
| APPLIED              | Expected   | The last plan applied successfully         | Proceed with the runbook |
| PLANNED_AND_FINISHED | Expected   | The last plan had no effect                | Proceed with the runbook |
| NEEDS CONFIRMATION   | Unexpected | A plan is waiting to be applied            | Stop and Escalate        |
| APPLY ERRORED        | Unexpected | The last plan failed during the apply step | Stop and Escalate        |

Then change the appropriate variable in the terraform configuration:

* Click on the "Variables" tab
* Find the variable called `maker_node_counts` (or `vaildator_node_counts` or `observer_node_counts`) and click on it to edit it
* Find the value for the region nodes `X` and `N` are in and decrement it by `1`
* Click "Save Variable" and verify that a "Success" dialog appears in the bottom-left of your screen
* Scroll to the top of the page and click the "Queue Plan" button in the top-right corner of the page

Now validate that the plan does what we expect it to. Stop and escalate if the plan does not look like we expect:

If the count for the region was **not** reduced to `0`, only minimal changes are expected. You may ignore data source reads when evaluating the plan.

* Expect removal of a single-digit handful of resources related to the instance being removed, such as the ASG, launch configuration, and IAM role.
* Do **not** expect destructive changes, including changes that replace resources, to other nodes in the network. In-place changes are acceptable.

If the count for the region was reduced to `0`, more destructive changes are expected:

* Expect more thorough destruction of networking infrastructure.
* Do **not** expect changes to resources for any other region.

If everything is in order, click the button that says "Confirm & Apply" near the bottom of the page to apply the configuration.

Once you have applied the configuration, wait for it to finish and verify that the apply succeeds.

* When the apply succeeds, the node removal is complete
* If the apply operation fails, escalate. You may queue another plan and try again if it appears the problem may be sporadic (e.g. a temporary API issue)
