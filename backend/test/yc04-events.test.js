import {test} from 'node:test';
import assert from 'node:assert/strict';
import {extractCarId} from '../src/events.js';
test('YC04: event for changed car only',()=>{
  assert.equal(extractCarId('/api/cars/abc123/details'),'abc123');
  assert.equal(extractCarId('/api/maintenance/cars/car-44'),'car-44');
  assert.equal(extractCarId('/api/documents/cars/xyz'),'xyz');
  assert.equal(extractCarId('/api/cars'),null);
  assert.equal(extractCarId('/api/operations/expenses'),null);
});
