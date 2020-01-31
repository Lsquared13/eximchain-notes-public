Table of Contents
=================

   * [API v1 Spec](#api-v1-spec)
      * [Overview](#overview)
         * [Variables](#variables)
         * [Root URL](#root-url)
         * [Authenticated vs. Unauthenticated Endpoints](#authenticated-vs-unauthenticated-endpoints)
         * [Data Types](#data-types)
            * [Tier Enum](#tier-enum)
            * [State Enum](#state-enum)
               * [Terminal States](#terminal-states)
               * [Transient States](#transient-states)
            * [DappItem](#dappitem)
         * [Enterprise Requirements](#enterprise-requirements)
      * [Auth APIs](#auth-apis)
         * [Login](#login)
            * [Begin Login Syntax](#begin-login-syntax)
               * [Request](#request)
               * [Successful Response](#successful-response)
               * [Challenge Response](#challenge-response)
            * [Confirm New Password Syntax](#confirm-new-password-syntax)
               * [Request](#request-1)
               * [Response](#response)
            * [Confirm MFA Login Syntax](#confirm-mfa-login-syntax)
               * [Request](#request-2)
               * [Response](#response-1)
            * [Select MFA Syntax](#select-mfa-syntax)
               * [Request](#request-3)
               * [Response](#response-2)
            * [Example: Successful Login w/ Temporary Password](#example-successful-login-w-temporary-password)
            * [Example: Login w/ SMS MFA](#example-login-w-sms-mfa)
         * [Password Reset](#password-reset)
            * [Begin Syntax](#begin-syntax)
               * [Request](#request-4)
               * [Response](#response-3)
            * [Confirm Syntax](#confirm-syntax)
               * [Request](#request-5)
               * [Response](#response-4)
            * [Example: Beginning &amp; Confirming a Password Reset](#example-beginning--confirming-a-password-reset)
         * [Configure MFA](#configure-mfa)
            * [Setup SMS MFA Syntax](#setup-sms-mfa-syntax)
               * [Request](#request-6)
               * [Response](#response-5)
            * [Begin Setup App MFA Syntax](#begin-setup-app-mfa-syntax)
               * [Request](#request-7)
               * [Response](#response-6)
            * [Confirm Setup App MFA Syntax](#confirm-setup-app-mfa-syntax)
               * [Request](#request-8)
               * [Response](#response-7)
            * [Set MFA Preference Syntax](#set-mfa-preference-syntax)
               * [Request](#request-9)
               * [Response](#response-8)
            * [Example: Configuring App MFA](#example-configuring-app-mfa)
            * [Example: Set MFA Preference to use App MFA](#example-set-mfa-preference-to-use-app-mfa)
            * [Example: Disable MFA](#example-disable-mfa)
      * [Read APIs](#read-apis)
         * [Public View](#public-view)
            * [Syntax](#syntax)
               * [Request](#request-10)
               * [Response](#response-9)
            * [Return Codes](#return-codes)
            * [Examples](#examples)
               * [Request](#request-11)
               * [Response](#response-10)
         * [Read](#read)
            * [Syntax](#syntax-1)
               * [Request](#request-12)
               * [Response](#response-11)
            * [Return Codes](#return-codes-1)
            * [Examples](#examples-1)
               * [Request](#request-13)
               * [Response](#response-12)
         * [List](#list)
            * [Syntax](#syntax-2)
               * [Request](#request-14)
               * [Response](#response-13)
            * [Return Codes](#return-codes-2)
            * [Examples](#examples-2)
               * [Request](#request-15)
               * [Response](#response-14)
      * [Write APIs](#write-apis)
         * [Create](#create)
            * [Syntax](#syntax-3)
               * [Request](#request-16)
               * [Response](#response-15)
            * [Return Codes](#return-codes-3)
            * [Examples](#examples-3)
               * [Request](#request-17)
               * [Response](#response-16)
         * [Update](#update)
            * [Syntax](#syntax-4)
               * [Request](#request-18)
               * [Response](#response-17)
            * [Return Codes](#return-codes-4)
            * [Examples](#examples-4)
               * [Request](#request-19)
               * [Response](#response-18)
         * [Delete](#delete)
            * [Syntax](#syntax-5)
               * [Request](#request-20)
               * [Response](#response-19)
            * [Return Codes](#return-codes-5)
            * [Examples](#examples-5)
               * [Request](#request-21)
               * [Response](#response-20)

Created by [gh-md-toc](https://github.com/ekalinin/github-markdown-toc)

# API v1 Spec

## Overview

This document describes the specification for the DappBot v1 API.

### Variables

The following variables, which will be used throughout this document, will be defined here:

* `:version` - The version of the API being used. There is currently only one working value for this: `v1`
* `:dappname` - The name of the dapp the API call is supposed to operate on. This is user selected and must be URL safe.

### Root URL

There is currently only one Root URL which hosts the DappBot API

`https://api.dapp.bot`

All API calls should be issued to the root endpoint:

`https://api.dapp.bot/:version`

This documentation will omit the root endpoint except in the example calls.

### Authenticated vs. Unauthenticated Endpoints

The root endpoint has three sub-resources: `public`, `private`, and `auth`.

Resources under the `public` resource are unauthenticated and always read-only.  No authorization is required to make a request to a `public` resource. They are typically used to display resources on DappHub.

Resources under the `private` resource are authenticated using the Cognito User Pool.  Before using an authenticated API, the user must log into their user account and include the provided token in the request under the `Authorization` header.

The `auth` resource is exclusively used to get auth tokens for accessing `private` resources.  It is not responsible for user management.

### Data Types

The following data structures and types are used throughout the API

#### Tier Enum

The following values are valid for the value of `Tier`:

* `STANDARD` - Cheapest DappHub offering. Includes a watermark and lacks some customization features.
* `PROFESSIONAL` - Best possible DappHub experience. This removes the watermark and includes all customization features.
* `ENTERPRISE` - Customer-controlled source code built by DappBot

#### State Enum

The following values are valid for the value of `State`:

##### Terminal States

These states are terminal. A Dapp in a terminal state is not expected to change state unless an API call or another external event causes it.

* `AVAILABLE` - The Dapp is available for use.
* `FAILED` - The Dapp could not be successfully created.
* `DEPOSED` - The Dapp could not be successfully deleted.

##### Transient States

These states are transient. A Dapp in a transient state is being worked on by the DappBot backend. It is expected that DappBot will move the Dapp to a terminal state when it is done processing.

* `CREATING` - The Dapp is being created, and has not yet been processed by the DappBot backend.
* `BUILDING_DAPP` - The Dapp is being created and has been processed by the backend. A required build step is in progress, and the Dapp will be moved to `AVAILABLE` state once the build step is complete.
* `DELETING` - The Dapp is being deleted, and has not yet been processed by the DappBot backend.

#### DappItem

A DappItem is a JSON object used in responses to read requests. It represents a single DappBot dapp as read from a private API and has the following structure:

```json
{
  "DappName": "<STRING: The canonical name of the Dapp>",
  "OwnerEmail": "<STRING: The email of the owner of the Dapp>",
  "CreationTime": "<STRING: The timestamp at which the Dapp was created>",
  "UpdatedAt": "<STRING: The timestamp at which the Dapp was last updated>",
  "DnsName": "<STRING: The DNS name at which the Dapp can be accessed>",
  "Abi": "<OBJECT: The ABI for the Dapp>",
  "ContractAddr": "<STRING: The address which hosts the contract for the Dapp>",
  "Web3URL": "<STRING: The URL at which to access an Eximchain or Ethereum node>",
  "GuardianURL": "<STRING: The URL of the Guardian instance to use for this Dapp>",
  "State": "<STRING: One of the states listed below describing the state of the Dapp>",
  "Tier": "<STRING: One of the tiers listed below for the Dapp>"
}
```

### Enterprise Requirements

Note the following setup requirements before creating an Enterprise dapp:

- The repository named as `TargetRepoName` must exist, and belong to the organization or user named as `TargetRepoOwner`.
- The repository must be initialized with an initial commit.  Dappbot cannot initialize a completely empty repository. We strongly recommend providing a repository that has been auto-initialized with a `README.md` and does not contain any other files or commits.
- You must grant the DappBot GitHub Account (TODO: Create account and specify username here) `Write` permission on the repository named as `TargetRepoName`. DappBot must be able to push commits to the `master` branch.

## Auth APIs

### Login

This API handles all requests related to the core flow of logging in and responding to Cognito auth challenges:
- Initiating a login
- Updating temporary password
- Setting up & confirming MFA login

`POST /auth/login`

#### Begin Login Syntax

##### Request

```
POST /v1/auth/login HTTP/2

{
    "username" : "string",
    "password" : "string"
}
```

##### Successful Response

When your login is successful, the `data` field will hold the token that clients can use for the `Authorization` header in requests to `/private` endpoints:

```
HTTP/2 200
Content-type: application/json

{
    "data": {
        "AuthToken": "string"
    },
    "err": null
}
```

##### Challenge Response

If you don't receive an `AuthToken` in your response, you will instead get back an object with a `ChallengeName`, `ChallengeParameters`, and a `Session`.  The authentication challenge is something like needing to reset a temporary password or to setup MFA.  This response object is passed directly from AWS Cognito, which has [good documentation](https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_InitiateAuth.html#API_InitiateAuth_ResponseSyntax) on all the possible options for `ChallengeName`.

```
HTTP/2 200
Content-type: application/json

{
    "data": {
        "ChallengeName" : "string",
        "ChallengeParameters" : {
            "string" : "string"
        },
        "Session" : "string"
    },
    "err": null
}
```

The `Session` is very important.  Each time you login and are required to respond to a challenge, the challenge response will have this `Session` key.  Its string value must be included in following login requests, as shown in other `/auth/login` action docs below.

#### Confirm New Password Syntax

You would make this request after receiving a login challenge response whose `data` field looks like:

```
{
    "ChallengeName" : "NEW_PASSWORD_REQUIRED",
    "ChallengeParameters" : {
        "USERNAME" : "string"
    },
    "Session" : "string"
}
```

##### Request

```
POST /v1/auth/login HTTP/2

{
    "username" : "string",
    "session" : "string",
    "newPassword" : "string"
}
```

##### Response

The response will either be a successful login response holding an `AuthToken`, shown above, or one of the other challenge responses.

#### Confirm MFA Login Syntax

You would make this request after receiving a challenge response whose `data` fields looks like:

```
{
    "ChallengeName" : "SMS_MFA",
    "ChallengeParameters" : {
        ...
    },
    "Session" : "string"
}
```

##### Request

```
POST /v1/auth/login HTTP/2

{
    "session" : "string",
    "mfaLoginCode" : "string"
}
```

##### Response

The response will either be a successful login response holding an `AuthToken`, or one of the other challenge responses.

#### Select MFA Syntax

You would make this request after receiving a challenge response whose `data` fields looks like:

```
{
    "ChallengeName" : "SELECT_MFA_TYPE",
    "ChallengeParameters" : {
        "MFAS_CAN_CHOOSE": "["SMS_MFA","SOFTWARE_TOKEN_MFA"]",
        ...
    },
    "Session" : "string"
}
```

##### Request

```
POST /v1/auth/login HTTP/2

{
    "session" : "string",
    "username" : "string",
    "mfaSelection" : "string"
}
```

Valid values for `mfaSelection` are `SMS_MFA` and `SOFTWARE_TOKEN_MFA`

##### Response

**TODO**

```
HTTP/2 200 
content-type: application/json
{
    "data": {
        "message" : "MFA was successfully set up, you can now log in."
    },
    "err":null
}
```


#### Example: Successful Login w/ Temporary Password

**Initial Login Request:**

```
POST /v1/auth/login HTTP/2
Host: api.dapp.bot

{
    "username" : "alex@example.com",
    "password" : "j9eA3bFr"
}
```

**Temporary Password Challenge Response:**

```
HTTP/2 200 
content-type: application/json
{
    "data": {
        "ChallengeName" : "NEW_PASSWORD_REQUIRED",
        "ChallengeParameters" : {
            ...
        },
        "Session" : "24f0dllkj..."
    },
    "err":null
}
```

**New Password Request:**

The `newPassword` value could be collected from the user in the GUI.

```
POST /v1/auth/login HTTP/2
Host: api.dapp.bot

{
    "username" : "alex@example.com",
    "newPassword" : "very-secure-and-memorable",
    "session" : "24f0dllkj..."
}
```

**Final Success Response:**

```
HTTP/2 200 
content-type: application/json
{
    "data": {
        "AuthToken" : "eyJS..."
    },
    "err":null
}
```

#### Example: Login w/ SMS MFA

**Initial Login Request:**

```
POST /v1/auth/login HTTP/2
Host: api.dapp.bot

{
    "username" : "alex@example.com",
    "password" : "j9eA3bFr"
}
```

**SMS MFA Challenge Response:**

```
HTTP/2 200 
content-type: application/json
{
    "data": {
        "ChallengeName" : "SMS_MFA",
        "ChallengeParameters" : {
            ...
        },
        "Session" : "49j2lk..."
    },
    "err":null
}
```

**Confirm SMS MFA Request:**

The `mfaLoginCode` value could be collected from the user in the GUI.

```
POST /v1/auth/login HTTP/2
Host: api.dapp.bot

{
    "session" : "49j2lk...",
    "mfaLoginCode" : "413827"
}
```

**Final Success Response:**

```
HTTP/2 200 
content-type: application/json
{
    "data": {
        "AuthToken" : "eyJS..."
    },
    "err":null
}
```

### Password Reset

This API handles beginning and confirming password resets.  Calling it with a username will send that user an email containing their `passwordResetCode`.  This code is then included in the following request with the new password.

`POST /auth/password-reset`

#### Begin Syntax

##### Request

```
POST /v1/auth/password-reset HTTP/2

{
    "username" : "string"
}
```

##### Response

Success:

```
HTTP/2 200
Content-type: application/json

{
    "data": {
        "message": "Please reset your password, we've emailed you a confirmation code."
    },
    "err": null
}
```

#### Confirm Syntax

##### Request

```
POST /v1/auth/password-reset HTTP/2

{
    "username"          : "string",
    "passwordResetCode" : "string",
    "newPassword"       : "string
}
```

##### Response

Success:

```
HTTP/2 200
Content-type: application/json

{
    "data": {
        "message": "Your password was successfully set, you may now login."
    },
    "err": null
}
```

#### Example: Beginning & Confirming a Password Reset

**Begin Password Reset HTTP Request:**

```
POST /v1/auth/password-reset HTTP/2
Host: api.dapp.bot

{
    "username" : "alex@example.com"
}
```

**HTTP Response:**

```
HTTP/2 200 
content-type: application/json
{
    "data": {
        "message" : "Please reset your password, we've emailed you a confirmation code."
    },
    "err":null
}
```

**Confirm Password Reset HTTP Request:**

```
POST /v1/auth/password-reset HTTP/2
Host: api.dapp.bot

{
    "username" : "alex@example.com",
    "passwordResetCode" : "j9eA3bFr",
    "newPassword" : "very-memorable-and-secure"
}
```

**Final Successful HTTP Response:**

```
HTTP/2 200 
content-type: application/json
{
    "data": {
        "message" : "Your password was successfully set, you may now login."
    },
    "err":null
}
```

### Configure MFA

This API handles configuring MFA for a user.  It allows the user to set a phone number for SMS MFA, set up a software token for App MFA, and choose which MFA method should be used.

`POST /auth/configure-mfa`

#### Setup SMS MFA Syntax

##### Request

```
POST /v1/auth/configure-mfa HTTP/2

{
    "phoneNumber" : "string"
}
```

Phone numbers must follow these formatting rules: A phone number must start with a plus (+) sign, followed immediately by the country code. A phone number can only contain the + sign and digits. You must remove any other characters from a phone number, such as parentheses, spaces, or dashes (-) before submitting the value to the service. For example, a United States-based phone number must follow this format: +14325551212.

##### Response

Success:

```
HTTP/2 200
Content-type: application/json

{
    "data": {
        "message": "Your phone number has been registered for SMS MFA."
    },
    "err": null
}
```

#### Begin Setup App MFA Syntax

##### Request

```
POST /v1/auth/configure-mfa HTTP/2

{
    "refreshToken" : "string"
}
```

##### Response

Success:

```
HTTP/2 200
Content-type: application/json

{
    "data": {
        "secretCode": "U3U5SLAMYDHXM54RLRTJWY7EJQAXGH2VCI6JX5AFP24L3EONX96A"
    },
    "err": null
}
```

#### Confirm Setup App MFA Syntax

##### Request

```
POST /v1/auth/configure-mfa HTTP/2

{
    "refreshToken" : "string",
    "mfaVerifyCode" : "string" 
}
```

##### Response

Success:

```
HTTP/2 200
Content-type: application/json

{
    "data": {
        "message": "Your MFA app has been successfully configured."
    },
    "err": null
}
```

#### Set MFA Preference Syntax

##### Request

```
POST /v1/auth/configure-mfa HTTP/2

{
    "mfaEnabled" : boolean,
    "preferredMfa" : "string <OPTIONAL>" 
}
```

`preferredMfa` is a required argument if `mfaEnabled` is set to `true`

##### Response

Success:

```
HTTP/2 200
Content-type: application/json

{
    "data": {
        "message": "Successfully set MFA Preferences."
    },
    "err": null
}
```

#### Example: Configuring App MFA

**Begin Setup App MFA HTTP Request:**

```
POST /v1/auth/configure-mfa HTTP/2
Host: api.dapp.bot
Authorization: <XXX>

{
    "refreshToken" : "24f0dllkj..."
}
```

**HTTP Response:**

```
HTTP/2 200 
content-type: application/json
{
    "data": {
        "secretCode": "U3U5SLAMYDHXM54RLRTJWY7EJQAXGH2VCI6JX5AFP24L3EONX96A"
    },
    "err":null
}
```

The user then enters the secret code into their MFA App to add the account and retrieve an `mfaVerifyCode`

**Confirm Setup App MFA HTTP Request:**

```
POST /v1/auth/configure-mfa HTTP/2
Host: api.dapp.bot
Authorization: <XXX>

{
    "refreshToken" : "24f0dllkj...",
    "mfaVerifyCode" : "123456"
}
```

**HTTP Response:**

```
HTTP/2 200 
content-type: application/json
{
    "data": {
        "message": "Your MFA app has been successfully configured."
    },
    "err":null
}
```

#### Example: Set MFA Preference to use App MFA

**Begin Set MFA Preference HTTP Request:**

```
POST /v1/auth/configure-mfa HTTP/2
Host: api.dapp.bot
Authorization: <XXX>

{
    "mfaEnabled": true,
    "preferredMfa": "SOFTWARE_TOKEN_MFA"
}
```

**HTTP Response:**

```
HTTP/2 200 
content-type: application/json
{
    "data": {
        "message": "Successfully set MFA Preferences."
    },
    "err":null
}
```

#### Example: Disable MFA

**Begin Set MFA Preference HTTP Request:**

```
POST /v1/auth/configure-mfa HTTP/2
Host: api.dapp.bot
Authorization: <XXX>

{
    "mfaEnabled": false
}
```

**HTTP Response:**

```
HTTP/2 200 
content-type: application/json
{
    "data": {
        "message": "Successfully set MFA Preferences."
    },
    "err":null
}
```

## Read APIs

### Public View

This API returns all public information about a specific Dapp. This API is primarily intended for consumption by DappHub, but may be used by any client.

`GET /v1/public/:dappname`

#### Syntax

##### Request

```
GET /v1/public/:dappname HTTP/2
```

##### Response

Success:

```
HTTP/2 200
Content-type: application/json

{
    "data": {
        "exists": boolean,
        "item": {
            "Abi": "string",
            "DappName": "string",
            "GuardianURL": "string",
            "Web3URL": "string",
            "ContractAddr": "string"
        }
    },
    "err": null
}
```

#### Return Codes

| Status       | Return Code |
| :----------: | :---------: |
| Success      | 200         |
| DappNotFound | 404         |

#### Examples

##### Request

HTTP Request:

```
GET /v1/public/exampledapp HTTP/2
Host: api.dapp.bot
```

CURL Command:

```
curl -X GET https://api.dapp.bot/v1/public/exampledapp
```

##### Response

```
HTTP/2 200 
content-type: application/json
content-length: 895
date: Fri, 21 Jun 2019 20:32:39 GMT
x-amzn-requestid: b5340852-9463-11e9-843e-e1119beba152
access-control-allow-origin: *
access-control-allow-headers: Authorization,Content-Type
x-amz-apigw-id: bpbD2HCGIAMFveQ=
x-amzn-trace-id: Root=1-5d0d3ee5-5e64f2f0694814782ee146f0;Sampled=0
x-cache: Miss from cloudfront
via: 1.1 94718ab0f44b71d1549a48f2f5573b91.cloudfront.net (CloudFront)
x-amz-cf-pop: BOS50-C1
x-amz-cf-id: HS3OKvToQmnha6VkJCPHIWkcMnmTAaVOb8WUHkjkb4nOsQ7X6KsQ3A==

{
    "data": {
        "exists": true,
        "item": {
            "Abi": "[{\"constant\":true,\"inputs\":[],\"name\":\"storedData\",\"outputs\":[{\"name\":\"\",\"type\":\"uint256\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"constant\":false,\"inputs\":[{\"name\":\"x\",\"type\":\"uint256\"}],\"name\":\"set\",\"outputs\":[],\"payable\":false,\"stateMutability\":\"nonpayable\",\"type\": \"function\"},{\"constant\":true,\"inputs\":[],\"name\":\"get\",\"outputs\":[{\"name\":\"retVal\",\"type\":\"uint256\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"name\":\"initVal\",\"type\": \"uint256\"}],\"payable\":false,\"stateMutability\":\"nonpayable\",\"type\":\"constructor\"}]",
            "DappName": "exampledapp",
            "GuardianURL": "https://guardian.dapp.bot",
            "Web3URL": "https://tx-executor.dapp.bot",
            "ContractAddr": "0x000000000000000000000000000000000000002A"
        }
    },
    "err":null
}
```

### Read

This API returns all information about a Dapp, including information private to its owner. You must authenticate with a token belonging to the specified Dapp's owner.

`GET /v1/private/:dappname`

#### Syntax

##### Request

```
GET /v1/private/:dappname HTTP/2
```

##### Response

Success:

```
HTTP/2 200
Content-type: application/json

{
    "data": {
        "exists": boolean,
        "item": {
            "DappName": "string",
            "OwnerEmail": "string",
            "CreationTime": "string",
            "UpdatedAt": "string",
            "DnsName": "string",
            "Abi": "string",
            "ContractAddr": "string",
            "Web3URL": "string",
            "GuardianURL": "string",
            "State": "string",
            "Tier": "string"
        }
    },
    "err":null
}
```

#### Return Codes

| Status       | Return Code |
| :----------: | :---------: |
| Success      | 200         |
| DappNotFound | 404         |

#### Examples

##### Request

HTTP Request:

```
GET /v1/private/exampledapp HTTP/2
Host: api.dapp.bot
Authorization: <XXX>
```

CURL Command:

```
curl -X GET -H "Authorization: $AUTH_TOKEN" https://api.dapp.bot/v1/private/exampledapp
```

##### Response

```
HTTP/2 200 
content-type: application/json
content-length: 1091
date: Fri, 21 Jun 2019 20:30:00 GMT
x-amzn-requestid: 56d42e9a-9463-11e9-bb72-f342128e54e5
access-control-allow-origin: *
access-control-allow-headers: Authorization,Content-Type
x-amz-apigw-id: bparGEtFoAMF9pA=
x-amzn-trace-id: Root=1-5d0d3e47-1158be35326f6a4ce1008592;Sampled=0
x-cache: Miss from cloudfront
via: 1.1 a6b1f1036ef5ce8fe503a14addc801ab.cloudfront.net (CloudFront)
x-amz-cf-pop: BOS50-C1
x-amz-cf-id: DLI9gIt6EIwho7G1dyZMMM56frcwmIuQZ-a8oWj3a32NXyxMFBRIlg==

{
    "data": {
        "exists": true,
        "item": {
            "DappName": "exampledapp",
            "OwnerEmail": "dappowner@eximchain.com",
            "CreationTime": "2019-06-21T20:18:44.702Z",
            "UpdatedAt":"2019-06-21T20:18:44.702Z", 
            "DnsName":"exampledapp.eximchain-dev.com",
            "Abi": "[{\"constant\":true,\"inputs\":[],\"name\":\"storedData\",\"outputs\":[{\"name\":\"\",\"type\":\"uint256\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"constant\":false,\"inputs\":[{\"name\":\"x\",\"type\":\"uint256\"}],\"name\":\"set\",\"outputs\":[],\"payable\":false,\"stateMutability\":\"nonpayable\",\"type\": \"function\"},{\"constant\":true,\"inputs\":[],\"name\":\"get\",\"outputs\":[{\"name\":\"retVal\",\"type\":\"uint256\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"name\":\"initVal\",\"type\": \"uint256\"}],\"payable\":false,\"stateMutability\":\"nonpayable\",\"type\":\"constructor\"}]",
            "ContractAddr": "0x000000000000000000000000000000000000002A",
            "Web3URL": "https://tx-executor.dapp.bot",
            "GuardianURL": "https://guardian.dapp.bot",
            "State": "AVAILABLE",
            "Tier": "STANDARD"
        }
    },
    "err":null
}
```

### List

This API returns all Dapps belonging to the authenticated caller.

`GET /v1/private`

#### Syntax

##### Request

```
GET /v1/private HTTP/2
```

##### Response

Success:

```
HTTP/2 200
Content-type: application/json

{
    "data": {
        "count": number,
        "items": [
            {
                "DappName": "string",
                "OwnerEmail": "string",
                "CreationTime": "string",
                "UpdatedAt": "string",
                "DnsName": "string",
                "Abi": "string",
                "ContractAddr": "string",
                "Web3URL": "string",
                "GuardianURL": "string",
                "State": "string",
                "Tier": "string"
            }
        ]
    },
    "err":null
}
```

#### Return Codes

| Status       | Return Code |
| :----------: | :---------: |
| Success      | 200         |

#### Examples

##### Request

HTTP Request:

```
GET /v1/private HTTP/2
Host: api.dapp.bot
Authorization: <XXX>
```

CURL Command:

```
curl -X GET -H "Authorization: $AUTH_TOKEN" https://api.dapp.bot/v1/private
```

##### Response

```
HTTP/2 200 
content-type: application/json
content-length: 1090
date: Fri, 21 Jun 2019 20:34:23 GMT
x-amzn-requestid: f4540189-9463-11e9-82fb-6707076b1b58
access-control-allow-origin: *
access-control-allow-headers: Authorization,Content-Type
x-amz-apigw-id: bpbUZF8RIAMFZCw=
x-amzn-trace-id: Root=1-5d0d3f4f-014f42117b42d8fc22c3fe8d;Sampled=0
x-cache: Miss from cloudfront
via: 1.1 e2591c1a99bf6b9ad500ec39436afa1f.cloudfront.net (CloudFront)
x-amz-cf-pop: BOS50-C1
x-amz-cf-id: xe2qRV39MJuO_uQu4eQQPF-j690kw5DX_N2zdGSzVNG3Lj_zHogpNA==

{
    "data": {
        "count": 1,
        "items": [
            {
                "DappName": "exampledapp",
                "OwnerEmail": "dappowner@eximchain.com",
                "CreationTime": "2019-06-21T20:18:44.702Z",
                "UpdatedAt": "2019-06-21T20:18:44.702Z",
                "DnsName": "exampledapp.eximchain-dev.com",
                "Abi": "[{\"constant\":true,\"inputs\":[],\"name\":\"storedData\",\"outputs\":[{\"name\":\"\",\"type\":\"uint256\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"constant\":false,\"inputs\":[{\"name\":\"x\",\"type\":\"uint256\"}],\"name\":\"set\",\"outputs\":[],\"payable\":false,\"stateMutability\":\"nonpayable\",\"type\": \"function\"},{\"constant\":true,\"inputs\":[],\"name\":\"get\",\"outputs\":[{\"name\":\"retVal\",\"type\":\"uint256\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"name\":\"initVal\",\"type\": \"uint256\"}],\"payable\":false,\"stateMutability\":\"nonpayable\",\"type\":\"constructor\"}]",
                "ContractAddr": "0x000000000000000000000000000000000000002A",
                "Web3URL": "https://tx-executor.dapp.bot",
                "GuardianURL": "https://guardian.dapp.bot",
                "State": "AVAILABLE",
                "Tier": "STANDARD"
            }
        ]
    },
    "err":null
}
```

## Write APIs

### Create

This API creates a new Dapp named `:dappname` owned by the authenticated caller.

`POST /v1/private/:dappname`

#### Syntax

##### Request

```
POST /v1/private/:dappname HTTP/2

{
    "Tier": "string",
    "ContractAddr": "string",
    "Web3URL": "string",
    "GuardianURL": "string",
    "TargetRepoName": "string",
    "TargetRepoOwner": "string",
    "Abi": "string"
}
```

##### Response

Success:

```
HTTP/2 201
Content-type: application/json

{
    "data": {
        "message": "string"
    },
    "err": null
}
```

#### Return Codes

| Status                   | Return Code |
| :----------------------: | :---------: |
| Success                  | 201         |
| DappNameTaken            | 409         |
| RequiredParameterMissing | 422         |

#### Examples

##### Request

HTTP Request:

```
POST /v1/private/:dappname HTTP/2
Host: api.dapp.bot
Authorization: <XXX>

{
    "Tier": "ENTERPRISE",
    "ContractAddr": "0x000000000000000000000000000000000000002A",
    "Web3URL": "https://tx-executor.dapp.bot",
    "GuardianURL": "https://guardian.dapp.bot",
    "TargetRepoName": "dappbot-dapp",
    "TargetRepoOwner": "Eximchain",
    "Abi": "[{\"constant\":true,\"inputs\":[],\"name\":\"storedData\",\"outputs\":[{\"name\":\"\",\"type\":\"uint256\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"constant\":false,\"inputs\":[{\"name\":\"x\",\"type\":\"uint256\"}],\"name\":\"set\",\"outputs\":[],\"payable\":false,\"stateMutability\":\"nonpayable\",\"type\": \"function\"},{\"constant\":true,\"inputs\":[],\"name\":\"get\",\"outputs\":[{\"name\":\"retVal\",\"type\":\"uint256\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"name\":\"initVal\",\"type\": \"uint256\"}],\"payable\":false,\"stateMutability\":\"nonpayable\",\"type\":\"constructor\"}]"
}
```

CURL Command:

Write the request body to `body.json`, then do

```
curl -X POST -H "Authorization: $AUTH_TOKEN" -d @body.json https://api.dapp.bot/v1/private/exampledapp
```

##### Response

```
HTTP/2 201 
content-type: application/json
content-length: 111
date: Mon, 24 Jun 2019 14:59:09 GMT
x-amzn-requestid: 9e7b7a38-9690-11e9-ab46-f92fffc3fe1c
access-control-allow-origin: *
access-control-allow-headers: Authorization,Content-Type
x-amz-apigw-id: byjBhEhBoAMFZEQ=
x-amzn-trace-id: Root=1-5d10e53c-015821cc6d92118c4bdd4290;Sampled=0
x-cache: Miss from cloudfront
via: 1.1 1bbfa275cce73ba7a423bc907239dedf.cloudfront.net (CloudFront)
x-amz-cf-pop: EWR52-C1
x-amz-cf-id: F_r6xlyRR8QPWy594LzCmxd232okwOZ7IOwdVMIXcY_C8mG1eulmbg==

{
    "data": {
        "message":"Dapp generation successfully initialized!  Check your URL in about 5 minutes."
    },
    "err":null
}
```

### Update

This API updates an existing Dapp, changing any attributes specified as an input to the call.

`PUT /v1/private/:dappname`

#### Syntax

##### Request

```
PUT /v1/private/:dappname HTTP/2

{
    "ContractAddr": "string",
    "Web3URL": "string",
    "GuardianURL": "string",
    "Abi": "string"
}
```

##### Response

```
HTTP/2 200
Content-type: application/json

{
    "data": {
        "message": "string"
    },
    "err": null
}
```

#### Return Codes

| Status       | Return Code |
| :----------: | :---------: |
| Success      | 200         |
| DappNotFound | 404         |

#### Examples

##### Request

HTTP Request:

```
PUT /v1/private/:dappname HTTP/2
Host: api.dapp.bot
Authorization: <XXX>

{
    "ContractAddr": "0x000000000000000000000000000000000000003F",
    "Web3URL": "https://tx-executor-updated.dapp.bot",
    "GuardianURL": "https://guardian-updated.dapp.bot",
    "Abi": "[{\"constant\":true,\"inputs\":[],\"name\":\"storedData\",\"outputs\":[{\"name\":\"\",\"type\":\"uint256\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"constant\":false,\"inputs\":[{\"name\":\"x\",\"type\":\"uint256\"}],\"name\":\"set\",\"outputs\":[],\"payable\":false,\"stateMutability\":\"nonpayable\",\"type\": \"function\"},{\"constant\":true,\"inputs\":[],\"name\":\"get\",\"outputs\":[{\"name\":\"retVal\",\"type\":\"uint256\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"name\":\"initVal\",\"type\": \"uint256\"}],\"payable\":false,\"stateMutability\":\"nonpayable\",\"type\":\"constructor\"}]"
}
```

CURL Command:

Write the request body to `body.json`, then do

```
curl -X PUT -H "Authorization: $AUTH_TOKEN" -d @body.json https://api.dapp.bot/v1/private/exampledapp
```

##### Response

```
HTTP/2 200 
content-type: application/json
content-length: 119
date: Mon, 24 Jun 2019 15:02:19 GMT
x-amzn-requestid: 0f894800-9691-11e9-9e97-253e2121850a
access-control-allow-origin: *
access-control-allow-headers: Authorization,Content-Type
x-amz-apigw-id: byjfKFh0oAMF4Ow=
x-amzn-trace-id: Root=1-5d10e5fa-5b0b346e226e972b8ba1c40a;Sampled=0
x-cache: Miss from cloudfront
via: 1.1 4a93be6e6adaadeec2a72967f0720081.cloudfront.net (CloudFront)
x-amz-cf-pop: EWR52-C1
x-amz-cf-id: ZeJZASTaWEYLhF7OFi2YF9x8s2yheaUXXHfGMi8U5CWmRUAmPIIC5w==

{
    "data": {
        "message":"Your Dapp was successfully updated! Allow 5 minutes for rebuild, then check your URL."
    },
    "err":null
}
```

### Delete

This API deletes an existing Dapp.

`DELETE /v1/private/:dappname`

#### Syntax

##### Request

```
DELETE /v1/private/:dappname HTTP/2
```

##### Response

```
HTTP/2 200
Content-type: application/json

{
    "data": {
        "message": "string"
    },
    "err": null
}
```

#### Return Codes

| Status       | Return Code |
| :----------: | :---------: |
| Success      | 200         |
| DappNotFound | 404         |

#### Examples

##### Request

HTTP Request:

```
DELETE /v1/private/:dappname HTTP/2
Host: api.dapp.bot
Authorization: <XXX>
```

CURL Command:

```
curl -X DELETE -H "Authorization: $AUTH_TOKEN" https://api.dapp.bot/v1/private/exampledapp
```

##### Response

```
HTTP/2 200 
content-type: application/json
content-length: 69
date: Mon, 24 Jun 2019 15:03:44 GMT
x-amzn-requestid: 42ba9828-9691-11e9-b0a4-e95d0792cc54
access-control-allow-origin: *
access-control-allow-headers: Authorization,Content-Type
x-amz-apigw-id: byjslHQNoAMFb_Q=
x-amzn-trace-id: Root=1-5d10e650-5a90e41c3fcfac27a7b377eb;Sampled=0
x-cache: Miss from cloudfront
via: 1.1 bf5abe06e7e8ddc3963a0afd0a961f75.cloudfront.net (CloudFront)
x-amz-cf-pop: EWR52-C1
x-amz-cf-id: qudGYEZWbpxFq-URLXectSB86OQaLAXmV8yj5UMmYLPeu9qOMYQfEQ==

{
    "data": {
        "message":"Your Dapp was successfully deleted."
    },
    "err":null
}
```

