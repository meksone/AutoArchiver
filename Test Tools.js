// strane funzioni pescate in internet... 
// la prima prende una stringa con il path di un folder (case sensitive) e restituisce un folder object
// la seconda funzione prende un folder object e restituisce una stringa con il path completo... se si aggiunge un'altra stringa come parametro la aggiunge al path.
// http://ramblings.mcpher.com/Home/excelquirks/gooscript/driveapppathfolder

function getDriveFolderFromPath (path) {
  return (path || "/").split("/").reduce ( function(prev,current) {
    if (prev && current) {
      var fldrs = prev.getFoldersByName(current);
      return fldrs.hasNext() ? fldrs.next() : null;
    }
    else { 
      return current ? null : prev; 
    }
  },DriveApp.getRootFolder()); 
}

function getDrivePathFromFolder(folder,optPath) {
  
  var path = optPath || '/';
  if (!folder) return '';
  
  if (folder.getId() === DriveApp.getRootFolder().getId()) {
    return path;
  }
  else {
    return getDrivePathFromFolder(folder.getParents().next() , '/' + folder.getName() + path);
  }
  
}

function TESTgetDrivePathFromFolder() {
  var folder1 = getDriveFolderFromPath("Contenzioso Roma/Depositi/2014");
  var folder2 = getGdriveFolderByPath("Test/dated");
  var result1 = getDrivePathFromFolder(folder1,"/ciao");
  var result2 = getDrivePathFromFolder(folder2);
  Logger.log(result1)
  Logger.log(result2)
}

// non funziona
function updateCustomProperty(fileId,key,newvalue) {
  //var getProp = Drive.Properties.get(fileId, key);
  var resource = {
    key: key,
    value: newvalue,
    visibility: 'PUBLIC'
  };
  Drive.Properties.update(resource, fileId, key)
}

// non usata...perchè?
function createMsgPDF(msg,att,fld,run) {
  
  if (run == 1) {
    var html = "";
    html += "Da: " + msg.getFrom() + "<br />";  
    html += "A: " + msg.getTo() + "<br />";  
    html += "CC: " + msg.getCc() + "<br />";  
    html += "Oggetto: " + msg.getSubject() + "<br />";  
    html += "<hr />";
    html += msg.getBody().replace(/<img[^>]*>/g,""); // <----------- forse è meglio strippare le immagini, i PDF vengono più puliti
    html += "<hr />";
    var footer = "<strong>Allegati:</strong><ul>";
    footer += "<li>" + att + "</li>";
    var tempFile = DriveApp.createFile("temp.html", html, "text/html");
    fld.createFile(tempFile.getAs("application/pdf")).setName(msg.getSubject() + ".pdf");
    tempFile.setTrashed(true);
    // email
  }
  Logger.log("---------------------------------------- No message to save")
}



// Controlla le dimensioni delle e-mail in una data Label come checkSize
// stessa funzione, ma elabora una lista di ID invece di un object preso da una label
function checkSizeByID(msgZiparray) {  // msgZiparray è la Var in sendziporlinks che contiene tutti gli ID
  Logger.log("function checkSizeByID starting");
  
  var messageSize = 0; // questa variabile è fuori dal loop, la dichiaro a 0 e la incremento da dentro il loop seguente
  var attachNumber = 0; // conto anche gli allegati totali
  for (var checkIDIdx = 0; checkIDIdx < msgZiparray.messages.length; checkIDIdx++) { // elaborazione ID messaggi
    var checknewmsgID = msgZiparray.messages[checkIDIdx];
    var checkuniqueID = checknewmsgID.id;
    var checkmessage = GmailApp.getMessageById(checkuniqueID);
    var attachFromMsg = checkmessage.getAttachments();
    var partialAttachs = checkmessage.getAttachments().length;
    var msgAttachSize = getMessageSize(attachFromMsg);
    messageSize += msgAttachSize;
    attachNumber += partialAttachs;
    Logger.log(msgAttachSize + " MB");
  }
  Logger.log(messageSize + " <--- is the total size in MB");
  // return messageSize;
  // voglio avere come risposta due valori ;) quindi costruisco un object
  return {
    totalsize: messageSize,
    totalattach: attachNumber
  }
}

function getMessageSize(att) {
  var size = 0;
  for (var i = 0; i < att.length; i++) {
    //size += att[i].getBytes().length;
    size += att[i].getSize(); // Better and faster than getBytes()
  }
  // Wait for a second to avoid hitting the system limit
  Utilities.sleep(1000);
  return Math.round(size * 100 / (1024 * 1024)) / 100; //divisione per 100 = doppio decimale
  //return Math.round(size /(1024*1024)); // niente decimali
}

/*Per risolvere il problema derivato dall'uso di DocsList
mi restituisce un oggetto di tipo Folder - NON PIU USATO


function convertFolderFromDocsListToDriveApp(folder) { 
  return (folder === null) ? null : DriveApp.getFolderById(folder.getId());
}
*/



// list all files in a folder TEST

/* Code written by @hubgit 
   https://gist.github.com/hubgit/3755293
   Updated since DocsList is deprecated 
*/
 
function listFilesInFolder(folderName) {
  var ss = SpreadsheetApp.openById('1qYzDmpBnLu1ImuJnI_AQrTgDmIjC8ZcKMQx__SGKxQ0');
  SpreadsheetApp.setActiveSpreadsheet(ss);
  
  var file, data, sheet = SpreadsheetApp.getActiveSheet();
  sheet.clear();
  
  sheet.appendRow(["Name", "Date", "Size", "URL", "Download", "Description", "Type", "ID"]);
  
  
  var folder = DriveApp.getFoldersByName(folderName).next();
  var files = folder.getFiles(); // trova i file nel folder specificato
  var folders = folder.getFolders(); // trova i folder nel folder specificato
  while (files.hasNext()) {
    var contfiles = files.next()
    data = [ 
      contfiles.getName(),
      contfiles.getDateCreated(),
      contfiles.getSize(),
      contfiles.getUrl(),
      "https://docs.google.com/uc?export=download&confirm=no_antivirus&id=" + contfiles.getId(),
      contfiles.getDescription(),
      contfiles.getMimeType().toString(),
      contfiles.getId()
    ];
  sheet.appendRow(data);
  }
    
    while (folders.hasNext()) {
      var foldcontents = folders.next().getName();
      var foldername = DriveApp.getFoldersByName(foldcontents).next();
      var contfolders = foldername.getFiles();
      while (contfolders.hasNext()) {
        var foldername2 = contfolders.next();
      data2 = [ 
      contfolders.getName(),
      contfolders.getDateCreated(),
      contfolders.getSize(),
      contfolders.getUrl(),
      "https://docs.google.com/uc?export=download&confirm=no_antivirus&id=" + contfolders.getId(),
      contfolders.getDescription(),
      contfolders.getMimeType().toString(),
      contfolders.getId()
    ];
      sheet.appendRow(data2);
      }
        
   
  
  }
}
  


// TEST funzione soprastante ;)
function TESTlistFilesInFolder() {
 listFilesInFolder('Test') 
}



// test listing files and folders ... numero due!!!

/** 
 * Google Apps Script - List all files & folders in a Google Drive folder, & write into a speadsheet.
 *    - Main function 1: List all folders
 *    - Main function 2: List all files & folders
 * 
 * Hint: Set your folder ID first! You may copy the folder ID from the browser's address field. 
 *       The folder ID is everything after the 'folders/' portion of the URL.
 * 
 * @version 1.0
 * @see     https://github.com/mesgarpour
 */



// TODO: Set folder ID
var folderId = '0BzsHu_Y2fJ3sZlBORUlxYXZpdFE';
 
// Main function 1: List all folders, & write into the current sheet.
function listFolders(){
  getFolderTree(folderId, false);
};

// Main function 2: List all files & folders, & write into the current sheet.
function listAll(){
  getFolderTree(folderId, true); 
};

// =================
// Get Folder Tree
function getFolderTree(folderId, listAll) {
  var ss = SpreadsheetApp.openById('1qYzDmpBnLu1ImuJnI_AQrTgDmIjC8ZcKMQx__SGKxQ0');
  SpreadsheetApp.setActiveSpreadsheet(ss);
  
  try {
    // Get folder by id
    var parentFolder = DriveApp.getFolderById(folderId);
    
    // Initialise the sheet
    var file, data, sheet = SpreadsheetApp.getActiveSheet();
    sheet.clear();
    sheet.appendRow(["Full Path", "Name", "Date", "URL", "Last Updated", "Description", "Size", "ID"]);
    
    // Get files and folders
    getChildFolders(parentFolder.getName(), parentFolder, data, sheet, listAll);
    
  } catch (e) {
    Logger.log(e.toString());
  }
};

// Get the list of files and folders and their metadata in recursive mode
function getChildFolders(parentName, parent, data, sheet, listAll) {
  var maxchildfolders = 2;
  var childFolders = parent.getFolders();
  
  // List folders inside the folder
  //for (var i = 0; i < maxchildfolders && childFolders.hasNext(); ++i) { 
  while (childFolders.hasNext() ) {
    var childFolder = childFolders.next();
    // Logger.log("Folder Name: " + childFolder.getName());
    data = [ 
      parentName + "/" + childFolder.getName(),
      childFolder.getName(),
      childFolder.getDateCreated(),
      childFolder.getUrl(),
      childFolder.getLastUpdated(),
      childFolder.getDescription(),
      childFolder.getSize(),
      childFolder.getId()
    ];
    // Write
    sheet.appendRow(data);
    
    // List files inside the folder
    var files = childFolder.getFiles();
    while (listAll & files.hasNext()) {
      var childFile = files.next();
      // Logger.log("File Name: " + childFile.getName());
      data = [ 
        parentName + "/" + childFolder.getName() + "/" + childFile.getName(),
        childFile.getName(),
        childFile.getDateCreated(),
        childFile.getUrl(),
        childFile.getLastUpdated(),
        childFile.getDescription(),
        childFile.getSize(),
        childFile.getId()
       
      ];
      // Write
      sheet.appendRow(data);
    }
    
    // Recursive call of the subfolder
    getChildFolders(parentName + "/" + childFolder.getName(), childFolder, data, sheet, listAll);  
  }
};



// test ricerca folders non di proprietà di drive@virtax.it
// funzionicchia ma in finale sticazzi
// Log the name of every folder that are children of the current folder and you own and is starred.

function ListFoldersNotOwnedByMe() {
 var startfolder = DriveApp.getFolderById('0BzsHu_Y2fJ3scjlCUnJ4c19tbTg'); // folder cont roma
 var folders = DriveApp.getRootFolder().searchFolders('"serrenti@virtax.it" in owners');
  //var allfolders = DriveApp.getFolders().searchFolders('"serrenti@virtax.it" in owners');
  var allfolders = startfolder.getFolders();
  while (allfolders.hasNext()) {
    var foldername = allfolders.next();
    var viewname = foldername.getName();
   Logger.log (viewname);
  }
 
  //while (startfolder.hasNext().getFolders
  var nextfolders = allfolders.getFolders();
  
 while (allfolders.hasNext()) {
   var folder = allfolders.next();
   Logger.log(folder.getName());
 }
} // funziona ma solo per un livello (in root)




// test idiota di trasposizione della ricerca in Gmail adv. Services, ma in Drive...
// e perchè non convertirlo come l'altra funzione, usando un paio di righe invece di 50? ;)
// fatto! 27-04-2016
/*
function GAPIlistFiles(query, items, maxresults) { //funzione lunga, non usare... c'è la versione corta ;)
  
  // vediamo di integrare l'URL della richiesta e il token...
  
  // richiesta GET completa di esempio
  // GET https://www.googleapis.com/drive/v2/files?maxResults=10&q=not+%22me%22+in+owners&fields=items(downloadUrl%2CfileExtension%2Cid%2Cowners%2FemailAddress%2Cparents%2Fid)&key={YOUR_API_KEY}
// query di esempio
// not "me" in owners
  // fields nella risposta
  // items(id,mimeType,parents(id,kind),title)
  
  // richiesta GET 
  // GET https://www.googleapis.com/drive/v2/files
  var queryencoded = encodeURIComponent(query);
  var itemsencoded = encodeURIComponent(items);
  var url = 'https://www.googleapis.com/drive/v2/files?maxResults='+maxresults+'&q='+queryencoded+'&fields='+itemsencoded //restituisce un JSON con una array di ID
  var headers = {
    Authorization: 'Bearer ' + ScriptApp.getOAuthToken()
  };
   
  var params = {
    method: "GET",
    contentType: "application/json",
    headers: headers,
    muteHttpExceptions: true, // for debugging 
    };
  
  var check = UrlFetchApp.getRequest(url, params); // for debugging
  var response = UrlFetchApp.fetch(url, params);
  
  var result = response.getResponseCode();
  if (result == '200') {  // OK
    var listfiles = JSON.parse(response.getContentText());
    Logger.log(response.getContentText()) // commentare quando la funzione è a posto
  return listfiles;
  
  }
  else {
    // This is only needed when muteHttpExceptions == true
    var err = JSON.parse(response.getContentText());
    throw new Error( 'Error (' + result + ") " + err.error.message );
  }
}


// TEST Funzione ricerca in drive
function GAPIlistFilesTEST() {
  var query = '"serrenti" in owners';
  var maxresults = 1;
  var items = 'items(id,mimeType,parents(id),title)';
  var IDarray = GAPIlistFiles(query, items, maxresults);
  for (var IDidx = 0; IDidx < IDarray.items.length; IDidx++) {
    var whatType;
    var IDlist = IDarray.items[IDidx];
    var uniqueID = IDlist.id;
    Logger.log(IDlist.title + '-' + IDlist.mimeType)
    if (uniqueID) { whatType = DriveApp.getFileById(uniqueID) ? DriveApp.getFileById(uniqueID) : DriveApp.getFolderById(uniqueID); // ternary operand :D studiare!!!
                   if (whatType) {whatType.setOwner('drive@virtax.it')}
  }
  }
} 
*/



// come la funzione sopra, ma più breve ;)
// se fields = all, ritorna un'array enorme con tutte le properties, altrimenti va impostata per restituire solo quello che interessa
// occhio che il massimo dei risultati è 1000, poi serve il token: aggiungere maxResults: "1000" dopo q:
function GAPIDriveList(query,fields) {
  if (fields == "all") {
    var res = Drive.Files.list({
      q: query
      
    });
    return res;
  } else {
    var res = Drive.Files.list({
      q: query,
      fields:fields
    });
    return res
  }
}

// test funzione sopra
function GAPIDriveListTEST(){
  //var query = "mimeType = 'application/vnd.google-apps.folder' AND 'difiore' in owners AND '0BzsHu_Y2fJ3sTUVmc01hME41aTg' in parents"; // trova tutti i folders di clementina che siano childs di (ID)
  //var query = "'difiore' in owners AND '0BycPssOddO54THd4MlBkcW55TWc' in parents"; // trova tutti i files di clementina che siano childs di (ID)
  var query = "mimeType = 'application/vnd.google.drive.ext-type.pdf'";
  var fields = 'items(id,parents/id,title)';
  //var fields = 'items(id,owners/emailAddress)';
  //var fields = "all";
  var result = GAPIDriveList(query,fields)
  var number = result.items.length
  Logger.log("numero elementi: " + number)
}

// stessa funzione di GetAllChildrens (che funziona) ma usando GAPI e un solo helper, ovvero GAPIDriveList con diverse query
// è un pò strutturata male per quanto riguarda la variabili da passare alla funzione... rivedere!!!
function GetAllChildrensGAPI(folderId){
  //parent = 0BzsHu_Y2fJ3sTm1nRlBERWVmclU // cont roma/depositi/2016
  //parent = 0BzsHu_Y2fJ3sa1F1TDducG8xWVk // cont roma/depositi
  //parent = 0BzsHu_Y2fJ3scjlCUnJ4c19tbTg // cont roma
  var fullquery = "mimeType = 'application/vnd.google-apps.folder'";
  var query1 = "mimeType = 'application/vnd.google-apps.folder'";
  //var folderId = "'0BzsHu_Y2fJ3sTm1nRlBERWVmclU'"; // non hardcoded, ora è nei parametri della funzione
  var query3 = "in parents";
  var folders = GAPIDriveList(query1 + " AND " + "'" + folderId + "'" + " " + query3,'items(id,parents/id,title)')
  //Logger.log(folders) // e qui dovrei avere i primi 12 folders...
  for (var i=0; i < folders.items.length; i++){
    var subfoldersId = folders.items[i].id;
    var subfolders = GAPIDriveList(query1 + " AND " + "'" + subfoldersId + "'" + " " + query3,'items(id,parents/id,title)');
    //Logger.log(subfolders)
    if (subfolders.items.length > 0){
      Array.prototype.push.apply(folders.items,subfolders.items)
    }
  }
  //Logger.log("folders " + folders.items.length) // e funziona, cazzo... 9 secondi contro 34, daje!
  
  // ora ho una serie di folder id... dovrei riuscire a prendere tutti i files ciclando su ogni id
  var filesId = {
    items:[
      
    ]
  }
  for (var i=0; i < folders.items.length; i++){
    var files = GAPIDriveList("NOT " + query1 + " AND " + "'" + folders.items[i].id + "'" + " " + query3,'items(id,parents/id,title)');
    //Logger.log(files)
    if (files.items.length > 0){
      Array.prototype.push.apply(filesId.items,files.items)
    }
  }
  //Logger.log("numero files " + filesId.items.length) // e qui dovrei avrei tutti gli id dei files...
  var res = {
    folders: folders,
    files: filesId
  }
  Logger.log("files number: " + res.files.items.length); // giusto per...
  Logger.log("folders number: " + res.folders.items.length); // idem
  return res
}





// non utile...
// funzione per identificare tutti i children di una cartella
// contenzioso roma 0BzsHu_Y2fJ3scjlCUnJ4c19tbTg
/*
function GAPIDriveChildrens(folderId){
  var res = Drive.Children.list(folderId)
  return res;
}
// test funzione sopra
function GAPIDriveChildrensTEST(){
  var folderId = "0BzsHu_Y2fJ3scjlCUnJ4c19tbTg";
  var res = GAPIDriveChildrens(folderId)
Logger.log(res)
}
*/

// Funzione ricorsiva per individuare tutti i child folders e i files dentro una cartella root
// Funziona - 27-04-2016
// la funzione GetAllChildrensGAPI sostituisce la seguente funzione, usando un helper in meno e girando più rapidamente
/*
function GetAllChildrens(){
  // 0BzsHu_Y2fJ3scjlCUnJ4c19tbTg Contenzioso Roma - timeout
  // 0BzsHu_Y2fJ3sa1F1TDducG8xWVk Contenzioso Roma/Depositi - al limite
  // 0BzsHu_Y2fJ3sTm1nRlBERWVmclU Contenzioso Roma/Depositi/2016 - ok
  var folderId = "0BzsHu_Y2fJ3sTm1nRlBERWVmclU";
  var parent = DriveApp.getFolderById(folderId)
  var folders = getChildFolders(parent)
  //Logger.log(folders) // i child del root folder...
  
  for (var i =0; i < folders.length; i++) { // per ogni child folder trova i suoi child folder... 
    var subfolder = DriveApp.getFolderById(folders[i]);
    var subfolderId = getChildFolders(subfolder)
    if (subfolderId.length > 0) {
      Array.prototype.push.apply(folders,subfolderId); // e pusha l'array nell'array principale
    }
  }
  //Logger.log(folders) // le sottocartelle di prima e i loro child folders, ricorsivi
  // ora ho tutti i folder id... bisogna prendere tutti i files ciclando su ogni id
  var files = getAllFilesById(folders)
  // Logger.log(files) // e qui dovrei avrei tutti gli id dei files...
  var res = {
    folders: folders,
    files: files
  }
   Logger.log("files number: " + res.files.length); // conteggio di prova
   Logger.log("folders number: " + res.folders.length); // idem
  return res
}

// helper della funzione GetAllChildrens -trova i child folders
function getChildFolders(parent) {
  var foldersId = []
  var childFolders = parent.getFolders();
  while (childFolders.hasNext()) {
    var childFolder = childFolders.next();
    foldersId.push(childFolder.getId())
  }
  return foldersId
}

// helper della funzione GetAllChildrens - trova i files a partire da un'array di folder ID
function getAllFilesById(arrayOfFolderId){
  var filesId = []
  for (var i=0; i < arrayOfFolderId.length; i++){
    var folderById = DriveApp.getFolderById(arrayOfFolderId[i]);
    var files = folderById.getFiles();
    while (files.hasNext()){
      filesId.push(files.next().getId())
    }
  }
  return filesId
}
*/

       
// UCCAZZO FUNZIONA ALLA PRIMA BOTTA! DAJE! 15/05/2016 23:10!!! si, ma:
// purtroppo il test qui sorpa non funziona benissimo... non permette di cambiare l'owner se non sono io l'owner :D
// bisogna vedere se cambia qualcosa nel caso drive@virtax.ir diventi superadmin...






/*
 funzione per rinominare l'allegato in base ad un pattern; 
 funzionante nello script originale, io l'ho messo qui perchè non lo uso

if (rule.filenameFrom && rule.filenameTo && rule.filenameFrom == file.getName()) {
              var newFilename = Utilities.formatDate(messageDate, config.timezone, rule.filenameTo.replace('%s',message.getSubject()));
              Logger.log("INFO:           Renaming '" + file.getName() + "' -> '" + newFilename + "'");
              file.rename(newFilename);
            }
*/


// Casi da implementare ... ma anche no?
  
/*

                       

else if (doConvert == true) { // occhio che possono esservi più combinazioni
                          // ** Cartella assegnata da regola, no datazione, Salvataggio allegati MSG per successiva conversione *
					      // funzione ancora da implementare, la procedura di conversionedei MSG è oscura !!!
                          
							Logger.log("INFO:-------------------- Salvo allegati .MSG in cartella assegnata da regola (no datazione)");

							var sender = message.getFrom(); // perchè?
							var folder = CreateCustomDatedFolders(sender, rule.folder);
							var file = folder.createFile(attachment);

							//Inserire qui il costrutto IF per la funzione di rinominazione dei file - To Do - low priority
							// inserire qui il codice per la verifica di scrittura dei file + descrizione
                          
							Utilities.sleep(config.sleepTime);
						}
*/