# Migrating Standard Subscriptions

Given a Stripe API key and an export of customers, this script will update every user's subscription to use the current pricing `standard` pricing plan.  It current has a couple of key assumptions:

1. All users only have standard dapps, so all subs will have one item and it will correspond to the old standard pricing plan.
2. We are migrating to a plan whose `id === 'standard'`.

## Usage

From this directory, run:

```
$ npm run build

<installs dependencies, compiles typescript>

$ npm run migrate <path-to-customers.csv> <stripe-api-key>
```