## @kessler/exponential-backoff

**Opinionated modern exponential backoff retry driver**

[![npm status](http://img.shields.io/npm/v/@kessler/exponential-backoff.svg?style=flat-square)](https://www.npmjs.org/package/@kessler/exponential-backoff) [![Travis build status](https://img.shields.io/travis/kessler/exponential-backoff.svg?style=flat-square&label=travis)](http://travis-ci.org/kessler/exponential-backoff) [![Dependency status](https://img.shields.io/david/kessler/@kessler/exponential-backoff.svg?style=flat-square)](https://david-dm.org/kessler/@kessler/exponential-backoff)

As of version `3.x` callback support is dropped.

### install

```
npm i -S @kessler/exponential-backoff
```

### simplest example

```js
const backoff = require('@kessler/exponential-backoff')

async function main() {
  
  // if an error is thrown then work will be retried
  // with an appropriate delay
  // after `maxAttempts` is exceeded 
  // an 'operation failed, exceeded maximum attempts' Error
  // is thrown and the retry process stops
  const work = () => httpRequest('http://example.com')
  const response = await backoff(work)
}

```

### changing the retry behavior

```js
const backoff = require('@kessler/exponential-backoff')

async function main() {
  
  const work = () => httpRequest('http://example.com')
  // more details about these options below
  const response = await backoff(work, {
    maxAttempts: 100,
    maxExponent: 10
  })
}
```
#### configuration options

- **maxAttempts** (Default 100) - maximum number of attempts before giving up. Meaning, if the 100th attempt fails an error will be thrown.
- **throwMaxAttemptsError** (Default true) - if set to false, no error will be thrown when maxAttempts is exceeded
- **delayInterval** (Default 100) - minimum delay unit, random(0, Math.pow(base, attemptNumber or maxAttempts)) * delayInterval = next delay
- **base** (Default 2) - base exponent for backoff algorithm
- **maxExponent** (Default 10) - in exponential backoff the number of attempts is used as the exponent, this is the maximum value that can be used even if retries exceed this value
- **unrefTimer** (Default false) - retry delay is achieved using setTimeout(). by default it will be unrefed, so the process will  not wait for these timers to finish

### iteration API

You can also _iterate_ over the attempts for better insight into and control over the process.
 
```js
const backoff = require('@kessler/exponential-backoff')

async function main() {
  
  const work = () => httpRequest('http://example.com')
  const iterator = backoff.iterator(work /*, { you can provide options here } */)
  
  for await (let attempt of iterator) {
    console.log(`this is attempt #${attempt}`)
    if (attempt > 0) {
      console.log(iterator.lastError)
    }

    if (attempt > 2) {
      break;
    }
  }

  // proceed from attempt #2 until maxAttempts
  for await (let attempt of iterator) {

  }

  console.log(iterator.result)
}

```

### optimized version

The startup code in `backoff()` has a cost. You can see the code in [bench.js](bench.js). In situations where you need a performence optimization, use the cached version (but remember: _preoptimization is the root of all evil!_):

```js
const backoff = require('@kessler/exponential-backoff')

async function main() {
  
  const retry = backoff.cached(/* options */)
  const work = () => httpRequest('http://example.com')
  for (let i = 0; i < 1000; i++) {
    const response = await retry(work)
  }
}

```

also cached iterator:
```js
const backoff = require('@kessler/exponential-backoff')

async function main() {
  
  const createIterator = backoff.cachedIterator(/* options */)
  const work = () => httpRequest('http://example.com')
  for (let i = 0; i < 1000; i++) {
    const iterator = createIterator(work)
    for await (const attempt of iterator) {}
  }
}

```

### infinite max attempts
Specifiying maxAttempts = Infinity can be handy in situations where you want to retry forever or control the maximum attempts dynamically.

This, however, will never through a `operation failed, exceeded maximum attempts` error and implicitly ignores `throwMaxAttemptsError` flag

```js
const backoff = require('@kessler/exponential-backoff')

async function main() {
  
  const work = attempt => {
    if (attempt > computeMaxAttemptSomehow()) {
      return
    }

    return httpRequest('http://example.com')
  }
  const response = await backoff(work, { maxAttempts: Infinity })
}

```

### debug log

This module uses [debug](https://github.com/visionmedia/debug) module. set `DEBUG=@kessler/exponential-backoff` to show debug messages.

### other stuff

This module is based on the [wikipedia article for exponential backoff](https://en.wikipedia.org/wiki/Exponential_backoff)

The use of the word _attempt_ is used in the code instead of _retry_ mostly because of the wikipedia article.

## license

[MIT](http://opensource.org/licenses/MIT) © Yaniv Kessler
