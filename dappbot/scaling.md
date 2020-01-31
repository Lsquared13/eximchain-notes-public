# Scaling Analysis for Dapperator

## Proof of Concept scaling problems

Per Dapp Resources:

- S3 bucket
- Dappseed in Dappseed bucket
- CodePipeline
- Cloudfront Distribution
- DNS Record
- DynamoDB Item

Relevant Limits:

- S3 buckets: 100 default, max limit 1,000
- CodePipelines: 300 default, only 60 if periodically checking for source changes
- Cloudfront Distributions: 200 default
- DNS Records: 10,000 default

Conclusion: To scale past ~1,000 dapps we need to avoid creating an S3 bucket, a CloudFront Distribution, and a permanent CodePipeline for each Dapp

## Basic Offering

The following architectural changes should scale to an indefinite number of users. We could use this as a baseline offering and charge enough extra for other offerings that our scaling demands stay under control.

Basic Dappsmith Offering:

- Dapps served from shared domain we manage (e.g. `shared.dapperator.com/mydapp`)
- Dapps served on backend served through a single API Gateway
- Dapps deployed into a single bucket by CodePipeline that is deleted after completion

This reduces our per-Dapp resources to:

- Dappseed in Dappseed bucket
- A bundle of S3 objects produced by build
- A DynamoDB Item

None of those things have limits. We just have to pay for our usage in S3 and DynamoDB.

## Potential Premium Offerings

The following per-Dapp architectures can be used as premium offerings, though account-level limits prevent us from using these for an indefinite number of people without also creating and managing an indefinite number of AWS accounts.

### CloudFront CDN Served

A version that serves the user's Dapp globally via the CloudFront CDN.

#### Benefits

- Dapp caching at Edge locations for better performance, especially geographically far from the origin.
- Dapps get their own domain name, instead of being hosted in a shared domain

#### Scaling Problems

- S3 bucket per-Dapp limits us to (less than) 1,000 Dapps per account
- CloudFront Web Distribution per-Dapp (though S3 buckets are the more pressing limit)

### Continuous Updates

A version that allows users to push updates to their Dapp to customize it. A workflow like GitHub Pages.

#### Benefits

- User can push updates to their Dapp and have the Dapp update in real time

#### Scaling Problems

- Requirement to handle changes in real time necessitates a CodePipeline per-Dapp. That has a default account limit around 300.

### Unique Domain

A version that provisions a unique API Gateway without a CLoudFront distribution. Used to give a user their own domain without the CDN delivery.

#### Benefits

- Dapps get their own Domain Name

#### Scaling Problems

- Likely requires an API Gateway per-Dapp. The API Gateways created by this offering would conflict with the CloudFront CDN offering
- May require an S3 bucket per-Dapp, which would also conflict with CloudFront CDN offering. We could probably work around this by having Lambda transform the request into one that reads from a single bucket.

### Provisioned Multi-Dapp Domain

A version in which a user representing an organization provisions a shared domain to host multiple Dapps.

Haven't yet worked out how we'd handle authentication and such, and this requires more design and dev work than the other offerings, but in principle this seems like something we could offer.

#### Benefits

- Organization gets their own domain, and can create lots of Dapps without stressing our account-limited resources

#### Scaling Problems

- The per-organization 'directory service' would use resources we have limits on
