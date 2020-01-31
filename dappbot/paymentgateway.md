# Payment Gateway Spec

## Responsibilities

Access to Dapp Management APIs are controlled by a [Cognito User Pool](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-identity-pools.html).

A payment gateway is responsible for integrating with a specific payment processor (e.g. [Stripe](https://stripe.com)) to accept payments from users. After accepting payment, the payment gateway must create and manage the Cognito user that corresponds to the paying customer.

A payment gateway must handle the following tasks:

* Process payment for a DappBot subscription through the payment provider
* For a first-time user, create a Cognito User for the new user
* Update the Cognito User's attributes to reflect the appropriate limit for the account
* In the event a user fails to pay for their subscription, deactivate their account so they cannot continue to use it

Tasks to consider for future development:

* Ensure a user doesn't reduce their dapp count below their current amount
* Put Dapps in a `LAPSED` state after they miss payment

## Cognito Interface

The DappBot API requires that the following custom attributes are set on each user:

* `custom:standard_limit` - Number of `STANDARD` dapps the account has paid for
* `custom:professional_limit` - Number of `PROFESSIONAL` dapps the account has paid for
* `custom:enterprise_limit` - Number of `ENTERPRISE` dapps the account has paid for
* `custom:payment_provider` - The payment provider responsible for processing the account's payments
* `custom:payment_status` - The payment status of the account

### Payment Providers

The following are the possible values for `custom:payment_provider`:

* `ADMIN` - The account is not managed by any payment provider and will be free to use until it is manually disabled.
* `STRIPE` - Payment is handled by [Stripe](https://stripe.com/).

### Payment Statuses

The following are the possible values for `custom:payment_status`:

* `ACTIVE` - Payments on the account are up-to-date and the account can be used.
* `LAPSED` - At least one payment attempt has been missed. The payment processor will retry the charge in the future.
* `FAILED` - All payment attempts have been missed and the payment processor is no longer trying to complete the charge.
* `CANCELLED` - The account owner has voluntarily cancelled their account.

## SNS Interface

In order for the system to properly expire accounts with `LAPSED` payment, the payment gateway must emit an SNS notification to a specified "Payment Event Topic".  Ideally this topic is taken as a Terraform argument so we can pass it in when using it as a module.

### Notification Format

The notification emitted on a payment status change should be a JSON object like this:

```json
{
    "event": "PAYMENT_STATUS",
    "status": "<STRING: The new payment status for the user>",
    "email": "<STRING: The email address for the user>"
}
```

Example Notification:

```json
{
    "event": "PAYMENT_STATUS",
    "status": "LAPSED",
    "email": "lapseduser@domain.com"
}
```

### Required Notifications

`LAPSED` - The system requires notifications when an account moves to the `LAPSED` state. Sending a notification for a user in the `LAPSED` state flags that user to have their dapps deleted and their account limits set to 0 after 72 hours of being `LAPSED` (Note: The number of hours in the grace period can be configured at the terraform level).

`CANCELLED` - The system requires notifications when an account moves to the `CANCELLED` state.  This should never occur without the user requesting it. When an account is moved to the `CANCELLED` state, it's dapps will immediately be deleted and the user's dapp limits will be set to 0.  Unlike the `LAPSED` state, there is no grace period.

`ACTIVE` - Notifications when an account moves from the `LAPSED` state back to the `ACTIVE` state can help avoid extra work by the system. However, as long as the cognito user's payment status is `ACTIVE` when the cleanup is attempted, the user will not be cleaned up.  Thus these notifications are technically optional.