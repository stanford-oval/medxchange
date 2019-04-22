'use strict';

const request = require('request-promise');

async function main() {
  let options;
  let result;
  let directoryID;
  let EASID;

  /*
    Create a new directory
    POST /directory/new/
    STEP1: apply and obtain a new directory ID
  */
  console.log('Create a new directory');
  try {
    options = {
      url: 'https://dxdl.deepq.com:5000/directory/new/',
      form: {}
    };
    await request.post(options, (error, res, body) => {
      result = JSON.parse(res.body).result;
      directoryID = result.directoryID;
      console.log(result);
    });
  } catch (error) {
    console.log(error.message);
  }


  /*
    Register a user (provider)
    POST /user/register/
    STEP2: apply an user account on the new directory
           enter the directory ID from STEP1, user type, user-specified ID and password
  */
  console.log('Register a provider');
  try {
    options = {
      url: 'https://dxdl.deepq.com:5000/user/register/',
      form: {
        directoryID: directoryID,
        userType: 'provider',
        userID: 'providerID',
        password: 'providerPassword'
      }
    };
    await request.post(options, (error, res, body) => {
      result = JSON.parse(res.body).result;
      console.log(result);
    });
  } catch (error) {
    console.log(error.message);
  }


  /*
    Register a user (consumer)
    POST /user/register/
    STEP3: apply an user account on the new directory
           enter the directory ID from STEP1, user type, user-specified ID and password
  */
  console.log('Register a consumer');
  try {
    options = {
      url: 'https://dxdl.deepq.com:5000/user/register/',
      form: {
        directoryID: directoryID,
        userType: 'consumer',
        userID: 'consumerID',
        password: 'consumerPassword'
      }
    };
    await request.post(options, (error, res, body) => {
      result = JSON.parse(res.body).result;
      console.log(result);
    });
  } catch (error) {
    console.log(error.message);
  }


  /*
    Create a new data entry by a provider
    POST /entry/create/
    STEP4: create a new data entry
           enter the directory ID from STEP1, the provider ID and password from STEP2
           data entry = data owner, data description, data certificate, data access path,
                        offer price and data entry due date
  */
  console.log('Create a new data entry by a provider');
  try {
    options = {
      url: 'https://dxdl.deepq.com:5000/entry/create/',
      form: {
        directoryID: directoryID,
        userID: 'providerID',
        password: 'providerPassword',
        dataOwner: 'djv24-vj8942-49hv2hv58924vh-fv294v',
        dataDescription: 'data',
        dataCertificate: '49b45u9gm9042mg04b24jbj2=bj2=bj',
        dataAccessPath: 'https://directory/test/sql',
        offerPrice: '100',
        dueDate: '1554087447123'
      }
    };
    await request.post(options, (error, res, body) => {
      result = JSON.parse(res.body).result;
      console.log(result);
    });
  } catch (error) {
    console.log(error.message);
  }


  /*
    Deploy a new EAS for a provider and a consumer by the service
    POST /eas/deploy/
    STEP5: deploy a new EAS and returned an EAS ID
           enter the directory ID from STEP1 and the consumer ID from STEP2
           EAS = data entry fields + 
                 data certificate, data expiration date, provider agreement and consumer agreement
  */
  console.log('Deploy a new EAS for a provider and a consumer by the service');
  try {
    options = {
      url: 'https://dxdl.deepq.com:5000/eas/deploy/',
      form: {
        directoryID: directoryID,
        userID: 'consumerID',
        dataCertificate: '49b45u9gm9042mg04b24jbj2=bj2=bj',
        expirationDate: '1564481164677',
        providerAgreement: '(digital fingerprint, digital signature and so on)',
        consumerAgreement: '(digital fingerprint, digital signature and so on)'
      }
    };
    await request.post(options, (error, res, body) => {
      result = JSON.parse(res.body).result;
      EASID = result.EASID;
      console.log(result);
    });
  } catch (error) {
    console.log(error.message);
  }


  /*
    Revoke an EAS by a user (provider or consumer)
    POST /eas/revoke/
    STEP6: revoke a new EAS
           enter the directory ID from STEP1, user type, user (provider or consumer) ID and password from STEP2 or STEP3
           EASID = the EAS ID returned from STEP5
  */
  console.log('Revoke an EAS by a user (provider or consumer)');
  try {
    options = {
      url: 'https://dxdl.deepq.com:5000/eas/revoke/',
      form: {
        directoryID: directoryID,
        userType: 'provider',
        userID: 'providerID',
        password: 'providerPassword',
        EASID: EASID
      }
    };
    await request.post(options, (error, res, body) => {
      result = JSON.parse(res.body).result;
      console.log(result);
    });
  } catch (error) {
    console.log(error.message);
  }


  /*
    Retrieve a data entry in a directory by entry index
    GET /entry/index/
    STEP7: retrieve a data entry by entry index
           enter the directory ID from STEP1 and an entry index (start from 0)
  */
  console.log('Retrieve a data entry in a directory by entry index');
  try {
    options = {
      url: 'https://dxdl.deepq.com:5000/entry/index/' + '?directoryID=' + directoryID + '&index=' + '0',
    };
    await request.get(options, (error, res, body) => {
      result = JSON.parse(res.body).result;
      console.log(result);
    });
  } catch (error) {
    console.log(error.message);
  }


  /*
    Retrieve a data entry in a directory by data certificate
    GET /entry/dctf/
    STEP8: retrieve a data entry by data certificate
           enter the directory ID from STEP1 and a data certificate
  */  
  console.log('Retrieve a data entry in a directory by data certificate');
  try {
    options = {
      url: 'https://dxdl.deepq.com:5000/entry/dctf/' + '?directoryID=' + directoryID + '&dataCertificate=' + '49b45u9gm9042mg04b24jbj2=bj2=bj',
    };
    await request.get(options, (error, res, body) => {
      result = JSON.parse(res.body).result;
      console.log(result);
    });
  } catch (error) {
    console.log(error.message);
  }


  /*
    Retrieve data entry count in a directory
    GET /entry/count/
    STEP9: retrieve data entry count in a directory
           enter the directory ID from STEP1
  */ 
  console.log('Retrieve data entry count in a directory');
  try {
    options = {
      url: 'https://dxdl.deepq.com:5000/entry/count/' + '?directoryID=' + directoryID,
    };
    await request.get(options, (error, res, body) => {
      result = JSON.parse(res.body).result;
      console.log(result);
    });
  } catch (error) {
    console.log(error.message);
  }


  /*
    Retrieve EAS information by an EAS ID
    GET /eas/sid/
    STEP10: retrieve EAS information by an EAS ID
            enter the EAS ID from STEP5
            If the the API /eas/revoke/ is called --> isValid=false
            If the the API /eas/revoke/ is not called --> isValid=true
  */ 
  console.log('Retrieve EAS information by an EAS ID');
  try {
    options = {
      url: 'https://dxdl.deepq.com:5000/eas/sid/' + '?EASID=' + EASID,
    };
    await request.get(options, (error, res, body) => {
      result = JSON.parse(res.body).result;
      console.log(result);
    });
  } catch (error) {
    console.log(error.message);
  }
  
}

module.exports = main;
if (!module.parent)
  main();
