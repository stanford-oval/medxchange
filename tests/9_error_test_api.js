'use strict';

const assert = require('assert');
const request = require('request-promise');
const url = 'https://localhost:5000';
const apiList = require('../routes/apiList.json');
let reqbody = require('./data/api-request.json');

async function main() {
  let options = {
    url: url,
    rejectUnauthorized: false,
    form: reqbody
  };
  let deployedDirectoryID = reqbody.directoryID;
  let EASID;
  let consumer1EASID = reqbody.consumer1EASID;
  ////Preprocedure before testing
  options.url = url + apiList.UserRegistration;
  options.form.userType = 'provider';
  options.form.userID = 'provider2';
  await request.post(options, (error, res, body) => {
    assert.strictEqual(JSON.parse(res.body).result.message, 'Register user successfully.');
  });

  options.url = url + apiList.EASDeployment;
  options.form.dataCertificate = 'ek4df/7ka4opg48ag89484=d2334';
  options.form.userID = 'consumer1';
  await request.post(options, (error, res, body) => {
    let result = JSON.parse(res.body).result;
    EASID = result.EASID;
  });

  console.log('Preprocedure finished!');
  ////////////////////////////////////////////////////////////////////////////////////////////////////

  ////Register user with the wrong directoryID
  options.url = url + apiList.UserRegistration;
  options.form.directoryID = '0xA7D0F9dCE477bb720626Df375E424d6c9B30A876';
  options.form.userType = 'provider';
  options.form.userID = 'providertest1';
  try {
    await request.post(options, (error, res, body) => {
      console.log('1.Register user with the wrong directoryID');
    });
  } catch (error) {
    console.log(JSON.parse(error.error).error);
    assert.strictEqual(JSON.parse(error.error).error, 'Error: Wrong directoryID');
  }

  ////Register with wrong userType 
  options.url = url + apiList.UserRegistration;
  options.form.directoryID = deployedDirectoryID;
  options.form.userType = 'wrongUserType';
  options.form.userID = 'provider1';
  try {
    await request.post(options, (error, res, body) => {
      console.log('2.Register with wrong userType');
    });
  } catch (error) {
    console.log(JSON.parse(error.error).error);
    assert.strictEqual(JSON.parse(error.error).error, 'Error: The userType is not defined.');
  }

  ////Register provider with the same providerID and the same password
  options.url = url + apiList.UserRegistration;
  options.form.directoryID = deployedDirectoryID;
  options.form.userType = 'provider';
  options.form.userID = 'provider1';
  options.form.password = '1111';
  try {
    await request.post(options, (error, res, body) => {
      console.log('3.Register provider with the same providerID and the same password');
    });
  } catch (error) {
    console.log(JSON.parse(error.error).error);
    assert.strictEqual(JSON.parse(error.error).error, 'Error: The userID is already registered as a provider.');
  }

  ////Register provider with the same providerID and the different password
  options.url = url + apiList.UserRegistration;
  options.form.directoryID = deployedDirectoryID;
  options.form.userType = 'provider';
  options.form.userID = 'provider1';
  options.form.password = '1234';
  try {
    await request.post(options, (error, res, body) => {
      console.log('4.Register provider with the same providerID and the different password');
    });
  } catch (error) {
    console.log(JSON.parse(error.error).error);
    assert.strictEqual(JSON.parse(error.error).error, 'Error: The userID is already registered as a provider.');
  }

  ////Register consumer with the same consuemrID and the same password
  options.url = url + apiList.UserRegistration;
  options.form.directoryID = deployedDirectoryID;
  options.form.userType = 'consumer';
  options.form.userID = 'consumer1';
  options.form.password = '1111';
  try {
    await request.post(options, (error, res, body) => {
      console.log('5.Register consumer with the same consuemrID and the same password');
    });
  } catch (error) {
    console.log(JSON.parse(error.error).error);
    assert.strictEqual(JSON.parse(error.error).error, 'Error: The userID is already registered as a consumer.');
  }

  ////Register consumer with the same consuemrID and the different password
  options.url = url + apiList.UserRegistration;
  options.form.directoryID = deployedDirectoryID;
  options.form.userType = 'consumer';
  options.form.userID = 'consumer1';
  options.form.password = '1234';
  try {
    await request.post(options, (error, res, body) => {
      console.log('6.Register consumer with the same consuemrID and the different password');
    });
  } catch (error) {
    console.log(JSON.parse(error.error).error);
    assert.strictEqual(JSON.parse(error.error).error, 'Error: The userID is already registered as a consumer.');
  }

  ////Deploy data entry with wrong directoryID
  options.url = url + apiList.DataEntryCreation;
  options.form.directoryID = '0xA7D0F9dCE477bb720626Df375E424d6c9B30A876';
  options.form.userType = 'provider';
  options.form.userID = 'provider1';
  options.form.password = '1111';
  try {
    await request.post(options, (error, res, body) => {
      console.log('7.Deploy data entry with wrong directoryID');
    });
  } catch (error) {
    console.log(JSON.parse(error.error).error);
    assert.strictEqual(JSON.parse(error.error).error, 'Error: Wrong directoryID');
  }

  ////Deploy data entry by the user who is not registered
  options.url = url + apiList.DataEntryCreation;
  options.form.directoryID = deployedDirectoryID;
  options.form.userID = 'notProvider';
  options.form.password = '1111';
  try {
    await request.post(options, (error, res, body) => {
      console.log('8.Deploy data entry by the user who is not registered');
    });
  } catch (error) {
    console.log(JSON.parse(error.error).error);
    assert.strictEqual(JSON.parse(error.error).error, 'Error: The userID is not registered as a provider.');
  }

  ////Deploy data entry by consumer
  options.url = url + apiList.DataEntryCreation;
  options.form.directoryID = deployedDirectoryID;
  options.form.userID = 'consumer1';
  options.form.password = '1111';
  try {
    await request.post(options, (error, res, body) => {
      console.log('9.Deploy data entry by consumer');
    });
  } catch (error) {
    console.log(JSON.parse(error.error).error);
    assert.strictEqual(JSON.parse(error.error).error, 'Error: The userID is not registered as a provider.');
  }

  ////Deploy data entry by provider with the wrong password
  options.url = url + apiList.DataEntryCreation;
  options.form.directoryID = deployedDirectoryID;
  options.form.userID = 'provider1';
  options.form.password = '1234';
  options.form.dataCertificate = 'd849dq49qdqd6q4d6';
  try {
    await request.post(options, (error, res, body) => {
      console.log('10.Deploy data entry by provider with the wrong password');
    });
  } catch (error) {
    console.log(JSON.parse(error.error).error);
    assert.strictEqual(JSON.parse(error.error).error, 'Error: Could not decrypt key with given password');
  }

  ////Deploy data entry with the same data certificate
  options.url = url + apiList.DataEntryCreation;
  options.form.directoryID = deployedDirectoryID;
  options.form.userID = 'provider1';
  options.form.password = '1111';
  options.form.dataCertificate = '49b45u9gm9042mg04b24jbj2=bj2=bj';
  try {
    await request.post(options, (error, res, body) => {
      console.log('11.Deploy data entry with the same data certificate');
    });
  } catch (error) {
    console.log(JSON.parse(error.error).error);
    assert.strictEqual(JSON.parse(error.error).error, 'Error: The data certificate has been used.');
  }

  ////Delete data entry with wrong directoryID
  options.url = url + apiList.DataEntryDeletion;
  options.form.directoryID = '0xA7D0F9dCE477bb720626Df375E424d6c9B30A876';
  options.form.userID = 'provider1';
  options.form.password = '1111';
  options.form.dataCertificate = '49b45u9gm9042mg04b24jbj2=bj2=bj';
  try {
    await request.post(options, (error, res, body) => {
      console.log('12.Delete data entry with wrong directoryID');
    });
  } catch (error) {
    console.log(JSON.parse(error.error).error);
    assert.strictEqual(JSON.parse(error.error).error, 'Error: Wrong directoryID');
  }

  ////Delete data entry by wrong data certificate
  options.url = url + apiList.DataEntryDeletion;
  options.form.directoryID = deployedDirectoryID;
  options.form.dataCertificate = 'wrongDatCertificate';
  try {
    await request.post(options, (error, res, body) => {
      console.log('13.Delete data entry by wrong data certificate');
    });
  } catch (error) {
    console.log(JSON.parse(error.error).error);
    assert.strictEqual(JSON.parse(error.error).error, 'Error: Wrong data certificate: the data entry does not exist.');
  }

  ////Delete data entry by wrong provider
  options.url = url + apiList.DataEntryDeletion;
  options.form.userID = 'provider2';
  options.form.dataCertificate = '49b45u9gm9042mg04b24jbj2=bj2=bj';
  try {
    await request.post(options, (error, res, body) => {
      console.log('14.Delete data entry by wrong provider');
    });
  } catch (error) {
    console.log(JSON.parse(error.error).error);
    assert.strictEqual(JSON.parse(error.error).error, 'Error: The userID is not the data provider of the entry.');
  }

  ////Delete data entry by provider with wrong password
  options.url = url + apiList.DataEntryDeletion;
  options.form.userID = 'provider1';
  options.form.password = '123445';
  try {
    await request.post(options, (error, res, body) => {
      console.log('15.Delete data entry by provider with wrong password');
    });
  } catch (error) {
    console.log(JSON.parse(error.error).error);
    assert.strictEqual(JSON.parse(error.error).error, 'Error: Could not decrypt key with given password');
  }

  ////Delete data entry which is deleted
  options.url = url + apiList.DataEntryDeletion;
  options.form.dataCertificate = 'ek4df/7ka4opg48ag89484=d2334';
  try {
    await request.post(options, (error, res, body) => {
      console.log('16.Delete data entry which is deleted');
    });
  } catch (error) {
    console.log(JSON.parse(error.error).error);
    assert.strictEqual(JSON.parse(error.error).error, 'Error: The data entry has been deleted.');
  }



  ////Deploy EAS with wrong directoryID
  options.url = url + apiList.EASDeployment;
  options.form.directoryID = '0xA7D0F9dCE477bb720626Df375E424d6c9B30A876';
  options.form.userID = 'consumer1';
  try {
    await request.post(options, (error, res, body) => {
      console.log('17.Deploy EAS with wrong directoryID');
    });
  } catch (error) {
    console.log(JSON.parse(error.error).error);
    assert.strictEqual(JSON.parse(error.error).error, 'Error: Wrong directoryID');
  }

  ////Deploy EAS with wrong data certificate
  options.url = url + apiList.EASDeployment;
  options.form.directoryID = deployedDirectoryID;
  options.form.userID = 'consumer1';
  options.form.dataCertificate = 'wrongDataCertificate';
  try {
    await request.post(options, (error, res, body) => {
      console.log('18.Deploy EAS with wrong data certificate');
    });
  } catch (error) {
    console.log(JSON.parse(error.error).error);
    assert.strictEqual(JSON.parse(error.error).error, 'Error: Wrong data certificate: the data entry does not exist.');
  }

  ////Deploy EAS with the user who is not the consumer
  options.url = url + apiList.EASDeployment;
  options.form.directoryID = deployedDirectoryID;
  options.form.userID = 'notConsumer';
  options.form.dataCertificate = '49b45u9gm9042mg04b24jbj2=bj2=bj';
  try {
    await request.post(options, (error, res, body) => {
      console.log('19.Deploy EAS with the user who is not the consumer');
    });
  } catch (error) {
    console.log(JSON.parse(error.error).error);
    assert.strictEqual(JSON.parse(error.error).error, 'Error: The userID is not registered as a consumer.');
  }

  ////Revoke EAS with wrong directoryID
  options.url = url + apiList.EASRevocation;
  options.form.directoryID = '0xA7D0F9dCE477bb720626Df375E424d6c9B30A876';
  options.form.userType = 'provider';
  options.form.userID = 'provider1';
  options.form.password = '1111';
  options.form.EASID = EASID;
  try {
    await request.post(options, (error, res, body) => {
      console.log('20.Revoke EAS with wrong directoryID');
    });
  } catch (error) {
    console.log(JSON.parse(error.error).error);
    assert.strictEqual(JSON.parse(error.error).error, 'Error: Wrong directoryID');
  }

  ////Revoke EAS with wrong EASID
  options.url = url + apiList.EASRevocation;
  options.form.directoryID = deployedDirectoryID;
  options.form.userType = 'provider';
  options.form.userID = 'provider1';
  options.form.password = '1111';
  options.form.EASID = '0xA7D0F9dCE477bb720626Df375E424d6c9B30A876';
  try {
    await request.post(options, (error, res, body) => {
      console.log('21.Revoke EAS with wrong EASID');
    });
  } catch (error) {
    console.log(JSON.parse(error.error).error);
    assert.strictEqual(JSON.parse(error.error).error, 'Error: Wrong EASID');
  }

  ////Revoke EAS by the user who is not registered
  options.url = url + apiList.EASRevocation;
  options.form.directoryID = deployedDirectoryID;
  options.form.userType = 'provider';
  options.form.userID = 'notProvider';
  options.form.password = '1111';
  options.form.EASID = EASID;
  try {
    await request.post(options, (error, res, body) => {
      console.log('22.Revoke EAS by the user who is not registered');
    });
  } catch (error) {
    console.log(JSON.parse(error.error).error);
    assert.strictEqual(JSON.parse(error.error).error, 'Error: The userID is not registered as a provider');
  }

  ////Revoke EAS by another provider 
  options.url = url + apiList.EASRevocation;
  options.form.directoryID = deployedDirectoryID;
  options.form.userType = 'provider';
  options.form.userID = 'provider2';
  options.form.password = '1111';
  options.form.EASID = EASID;
  try {
    await request.post(options, (error, res, body) => {
      console.log('23.Revoke EAS by another provider');
    });
  } catch (error) {
    console.log(JSON.parse(error.error).error);
    assert.strictEqual(JSON.parse(error.error).error, 'Error: The userID is not the provider of the EAS.');
  }

  ////Revoke EAS by another consumer
  options.url = url + apiList.EASRevocation;
  options.form.directoryID = deployedDirectoryID;
  options.form.userType = 'consumer';
  options.form.userID = 'consumer2';
  options.form.password = '1111';
  options.form.EASID = EASID;
  try {
    await request.post(options, (error, res, body) => {
      console.log('24.Revoke EAS by another consumer');
    });
  } catch (error) {
    console.log(JSON.parse(error.error).error);
    assert.strictEqual(JSON.parse(error.error).error, 'Error: The userID is not the consumer of the EAS.');
  }

  ////Revoke EAS by provider with wrong password
  options.url = url + apiList.EASRevocation;
  options.form.directoryID = deployedDirectoryID;
  options.form.userType = 'provider';
  options.form.userID = 'provider1';
  options.form.password = '1234';
  options.form.EASID = EASID;
  try {
    await request.post(options, (error, res, body) => {
      console.log('25.Revoke EAS by provider with wrong password');
    });
  } catch (error) {
    console.log(JSON.parse(error.error).error);
    assert.strictEqual(JSON.parse(error.error).error, 'Error: Could not decrypt key with given password');
  }

  ////Revoke EAS by consumer with wrong password
  options.url = url + apiList.EASRevocation;
  options.form.directoryID = deployedDirectoryID;
  options.form.userType = 'consumer';
  options.form.userID = 'consumer1';
  options.form.password = '1234';
  options.form.EASID = EASID;
  try {
    await request.post(options, (error, res, body) => {
      console.log('26.Revoke EAS by consumer with wrong password');
    });
  } catch (error) {
    console.log(JSON.parse(error.error).error);
    assert.strictEqual(JSON.parse(error.error).error, 'Error: Could not decrypt key with given password');
  }

  ////Revoke EAS which is revoked
  options.url = url + apiList.EASRevocation;
  options.form.directoryID = deployedDirectoryID;
  options.form.userType = 'consumer';
  options.form.userID = 'consumer1';
  options.form.password = '1111';
  options.form.EASID = consumer1EASID;
  try {
    await request.post(options, (error, res, body) => {
      console.log('27.Revoke EAS which is revoked');
    });
  } catch (error) {
    console.log(JSON.parse(error.error).error);
    assert.strictEqual(JSON.parse(error.error).error, 'Error: The EAS has been revoked.');
  }

  ////Retrieve data entry count by wrong directoryID
  options.url = url + apiList.DataEntryCount + '?directoryID=' + '0xA7D0F9dCE477bb720626Df375E424d6c9B30A876';
  try {
    await request.get(options, (error, res, body) => {
      console.log('28.Retrieve data entry count by wrong directoryID');
    });
  } catch (error) {
    console.log(JSON.parse(error.error).error);
    assert.strictEqual(JSON.parse(error.error).error, 'Error: Wrong directoryID');
  }

  ////Retrieve data entry by index with wrong directoryID
  options.url = url + apiList.DataEntryRetrievalByIndex + '?directoryID=' + '0xA7D0F9dCE477bb720626Df375E424d6c9B30A876' + '&index=0';
  try {
    await request.get(options, (error, res, body) => {
      console.log('29.Retrieve data entry by index with wrong directoryID');
    });
  } catch (error) {
    console.log(JSON.parse(error.error).error);
    assert.strictEqual(JSON.parse(error.error).error, 'Error: Wrong directoryID');
  }

  ////Retrieve data entry by index with out of boundary index
  options.url = url + apiList.DataEntryRetrievalByIndex + '?directoryID=' + deployedDirectoryID + '&index=5';
  try {
    await request.get(options, (error, res, body) => {
      console.log('30.Retrieve data entry by index with out of boundary index');
    });
  } catch (error) {
    console.log(JSON.parse(error.error).error);
    assert.strictEqual(JSON.parse(error.error).error, 'Error: Index of data entry is out of boundary.');
  }

  ////Retrieve data entry by data certificate with wrong directoryID
  options.url = url + apiList.DataEntryRetrievalByDataCertificate + '?directoryID=' + '0xA7D0F9dCE477bb720626Df375E424d6c9B30A876' + '&&dataCertificate=' + '49b45u9gm9042mg04b24jbj2=bj2=bj';
  try {
    await request.get(options, (error, res, body) => {
      console.log('31.Retrieve data entry by data certificate with wrong directoryID');
    });
  } catch (error) {
    console.log(JSON.parse(error.error).error);
    assert.strictEqual(JSON.parse(error.error).error, 'Error: Wrong directoryID');
  }

  ////Retrieve data entry by data certificate with wrong data certificate
  options.url = url + apiList.DataEntryRetrievalByDataCertificate + '?directoryID=' + deployedDirectoryID + '&&dataCertificate=' + 'wrongDataCertificate';
  try {
    await request.get(options, (error, res, body) => {
      console.log('32.Retrieve data entry by data certificate with wrong data certificate');
    });
  } catch (error) {
    console.log(JSON.parse(error.error).error);
    assert.strictEqual(JSON.parse(error.error).error, 'Error: Wrong data certificate: the data entry does not exist.');
  }

  ////Retrieve EAS with wrong EASID
  options.url = url + apiList.EASRetrieval + '?EASID=' + '0xA7D0F9dCE477bb720626Df375E424d6c9B30A876';
  try {
    await request.get(options, (error, res, body) => {
      console.log('33.Retrieve EAS with wrong EASID');
    });
  } catch (error) {
    console.log(JSON.parse(error.error).error);
    assert.strictEqual(JSON.parse(error.error).error, 'Error: Wrong EASID');
  }

}


module.exports = main;
if (!module.parent)
  main();
