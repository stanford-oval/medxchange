pragma solidity ^0.4.25;

contract Directory {
    struct Registration {
        string userID;
        address userAddress;
    }

    struct DataEntry {
        address providerAddress;
        string dataSummary;
        uint dataOfferPrice;
        uint dataEntryDueDate;
        uint dataEntryCreationDate;
        bool isOffered;
        address[] EASList;
        string[] invocationRecord;
        mapping(address => bool) EASExist;
        mapping(address => uint) EASIndex;
    }

    address admin;
    Registration[] providerList;
    Registration[] consumerList;
    DataEntry[] public dataEntryList;
    mapping(address => bool) public addressIsProvider;
    mapping(address => bool) public addressIsConsumer;
    mapping(address => string) public getProviderIdByAddress;
    mapping(address => string) public getConsumerIdByAddress;
    mapping(string => bool) idIsProvider;
    mapping(string => bool) idIsConsumer;
    mapping(string => bool) dataEntryExist;
    mapping(string => uint) dataEntryIndex;

    modifier isAdmin() {
        require(msg.sender == admin, "The user is not the administrator of the directory");
        _;
    }

    modifier isDataEntry(string dataKey) {
        require (dataEntryExist[dataKey], "The data entry does not exist");
        _;
    }

    constructor() public payable {
        require(msg.value >= 100000 ether, "Not enough ether");
        admin = msg.sender;
    }
    
    function register(bool userTypeIsProivder, string userID, address userAddress) isAdmin external {
        if (userTypeIsProivder) {
            require(!(addressIsProvider[userAddress] || idIsProvider[userID]), "The provider id or address is registered");
            require(address(this).balance > 1000 ether, "Not enough value in the directory");
            addressIsProvider[userAddress] = true;
            idIsProvider[userID] = true;
            getProviderIdByAddress[userAddress] = userID;
            providerList.push(Registration(userID, userAddress));
            userAddress.transfer(1000 ether);
        } else {
            require(!(addressIsConsumer[userAddress] || idIsConsumer[userID]), "The consumer id or address is registered");
            require(address(this).balance > 100 ether, "Not enough value in the directory");
            addressIsConsumer[userAddress] = true;
            idIsConsumer[userID] = true;
            getConsumerIdByAddress[userAddress] = userID;
            consumerList.push(Registration(userID, userAddress));
            userAddress.transfer(100 ether);
        }
    }
    
    function createDataEntry(
        string dataKey,
        string dataSummary,
        uint dataOfferPrice,
        uint dataEntryDueDate,
        uint dataEntryCreationDate
    ) 
        external
    {
        require(addressIsProvider[msg.sender], "The user is not registered as a provider");
        require(!dataEntryExist[dataKey], "The data already exist");
        dataEntryIndex[dataKey] = dataEntryList.length;
        dataEntryList.push(DataEntry(
            msg.sender,
            dataSummary,
            dataOfferPrice,
            dataEntryDueDate,
            dataEntryCreationDate,
            true,
            // EASList
            new address[](0),
            // EASInvocationRecord
            new string[](0)
            )
        );
        dataEntryExist[dataKey] = true;
    }

    function deleteDataEntry(string dataKey) isDataEntry(dataKey) public {
        DataEntry storage dataEntry = dataEntryList[dataEntryIndex[dataKey]];
        require(dataEntry.isOffered, "The data has been deleted");
        require(msg.sender == dataEntry.providerAddress, "The user is not the provider of the data entry");
        dataEntry.isOffered = false;
    }

    function deployEAS(
        address consumerAddress,
        uint EASDeploymentDate,
        uint EASExpirationDate, 
        string dataKey,
        string acknowledgement
        )
        external
        isAdmin
        isDataEntry(dataKey) 
    {
        EAS newEAS = new EAS
        (
            consumerAddress,
            EASDeploymentDate,
            EASExpirationDate, 
            dataKey,
            acknowledgement
        );

        DataEntry storage dataEntry = dataEntryList[dataEntryIndex[dataKey]];
        if (!dataEntry.EASExist[consumerAddress]) {
            dataEntry.EASIndex[consumerAddress] = dataEntry.EASList.length;
            dataEntry.EASList.push(newEAS);
            dataEntry.EASExist[consumerAddress] = true;
        } else {
            EAS oldEAS = EAS(dataEntry.EASList[dataEntry.EASIndex[consumerAddress]]);
            if (oldEAS.isValid()) {
                oldEAS.revokeEAS();
            }
            dataEntry.EASList[dataEntry.EASIndex[consumerAddress]] = newEAS;
        }
    }

    function invokeEAS(string dataKey, string invocationRecord) external isDataEntry(dataKey) {
        require (msg.sender == dataEntryList[dataEntryIndex[dataKey]].providerAddress, "The user is not the provider of the data entry");
        dataEntryList[dataEntryIndex[dataKey]].invocationRecord.push(invocationRecord);
    }

    function revokeEASbyProvider(string dataKey, address consumerAddress) external isDataEntry(dataKey) {
        DataEntry storage dataEntry = dataEntryList[dataEntryIndex[dataKey]];
        require (msg.sender == dataEntry.providerAddress, "The user is not the provider of EAS");
        require (dataEntry.EASExist[consumerAddress], "The EAS does not exist");
        EAS oldEAS = EAS(dataEntry.EASList[dataEntry.EASIndex[consumerAddress]]);
        oldEAS.revokeEAS();
    }

    function revokeEASbyConsumer(string dataKey) external isDataEntry(dataKey) {
        DataEntry storage dataEntry = dataEntryList[dataEntryIndex[dataKey]];
        require (dataEntry.EASExist[msg.sender], "The EAS does not exist");
        EAS oldEAS = EAS(dataEntry.EASList[dataEntry.EASIndex[msg.sender]]);
        oldEAS.revokeEAS();
    }

    function getProviderCount() external view returns (uint) {
        return providerList.length;
    }

    function getProviderByIndex(uint index) external view returns (string, address) {
        return (providerList[index].userID, providerList[index].userAddress);
    }

    function getConsumerCount() external view returns (uint) {
        return consumerList.length;
    }

    function getConsumerByIndex(uint index) external view returns (string, address) {
        return (consumerList[index].userID, consumerList[index].userAddress);
    }

    function getDataEntryCount() external view returns (uint) {
        return dataEntryList.length;
    }
    
    function getDataEntryByIndex(uint index) external view returns (address, string, uint, uint, uint, bool) {
        DataEntry memory dataEntry = dataEntryList[index];
        return (
            dataEntry.providerAddress,
            dataEntry.dataSummary,
            dataEntry.dataOfferPrice,  
            dataEntry.dataEntryDueDate, 
            dataEntry.dataEntryCreationDate,
            dataEntry.isOffered
        );
    } 

    function checkDataEntryExist(string dataKey) external view returns (bool) {
        return dataEntryExist[dataKey];
    }

    function getDataEntryIndex(string dataKey) external view returns (uint) {
        return dataEntryIndex[dataKey];
    }

    function getDataEntryByCertificate(string dataKey) external view returns (address, string, uint, uint, uint, bool) {
        DataEntry memory dataEntry = dataEntryList[dataEntryIndex[dataKey]];
        return (
            dataEntry.providerAddress,
            dataEntry.dataSummary,
            dataEntry.dataOfferPrice,
            dataEntry.dataEntryDueDate, 
            dataEntry.dataEntryCreationDate,
            dataEntry.isOffered
        );
    }
    
    function getDataEntryEASCount(string dataKey) external view returns (uint) {
        return dataEntryList[dataEntryIndex[dataKey]].EASList.length;
    }

    function getEASIndex(string dataKey, address consumerAddress) external view returns (uint) {
        return dataEntryList[dataEntryIndex[dataKey]].EASIndex[consumerAddress];
    }

    function getDataEntryEASAddress(string dataKey, uint index) external view returns (address) {
        return dataEntryList[dataEntryIndex[dataKey]].EASList[index];
    }

    function getDataEntryInvocationRecordCount(string dataKey) external view returns (uint) {
        return dataEntryList[dataEntryIndex[dataKey]].invocationRecord.length;
    }

    function getDataEntryInvocationRecord(string dataKey, uint index) external view returns (string) {
        return dataEntryList[dataEntryIndex[dataKey]].invocationRecord[index];
    }
}

contract EAS {
    struct DataEntry {
        address providerAddress;
        string dataSummary;
        uint dataOfferPrice;
        uint dataEntryDueDate;
        uint dataEntryCreationDate;
        bool isOffered;
    }

    address public directoryContractAddress;
    address public consumerAddress;
    bool public isValid;
    uint public EASDeploymentDate;
    uint public EASExpirationDate;
    string public acknowledgement; 
    DataEntry dataEntryList;

    constructor(
        address _consumerAddress,
        uint _EASDeploymentDate,
        uint _EASExpirationDate,
        string _dataKey, 
        string _acknowledgement
    ) 
    public 
    {
        directoryContractAddress = msg.sender;
        consumerAddress = _consumerAddress;
        EASDeploymentDate = _EASDeploymentDate;
        isValid = true;
        EASExpirationDate = _EASExpirationDate;
        acknowledgement = _acknowledgement;
        Directory directory = Directory(directoryContractAddress);
        (
            dataEntryList.providerAddress, 
            dataEntryList.dataSummary, 
            dataEntryList.dataOfferPrice, 
            dataEntryList.dataEntryDueDate, 
            dataEntryList.dataEntryCreationDate,
            dataEntryList.isOffered
        ) 
        = directory.getDataEntryByIndex(directory.getDataEntryIndex(_dataKey));
    }

    function revokeEAS() external {
        require(msg.sender == directoryContractAddress, "Wrong way to use");
        require(isValid, "The EAS has been revoked");
        isValid = false;
    }
    
    function getEAS() external view returns (address, address, string, uint, uint, string, uint, bool) {
        return (
            dataEntryList.providerAddress, 
            consumerAddress, 
            dataEntryList.dataSummary, 
            dataEntryList.dataOfferPrice, 
            EASExpirationDate,
            acknowledgement,
            EASDeploymentDate,
            isValid
        );
    }
}