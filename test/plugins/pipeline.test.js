import test from 'ava';
import {stub} from 'sinon';
import pipeline from '../../lib/plugins/pipeline';

test('Execute each function in series passing the same input', async t => {
  const step1 = stub().resolves(1);
  const step2 = stub().resolves(2);
  const step3 = stub().resolves(3);

  const result = await pipeline([step1, step2, step3])(0);
  t.deepEqual(result, [1, 2, 3]);
  t.true(step1.calledWith(0));
  t.true(step2.calledWith(0));
  t.true(step3.calledWith(0));

  t.true(step1.calledBefore(step2));
  t.true(step2.calledBefore(step3));
});

test('With on step, returns the step values rather than an Array ', async t => {
  const step1 = stub().resolves(1);

  const result = await pipeline([step1])(0);

  t.deepEqual(result, 1);
  t.true(step1.calledWith(0));
});

test('With on step, throws the error rather than an AggregateError ', async t => {
  const error = new Error('test error 1');
  const step1 = stub().rejects(error);

  const thrown = await t.throws(pipeline([step1])(0));

  t.is(error, thrown);
});

test('Execute each function in series passing a transformed input from "getNextInput"', async t => {
  const step1 = stub().resolves(1);
  const step2 = stub().resolves(2);
  const step3 = stub().resolves(3);
  const step4 = stub().resolves(4);

  const result = await pipeline([step1, step2, step3, step4])(0, false, (lastResult, result) => lastResult + result);

  t.deepEqual(result, [1, 2, 3, 4]);
  t.true(step1.calledWith(0));
  t.true(step2.calledWith(0 + 1));
  t.true(step3.calledWith(0 + 1 + 2));
  t.true(step4.calledWith(0 + 1 + 2 + 3));
  t.true(step1.calledBefore(step2));
  t.true(step2.calledBefore(step3));
  t.true(step3.calledBefore(step4));
});

test('Execute each function in series passing the "lastResult" and "result" to "getNextInput"', async t => {
  const step1 = stub().resolves(1);
  const step2 = stub().resolves(2);
  const step3 = stub().resolves(3);
  const step4 = stub().resolves(4);
  const getNextInput = stub().returnsArg(0);

  const result = await pipeline([step1, step2, step3, step4])(5, false, getNextInput);

  t.deepEqual(result, [1, 2, 3, 4]);
  t.deepEqual(getNextInput.args, [[5, 1], [5, 2], [5, 3], [5, 4]]);
});

test('Execute each function in series calling "transform" to modify the results', async t => {
  const step1 = stub().resolves(1);
  const step2 = stub().resolves(2);
  const step3 = stub().resolves(3);
  const step4 = stub().resolves(4);
  const getNextInput = stub().returnsArg(0);
  const transform = stub().callsFake(result => result + 1);

  const result = await pipeline([step1, step2, step3, step4])(5, false, getNextInput, transform);

  t.deepEqual(result, [1 + 1, 2 + 1, 3 + 1, 4 + 1]);
  t.deepEqual(getNextInput.args, [[5, 1 + 1], [5, 2 + 1], [5, 3 + 1], [5, 4 + 1]]);
});

test('Stop execution and throw error is a step rejects', async t => {
  const step1 = stub().resolves(1);
  const step2 = stub().rejects(new Error('test error'));
  const step3 = stub().resolves(3);

  const error = await t.throws(pipeline([step1, step2, step3])(0), Error);
  t.is(error.message, 'test error');
  t.true(step1.calledWith(0));
  t.true(step2.calledWith(0));
  t.true(step3.notCalled);
});

test('Execute all even if a Promise rejects', async t => {
  const error1 = new Error('test error 1');
  const error2 = new Error('test error 2');
  const step1 = stub().resolves(1);
  const step2 = stub().rejects(error1);
  const step3 = stub().rejects(error2);

  const errors = await t.throws(pipeline([step1, step2, step3])(0, true));

  t.deepEqual(Array.from(errors), [error1, error2]);
  t.true(step1.calledWith(0));
  t.true(step2.calledWith(0));
  t.true(step3.calledWith(0));
});

test('Execute each function in series passing a transformed input even if a step rejects', async t => {
  const error2 = new Error('test error 2');
  const error3 = new Error('test error 3');
  const step1 = stub().resolves(1);
  const step2 = stub().rejects(error2);
  const step3 = stub().rejects(error3);
  const step4 = stub().resolves(4);

  const errors = await t.throws(
    pipeline([step1, step2, step3, step4])(0, true, (prevResult, result) => prevResult + result)
  );

  t.deepEqual(Array.from(errors), [error2, error3]);
  t.true(step1.calledWith(0));
  t.true(step2.calledWith(0 + 1));
  t.true(step3.calledWith(0 + 1 + error2));
  t.true(step4.calledWith(0 + 1 + error2 + error3));
});
