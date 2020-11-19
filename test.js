const test = require('ava')
const backoff = require('./index')

test('executes a synchronous function', async t => {
	t.is(await backoff(() => 'result'), 'result')
})

test('executes an asynchronous function', async t => {
	const work = backoff(async () => {
		await sleep(10)
		return 'result'
	})

	t.is(await work, 'result')
})

test('after maxAttempts an error is thrown', async t => {
	let count = 0
	const work = backoff(async () => {
		count++
		throw new Error('123')
	}, { maxAttempts: 5 })

	await t.throwsAsync(async () => {
		await work
	}, { instanceOf: backoff.OperationFailedError, message: 'operation failed, exceeded maximum attempts' })

	t.is(count, 5)
})

test('if throwMaxAttemptsError flag is set to false then no error is thrown when maxAttempts is exceeded', async t => {
	const work = backoff(async () => {
		throw new Error('123')
	}, { maxAttempts: 5, throwMaxAttemptsError: false })

	await t.notThrowsAsync(async () => {
		await work
	})
})

test('execute a function multiple times if it throws an error', async t => {
	const maxAttempts = 5
	let actualRetryCount = 0


	const work = backoff((attempt) => {
		if (attempt === maxAttempts) {
			return 'result'
		}

		actualRetryCount++
		throw new Error()
	})

	const result = await work

	t.is(result, 'result')
	t.is(actualRetryCount, maxAttempts)
})

test('iteration API', async t => {
	const maxAttempts = 5
	let actualRetryCount = 0

	const iterator = backoff.iterator((attempt) => {
		if (attempt === maxAttempts) {
			return 'result'
		}

		throw new Error('blabla')
	})

	for await (let attempt of iterator) {
		actualRetryCount++
		if (attempt === 3) break
	}

	t.is(actualRetryCount, 3)

	for await (let attempt of iterator) {
		actualRetryCount++
	}

	t.is(actualRetryCount, maxAttempts)

	t.is(iterator.result, 'result')
})

test('during iteration lastError is provided', async t => {
	const maxAttempts = 5
	let actualRetryCount = 0

	const iterator = backoff.iterator((attempt) => {
		if (attempt === maxAttempts) {
			return 'result'
		}

		throw new Error('blabla')
	})

	for await (let attempt of iterator) {
		if (attempt === 0) {
			t.is(iterator.lastError, undefined)
		} else {
			t.is(iterator.lastError.message, 'blabla')
		}
	}
})

test('iteration will stop and an error is thrown after maxAttempts', async t => {

	const iterator = backoff.iterator((attempt) => {
		throw new Error('blabla')
	}, { maxAttempts: 5 })

	await t.throwsAsync(async () => {
		for await (let attempt of iterator) {}
	}, { instanceOf: backoff.OperationFailedError, message: 'operation failed, exceeded maximum attempts' })
})

function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms))
}
