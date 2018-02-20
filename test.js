'use strict'

const { expect } = require('chai')
const exponentialBackoff = require('./index')

describe('@kessler/exponential-backoff', () => {

	let backoff

	it('throws an error if caller does not provide a callback', () => {
		expect(() => {
			backoff()
		}).to.throw('must provide a callback as the last argument')
	})

	it('executes a function without delay (i.e synchronously)', (done) => {
		let executed = false
		let work = (cb) => {
			executed = true
			cb()
		}

		backoff(work, done)

		expect(executed).to.be.true
	})

	it('executes a function with arguments', (done) => {
		let work = (a1, a2, cb) => {
			expect(a1).to.equal('a1')
			expect(a2).to.equal('a2')
			cb()
		}

		backoff(work, 'a1', 'a2', done)
	})

	it('reports the retryCount in the callback as the last parameter', (done) => {
		let work = (cb) => {
			cb(null, 3)
		}

		let callback = (err, p1, retry, retryCount) => {
			if (err) return done(err)

			expect(retryCount).to.equal(1)

			done()
		}

		backoff(work, callback)
	})

	it('passes the arguments from work function to the callback', (done) => {
		let work = (cb) => {
			cb(null, 'a', 'b')
		}

		let callback = (err, p1, p2) => {
			if (err) return done(err)

			expect(p1).to.equal('a')
			expect(p2).to.equal('b')

			done()
		}

		backoff(work, callback)
	})

	describe('retries the operation if it fails', () => {
		let customError = new Error()

		it('by providing a retry function to the caller\'s callback', (done) => {
			let work = (cb) => {
				cb(customError)
			}

			let maxRetries = 2

			let callback = (err, retry, retryCount) => {
				if (err && retryCount < maxRetries) {
					expect(retry).to.be.an.instanceOf(Function)
					expect(err).to.equal(customError)
					return retry()
				}

				expect(retryCount).to.equal(2)

				done()
			}

			backoff(work, callback)
		})

		// random generator is seeded to provide the same "random"
		// delay each test
		it('using exponential backoff algorithm', function(done) {
			this.timeout(5000)

			let work = (cb) => {
				cb(customError)
			}

			let maxRetries = 5

			let start = Date.now()
			let expectedFlooredDelays = [0, 100, 400, 800]

			let callback = (err, retry, retryCount) => {
				if (err && retryCount < maxRetries) {

					let delay = Date.now() - start
					let flooredDelay = Math.floor(delay / 100) * 100
					expect(flooredDelay).to.equal(expectedFlooredDelays[retryCount - 1])
					return retry()
				}

				done()
			}

			backoff(work, callback)
		})
	})

	beforeEach(() => {
		backoff = exponentialBackoff({ _seed: 1 })
	})
})
