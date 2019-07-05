"use strict";

const assert = require('assert');
const Database = require('../../controllers/database.js');
const sleep = require('system-sleep');
const AuditTrailLog = new Database.AuditTrailLog();
const directoryID = '0x33456780987987987';
const d = new Date();
const time = d.getTime();
const loggingTime = [time, time + 1000, time + 2000, time + 3000];
const loggingMessage = ['loginAt' + loggingTime[0], 'loginAt' + loggingTime[1], 'loginAt' + loggingTime[2], 'loginAt' + loggingTime[3]];
const txHash = ['0x' + loggingTime[0], '0x' + loggingTime[1], '0x' + loggingTime[2], '0x' + loggingTime[3]];

async function main() {

  let response;
  let condition;

  //Delete database.
  await AuditTrailLog.connect();
  try {
    await AuditTrailLog.db.run(`DELETE FROM auditTrailLog`);
  } catch (error) {
    console.log(error);
  }
  sleep(1000);

  //testing retrieveAll before writeAuditTrailLog
  response = await AuditTrailLog.retrieveAll();
  assert.strictEqual(response.message, 'All audit logs are retrieved.');
  assert.strictEqual(response.data.length, 0);

  //testing writeAuditTrailLog
  for (let i = 0; i < 4; i++) {
    response = await AuditTrailLog.writeAuditTrailLog(directoryID, loggingTime[i], loggingMessage[i], txHash[i]);
    assert.strictEqual(response.message, 'Audit log is written successfully.');
    await checkData(response.data, directoryID, loggingTime[i], loggingMessage[i], txHash[i]);
  }

  //testing retrieveAll after writeAuditTrailLog
  response = await AuditTrailLog.retrieveAll();
  assert.strictEqual(response.message, 'All audit logs are retrieved.');
  assert.strictEqual(response.data.length, 4);
  for (let i = 0; i < response.data.length; i++) {
    await checkData(response.data[i], directoryID, loggingTime[i], loggingMessage[i], txHash[i]);
  }

  //testing retrieveByConditions
  condition = {
    timeLowerBound: undefined,
    timeUpperBound: undefined,
    loggingMessage: undefined,
    txHash: undefined,
  }

  response = await AuditTrailLog.retrieveByConditions(directoryID, condition);
  assert.strictEqual(response.message, 'Audit logs are retrieved conditionally.');
  assert.strictEqual(response.data.length, 4);
  for (let i = 0; i < response.data.length; i++) {
    await checkData(response.data[i], directoryID, loggingTime[i], loggingMessage[i], txHash[i]);
  }

  for (let i = 0; i < 4; i++) {
    condition.txHash = txHash[i];
    response = await AuditTrailLog.retrieveByConditions(directoryID, condition);
    assert.strictEqual(response.data.length, 1);
    await checkData(response.data[0], directoryID, loggingTime[i], loggingMessage[i], txHash[i]);
  }

  condition.txHash = undefined;
  condition.loggingMessage = 'At';
  response = await AuditTrailLog.retrieveByConditions(directoryID, condition);
  assert.strictEqual(response.data.length, 4);
  for (let i = 0; i < response.data.length; i++) {
    await checkData(response.data[i], directoryID, loggingTime[i], loggingMessage[i], txHash[i]);
  }

  for (let i = 0; i < 4; i++) {
    condition.txHash = undefined;
    condition.loggingMessage = 't' + loggingTime[i];
    response = await AuditTrailLog.retrieveByConditions(directoryID, condition);
    assert.strictEqual(response.data.length, 1);
    await checkData(response.data[0], directoryID, loggingTime[i], loggingMessage[i], txHash[i]);
  }

  condition.loggingMessage = undefined;
  condition.timeLowerBound = time + 500;
  response = await AuditTrailLog.retrieveByConditions(directoryID, condition);
  assert.strictEqual(response.data.length, 3);
  for (let i = 0; i < response.data.length; i++) {
    await checkData(response.data[i], directoryID, loggingTime[i+1], loggingMessage[i+1], txHash[i+1]);
  }

  condition.timeUpperBound = time + 2500;
  response = await AuditTrailLog.retrieveByConditions(directoryID, condition);
  assert.strictEqual(response.data.length, 2);
  for (let i = 0; i < response.data.length; i++) {
    await checkData(response.data[i], directoryID, loggingTime[i+1], loggingMessage[i+1], txHash[i+1]);
  }

  condition.timeLowerBound = undefined;
  response = await AuditTrailLog.retrieveByConditions(directoryID, condition);
  assert.strictEqual(response.data.length, 3);
  for (let i = 0; i < response.data.length; i++) {
    await checkData(response.data[i], directoryID, loggingTime[i], loggingMessage[i], txHash[i]);
  }

  condition.timeUpperBound = undefined;
  response = await AuditTrailLog.retrieveByConditions(directoryID, condition);
  assert.strictEqual(response.message, 'Audit logs are retrieved conditionally.');
  assert.strictEqual(response.data.length, 4);
  for (let i = 0; i < response.data.length; i++) {
    await checkData(response.data[i], directoryID, loggingTime[i], loggingMessage[i], txHash[i]);
  }
}

async function checkData(data, directoryID, loggingTime, loggingMessage, txHash) {
  assert.strictEqual(data.directoryID, directoryID);
  assert.strictEqual(data.loggingTime, loggingTime);
  assert.strictEqual(data.loggingMessage, loggingMessage);
  assert.strictEqual(data.txHash, txHash);
}

module.exports = main;
if (!module.parent)
  main();