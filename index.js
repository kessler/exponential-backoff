'use strict'

const { name } = require('./package.json')
const Random = require('random-js')
const debug = require('debug')(name)

/**
 *	create a backoff driver and execute immediately, returning the result	
 */
module.exports = async (work, options) => {
	const iterator = factory(options)(work)
	for await (let attempt of iterator) {}
	return iterator.result
}

/**
 *	create a backoff driver and return an iterator
 */
module.exports.iterator = (work, options) => {
	return factory(options)(work)
}

/**
 *	create a cached version, allowing for multiple executions with slightly less initialization cost
 */
module.exports.cached = (options) => {
	const createIterator = factory(options)
	return async (work) => {
		const iterator = createIterator(work)
		for await (let attempt of iterator) {}
		return iterator.result
	}
}

/**
 *	create a cached version, allowing for multiple executions with slightly less initialization cost
 */
module.exports.cachedIterator = (options) => {
	return factory(options)
}


/**
 *	@param {number} [maxAttempts=100] - maximum number of attempts before giving up
 *	@param {number} [delayInterval=100] - minimum delay unit, exponentialBackoff() * intervalInMillis === delay
 *	@param {number} [base=2] - base exponent for backoff algorithm
 *	@param {number} [maxExponent=10] - in exponential backoff the number of attempts is used as the exponent, this is the maximum value that can be used even if retries exceed this value
 *	@param {boolean} [unrefTimer=false] - retry delay is achieved using setTimeout(). by default it will be unrefed, so the process will	not wait for these timers to finish
 *
 */
function factory({
	maxAttempts = 100,
	throwMaxAttemptsError = true,
	delayInterval = 100,
	base = 2,
	maxExponent = 10,
	unrefTimer = false,
	_seed
} = {}) {

	const rdg = new RandomDelayGenerator(_seed, base, delayInterval, maxExponent)

	return (work) => {
		if (typeof work !== 'function') throw new TypeError('work must be a function')
		return new Iterator(work, rdg, unrefTimer, maxAttempts, throwMaxAttemptsError)
	}
}

class Iterator {
	constructor(work, randomDelayGenerator, unrefTimer, maxAttempts, throwMaxAttemptsError) {
		this._work = work
		this._attemptNumber = 0
		this._done = false
		this._randomDelayGenerator = randomDelayGenerator
		this._unrefTimer = unrefTimer
		this._maxAttempts = maxAttempts - 1
		this._throwMaxAttemptsError = throwMaxAttemptsError
	}

	async next() {
		try {
			this._result = await Promise.resolve(this._work(this._attemptNumber))
			this._done = true
		} catch (e) {
			debug('error', e)
			this._error = e
			this._done = this._attemptNumber === this._maxAttempts
			if (this._done) {
				this._done = true
				if (this._throwMaxAttemptsError) {
					throw new OperationFailedError(e)
				}
			} else {
				this._attemptNumber++
				this._sleep()
			}
		}

		return this
	}

	get lastError() {
		return this._error
	}

	get result() {
		return this._result
	}

	get value() {
		return this._attemptNumber
	}

	get done() {
		return this._done
	}

	[Symbol.asyncIterator]() {
		return this
	}

	_sleep() {
		const delay = this._randomDelayGenerator.next(this._attemptNumber)
		debug(`sleeping ${delay}ms`)
		return new Promise(resolve => this._timeout(resolve, delay))
	}

	_timeout(resolve, delayInMs) {
		const timer = global.setTimeout(resolve, delayInMs)
		if (this._unrefTimer) {
			timer.unref()
		}
	}
}

class RandomDelayGenerator {
	constructor(_seed, base, delayInterval, maxExponent) {
		let engine
		if (_seed === undefined) {
			debug('using auto seed')
			engine = Random.engines.mt19937().autoSeed()
		} else {
			debug('using seed %d', _seed)
			engine = Random.engines.mt19937().seed(_seed)
		}

		this._random = new Random(engine)
		this._maxExponent = maxExponent
		this._base = base
		this._delayInterval = delayInterval
	}

	next(attemptNumber) {
		if (attemptNumber > this._maxExponent) {
			attemptNumber = this._maxExponent
		}

		const delaySlots = this._random.integer(0, Math.pow(this._base, attemptNumber)) - 1

		return delaySlots * this._delayInterval
	}
}

class OperationFailedError extends Error {
	constructor(lastError) {
		super('exceeded maximum attempts, operation failed')
		this._lastError = lastError
	}

	get lastError() {
		return lastError
	}
}

module.exports.OperationFailedError = OperationFailedError