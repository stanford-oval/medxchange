"use strict";

const assert = require('assert');
const Database = require('../../controllers/database.js');
const sleep = require('system-sleep');
const BlockNumber = new Database.BlockNumber();
const d = new Date();

async function main() {

  let response;
  let N=10;

  //Delete database.
  await BlockNumber.connect();
  try {
    await BlockNumber.db.run(`DELETE FROM blockNumber`);
  } catch (error) {
    console.log(error);
  }
  sleep(1000);

  //testing retrieveAll before writeBlockNumber
  response = await BlockNumber.retrieveBlockNumber();
  assert.strictEqual(response.message, 'Block number is retrieved.');
  assert.strictEqual(response.data.length, 0);

  //testing writeBlockNumber
  for (let i = 0; i < N; i++) {
    response = await BlockNumber.writeBlockNumber(i);
    assert.strictEqual(response.message, 'Block number is written successfully.')
    assert.strictEqual(response.data.number, i);
  }

  //testing retrieveAll after writeBlockNumber
  response = await BlockNumber.retrieveBlockNumber();
  assert.strictEqual(response.message, 'Block number is retrieved.');
  assert.strictEqual(response.data.length, N);
}

module.exports = main;
if (!module.parent)
  main();