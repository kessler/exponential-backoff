## @kessler/exponential-backoff

**Opinionated exponential backoff retry driver**

[![npm status](http://img.shields.io/npm/v/@kessler/exponential-backoff.svg?style=flat-square)](https://www.npmjs.org/package/@kessler/exponential-backoff) 

### example

`npm install --save @kessler/exponential-backoff`

```js
const exponentialBackoff = require('@kessler/exponential-backoff')

let backoff = exponentialBackoff()

let work = (cb) => {
    console.log('work work work...')
    setImmediate(cb)
}

let done = (err, retry, retryCount) => {
    
    if (err && retryCount < 5) {
        // retry with exponential backoff
        return retry()
    }

    if (err) {
        console.log('failed')
    } else {
        console.log('success')
    }
}

backoff(work, done)

```

### passing parameters to the `work` function

```js
const exponentialBackoff = require('@kessler/exponential-backoff')

let backoff = exponentialBackoff()

let work = (one, two, three, cb) => {
    // now one === 1, two === 2, three === 3
    setImmediate(cb)
}

let done = ...
backoff(work, 1, 2, 3, done)

```

### passing parameters from the `work` function to the `done` function

```js
const exponentialBackoff = require('@kessler/exponential-backoff')

let backoff = exponentialBackoff()

let work = (cb) => {
    cb(null, 1, 2, 3)
}

let done = (err, one, two, three, retry, retryCount) => {
    // now one === 1, two === 2, three === 3
}

backoff(work, done)

```

### configuration options

```js
const exponentialBackoff = require('@kessler/exponential-backoff')

let backoff = exponentialBackoff({
    delayInterval: 100, //minimum delay unit, exponentialBackoff() * intervalInMillis === delay, default is 100ms
    exponent: 2, // base exponent for backoff algorithm, default is 2
    unrefTimer: false // we use setTimeout() timer, setting this to true will cause setTimeout().unref() to be called
})
```

## license

[MIT](http://opensource.org/licenses/MIT) © Yaniv Kessler
