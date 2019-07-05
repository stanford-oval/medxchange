"use strict";

const Q = require('q');
Q.longStackSupport = true;
process.on('unhandledRejection', (up) => { throw up; });

process.env.TEST_MODE = '1';

async function seq(array) {
  for (let fn of array) {
    console.log(`Running ${fn}`);
    await require(fn)();
  }
}

seq([
  ('./1_test_UserRegistrationDB.js'),
  ('./2_test_DataDirectoryDB.js'),
  ('./3_test_DataEntryAgreementDB.js'),
  ('./4_test_ExecutableAgreementScriptDB.js'),
  ('./5_test_AuditTrailLogDB.js'),
  ('./6_test_BlockNumberDB.js')
]);