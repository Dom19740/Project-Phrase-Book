import { test, mock, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { redisOps } from '../lib/redisOps.js'
import { BudgetCheckFailedError, BudgetExceededError, consumeDailyBudget, ensureBudgetAvailable } from '../lib/dailyBudget.js'

afterEach(() => {
  mock.restoreAll()
  delete process.env.DAILY_TRANSLATION_REQUEST_LIMIT
})

test('consumeDailyBudget allows requests and never touches Redis when no limit is configured', async () => {
  delete process.env.DAILY_TRANSLATION_REQUEST_LIMIT
  const incrMock = mock.method(redisOps, 'incr', async () => 999999)

  assert.equal(await consumeDailyBudget(), true)
  assert.equal(incrMock.mock.calls.length, 0)
})

test('consumeDailyBudget allows requests under the configured limit', async () => {
  process.env.DAILY_TRANSLATION_REQUEST_LIMIT = '100'
  mock.method(redisOps, 'incr', async () => 5)
  mock.method(redisOps, 'expire', async () => 1)

  assert.equal(await consumeDailyBudget(), true)
})

test('consumeDailyBudget denies requests once the daily limit is reached', async () => {
  process.env.DAILY_TRANSLATION_REQUEST_LIMIT = '100'
  mock.method(redisOps, 'incr', async () => 101)

  assert.equal(await consumeDailyBudget(), false)
})

test('consumeDailyBudget denies exactly at the boundary one past the limit', async () => {
  process.env.DAILY_TRANSLATION_REQUEST_LIMIT = '10'
  mock.method(redisOps, 'incr', async () => 11)

  assert.equal(await consumeDailyBudget(), false)
})

test('consumeDailyBudget sets an expiry only on the first increment of the day', async () => {
  process.env.DAILY_TRANSLATION_REQUEST_LIMIT = '100'
  mock.method(redisOps, 'incr', async () => 1)
  const expireMock = mock.method(redisOps, 'expire', async () => 1)

  await consumeDailyBudget()
  assert.equal(expireMock.mock.calls.length, 1)
})

test('consumeDailyBudget does not re-set the expiry on subsequent increments', async () => {
  process.env.DAILY_TRANSLATION_REQUEST_LIMIT = '100'
  mock.method(redisOps, 'incr', async () => 2)
  const expireMock = mock.method(redisOps, 'expire', async () => 1)

  await consumeDailyBudget()
  assert.equal(expireMock.mock.calls.length, 0)
})

test('consumeDailyBudget ignores a non-numeric limit rather than crashing', async () => {
  process.env.DAILY_TRANSLATION_REQUEST_LIMIT = 'not-a-number'
  const incrMock = mock.method(redisOps, 'incr', async () => 999999)

  assert.equal(await consumeDailyBudget(), true)
  assert.equal(incrMock.mock.calls.length, 0)
})

test('ensureBudgetAvailable resolves without throwing when within budget', async () => {
  process.env.DAILY_TRANSLATION_REQUEST_LIMIT = '10'
  mock.method(redisOps, 'incr', async () => 1)
  mock.method(redisOps, 'expire', async () => 1)

  await assert.doesNotReject(() => ensureBudgetAvailable())
})

test('ensureBudgetAvailable throws BudgetExceededError once the daily budget is exhausted', async () => {
  process.env.DAILY_TRANSLATION_REQUEST_LIMIT = '10'
  mock.method(redisOps, 'incr', async () => 11)

  await assert.rejects(() => ensureBudgetAvailable(), BudgetExceededError)
})

test('ensureBudgetAvailable throws BudgetCheckFailedError (fails closed) when Redis throws', async () => {
  process.env.DAILY_TRANSLATION_REQUEST_LIMIT = '10'
  mock.method(redisOps, 'incr', async () => {
    throw new Error('ECONNREFUSED')
  })

  await assert.rejects(() => ensureBudgetAvailable(), BudgetCheckFailedError)
})
