How We Redux
==============

Redux is a front-end library which makes it easy to manage complicated state.  If you use it correctly, then your React components can be much smaller and exclusively focus on presenting the application state.  However, it has a reputation for being very complicated; this document will briefly explain its core ideas and link to in-depth explanations of how all the pieces fit together.  
* [How We Redux](#how-we-redux)
* [Overview from 30,000ft](#overview-from-30000ft)
* [Connecting Redux to React](#connecting-redux-to-react)
  * [Initializing Store &amp; Provider](#initializing-store--provider)
  * [Component connect()ions](#component-connections)
* [Diving Deeper](#diving-deeper)
  * [Reducers](#reducers)
      * [Important Rules of Reducers](#important-rules-of-reducers)
        * [Reducers are Pure Functions](#reducers-are-pure-functions)
        * [State is Immutable](#state-is-immutable)
            * [lodash.merge() vs. Object.assign()](#lodashmerge-vs-objectassign)
        * [Don't Put Everything in Redux](#dont-put-everything-in-redux)
      * [Initializing State](#initializing-state)
      * [Separating Concerns](#separating-concerns)
  * [Actions](#actions)
      * [Action Creators](#action-creators)
      * [Async Actions via redux-thunk](#async-actions-via-redux-thunk)
  * [Selectors](#selectors)
      * [Composing reselect-ors](#composing-reselect-ors)
      * [Deriving Data](#deriving-data)
      * [Using Props](#using-props)
      * [Multiple Instances](#multiple-instances)
* [Code Organization](#code-organization)

*Redux is a stand-alone library which works with different frameworks and has many extensions.  Rather than exhaustively describing all of the ways it can be used, this document will focus on explaining how we're using it ourselves.*

# Overview from 30,000ft

> This section explains **what** Redux is from a high-level; later sections will cover **why** it is that way.

Redux represents your application's state as one big object which is kept in a **`store`**.  This object stores the core domain data which your application depends on, something like:

```javascript
{
  events : [...],
  txns : [...],
  blocks : [...]
}
```

You update the store by sending it an **`action`**, which is an object with the following shape:

```javascript
{
  type: 'FETCH-TXNS-FROM-BLOCK',
  payload : {
    blockHash : '...'
  }
}
```

Each time you send an action, it is processed by a **`reducer`**.  Nobody's trying to trick you, reducers are just like the functions you write in `.reduce()`.  Given a current state and one new action, they return the next state:

```javascript
function Reducer(state, action) {
  switch (action.type){
    case 'FETCH-TXNS-FROM-BLOCK':
      ...
      return newState;
    default:
      return state;
  }
}
```

To complete the loop, your React components then consume state using **selector** functions.  A selector takes your application's state object and only returns the data which the your component needs:

```javascript
const selectLatestBlock = state => state.blocks[0];
```

That's it -- you now have all the fundamental pieces required to use Redux for client-side business logic.

# Connecting Redux to React

Before diving further into the details of each piece, it's worth covering how Redux hooks up to your React app.  The Redux community is pretty closely aligned with the React community, so there is a first-party library named `react-redux` which provides a very convenient API.

## Initializing Store & Provider

First we hook up the Redux store to our overall application.  There is blessedly little code required to make this happen.  Below is the minimal source you need to create a store and connect it with your root `<App />` component:

```javascript
// index.js

// createStore uses your reducer to initialize the store, and
// can also accept an initialState and other customizations
import { createStore } from 'redux';
import { Provider } from 'react-redux';
import App from './src/App';

// Idiomatically, all of your Redux code lives in
// a directory named 'state' or something similar
import { Reducer } from './src/state';

const store = createStore(Reducer);

ReactDOM.render(
  <Provider store={store}>
    <App />
  </Provider>,
  rootDiv
)
```

The `<Provider>` component from `react-redux` leverages the React Context API so that all of its children (i.e. your entire application) can connect to the Redux store.

## Component connect()ions

Once you have Redux hooked up to your application, now you want to `connect()` it to your components.  This method takes two arguments: one function which lets you grab data from the state, and one function which lets you send* actions to update the state.  The method then wraps around your component, passing the results into its props.  Here's an example of how the connecting works, using some of the pieces described in the Overview:

*The technical term is that you `dispatch` actions, but that's just a fancy word for send.*

```javascript
import { selectLatestBlock, fetchTxnsFromBlock } from '../state'

// This is a React FunctionComponent
const BlockDetail = (props) => {

  // These props come from Redux, not the BlockDetail parent
  const { latestBlock, fetchTxns } = props;
  return (
    <div>
      <h1>Block #{latestBlock.number}: {latestBlock.hash}</h1>
      <Button onClick={()=>{fetchTxns(latestBlock.hash)}}>
        Get Block Transactions
      </Button>
    </div>
  )
}

const mapStateToProps = (state) => {
  return {
    latestBlock : selectLatestBlock(state)
  }
}

const mapDispatchToProps = (dispatch) => {
  // fetchTxnsFromBlock is an "action creator".  It is described further
  // later, but it is essentially just a function which returns an action
  // object as described in the overview.
  return {
    fetchTxns : (blockHash) => { dispatch( fetchTxnsFromBlock(blockHash) ) }
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(BlockDetail);
```

Your `BlockDetail` component now has the latest block and the ability to fetch its transactions, all with a minimal interface.  That way your component can focus on how it presents data, rather than how it gets and manipulates it.  It also means the parent doesn't need to have access to those props itself:

```javascript
import BlockDetail from './components/BlockDetail';

export const App = (props) => {
  return (
    <PageBase>
      <BlockList />
      <BlockDetail />
    </PageBase>
  )
}
```

Now that you know how Redux connects back to React in mind, we can look more closely at the pieces of Redux itself.

# Diving Deeper

The sections further describes each of the key pieces of Redux, along with some of the motivations for why they work as they do.  Where appropriate, there will be links to other articles with even more in-depth explanations.

## Reducers

Recall that your reducer function accepts the current state along with a new action to produce the new state.  The mental model here is that you start with an initial state and then reduce an array of actions to produce the current state:

```javascript
[action1, action2, ...].reduce((currentState, action) => {
  switch (action.type) {
    case (...):
      return newState;
    default:
      return currentState;
  }
}, initialState);
```

However, rather than start out with an array of actions, new actions get reduced as the user interacts with your application.

### Important Rules of Reducers

#### Reducers are Pure Functions

A [pure function](https://www.sitepoint.com/functional-programming-pure-functions/) is one whose return value exclusively depends on its inputs, with no external side effects.  Practically, this means that reducers should never be depending on anything other than their two arguments `state` and `action`.  This has a few upsides:

- Your reducers are wholly deterministic, eliminating a big class of bugs.
- Your reducers are easily testable, as they can be run in isolation from the main app.
- Your reducers end up being pretty damn fast, as they're just doing basic data manipulation in memory.

Reducers must always be pure.  They take two objects and return one.  They can't return Promises, either; reducers are all synchronous.  More on this in the Async Actions section.

#### State is Immutable

A key part of Redux's motivation is improving performance.  Part of how it does this is by **shallow object equality** to determine if the state has changed after running an action through the reducers.  This equality check just looks to see if the input and return objects share the same memory address.

> If your reducer changes state, then it **must** return a new object.  If it does not change the state, then it **must** return the original object.

If a reducer **does** perform changes in response to an action, then it must **return a new object** for the new state, rather than mutating the original object.  If a reducer does not perform any changes in response to an action, then it must return the same state it received -- the `default` statement is essential. This rule leads to switch statements which look like:

```javascript
function Reducer(state, action) {
  switch (action.type) {
    case 'SAVE-EVENT':
      let newEvent = action.payload;
      return lodash.merge({}, state, {
        events : [newEvent, ...state.events]
      })
    default:
      return state;
  }
}
```

[`lodash.merge(baseObject, ...sourceObjects)`](https://lodash.com/docs/4.17.11#merge) goes through the `sourceObjects` and copies their properties onto the `baseObject`.  In this case, it will copy the current state properties onto a new object, then copy our new `events` property, overwriting the old value.  We end up returning a new object at the end, ensuring that Redux knows this action changes application state.

##### `lodash.merge()` vs. `Object.assign()`
Example code you find online may use `Object.assign()` instead of `lodash.merge()` in order to not introduce another dependency.  The key difference is that `merge` goes through the source objects recursively, while `assign` only handles the top level.  If you are modifying only one nested property, `assign` will remove other properties around it.  Compare:

```javascript
const currentState = {
    alex : { favoriteFood: 'pasta', favoriteDrink: 'seltzer' },
    taylor : { favoriteFood: 'pizza', favoriteDrink: 'coke' }
  }

const stateUpdate = {
  taylor : { favoriteFood : 'burgers' }
}

console.log( Object.assign({}, currentState, stateUpdate) );
// {
//    alex : { favoriteFood: 'pasta', favoriteDrink: 'seltzer' },
//    taylor : { favoriteFood: 'burgers' }
// }

console.log( lodash.merge({}, currentState, stateUpdate) );
// {
//   alex : { favoriteFood: 'pasta', favoriteDrink: 'seltzer' },
//   taylor : { favoriteFood: 'burgers', favoriteDrink: 'coke' }
// }
```

Take it from somebody who has fixed a lot of bugs from accidentally destroying properties: just use `lodash.merge()`.

#### Don't Put Everything in Redux

Redux is not supposed to be a replacement for React state, and keeping every bit of state in there is a bad idea which creates unnecessary overhead.  Redux is meant to contain state which is relevant across your app, not just in one small piece of it.  

> Ask yourself: is this **interface data** or **application data**?

If you have a collapsible box on one page, the rest of the app doesn't need to know wheter it's open; just pop it in `React.useState()`.  Transient state from the interface doesn't need to be in Redux; core data from your domain probably should be.

### Initializing State

When your application turns on, the "state" will be null.  Reducers are responsible for initializing the application state by using default arguments.

```javascript
const initialState = {
  events : [],
  txns : [],
  blocks : []
}

function YourReducer(state=initialState, action) {
  switch (action.type){
    case 'UNIQUE-NAME-FOR-ACTION':
      ...
      return newState;
    default:
      return state;
  }
}
```

Redux initializes the store by calling the reducers with both `state` and `action` set to null.  The function will see that `state` doesn't exist, so it will use `initialState`.  The empty action will not have a `.type`, so your reducer will hit the `default` case and directly return the initial state.  This pattern lets you keep the baseline state definition right next to the function which describes all the ways it can be updated.

### Separating Concerns

As your application grows in complexity, you want to separate different chunks of business logic.  Redux helps you do this using a function named [`combineReducers()`](https://redux.js.org/api/combinereducers).  Suppose your application's complete state looks like the overview example:

```javascript
{
  events : [...],
  txns : [...],
  blocks : [...]
}
```

Rather than having one reducer function manage every part of this, you can use `combineReducers()` to write separate functions for managing each part.  Each reducer state argument becomes its own dedicated slice, making it easy to separate concerns :

```javascript

const initialEventState = [];
function EventReducer(eventState=initialEventState, action) { ... }

const initialTxnState = [];
function TxnReducer(txnState=initialTxnState, action) { ... }

const initialBlockState = [];
function BlockReducer(blockState=initialBlockState, action) { ... }

function AppReducer = combineReducers({
  events : EventReducer,
  txns : TxnReducer,
  blocks : BlockReducer
})
```

`EventReducer`'s `eventState` argument will only be the data behind the `events` key, letting you keep these reducers in separate files and not have to be aware of each other.

You can use `combineReducers()` at multiple levels through your state hierarchy, letting you separate concerns as much as desired.  [This blog post](http://randycoulman.com/blog/2016/11/22/taking-advantage-of-combinereducers/) talks about how you can decompose a sample reducer into smaller pieces.

## Actions

Actions are plain objects which reducers use to determine whether they need to return a new state.  They have a `type` and a `payload`.  The `type` is typically exported in its own variable, so the simplest action definition looks like:

```javascript
export const ACTION_TYPE = 'ACTION-TYPE';
export const ACTION = {
  type : ACTION_TYPE,
  payload : { /** action contents */ }
}
```

That way your reducers can use `case ACTION_TYPE:`, eliminating annoying string typo bugs.  Technically Redux does not enforce constraints on action shape, but this shape is the [Standard Action](https://github.com/redux-utilities/flux-standard-action) spec which encourages consistency across the community.

Previously I said actions were sent to reducers, but the technical term is that you **`dispatch`** them.  `dispatch()` accepts an **action** and runs it through all your **reducers** to update the **store**.  Part of the beauty of Redux is that when it comes to sending actions, that's basically all you need to know.  More later on how it's used within React.

### Action Creators

Remember that actions are plain, fixed objects.  For instance, you can update a boolean with something like:

```javascript
const TOGGLE_DARK_MODE_TYPE = 'TOGGLE-DARK-MODE';
const TOGGLE_DARK_MODE = {
  type : TOGGLE_DARK_MODE_TYPE,
  payload : null
}
```

However, your updates to the store will often need to include some information about what happened, like:

```javascript
{
  type : 'SAVE-EVENT',
  payload : { ...yourNewEvent }
}
```

You do this using **action creators**, which is a fancy name for a function that makes the object you want.  It is exclusively responsible for creating your action object.

```javascript
function saveEvent(yourNewEvent){
  return {
    type : 'SAVE-EVENT',
    payload : { ...yourNewEvent }
  }
}
```

Then you use it by calling `dispatch( saveEvent(newEvent) )`.

### Async Actions via redux-thunk

Previously I highlighted that reducers must be pure functions.  One constraint of this is that none of their operations can be asynchronous, as async operations can have fail and have side effects.  However, async operations are unavoidable.  

Suppose you dispatch an action which changes the page, pulls new content, and saves it into the store -- how do you incorporate that into the Redux data flow?  You use [`redux-thunk`](https://github.com/reduxjs/redux-thunk).

> Terminology note: `thunk`s are functions which are designed to be saved and called at a later time; they encapsulate logic that's already been "thunk" through.  It's an [old CS term](https://dl.acm.org/citation.cfm?id=366084) from back when ALGOL was a relevant language, so now you know a little more history.

`redux-thunk` is a piece of Redux middleware which enhances the built-in functionality.  Fundamentally, it upgrades the `dispatch()` function so that instead of just accepting plain action objects, it can also accept a function with the following signature:

```javascript
function thunkAction(dispatch, getState){
  ...
}
```

`getState` does exactly what it sounds like; it returns the entire state at the time the `thunk` is called.  The return value of `thunkAction` is thrown away, we are free to make it as `async` function and reduce our boilerplate.  This pattern lets you synchronously dispatch actions at different points in an async process.  Here is a common pattern for an action creator which returns an async action that grabs form data from the state to then perform a network fetch:

```javascript
// Within your actions file
function requestData() {
  return async (dispatch, getState) => {
    const AppState = getState();
    const requestUrl = AppState.currentDataSource.url;
    dispatch({
      type : BEGINNING_DATA_FETCH,
      payload : {}
    });
    try {
      const requestData = await fetch(requestUrl);
      dispatch({
        type : COMPLETED_DATA_FETCH,
        payload : { ...requestData }
      })
    } catch (NetworkError) {
      dispatch({
        type : FAILED_DATA_FETCH,
        payload : { NetworkError }
      })
    }
  }
}

// Somewhere within your app, maybe an onClick handler:
dispatch(requestData());
```

Your reducers could use the first action to toggle a boolean which show the user a loader, then use the completed/failed actions to set that boolean false and update the UI to reflect either the data or error.  `redux-thunk` makes it so that an async process can still dispatch synchronously.

A few notes before moving on: 

1. Yes: the thunk's `dispatch` can accept another thunk, letting you chain async actions at will.
2. I showed `dispatch` being called directly with an object here to be concise, but in practice, you should always be using action creators.
3. There is another library named `redux-saga` for handling async actions.  It depends on the concept of Observables and is widely considered to be a, "If you don't **know** you need it, you definitely don't" sort of tool.  It's a good bit more complicated, so save yourself some pain and stick with `redux-thunk`.

## Selectors

Actions are how you get data into the store, and selectors are how you get data out of it.  Selectors are fundamentally just functions which accept the entire application state and then return just slice that your component needs:

```javascript
const getLatestBlock = (AppState) => AppState.blocks[0];
```

You realize their full benefits when you combine them with [`reduxjs/reselect`](https://github.com/reduxjs/reselect), a selector memoization library:

1. Selectors let you give a component exclusively the data it needs.  Rather than pushing state shared between siblings up to a parent which doesn't actually need it, you can instead have each child grab the state it needs from the store.
2. Reselect lets you save the value of a selector and will only return a new object if that value changes.  Even if the state is a new object, the selector will only return a new object if its output is updated.  

Reselect is essential because, just like Redux, React uses shallow object comparisons to detect prop changes.  When Redux updates the state, every selector will now be pulling from a new object, even if it's output hasn't changed.  Memoization makes it so that each component's props only reflect a new object if the result data actually changed.  

If you have questions which the rest of the selectors section doesn't cover, try reading [this blog post](https://blog.isquaredsoftware.com/2017/12/idiomatic-redux-using-reselect-selectors/) from one of the core developers in the Redux community.

### Composing reselect-ors

Another benefit of selectors created by `reselect`'s `createSelector()` function is that they can be composed to make your state management code more modular.  Taking the example above and extending it, you could compose selectors like this:

```javascript
const getAllBlocks = state => state.blocks;
const getAllTxns = state => state.txns;

const getLatestBlock = createSelector(
  getAllBlocks,
  (allBlocks) => allBlocks[0]
)

const getLatestBlockNum = createSelector(
  getLatestBlock,
  (block) => block.number
)

const getLatestTxns = createSelector(
  getLatestBlockNum, getAllTxns,
  (blockNum, txns) => txns.filter((txn) => {
    return txn.blockNumber === block.number;
  })
)
```

Each of these `createSelector()` calls outputs a function which accepts the entire application state, while the function you provide just gets the slices from previous selectors.  If there are no new blocks but new transactions are loaded, the `getLatestTxns` output might change while the `getLatestBlockNum` is guaranteed to stay the same.  Given that none of these selectors depend on a `getAllEvents` selector, loading new events will never change their output.

Two more key benefits of composing these selectors level-by-level:

1. Your block selectors don't need to be concerned about the shape of the rest of the state tree and can be kept in their own isolated file.  I showed txn and block selectors together here, but in practice you could break them apart.
2. If you decide in later development that the `blocks` key should actually be `blockHistory`, then you only need to modify a single function.

### Deriving Data

Another perk of using selectors is that you can efficiently compute required data, rather than having to store the transformation within the Redux state.  Suppose that one part of your application needed a directory of everyone who has sent a transaction.  Rather than adding a new key to the Redux store like this:

```javascript
{
  ...,
  txns : {
    allTxns : [...],
    allSenders : [...]
  }
}
```

You can instead compute that data like this:

```javascript
const allTxnSenders = createSelector(
  getAllTxns,
  (txns) => uniq(txns.map(txn => txn.from))
)
```

When you then use that selector in your components, you will only be performing that computation when there is a rendered component that depends on it.  This makes it really easy to get data in whatever shape you need it while minimizing the overhead inside of the core Redux store.

### Using Props

Your selectors can also use the props of the component they are connected to.  I've omitted it previously, but all selectors also get their connected component's props as their second argument.  Suppose that you have a `BlockDetail` component which takes the blockhash as a prop and then uses Redux to pull the actual block data.  You could create a selector for that like this:

```javascript
// This selector ignores state because it's only responsible 
// for fetching the value from props. We already have a 
// selector for getting all the blocks.
const getHashFromProps = (state, props) => props.blockHash

const getBlock = createSelector(
  getAllBlocks, getHashFromProps,
  (blocks, blockHash) => {
    return blocks.find((block) => block.hash === blockHash)
  }
)

// In your consuming component:
const mapStateToProps = (state, props) => {
  return {
    block : getBlock(state, props)
  }
}
```

### Multiple Instances
One gotcha with reselect is that each call to `createSelector()` creates one memoized selector.  If only one component is using the selector at any given time, then you're fine.  Suppose you have multiple `BlockItem` components rendering in a list, though, all of which need to grab their block.  In order to prevent them from colliding, you need to use a factory pattern so that each one has its own instance:

```javascript
const getBlockFactory = () => {
  return createSelector(
    getAllBlocks, getHashFromProps,
    (blocks, blockHash) => {
      return blocks.find((block) => block.hash === blockHash)
    }
  )
}

// In your consuming component:
const mapStateToProps = (state, props) => {
  return {
    block : getBlockFactory()(state, props)
  }
}
```

# Code Organization

// TODO: Write out an overall project directory explanation

## Configuring Middleware

// TODO: Write out an explanation of how the store's configuration can include more involved pieces

## Growing the App

One big question as your app scales is how to organize all of this state management code.  People have criticized Redux for being verbose, but with clean code organization, it feels much more manageable.  When you're organizing code, the two broad approaches are grouping by *function* vs grouping by *domain*.  In the context of Redux, the two different layouts could look like:

```
Grouping by Function:

/ state
---/ reducers
------/ BlockReducer.js
------/ ...
---/ actions
------/ ...
------/ EventActions.js
------/ ...
---/ selectors
------/ ...
------/ TxnSelectors.js

Grouping by Domain:

/ state
---/ Blocks
------/ actions.js
------/ reducer.js
------/ selectors.js
---/ Events
------/ actions.js
------/ ...
---/ Txns
------/ selectors.js
------/ ...
```

Within the context of growing an app using Redux, the "functions" will stay constant over time, whereas the domains will keep growing.  With the first pattern, the have function folders grow bigger and bigger.  In the second pattern, we slowly grow the number of domain folders and they all have the same number of files within them.

We implement this "grouping by domain" pattern using [ReDucks](https://github.com/alexnm/re-ducks) pattern, which turns each domain into a module.  Check out the README for more details, but this is the developer experience it enables.

Each domain has a consistent naming pattern for all of its exports:
```javascript
// ./state/BlockDuck/index.js

import BlockReducer from './reducer';

export * as BlockActions from './actions';
export * as BlockSelectors from './selectors';

export default BlockReducer;
```

Your overall final reducer is easy to compose:
```javascript
// ./state/index.js

import BlockReducer from './BlockDuck';
import EventReducer from './EventsDuck';
import TxnReducer from './TxnDuck';

const AppReducer = combineReducers({
  blocks : BlockReducer,
  events : EventReducer,
  txns : TxnReducer
})

export default AppReducer;
```

And when you have a bunch of different actions & selectors, your components have a clean single imports:

```javascript
// ./components/BlockDetail

import { BlockActions, BlockSelectors } from '../state/BlockDuck';
import { TxnSelectors } from '../state/TxnDuck'

const mapStateToProps = (state, props) => {
  return {
    block : BlockSelectors.getBlock(state, props),
    numBlocks : BlockSelectors.getNumBlocks(state),
    txns : TxnSelects.getBlockTxns(state, props)
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    fetchBlock : (blockHash) => { 
      dispatch( BlockActions.fetchBlock(blockhash) )
    },
    deleteBlock : (blockHash) => {
      dispatch( BlockActions.deleteBlock(blockHash) )
    },
    refreshConfirmation : (blockHash) => {
      dispatch( BlockActions.refreshBlock(blockHash) )
    },
    ...
  }
}
```