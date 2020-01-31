# DappBot Pre-Deployment Acceptance Tests

## Goal
The purpose of the acceptance tests is to do basic validation of functionality on our staging version before we deploy to prod.  This is not intended to be a thorough test that will catch any and all bugs, but rather to validate that the main “happy case” workflow works correctly, and that we did not break any of the main workflows that are necessary for basic usage of the product.  Acceptance Tests are manual tests, run by a human, using the main product UI. They do not test any of the underlying APIs directly.

Note: Testing DappHub is outside the scope of this acceptance test
## Prerequisites
- Access to a fresh test `@eximchain.com` email address.  Note that you can easily create a “fresh” address out of your own email by appending a “+tag” after your name (e.g. “john+acceptance1@eximchain.com” forwards to “john@eximchain.com” )
## Procedure
### Register for a free trial

You should be able to complete the following steps without error:

- Log into the test email inbox
- In another tab, navigate to https://staging.dapp.bot
- Click on the button that reads ‘Start Your Free Trial’
- Fill in the registration form.  For most boxes, the contents are unimportant.  The Email box must be set to your test email, and you must check the box saying you read the Terms of Use.
- Click Submit, then follow the prompt back to the login screen
- Open your test email inbox and look for the DappBot welcome email

### Log in for the first time
You should be able to complete the following steps without error:

- Back in the DappBot tab, use your test email address and the temporary password provided in the email to log in
- Generate a password via any preferred means with at least 8 characters, and at least one of each of the following character types: uppercase letters, lowercase letters, numeric digits, symbols
- Enter your generated password into both new password boxes and submit the form to set your new password.  It should prompt you to log in again with that new password.

### Test Dapp Creation
You should be able to complete the following steps without error:

- Click either button that reads ‘New Dapp’
- Enter a name into the ‘Dapp Name’ box.  Any name that isn’t taken will work. I suggest `acceptance-test-N-1` where `N` is a unique number we increment each time we do the acceptance test. (**BUG**: Currently can’t type hyphens in your name as you go, but can add them in later.  Issue is that it filters all hyphens on the ends after every keystroke.)
- Click the button that reads ‘Configure Dapp’
- In the box titled ‘Contract Deployed Address’, enter this address: `0x000000000000000000000000000000000000002A`
- In the box titled ‘Contract ABI’, copy and paste the ABI included at the bottom of this section
- In the drop-down titled ‘Contract Network’, select ‘Eximchain’ from the list
- Click the button that reads ‘Create Dapp’
- Wait for the loading screen to finish and the Dapp list to appear on the screen.  Your new Dapp should become visible within a few seconds.

```
[{"constant": true,"inputs": [],"name": "storedData","outputs": [{"name": "","type": "uint256"}],"payable": false,"stateMutability": "view","type": "function"},{"constant": false,"inputs": [{"name": "x","type": "uint256"}],"name": "set","outputs": [],"payable": false,"stateMutability": "nonpayable","type": "function"},{"constant": true,"inputs": [],"name": "get","outputs": [{"name": "retVal","type": "uint256"}],"payable": false,"stateMutability": "view","type": "function"},{"inputs": [{"name": "initVal","type": "uint256"}],"payable": false,"stateMutability": "nonpayable","type": "constructor"}]
```

### TBD: Test Dapp Update
This isn’t implemented on the client yet, but ought to be incorporated here once it is.
### Test Dapp Limit

You should expect an error at the end of this test:

- Click the button that reads ‘New Dapp’
- Enter a name into the ‘Dapp Name’ box.  Any name that isn’t taken will work. I suggest `acceptance-test-N-2` where `N` is a unique number we increment each time we do the acceptance test.
- Click the button that reads ‘Configure Dapp’
- Expect an error that reads ‘Please purchase more dapp slots before creating new dapps.’

### Test Input Credit Card

You should be able to complete the following steps without error:

- Click the ‘Settings’ tab at the top of the page
- Where it says ‘Credit Card’ click on the button that reads ‘Update’
- For the ‘Card Number’, enter the following: `4242 4242 4242 4242`
- For the Expiration Date, enter any date in the future. For example: `09/24`
- For the ‘CVC’, enter any 3 digit number. For example: `789`
- For the zip code, enter any valid US zip code.  For example: `02139`
- Expect the page to update and load an image of a credit card

### End trial and buy another dapp

You should be able to complete the following steps without error:

- Underneath ‘Standard Dapp Slots’, click on the button that reads ‘Update’
- Change the number in the box from `1` to `2`
- Click the button that reads ‘Submit’
- In the modal that appears, click the button that reads ‘Yes’
- Expect the ‘Standard Dapp Slots’ and ‘Upcoming Invoice’ to update to reflect that you now have `2` Dapps (**BUG**: Note that the ‘Standard Dapp Slots’ currently doesn’t update without logging out and back in, although the invoice does)

### Test Second Dapp
You should be able to complete the following steps without error:

- Click the ‘Dapps’ tab at the top of the page
- Click the button that reads ‘New Dapp’
- Enter a name into the ‘Dapp Name’ box.  Any name that isn’t taken will work. I suggest `acceptance-test-N-2` where `N` is a unique number we increment each time we do the acceptance test.
- Click the button that reads ‘Configure Dapp’
- In the box titled ‘Contract Deployed Address’, enter this address: `0x0000000000000000000000000000000000000020`
- In the box titled ‘Contract ABI’, copy and paste the ABI included at the bottom of this section
- In the drop-down titled ‘Contract Network’, select ‘Ethereum’ from the list
- Click the button that reads ‘Create Dapp’
- Wait for the loading screen to finish and the Dapp list to appear on the screen

```
[{"constant": true,"inputs": [],"name": "storedData","outputs": [{"name": "","type": "uint256"}],"payable": false,"stateMutability": "view","type": "function"},{"constant": false,"inputs": [{"name": "x","type": "uint256"}],"name": "set","outputs": [],"payable": false,"stateMutability": "nonpayable","type": "function"},{"constant": true,"inputs": [],"name": "get","outputs": [{"name": "retVal","type": "uint256"}],"payable": false,"stateMutability": "view","type": "function"},{"inputs": [{"name": "initVal","type": "uint256"}],"payable": false,"stateMutability": "nonpayable","type": "constructor"}]
```

### Test Link to DappHub
You should be able to complete the following steps without error:

- Click either of the links listed under ‘Dapp URL’
- Expect to be taken to a page on DappHub
- Close the DappHub tab and any Metamask windows that open and return to the DappBot tab

Testing DappHub is outside the scope of this acceptance test

### Test Dapp Status Page
You should be able to complete the following steps without error:

- Click either of the dapps listed under ‘Dapp Name’
- Verify the ‘Status’ is ‘Available’
- Verify the ‘Dapp URL’, ‘Contract Network’, and ‘Contract Address’ are all visible and lack obvious errors
- Click on the ‘Contract Address’, expecting a message that the value was copied to your clipboard.
- Paste your clipboard into your Notes app and verify that the output is the same as the Contract Address
- Click on the ‘Contract Network’, expecting a message that the value was copied to your clipboard.
- Paste your clipboard into your Notes app and verify that the output is an infura URL (for Ethereum), or an eximchain URL (for Eximchain)
- Click on the button that reads ‘ABI’, expecting a message that the value was copied to your clipboard.
- Paste your clipboard into your Notes app and verify that the output looks like the provided ABI (**BUG**: This is currently broken)

### Test Delete
You should be able to complete the following steps without error:

- Click the ‘Settings’ tab for the Dapp, just above the ‘ABI’ button
- Enter your Dapp Name into the text box
- Click on the button that reads ‘Delete from DappBot’
- Verify that the dapp disappears from the list when it reloads
  - **BUG**: This still doesn’t work consistently and sometimes requires you to click the in-app refresh button.  Core issue is that Delete request returning isn’t synchronous with the Dapp actually being deleted, so the current hack just waits a second before refetching the Dapp list.

### Clean Up
You should be able to complete the following steps without error:

- Click the ‘Dapp Name’ for your remaining dapp
- Click the dapp ‘Settings’ tab
- Enter the Dapp Name into the box
- Click the button that reads ‘Delete from DappBot’
- Verify that the dapp disappears from the list when it reloads

### Test Sign Out
You should be able to complete the following steps without error:

- Click the blue button in the top-right corner of the page
- Click on ‘Sign Out’ in the drop-down menu that appears
- Expect to be taken back to the login screen