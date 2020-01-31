# Clean AWS Dev Account

## Summary

This runbook describes how to clean the Eximchain AWS development account. This should be done occasionally to ensure we don't pay for resources accidentally left up indefinitely.

## Prerequisites

* You must have CLI credentials and console access to the AWS dev account
* You must install [cloud-nuke](https://github.com/gruntwork-io/cloud-nuke) on your local machine

## Procedure

### Ensure correct AWS credentials

Ensure the terminal you are using does not have a credential variable set:

```sh
$ echo $AWS_ACCESS_KEY_ID
```

Expect a blank line. If this command outputs a credential, open a fresh terminal and try the command again to confirm that terminal doesn't have a credential.

We expect that the credentials in your AWS CLI configuration file are development account credentials. Main Network and Gamma Network credentials should never be stored in this file. If you have any reason to believe your stored credentials are for another account, stop and send a Telegram message to Louis to get a fresh set of credentials.

**WARNING: IF YOU DO NOT COMPLETE THIS STEP YOU RISK DESTROYING OUR ENTIRE BLOCK HISTORY. BE ABSOLUTELY SURE YOU ARE USING DEVELOPMENT ACCOUNT CREDENTIALS BEFORE CONTINUING**

### Nuke the Dev Account

Use cloud-nuke to automatically destroy most resources in the account:

```sh
$ cloud-nuke aws
```

Look over the resources, confirm one more time that they do not appear to be main network resources, then confirm and nuke the account.

## Log into the AWS console

Go to `https://REDACTED.signin.aws.amazon.com/console` and sign in with your IAM user

## Delete remaining resources

cloud-nuke does not destroy every AWS resource. It focuses primarily on EC2-related resources.  You'll need to check the following service consoles for any remaining resources and delete them. Note that for services on this list, resources may be deleted indiscriminately.

* S3
* DynamoDB
* CloudFront
* Lambda
* EFS
* DocumentDB
* Elastic Beanstalk
* API Gateway
* CodePipelines
* Key Management Service (Schedule keys for 7 day deletion)

### Clean Route53

Unlike the above services, resources in Route53 cannot be deleted indiscriminately. They will need to be deleted while preserving the few things we actually need.

#### Delete extra hosted zones

First check the list of hosted zones. There should be one public hosted zone for domain `eximchain-dev.com.`. That zone must be preserved. Other hosted zones may be completely deleted.

#### Delete extra records

Now select the `eximchain-dev.com.` public hosted zone to view the records. Remove all the records **except** for the following records which need to remain:

* The `NS` and `SOA` records for `eximchain-dev.com.`
* The `CNAME` record for `_5b222e30fcf9f1ea6af5937493befb9a.eximchain-dev.com.` (This is required to renew our ACM certificates)
* The `A` record for `gamma-tx-executor-us-east.eximchain-dev.com.` (Our gamma tx executor)