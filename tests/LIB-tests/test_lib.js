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
  ('./1_test_UserRegistration.js'),
  ('./2_test_DataEntry.js'),
  ('./3_test_EAS.js')
]);
