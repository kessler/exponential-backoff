'use strict'

const { name } = require('./package.json')
const Random = require('random-js')
const debug = require('debug')(name)

/**
 *	@param {number} delayInterval - minimum delay unit, exponentialBackoff() * intervalInMillis === delay
 *	@param {number} exponent - base exponent for backoff algorithm
 *	@param {boolean} unrefTimer - retry uses setTimeout() timer, by default it will be unrefed, so the process will
 *	not wait for these timers to finish
 *
 */
module.exports = (options) => exponentialBackoff(options || {})

function exponentialBackoff({ delayInterval = 100, exponent = 2, unrefTimer = false, _seed }) {
	let engine
	if (_seed === undefined) {
		debug('using auto seed')
		engine = Random.engines.mt19937().autoSeed()
	} else {
		debug('using seed %d', _seed)
		engine = Random.engines.mt19937().seed(_seed)
	}

	let random = new Random(engine)
	let retryCount = 0

	return execute

	function execute(work, ...args) {
		debug('executing (retryCount: %d)', retryCount)

		let cb = args.pop()
		if (typeof(cb) !== 'function') {
			throw new Error('must provide a callback as the last argument')
		}

		work(...args, function(err, ...args) {
			debug('executed')

			retryCount++

			if (err) {
				debug('error: %o', err)
				return cb(err, ...args, schedule, retryCount)
			}

			cb(null, ...args, schedule, retryCount)
		})

		function schedule() {
			let delay = randomDelaySlots() * delayInterval
			debug('scheduling retry in %d %dms', delay)

			let timer = setTimeout(() => {
				execute(work, cb)
			}, delay)

			if (unrefTimer) {
				timer.unref()
			}
		}
	}

	function randomDelaySlots() {
		// wait anywhere between zero to exponent^retryCount inclusive (hence +1)
		return random.integer(0, Math.pow(exponent, retryCount) - 1)
	}
}