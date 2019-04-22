// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 2 -*-
//
// This file is part of medx-server
//
// Copyright 2019 DeepQ
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
// Author: Alison Lin <yslin1013@gmail.com>
//         Wesley Liu <Wesley_Liu@htc.com>

pragma solidity ^0.4.25;

contract MetaData {
    // description = dataOwner + dataCertificate + dataDescription + dataAccesspath
    struct DataItemInfo {
        address provider;
        uint offerPrice;
        string description; 
    }
}

contract EAS is MetaData {
    address public directoryContractAddress;
    address public consumer;
    bool public isValid;
    uint public deploymentTime;
    uint public EASExpiration;
    string public providerAgreement; 
    string public consumerAgreement;
    DataItemInfo dataInfo;

    constructor(
        address _consumer,
        uint _EASExpiration,
        string _certificate, 
        string _providerAgreement, 
        string  _consumerAgreement
    ) 
    public 
    {
        directoryContractAddress = msg.sender;
        consumer = _consumer;
        deploymentTime = now;
        isValid = true;
        EASExpiration = _EASExpiration;
        providerAgreement = _providerAgreement;
        consumerAgreement = _consumerAgreement;
        Directory directory = Directory(directoryContractAddress);
        (dataInfo.provider, dataInfo.offerPrice, dataInfo.description) = directory.getDataEntryInfoByCertificate(_certificate);
    }

    function revokeEAS() external {
        require(msg.sender == directoryContractAddress && isValid);
        isValid = false;
    }
    
    function getDataEntryInfo() external view returns (address, uint, string) {
        return (dataInfo.provider, dataInfo.offerPrice, dataInfo.description);
    }
}

contract Directory is MetaData {
    struct RegisterInfo {
        address ethAddress;
        string id;
    }

    struct DataEntry {
        DataItemInfo dataInfo;
        bool isSearched;
        uint dueDate;
        uint commitTime;
        address[] EASList;
        string[] invocationRecord;
        mapping(address => uint) consumerEASLocation;
    }

    address admin;
    RegisterInfo[] providerList;
    RegisterInfo[] consumerList;
    DataEntry[] public dataEntryList;
    mapping(address => bool) public addressIsProvider;
    mapping(address => bool) public addressIsConsumer;
    mapping(string => bool) idIsProvider;
    mapping(string => bool) idIsConsumer;
    mapping(string => uint) dataEntryLocation;

    modifier isAdmin() {
        require(msg.sender == admin);
        _;
    }

    modifier dataIsExist(string certificate) {
        require (dataEntryLocation[certificate] > 0);
        _;
    }

    constructor() public {
        admin = msg.sender;
    }
    
    function registerProvider(address ethAddress, string id) isAdmin external {
        require(!(addressIsProvider[ethAddress] || idIsProvider[id]));
        addressIsProvider[ethAddress] = true;
        idIsProvider[id] = true;
        providerList.push(RegisterInfo(ethAddress, id));
    }

    function registerConsumer(address ethAddress, string id) isAdmin external {
        require(!(addressIsConsumer[ethAddress] || idIsConsumer[id]));
        addressIsConsumer[ethAddress] = true;
        idIsConsumer[id] = true;
        consumerList.push(RegisterInfo(ethAddress, id));
    }
    
    function createDataEntry(
        uint offerPrice,
        string certificate,
        string description,
        uint dueDate,
        uint commitTime
    ) 
        external
    {
        require(addressIsProvider[msg.sender]);
        require(dataEntryLocation[certificate] == 0);
        dataEntryList.push(DataEntry(
            DataItemInfo(
                msg.sender, 
                offerPrice,
                description
            ),
            true,
            dueDate,
            commitTime,
            new address[](0),
            new string[](0)
            )
        );
        dataEntryLocation[certificate] = dataEntryList.length;
    }

    function deleteDataEntry(string certificate) public {
        require(dataEntryList[dataEntryLocation[certificate]-1].isSearched);
        require(msg.sender == dataEntryList[dataEntryLocation[certificate]-1].dataInfo.provider);
        dataEntryList[dataEntryLocation[certificate]-1].isSearched = false;
    }

    function deployEAS(
        address consumer, 
        uint EASExpiration, 
        string certificate,
        string providerAgreement, 
        string consumerAgreement
        //string auditData
        )
        isAdmin
        dataIsExist(certificate)
        external 
    {
        EAS newEAS = new EAS
        (
            consumer,
            EASExpiration, 
            certificate,
            providerAgreement, 
            consumerAgreement
        );

        if (dataEntryList[dataEntryLocation[certificate]-1].consumerEASLocation[consumer] == 0) {
            dataEntryList[dataEntryLocation[certificate]-1].EASList.push(newEAS);
            dataEntryList[dataEntryLocation[certificate]-1].consumerEASLocation[consumer] = dataEntryList[dataEntryLocation[certificate]-1].EASList.length;
        } else {
            EAS oldEAS = EAS(dataEntryList[dataEntryLocation[certificate]-1].EASList[dataEntryList[dataEntryLocation[certificate]-1].consumerEASLocation[consumer]-1]);
            oldEAS.revokeEAS();
            dataEntryList[dataEntryLocation[certificate]-1].EASList[dataEntryList[dataEntryLocation[certificate]-1].consumerEASLocation[consumer]-1] = newEAS;
        }
    }

    function invokeEAS(string certificate, string record) dataIsExist(certificate) external {
        require (msg.sender == dataEntryList[dataEntryLocation[certificate]-1].dataInfo.provider);
        dataEntryList[dataEntryLocation[certificate]-1].invocationRecord.push(record);
    }

    function revokeEASbyProvider(string certificate, address consumer) dataIsExist(certificate) external {
        require (msg.sender == dataEntryList[dataEntryLocation[certificate]-1].dataInfo.provider);
        uint EASLocation = dataEntryList[dataEntryLocation[certificate]-1].consumerEASLocation[consumer];
        require (EASLocation > 0);
        EAS oldEAS = EAS(dataEntryList[dataEntryLocation[certificate]-1].EASList[EASLocation-1]);
        oldEAS.revokeEAS();
    }

    function revokeEASbyConsumer(string certificate) dataIsExist(certificate) external {
        uint EASLocation = dataEntryList[dataEntryLocation[certificate]-1].consumerEASLocation[msg.sender];
        require (EASLocation > 0);
        EAS oldEAS = EAS(dataEntryList[dataEntryLocation[certificate]-1].EASList[EASLocation-1]);
        oldEAS.revokeEAS();
    }

    function getProviderCount() external view returns (uint) {
        return providerList.length;
    }

    function getProviderByIndex(uint index) external view returns (address, string) {
        return (providerList[index].ethAddress, providerList[index].id);
    }

    function getConsumerCount() external view returns (uint) {
        return consumerList.length;
    }

    function getConsumerByIndex(uint index) external view returns (address, string) {
        return (consumerList[index].ethAddress, consumerList[index].id);
    }

    function getDataEntryCount() external view returns (uint) {
        return dataEntryList.length;
    }
    
    function getDataEntryByIndex(uint index) external view returns (address, uint, string, bool, uint, uint) {
        DataEntry memory dataEntry = dataEntryList[index];
        return (dataEntry.dataInfo.provider, dataEntry.dataInfo.offerPrice, dataEntry.dataInfo.description, dataEntry.isSearched, dataEntry.dueDate, dataEntry.commitTime);
    } 

    function getDataEntryLocationByCertificate(string certificate) public view returns (uint) {
        return dataEntryLocation[certificate]-1;
    }

    function getDataEntryInfoByCertificate(string certificate) external view returns (address, uint, string) {
        DataItemInfo memory data = dataEntryList[getDataEntryLocationByCertificate(certificate)].dataInfo;
        return (data.provider, data.offerPrice, data.description);
    }

    function getDataEntryAdditionInfoByCertificate(string certificate) external view returns (bool, uint, uint) {
        DataEntry memory dataEntry = dataEntryList[getDataEntryLocationByCertificate(certificate)];
        return (dataEntry.isSearched, dataEntry.dueDate, dataEntry.commitTime);
    }
    
    function getDataEntryEASCount(string certificate) external view returns (uint) {
        return dataEntryList[getDataEntryLocationByCertificate(certificate)].EASList.length;
    }

    function getConsumerEASLocation(string certificate, address consumer) external view returns (uint) {
        return dataEntryList[getDataEntryLocationByCertificate(certificate)].consumerEASLocation[consumer]-1;
    }

    function getDataEntryEASAddress(string certificate, uint index) external view returns (address) {
        return dataEntryList[getDataEntryLocationByCertificate(certificate)].EASList[index];
    }

    function getDataEntryInvocationRecordCount(string certificate) external view returns (uint) {
        return dataEntryList[getDataEntryLocationByCertificate(certificate)].invocationRecord.length;
    }

    function getDataEntryInvocationRecord(string certificate, uint index) external view returns (string) {
        return dataEntryList[getDataEntryLocationByCertificate(certificate)].invocationRecord[index];
    }
}