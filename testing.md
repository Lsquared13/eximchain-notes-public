# Testing Smart Contracts
Smart contract development is best done using Truffle, we use its built-in test suite by running `truffle test`.  You're technically able to write tests in either Solidity or JS, but [the Solidity testing documentation](https://truffleframework.com/docs/truffle/testing/testing-your-contracts) says in all but advanced, "bare to the metal" cases, you want to write them in JS.  

The JS test suite is mostly just [Mocha.js](https://mochajs.org/) with the [Chai assertion library](http://www.chaijs.com/) -- if you have never used them, take some time to read through the documentation and get familiar.  Mocha includes functions like `before()` and `beforeEach()` to initialize your contracts and any baseline state, either for each test or for the whole group.  Chai includes convenient assertions like `assert.isAbove(expected, actual)`.  Truffle also provides some additional smart contract functionality.  Most importantly:
- `describe()` is replaced by `contract()`, which creates a clean chain environment for every `it()` test inside the block.
- The function for each `contract()` block gets preset with ten accounts via Ganache.  All traces of your test transactions are cleaned up once the `contract()` block completes.

## Test Syntax
For the sake of readability, all JS tests should use the [`async`/`await`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function) syntax for resolving Promises without ending up in callback hell.  In a nutshell, you can wait for an asynchronous call (e.g. any web3 call to a smart contract) with the following syntax:
```
it("Checks permissions", async function(){
  let isPermitted = await contract.hasPermission();
  ...
});
```
- If you need any variables across all of your `it()` cases, make sure to declare them at the top of the contract.
- Try to use descriptive yet succinct names.  If you are testing multiple variations of the same actions (e.g. testing elections with different vote counts), make sure to write all test names with a clear pattern which makes them easy to quickly scan.

## What to Test
Each `it()` case of your tests should only test one thing, that way it's clear what has broken.  For instance, testing that a function call succeeds and verifying its side effects should be different `it()` cases.  For each function of your smart contract, you should **at least** have `it()` cases which verify:
- If a caller should not have permission to call the function, their call fails.  You can check this by changing the `from` value in the web3 call and then putting an `assert.fail()` in the Promise's success case:
  ```javascript
  it("Does not allow nonpermitted callers", async function(){
    await contract.performAction({ from : nonPermittedAddress }).then(
      () => { assert.fail("Unexpected success: Unpermitted caller should not be able to perform action") },
      () => {
        // Expected failure
      }
    )
  });
  ```
- If the caller provides an incorrect argument, verify that the call fails using the same syntax as above.
- When an appropriate caller provides appropriate arguments, you should verify that the call succeeded by putting an `assert.fail()` in the failure callback.  If your function also emits events, you should verify that those events were emitted by checking the receipt's logs in the success callback:
  ```javascript
  it("Allows permitted callers", async function(){
    await contract.performAction({ from : permittedAddress }).then(
      (res) => { assert.equal(res.logs[0].event, "ActionPerformed") },
      (err) => { assert.fail("Unexpected failure: Permitted caller should be able to perform action without getting err: ",err) }
    )
  });
  ```
- Once the transaction has succeeded, you should use the contract's getter methods to verify that any state changes were successful.
