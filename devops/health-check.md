# Network Health Check

## Summary

This runbook describes how to perform a health check on the main network. This should be scheduled to be performed regularly.

When the health check is complete you will submit a FlowCrypt encrypted report to `louis@eximchain.com` describing any abnormalities found that may be worth investigating. If everything seems healthy, the report should simply state that no abnormalities have been found.

If during the health check you encounter a situation in which the runbook instructs you to "Escalate Immediately", you should send a telegram message to Louis describing the situation which caused you to escalate.

## Prerequisites

This runbook assumes you have the following permissions:

* SSH and sudo access to instances in the network via Foxpass
* Console access to the AWS account in which the network is running

## Networks

This information will be referenced below. If you are not health checking the main network or gamma test network, you will need to determine these values yourself.

Both the main network and the gamma test network use network id `1`

**WORKSPACES REDACTED**

## Procedure

### Check Health Metrics

**WARNING: Skip this step for now since metrics are currently broken**

Log into the AWS console and go to the CloudWatch dashboard. Select the dashboard for the network and set the dashboard to display metrics for the past week.  Look over the metrics and be sure to include any abnormalities (including when they occur) in the report.

The expected behavior of the metrics is as follows:

**TODO: After Metrics are Fixed**

### Check Vault Servers

Retrieve the vault server IPs from the Terraform Enterprise workspace. SSH each server and run the following command:

```sh
$ vault status
```

Expect a response that looks like the following:

```
Type: shamir
Sealed: false
Key Shares: 1
Key Threshold: 1
Unseal Progress: 0
Unseal Nonce: 
Version: 0.9.0
Cluster Name: vault-cluster-81ba68bc
Cluster ID: d8558d94-21a7-01ad-cffc-ff816a81a959

High-Availability Enabled: true
	Mode: active
	Leader Cluster Address: https://10.0.111.212:8201
```

In particular, check for the line `Sealed: false`. If the server is sealed or cannot be SSHed, include the IP address of the vault server in the report.

### Pick a Set of Nodes

Select 5 regions to investigate at random using the following methodology. If you want to ensure you are sufficiently random, you can use a [random number generator](https://www.random.org/) to help.

* Choose two US regions at random
* Choose two Asia-Pacific (AP) regions at random
* Choose one more random regions from all available unselected regions

From each of the 5 regions, select nodes at random using the following methodology, and retrieve their DNS name or IP address from the last run of the Terraform Enterprise workspace:

* One random maker node in that region
* One random observer node in that region
* One random validator from any two randomly selected regions

You should now have a selection of 12 nodes to check for health.

### Ensure blocks are being mined

Pick an arbitrary node from your list and SSH into it.  Attach the exim console.

```sh
$ sudo exim attach $EXIM_IPC
```

Check the block number by typing `eth.blockNumber` into the exim console. Wait about 20 seconds and check again. The block number should have increased.  If it does not, continue to check periodically for at least 3 minutes. If after 3 or more minutes have passed, the block number is still not increasing, select another node and repeat the test. If that test still fails, try a third node.

If the test fails on one or two nodes before finding one that works, include the DNS or IP of the node(s) that do not work in your report. If the test fails on three nodes in a row, escalate immediately.

### Check Difficulty Statistics

Attach the exim console and run the difficulty statistic script:

```sh
$ sudo exim attach --preload /opt/quorum/bin/difficulty-stats.js $EXIM_IPC
```

You should get an output that looks like the following:

```
Difficulty statistics for last 2016 blocks:
Mean: 18385822.217261903
Variance: 7700164020.729167
Standard Deviation: 87750.57846378659
```

Include this output in the health check report.

### Check that block numbers are synced

Now SSH all 12 nodes in the list and check that their block numbers are roughly even. Attach the exim console and run the following on each node:

```javascript
> eth.blockNumber
```

If any nodes are more than 25 blocks behind the highest block number returned by any node, include the node DNS/IP names in the report.

### Check Peers

SSH all 12 nodes again and check that their peers look appropriate. Attach the exim console and run the following on each node:

```javascript
> admin.peers
```

Scan the list of peers and include any abnormalities in the report. Abnormalities to look for include:

* Does any node have no peers, or have very few (less than 5) peers?
* Are any peered nodes using a client other than the exim client? Expect client names to look something like `exim/v1.8.16-unstable-c50dfcc6/linux-amd64/go1.10.3`
* Are any peers using an eth protocol other than `eth/63`

### Check Logs for Errors

SSH all 12 nodes again and scan their logs for errors:

```sh
$ cat /opt/quorum/log/quorum-error.log | grep ERROR
```

Report any output on the health check report.

### Check that makers are strongly connected

**TODO: Use Graphing Tool**