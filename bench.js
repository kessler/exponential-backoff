const backoff = require('./index')

const TEST_SIZE = 1000000

async function main() {
	
	for (const name in tests) {
		const test = tests[name]
		console.log(`testing ${name}`)
		console.time(`${name}`)

		test.setup()

		let invocationTime = 0

		for (let i = 0; i < TEST_SIZE; i++) {
			const start = Date.now()
			await test.run()
			invocationTime += Date.now() - start
		}
		console.timeEnd(`${name}`)
		console.log(`average invocationTime ${invocationTime / TEST_SIZE}`)
		console.log('------------------------------------------------------')
	}
}

const tests = {
	normal: {
		setup: () => {
			this.work = () => immediate()
		},
		run: () => backoff(this.work)
	},
	
	cached: {
		setup: () => {
			this.retry = backoff.cached()
			this.work = () => immediate()
		},
		run: () => this.retry(this.work)
	},

	iterator: {
		setup: () => {
			this.work = () => immediate()
		},
		run: async () => {
			const iterator = backoff.iterator(this.work)
			for await (const attempt of iterator) {}
		}
	},
	
	cachedIterator: {
		setup: () => {
			this.iterator = backoff.cachedIterator()
			this.work = () => immediate()
		},
		run: async () => {
			const iterator = this.iterator(this.work)
			for await (const attempt of iterator) {}
		}
	}
}

function immediate() {
	return new Promise(resolve => setImmediate(resolve))
}

main()