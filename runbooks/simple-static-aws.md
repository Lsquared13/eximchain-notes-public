Simple Static AWS Apps
=================

   * [Overview](#overview)
      * [In-House Shortcut](#in-house-shortcut)
   * [S3 Config](#s3-config)
   * [Cloudfront Config](#cloudfront-config)
   * [Route 53 Config](#route-53-config)
   * [Deployment](#deployment)

# Overview

This guide describes how to deploy the following infra for an arbitrary static
web client:

- Static [create-react-app](https://facebook.github.io/create-react-app/) client
  is hosted from an [S3 bucket](https://aws.amazon.com/s3/)
- S3 bucket is cached using [Cloudfront CDN](https://aws.amazon.com/cloudfront/)
- Cloudfront gets a user-facing origin from [Route 53](https://aws.amazon.com/route53/)

This pattern is how we deliver Dapp.Bot and the Token Holder Verification page.
Delivering the client as a static bundle is far cheaper than running a server for
it, and loading it into the Cloudfront CDN gives us speed and security.  You
should generally use Terraform modules and other managed solutions wherever
possible, rather than configuring this directly from the Console. If nothing else,
this serves as an explanation of how the stack works.  Throughout the guide,
I try to describe how the process via both the API and the console.  When you
are using the console, all settings I don't describe can be left at their
defaults.

## In-House Shortcut

Dapp.Bot is built to create a deployed app on this infra, so you can use it
to bootstrap real quick.  Create a dapp, then look up its S3 bucket name and
Cloudfront Distribution ID.  Use those values with the `deploy` command at
the bottom of this guide and you're done -- that dapp's address now hosts
your chosen `create-react-app`.

# S3 Config

First, create an S3 bucket with the ACL set to `public-read`.  If you are using
the API, then you want a call like this:

```javascript
await s3.createBucket({
  Bucket: 'your-bucket-name',
  ACL: 'public-read'
}).promise();
```

Next, you need to give it a bucket policy which lets anybody read from it.
If you are using the API, then you want a call like:

```javascript
await s3.putBucketPolicy({
  Bucket : 'your-bucket-name',
  Policy : JSON.stringify({
    "Version": "2012-10-17",
    "Statement": [{
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": ["s3:GetObject"],
      "Resource": [`arn:aws:s3:::your-bucket-name/*`]
    }]
  })
}).promise()
```

From within the console, you want that policy on the *Permissions > Bucket Policy*
screen.  With the policy placed, now you need to configure the bucket to host
a static website.  From within the console, go to *Properties > Static website hosting*,
and enable it with both the index and error documents set to `index.html`.  Using
the API, you want a call like:

```javascript
await s3.putBucketWebsite({
  Bucket: bucketName,
  WebsiteConfiguration: {
    ErrorDocument: {
        Key: 'index.html'
    },
    IndexDocument: {
        Suffix: 'index.html'
    }
  }
}).promise()
```

The last step to get the bucket fully configured (beyond deploying your app) is to
configure the CORS policy, as shown in the [S3 section of How to CORS](./how-to-cors.md#s3).

# Cloudfront Config

You only need one API call to create the Cloudfront distribution, although its
parameters are a doozy.  From within the Console, many of them can be auto-filled
for you.  When you go to create a Web distribution, the first input is the origin
domain name.  This is what your CDN is going to cache, so plug in the S3 bucket
that you just created.  That will auto-fill most of the page for you.  Here are
the only other values you need to worry about:

- **Viewer Protocol Policy**: HTTP is unclean, select *Redirect HTTP to HTTPS*
- **Allowed HTTP Methods**: Allow OPTIONS, others are unnecessary for static hosting.
- **Alternate Domain Names**: Plug in your intended user-facing address. Cloudfront
  needs to know all the names which can be used to refer to it.
- **SSL Certificate**: Either use the default SSL cert, in which case you can
  only load assets using the Cloudfront domain, or plug in a custom cert.
- **Default Root Object**: When you hit the naked Cloudfront address (e.g. 
  `app.eximchain.com` hits `249jfa.cloudfront.net`), no object specified, this
  is what will be returned.  You want it to be `index.html`.

If you are using the API, then you want your call to look something like:

```javascript
await cloudfront.createDistributionWithTags({
  DistributionConfigWithTags : {
    DistributionConfig : {
      CallerReference: uuidv4(),
      DefaultRootObject: 'index.html',
      Aliases: {
        Quantity: 1,
        Items: ['your-public-domain.com']
      },
      ViewerCertificate : {
          ACMCertificateArn : 'arn-of-custom-cert',
          SSLSupportMethod : 'sni-only',
      },
      Origins: {
          Quantity: 1,
          Items: [{
              Id: 's3-origin',
              DomainName: 'your-s3-bucket-url.com',
              S3OriginConfig: {
                  OriginAccessIdentity: ''
              }
          }],
      },
      Enabled: true,
      Comment: "Cloudfront distribution for your-new-app",
      DefaultCacheBehavior: {
        TargetOriginId: 's3-origin',
        ForwardedValues: {
          QueryString: false,
          Cookies: {
            Forward: 'none'
          },
          Headers: {
            Quantity: 0
          }
        },
        TrustedSigners: {
          Quantity: 0,
          Enabled: false
        },
        ViewerProtocolPolicy: 'redirect-to-https',
        MinTTL: 0,
        AllowedMethods: {
          Quantity: 7,
          Items: ['GET', 'HEAD', 'OPTIONS', 'PUT', 'PATCH', 'POST', 'DELETE']
        }
      },
    },
    Tags : {
      Items : [
        { Key : 'Owner', Value : 'You' },
      ]
    }
  }
}).promise()
```

# Route 53 Config

The last step is to put a clean name in front of your Cloudfront distro.  This
is the same name you specified as an Alias in the API, or Alternate Domain Name
in the console.  Specifically, you need to make a new **Alias** record of type
**A** whose target is your **Cloudfront DNS**.  You will need to already have
a hosted zone loaded into AWS, like `eximchain.com`.  From there you would name
the record `app`, and you will be able to load it from `app.eximchain.com`.
The API call to create this record would look like:

```javascript
await route53.changeResourceRecordSets({
  HostedZoneId : 'zone-id-for-eximchain.com',
  ChangeBatch  : {
    Changes : [{
      Action            : 'CREATE',
      ResourceRecordSet : {
        Name        : 'app',
        Type        : 'A',
        AliasTarget : {
          DNSName              : 'your.cloudfront.net',
          EvaluateTargetHealth : false,
          HostedZoneId         : "Z2FDTNDATAQYW2"
          // The above value is Cloudfront's HostedZoneId.
          // Yes, it's a magic number.  But it's *Amazon's* magic number.
        }
      }
    }]
  }
})
```

# Deployment

Deployment for this app is delightfully straightforward.  `create-react-app`s
produce a static bundle ready for deployment in `./build`, so all you have to
do is sync that directory to your bucket.  The one wrinkle is cacheing.

In order to make sure users instantly see the new site, you want to make sure
the `index.html` and `service-worker.js` files aren't cached.  You don't have
to worry about anything else -- so long as all your files are imported through
the module system (i.e. not just sitting in `./public`), then they will all be
bundled together and named with their hash.  This means that if their contents
change, their name will change and your users will load the new file.

`index.html` and `service-worker.js` (used to let your site run offline) must
have the same name each time, though, so there's a script below to let you sync
build and then sync those two files with the correct `Cache-Control` headers.
If you save this script in a file like `sync-to-bucket.sh`, then you could edit
your `package.json` like this:

```json
{
  "..." : "...",
  "scripts" : {
    "..."     : "...",
    "build"   : "react-scripts build",
    "deploy"  : "npm run build; ./sync-to-bucket.sh [bucket-name]",
    "..."     : "..."
  },
  "..." : "..."
}
```

and then deploy by simply calling `npm run deploy`.  

Script adapted from [@kevindice's gist](https://gist.github.com/kevindice/87ee5ffca9523810253de3d9a41c3ae5):

```bash
#!/bin/bash

S3_BUCKET_NAME=$1

# Sync all files except for service-worker and index
echo "Uploading files to $S3_BUCKET_NAME..."
aws s3 sync build s3://$S3_BUCKET_NAME/ \
  --acl public-read \
  --exclude service-worker.js \
  --exclude index.html

# Upload service-worker.js with directive to not cache it
echo "Uploading service-worker.js"
aws s3 cp build/service-worker.js s3://$S3_BUCKET_NAME/service-worker.js \
  --metadata-directive REPLACE \
  --cache-control max-age=0,no-cache,no-store,must-revalidate \
  --content-type application/javascript \
  --acl public-read

# Upload index.html
echo "Uploading index.html"
aws s3 cp build/index.html s3://$S3_BUCKET_NAME/index.html \
  --metadata-directive REPLACE \
  --cache-control max-age=0,no-cache,no-store,must-revalidate \
  --content-type text/html \
  --acl public-read
```