# How to CORS

This document explains how to configure CORS for an application following the
pattern [Simple Static infra pattern](./simple-static-aws.md).
Before diving in, it's worth explaining exactly what CORS is and why this 
architecture requires extra work to satisfy its requirements.

## What's Cross-Origin Resource Sharing?

### Motivation

When you pull down a page from `example.com`, Chrome expects that page to
only ever speak with `example.com`.  This is good for safety: you ought to
know who you're talking to.  However, there are scenarios where this isn't
true, like when your client and backend API are hosted in different locations,
or when your client is delivered from one address, but loads its assets from
a CDN.  CORS is a procedure which lets browsers safely load content to a page
from different domains.

Let's say `eximchain.com` includes an image from `s3-website.net`.  When 
Chrome sees that image address, it recognizes that it's from a different
domain.  Before sending the request to get your image, Chrome sends
`s3-website.net` a **pre-flight OPTIONS request** asking which external
domains are allowed to fetch its content.  Cloudfront then responds to the
request with a header named `Access-Control-Allow-Origin`, saying that it
accepts requests which were made on behalf on an `eximchain.com` page.  
Chrome knows that it's safe to make the request, and your content loads
normally!

### Formal Requirements

The CORS **pre-flight OPTIONS request** is made before making a request to 
any other origin, whether it's loading content or submitting a form.  The
response must have a successfull HTTP 200 code, and it must include the
following headers:

- `Access-Control-Allow-Origin`: The domain you're requesting from 
  (e.g. `app.eximchain.com`), or `*` for any.
- `Access-Control-Allow-Headers`: `Authorization,Content-Type` are 
  minimum for any request to an authenticated origin.
- `Access-Control-Allow-Methods`: Optional, The methods you're allowing 
  CORS requests to use.  Need to at least include GET & OPTIONS, 
  consider whether you want to allow POST and PUT.

This pre-flight request will not have any of your request's data,
so fully processing it can lead to errors.

## Infrastructure Configuration

With that in mind, let's address the two CORS use-cases mentioned above
and how to address them in this infrastructure.

### S3

This section focuses on the client loading assets from a CDN. Your S3
bucket's static website lives at one domain 
(e.g. `bucket-name.s3-website-region.amazonaws.com`), and it is cached
by the CDN on another domain (e.g. `so42fjk.cloudfront.net`). Meanwhile,
we put a Route 53 alias record onto it so our users can instead hit a
clean name like `app.eximchain.com`.  They will be getting a page from
`app.eximchain.com`, but then loading the resources on it from 
`so42fjk.cloudfront.net`, triggering a CORS request.

First, you need to set your bucket's CORS policy, either through the 
`putBucketCors` API method from `aws-sdk` or via the bucket's Console
page (*Permissions > CORS Configuration*).

If you are making an API call, the parameters look like:

```javascript
{
  Bucket : "your-bucket-name",
  CORSConfiguration : {
    CORSRules : [
      {
        AllowedHeaders: ["Authorization"],
        AllowedOrigins: ["https://app.eximchain.com"],
        AllowedMethods: ["GET"],
        MaxAgeSeconds : 3000
      }
    ]
  }
}
```

If you're setting it in the Console, then you can use the following XML:

```xml
<CORSConfiguration>
<CORSRule>
  <AllowedOrigin>https://app.eximchain.com</AllowedOrigin>
  <AllowedMethod>GET</AllowedMethod>
  <MaxAgeSeconds>3000</MaxAgeSeconds>
  <AllowedHeader>Authorization</AllowedHeader>
</CORSRule>
</CORSConfiguration>
```

### Lambda

This section addresses how to let a client make requests to a backend API hosted at
a different origin.  If your page loads from `app.eximchain.com` but submits
its form to `api.eximchain.com`, then `api.eximchain.com` needs to have CORS
configured.

In our infra, we tend to configure the Lambda function
as a proxy integration with an API Gateway.  This means the API Gateway 
doesn't do much processing on the request or response -- the responsibility
is on Lambda.  Other integrations allow you to define automatic headers on
the response, but that is outside the scope of this document.

Your Lambda function needs to detect when it is responding to a pre-flight
OPTIONS request, and it needs to automatically return a successful response
with the appropriate headers.  You can do that with a conditional like this:

```javascript
exports.handler = async(event) => {

  // Auto-return success for CORS pre-flight OPTIONS requests
  if (event.httpMethod.toLowerCase() == 'options'){

    // Note the empty body, no actual response data required
    return {
      statusCode : 200,
      headers : {
        'Content-Type': 'application/json', 
        'Access-Control-Allow-Origin': '*' ,
        'Access-Control-Allow-Headers': 'Authorization,Content-Type'
      },
      body : JSON.stringify({})
    };
  }

  // Other requests can continue...
}
```