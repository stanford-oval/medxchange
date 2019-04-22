// all tests, in batch form
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
  ('./1_test_CreateNewDirectory.js'),
  ('./2_test_UserRegistration.js'),
  ('./3_test_CreateDataEntry.js'),
  ('./4_test_EAS.js'),
  ('./5_test_CreateNewDirectory_api.js'),
  ('./6_test_UserRegistration_api.js'),
  ('./7_test_CreateDataEntry_api.js'),
  ('./8_test_EAS_api.js'),
  ('./9_error_test_api.js')
]);