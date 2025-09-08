// ******************************* TRIGGERS *******************************

// imposta trigger per Archiver
function setTriggerArchiver() {
  try {
    ScriptApp.newTrigger("Archiver")
    .timeBased()
    .everyMinutes(10)
    .create();
    return true
  } catch (e){
    Logger.log("********** setTriggerArchiver error: " + e);
    return false
  }
}

// imposta trigger per SendZipOrLinks // DA ELIMINARE!
function setTriggerSendZips() {
  try {
    ScriptApp.newTrigger("SendZipsOrLinks")
    .timeBased()
    .everyMinutes(10)
    .create();
    return true
  } catch (e) {
    Logger.log("********** setTriggerSendZips error: " + e);
    return false
  }
}

// imposta trigger per zipOldLogs (mensile, il primo giorno del mese) // DA ELIMINARE!
function setTriggerOldLogs() {
  try {
    ScriptApp.newTrigger("monthlyCleanUp")
    .timeBased()
    .onMonthDay(1)
    .atHour(1)
    .create();
    return true
  } catch (e) {
    Logger.log("********** setTriggerOldLogs error: " + e);
    return false
  }
}


// Cancella tutti i trigger
function deleteAllTriggers() {
  var triggers = ScriptApp.getScriptTriggers();
  for (var i = 0; i < triggers.length; i++) {
    ScriptApp.deleteTrigger(triggers[i]);
  }
}



/*
* Funzione per controllare lo status della mailbox
* return changed
* return unchanged
*/
// da sostituire con isStatusChanged() che ritorna true o false, nel nuovo loop di AA mail
function isMboxChanged(){ 
  try{
    Logger.log("********** Check status Mbox...");
    var oldMboxMsg = userProps.getProperty("oldMboxMsg"); 
    var oldMboxHist = userProps.getProperty("oldMboxHist");
    var MsgChanged, HistChanged
    
    // check status attuale
    var checkMboxStatus = gRetry2(function(){return Gmail.Users.getProfile('me')}); // expBackOff!
    var newMboxMsg = checkMboxStatus.messagesTotal; // numero messaggi totale
    var newMboxHist = checkMboxStatus.historyId; // progressivo non lineare history
    
    // update delle userProps "old"
    gRetry2(function(){userProps.setProperty("oldMboxMsg",newMboxMsg)});
    gRetry2(function(){userProps.setProperty("oldMboxHist",newMboxHist)});
    
    // ed ora vediamo di capire cosa farcene
    if (oldMboxMsg == newMboxMsg) { // se il numero dei messaggi vecchio è uguale a quello nuovo
      Logger.log("********** Nessun nuovo messaggio");
      MsgChanged = false;
    } else {
      Logger.log("********** Numero messaggi cambiato");
      MsgChanged = true;
    };
    if (oldMboxHist == newMboxHist) { // se l'HistoryID è cambiato
      Logger.log("********** History ID non cambiato");
      HistChanged = false;
    } else {
      Logger.log("********** History ID cambiato");
      HistChanged = true;
    };
    // per finire, stabiliamo la logica che decide SE procedere con l'elaborazione regole
    if (MsgChanged || HistChanged){ // numero messaggi o HistoryID cambiato 
      Logger.log("********** Mailbox status changed: TRUE" )
      return "changed"
    } else {
      Logger.log("********** Mailbox status changed: FALSE" )
      return "unchanged"
    }
  } catch (e){
    Logger.log("***error*** checkMbox error: " +e)
    return e
  }
}



function isStatusChanged(){ 
  try{
    Logger.log("********** Check Mbox Status...");
    var oldMboxMsg = userProps.getProperty("oldMboxMsg"); 
    var oldMboxHist = userProps.getProperty("oldMboxHist");
    var MsgChanged, HistChanged
    
    // check status attuale
    var checkMboxStatus = gRetry2(function(){return Gmail.Users.getProfile('me')}); // expBackOff!
    var newMboxMsg = checkMboxStatus.messagesTotal; // numero messaggi totale
    var newMboxHist = checkMboxStatus.historyId; // progressivo non lineare history
    
    // update delle userProps "old"
    gRetry2(function(){userProps.setProperty("oldMboxMsg",newMboxMsg)});
    gRetry2(function(){userProps.setProperty("oldMboxHist",newMboxHist)});
    
    // ed ora vediamo di capire cosa farcene
    if (oldMboxMsg == newMboxMsg) { // se il numero dei messaggi vecchio è uguale a quello nuovo
      Logger.log("********** Nessun nuovo messaggio");
      MsgChanged = false;
    } else {
      Logger.log("********** Numero messaggi cambiato");
      MsgChanged = true;
    };
    if (oldMboxHist == newMboxHist) { // se l'HistoryID è cambiato
      Logger.log("********** History ID non cambiato");
      HistChanged = false;
    } else {
      Logger.log("********** History ID cambiato");
      HistChanged = true;
    };
    // per finire, stabiliamo la logica che decide SE procedere con l'elaborazione regole
    if (MsgChanged || HistChanged){ // numero messaggi o HistoryID cambiato 
      Logger.log("********** Mailbox status changed: TRUE" )
      return true
    } else {
      Logger.log("********** Mailbox status changed: FALSE" )
      return false
    }
  } catch (e){
    Logger.log("***error*** checkMbox error: " +e)
    return e
  }
}


/* *******************************Utilities ****************************** */


// ********** TIME CONTROL
// Controllo tempo di esecuzione: restituisce true/false + runtime 
function isTimeOut(start){
  var now = new Date; 
  var maxRunTime = globalconfig.global[0].maxruntime
  var runTime = (now.getTime() - start.getTime()) / 1E3;
  Logger.log(localized.log[5].msg, runTime, maxRunTime); // ********** tempo trascorso...
  if (runTime >= maxRunTime) {
    Logger.log(localized.log[6].msg, runTime); // ********** TimeOut!
    return {
      runtime: runTime,
      end: now,
      timeout: true
    };
  }
  return {
    runtime: runTime,
    end: now,
    timeout: false
  };
}


// split array in gruppi definiti con unit
function chunkArrayInGroups(array, unit) { // e funziona! splitta una grossa array in array della dimensione definita da "unit"
var results = [],
length = Math.ceil(array.length / unit);
for (var i = 0; i < length; i++) {
    results.push(array.slice(i * unit, (i + 1) * unit));
}
 return results;
}

// rimuove gli elementi duplicati in una array
//http://stackoverflow.com/questions/16747798/delete-duplicate-elements-from-an-array
function removeDupesFromArray(array){
var unique = array.filter(function(elem, index, self) {
    return index == self.indexOf(elem);
})
return unique
}


  // Update numero di esecuzioni = se runtime è superiore a 0, aggiunge 1; se runs = null (ovvero: primissima esecuzione), allora imposta 1
function aaUpdateRuns(){
    var runs = userProps.getProperty("aa-runs");
    if (runs != null){
      var runsNumber = parseInt(runs); // le userProps sono sempre stringhe, quindi devo convertire in numero
      runsNumber++
        userProps.setProperty("aa-runs",runsNumber)
        Logger.log("********** AA-mail eseguito %s volte",runsNumber)
    } else {
      Logger.log("********** AA-mail non è stato mai eseguito! Imposto a 1");
      userProps.setProperty("aa-runs","1");
    }
}
  
  
  // Controllo numero esecuzioni
  // Se ha girato almeno 500 volte, e il numero di esecuzioni è divisibile per 500 con resto 0, parte e-mail di achievements :)
function AAachievement(){
  var AARuns = userProps.getProperty("aa-runs");
  var AArunsCount = parseInt(AARuns);
  var aaUser = getEmail()
  if (AArunsCount >= 500 && AArunsCount % 500 == 0) {
    var runshtmlbody = "Sono stato eseguito " + AArunsCount + " volte da " + aaUser ;
    GmailApp.sendEmail("serrenti+aaruns@virtax.it", "Obiettivo di AutoArchiver raggiunto da " + aaUser, "", { 
      htmlBody: runshtmlbody,
      name: 'AA-Runs'
    });
    //userProps.setProperty("aa-runs","0") // reset del contatore
    Logger.log("********** AA-mail obiettivo raggiunto: %s esecuzioni",AArunsCount);
  } // manda email
}


function betterClean(txt) {
  var cleanPass1 = txt.replace(/\//g, '-'); // sostituisco le "/" con dei "-"
  var cleanPass2 = cleanPass1.replace(/[:]/g, ' '); // i due punti con uno spazio...
  var cleanPass3 = cleanPass2.replace(/[^\wèéùàòì ,.-/@]/g, "."); // whitelist, non blacklist! - QUESTA FUNZIONA! quella sotto è TEST
return cleanPass3;
}

// Funzione per estrarre solo i valori da un'array associativa key/values
function extractValues(array){
  var result = []
  for(key in array) {
    if(array.hasOwnProperty(key)) {
        var value = array[key];
        result.push(value);
    }
}
  return result;
}


// add custom property 
// questa funzione da frequenti eRoRRi: internal error, ed esce proprio prima di finire l'esecuzione della regola (deve cancellare, nel caso delle mail IMAPSYNC); non imposta nemmeno i metadati.
// l'errore non è critico, in quanto l'email viene processata, etichettata, gli allegati sono salvati correttamente e non scattano allarmi nè etichette di avviso.
// e poi rallenta parecchio lo script: per scrivere 4-6 props, impiega anche 20 secondi!

// max 124 bytes fra key e value: devo inserire un controllo per limitare la grandezza dei valori
function addCustomProperty(fileId,key,value) {
  var keyLen = key.length;
  var valLen = value.length;
  if (keyLen + valLen > 122){
    var maxLen = 122 - keyLen // valore massimo della stringa Value
    var valTrimmed = value.substring(0, maxLen -4) + "...";
    value = valTrimmed
  };
  var property = {
    key: key,
    value: value,
    visibility: 'PUBLIC'
  };
    Drive.Properties.insert(property, fileId);
}


/* Cambio colore folders

 1 Cioccolato  2 Rosso mattone  3 Rosso Cardinale  4 Rosso Fragola  5 Aranciata  6 Giallo Taxi 
 7 Verde Menta  8 Felce  9 Verde Pisello  10 Verde Limone  11 Sabbia  12 Senape  13 Verde Acqua 
 14 Turchese  15 Blu Jeans  16 Blu Cielo  17 Velluto Blu  18 Viola Prugna  19 Grigio Topo 
 20 Grigio Fango  21 Lombrico  22 Rosa Confetto  23 Lavanda  24 Melanzana 
*/

function changeColor(folderId, colorNumber){
  var color = [ "index",
               "#ac725e","#d06b64","#f83a22","#fa573c","#ff7537",
               "#ffad46","#42d692","#16a765","#7bd148","#b3dc6c",
               "#fbe983","#fad165","#92e1c0","#9fe1e7","#9fc6e7",
               "#4986e7","#9a9cff","#b99aff","#8f8f8f","#cabdbf",
               "#cca6ac","#f691b2","#cd74e6","#a47ae2"
              ]
  var folder = Drive.Files.get(folderId);
  folder.folderColorRgb = color[colorNumber];
  Drive.Files.update(folder, folderId)
}


// funzione di test per vedere se una array (object JSON) è vuoto o no
// 13-09-2016 devo verificare se è anche un'array, altrimenti triggera un errore fastidiosissimo

function isEmpty(object) {
  if (object == null){
    Logger.log("---------- Object NULL");
    return true
  }
  else if (object != null){
    var objlength = Object.keys(object).length // ottengo la lunghezza, valore numerico
    if (objlength == 0){
      Logger.log("---------- Length: " + objlength + " = TRUE");
      return true;
    }
    else if (objlength != 0){
      Logger.log("---------- Length: " + objlength + " = FALSE");
      return false;
    } 
  } else { // qualsiasi altra cosa
    Logger.log("---------- Anything else = Rubbish")
    // return sempre true, come se fosse un'array vuota, anche se in realtà è tutt'altro e quindi vuol dire che la ricerca ha restituito un errore
    return true
  }
}


// parser per trovare gli url di Gdrive nel corpo della mail...
// adattato da https://ctrlq.org/code/19959-gmail-unsubscribe
// questa funzione dovrebbe essere abbastanza precisa

// cancellare e usare buildDriveFileData , quando avrò finito di accorpare la funzione buildEmailData
// la funzione buildDriveFileData è ok ed è usata nel nuovo AA-mail... questa funzione è usata nel vecchio
// aa-mail quindi potrà essere dismessa appena sarà in produzione il nuovo script
function getAllLinks2(message) {
  var expression = /([d]\/)[-\w]{25,}/g;
  var matching = message.getBody().match(expression);
  var driveID = [];
  if (matching == null) {
    return false; 
  } else {
    for (var i=0; i < matching.length; i++){
      var stripChars = matching[i].replace("d/","")
      driveID.push(stripChars);
    }
    
    // driveID è un'array che può avere duplicati e falsi links... ora la pulisco
    // magari con underscore? in futuro...
    var seen = {};
    var deDupe = [];
    var len = driveID.length;
    var j = 0;
    for(var i = 0; i < len; i++) {
      var item = driveID[i];
      if(seen[item] !== 1) {
        seen[item] = 1;
        deDupe[j++] = item;
      }
    }
    Logger.log("********** getAllLinks2: " + deDupe);
    
    // array pulita dai duplicati, ora controllo se sono files...
    var cleanedFileList = [];
    for (var i=0; i < deDupe.length; i++){
      try {
        var driveFile = DriveApp.getFileById(deDupe[i]);
        cleanedFileList.push(deDupe[i]);
      } catch (e) {
        Logger.log("********** getAllLinks2: not a Google Drive File! - " + e);
      }
    } 
    return cleanedFileList;
  }
}




/* ******************************* Funzioni relative a folders ed etichette ******************************* */

// Dato il nome come Stringa, restituisce il folder completo in Drive oppure lo crea se non esiste
function getOrCreateFolder(folderName) {
  var folder;
  try {
    folder = getGdriveFolderByPath(folderName)
  } catch (e) {
    var folderArray = folderName.split("/");
    folder = getOrCreateSubFolder(DriveApp.getRootFolder(), folderArray);
  }
  return (folder === null) ? null : DriveApp.getFolderById(folder.getId());
}

// http://ctrlq.org/code/19925-google-drive-folder-path
// HELPER di getOrCreateFolder
function getGdriveFolderByPath(path) {
  var name, folder, search, fullpath;
  // Rimuove gli slash e fa un trim del path
  fullpath = path.split("/");
  
  // Inizia sempre dalla root di Drive...
  folder = DriveApp.getRootFolder();
  for (var subfolder in fullpath) {
    name = fullpath[subfolder];
    search = folder.getFoldersByName(name);
    // Se il folder non esiste, allora viene creato
    folder = search.hasNext() ? search.next() : folder.createFolder(name);
  }
  Logger.log("********** Path: %s ",fullpath);
  return folder;
}


// Funzione ricorsiva per creare e restituire un path completo del folder
// HELPER di getOrCreateFolder
function getOrCreateSubFolder(baseFolder, folderArray) {
  if (folderArray.length == 0) {
    return baseFolder;
  }
  var nextFolderName = folderArray.shift();
  var nextFolder = null;
  var folders = baseFolder.getFolders();
  for (var i = 0; i < folders.length; i++) {
    var folder = folders[i];
    if (folders[i].getName() == nextFolderName) {
      nextFolder = folders[i];
      break;
    }
  }
  if (nextFolder == null) {
    // Il folder non esiste quindi verrà creato
    nextFolder = baseFolder.createFolder(nextFolderName);
  }
  return getOrCreateSubFolder(nextFolder, folderArray);
}

// TEST - WIP cosa succede se ci sono più folder con lo stesso nome?
function TESTgocf(){
  var folder = getOrCreateFolder("Test/Clementina");
  var foldername = folder.getName()
  Logger.log(foldername)
  

}


// Si possono passare stringhe formattate dd.MM.yyyy oppure oggetti Date ;)
// TEST - funzione per ottenere un pezzo del path che andrà a comporre la struttura del path completo ad un folder in drive partendo da una data
// mi serve per fare a meno delle diverse funzioni createdatedfolders, createdatedArbfolders ecc... e poter usare la sola getOrCreateFolder...
function datedPath(datestring) {
  Logger.log("********** datedPath: Creazione del path con data (data dal messaggio)");
  //if (isValidDate_(datestring)){ // la data è in un formato valido
    //datestring = Utilities.formatDate(datestring, Session.getScriptTimeZone(), "dd.MM.yyyy");
    var stringaSplit = datestring.split(".");
    var replace = replaceAll_(stringaSplit[1],months)
    var partialpath = stringaSplit[2] + "/" + replace + "/" + datestring; // ANNO/MESE LETTERALE/(dd.MM.yyyy)
    Logger.log("-------------------- Il path completo sarà BASEPATH + " + partialpath);
    return partialpath;
 // } else { // data in formato non valido
 //   Logger.log("**ERROR*** Data in formato non valido!");
 //   return false
 // }
}

function datedPath2(datestring) {
  //controlliamo subito se è un oggetto data o meno...
  if (isValidDate_(datestring)){ // se è un oggetto data...
    Logger.log("********** La data è un oggeto Date()! Continuo l'elaborazione...");
    var dateObj = new Date(datestring)
    var formatted = Utilities.formatDate(dateObj, Session.getScriptTimeZone(), "dd.MM.yyyy");
    var formattedString = formatted.toString();
    var stringaSplit = formattedString.split(".");
    var replace = replaceAll_(stringaSplit[1],months)
    var partialpath = stringaSplit[2] + "/" + replace + "/" + formattedString; // ANNO/MESE LETTERALE/(dd.MM.yyyy)
    return partialpath
  } else { // non è un oggetto date, quindi o è una data dd.MM.yyyy oppure è monnezza...
    try {   // prendo la data in formato dd.MM.yyyy e sostituisco subito i puntini con delle slash - triggera errore se il formato non è corretto!
      var stringaSplit = datestring.split(".");
      var replace = replaceAll_(stringaSplit[1],months)
      var partialpath = stringaSplit[2] + "/" + replace + "/" + datestring; // ANNO/MESE LETTERALE/(dd.MM.yyyy)
      var dateToCheck = stringaSplit[0] + "/" + stringaSplit[1] + "/" + stringaSplit[2];
      var checkDate = isValidDate_(dateToCheck);
      if (checkDate){
        Logger.log("********** La data è in formato valido!");
        return partialpath
      }
      return partialpath
    } catch (e) {
      Logger.log("********** datedPath: la data nell'oggetto dell'e-mail non è nel formato corretto! " + e);
      return false
    } // fine try/catch
  }
}


function TESTdated(){
  var stringOK = "02.02.2016";
  var stringKO = "02/02/2016";
  var stringKO2 = "02-02-2016";
  var test1 = datedPath2(stringOK);
  var test2 = datedPath2(stringKO);
  var test3 = datedPath2(stringKO2);
  //var test3 = datedPath(string);
  Logger.log("end")
}


// questa è OK ma bisogna usare la sintassi dd/MM/yyyy, se si usano i "." restituisce false
// se si passa un oggetto Date() è tutto ok...
function isValidDate_(date) { 
  if (new Date(date) !== "Invalid Date" && !isNaN(new Date(date)) ){
    return true
  } else {
    return false
  }
}


  
/*
Funzione per sostituire una serie di valori con altri 
Usato per sostituire i mesi numerali con il relativo mese letterale (01 = gennaio etc...)
http://stackoverflow.com/questions/15604140/replace-multiple-strings-with-multiple-other-strings
creare una mappa da passare alla funzione
var mapObj = {cat:"dog",dog:"goat",goat:"cat"};
*/

function replaceAll_(string,mapObj){
    var re = new RegExp(Object.keys(mapObj).join("|"),"gi");
    return string.replace(re, function(matched){
        return mapObj[matched.toLowerCase()];
    });
}

// Dato il nome, restituisce la label o la crea se non esiste
// @ labelName STRING
function getOrCreateLabel(labelName) {
  var label = GmailApp.getUserLabelByName(labelName);
  if (label == null) {
    if (labelName == null) {
      Logger.log("---------- Il nome dell'etichetta è vuoto!");
      var d = new Date();
      var formatted = Utilities.formatDate(d, Session.getScriptTimeZone(), "yyyy.MM.dd_HH.mm.ss");
      var today = formatted.toString();
      labelName = today.toString();
      Logger.log("---------- Il nome dell'etichetta è " + labelName);
    }
    label = GmailApp.createLabel(labelName);
  }
  return label;
}

// Funzione identica a folderFromSubject ma con uscita false, per nuova funzione buildPath
// un filo più veloce, più semplice
function checkFolderInSubject(str) {
  var strmatch = str.match(/@(.*?)@/g);
  if (strmatch) {
    var result = strmatch.toString().replace((/@/g),"");
    Logger.log("---------- Folder estratto dall'oggetto dell'e-mail: " + result);
    return result;
  } else {
    Logger.log("---------- folderFromSubject: no '@' found");
    return false
  }
}



// Nuova funzione! 7/7/2016
// match delle varie opzioni per costruire il path finale di salvataggio in un colpo solo e con una sola stringa nella config

  function freePathBuilder(folderstring,emaildata,partpath){ // definitivo
    /*var folderstring = "Test/@YEAR@/@MONTH@/@DAY@/@HOUR@/@MSGYEAR@/@MSGMONTH@/@MSGDAY@/@MSGHOUR@/@MSGFROM@/@MSGSUBJ@";
    var emaildata = {uniqueID: "111111111",
                     msgYear: 2015,
                     msgMonth: "Maggio",
                     msgDay: 22,
                     msgHour: "22.33.22",
                     msgFrom: 'meksONE <meksONE@gmail.com>',
                     msgSubj: "ciao stronzo:<>"
                    }*/
    // partPath è opzionale!
    
    var d = new Date();
    var formatted = Utilities.formatDate(d, Session.getScriptTimeZone(), "yyyy/MM/dd/HH.mm.ss");
    var stringaSplit = formatted.split("/");
    var monthName = replaceAll_(stringaSplit[1],months);
    var cleanSubj = betterClean(emaildata.msgSubj);
    var cleanFrom = betterClean(emaildata.msgFrom); 
    var onlyAddress = emaildata.msgFrom.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi);
    
    // aggiungere funzione per ARBfolder e siamo a posto!...e l'ho fatto, credo
    
    if (partpath != false) {
      
      var stringaSplitPart = partpath.split(".");
      Logger.log("***** FreePathBuilder - PartPath trovato: " + partpath);
      //Logger.log("***** FreePathBuilder: " + partpath)
      //Logger.log("***** FreePathBuilder: " + stringaSplitPart)
      
      var arbMonth = replaceAll_(stringaSplitPart[1],months);
      var arbMonthNum = stringaSplitPart[1];
      var arbYear = stringaSplitPart[2];
      var arbDay = stringaSplitPart[0]; 
      var processedString = folderstring
      
      .replace(/@YEAR@/g,stringaSplit[0])
      .replace(/@MONTH@/g,monthName)
      .replace(/@MONTHNUM@/g, stringaSplit[1])
      .replace(/@DAY@/g,stringaSplit[2])
      .replace(/@HOUR@/g,stringaSplit[3])
      .replace(/@MSGYEAR@/g, arbYear)
      .replace(/@MSGMONTH@/g, arbMonth)
      .replace(/@MSGMONTHNUM@/g, arbMonthNum)
      .replace(/@MSGDAY@/g, arbDay)
      .replace(/@MSGHOUR@/g, emaildata.msgHour)
      .replace(/@MSGFROM@/g, onlyAddress) // era cleanFrom... ora mette solo l'email invece della formula NOME COGNOME <email>
      .replace(/@MSGSUBJ@/g, cleanSubj)
      .replace(/@MSGID@/g, emaildata.uniqueID)
      } else {
        var processedString = folderstring
        .replace(/@YEAR@/g,stringaSplit[0])
        .replace(/@MONTH@/g,monthName)
        .replace(/@MONTHNUM@/g, stringaSplit[1])
        .replace(/@DAY@/g,stringaSplit[2])
        .replace(/@HOUR@/g,stringaSplit[3])
        .replace(/@MSGYEAR@/g, emaildata.msgYear)
        .replace(/@MSGMONTH@/g, emaildata.msgMonth)
        .replace(/@MSGMONTHNUM@/g, emaildata.msgMonthNum)
        .replace(/@MSGDAY@/g, emaildata.msgDay)
        .replace(/@MSGHOUR@/g, emaildata.msgHour)
        .replace(/@MSGFROM@/g, onlyAddress) // era cleanFrom... ora mette solo l'email invece della formula NOME COGNOME <email>
        .replace(/@MSGSUBJ@/g, cleanSubj)
        .replace(/@MSGID@/g, emaildata.uniqueID)
        }

   Logger.log("***** FreePathBuilder - Path string: " + processedString);
  return processedString
}



// ******************************* Funzioni relative ai messaggi *******************************


          

// salva messaggio e-mail in formato PDF, con link all'interno ai file in Google Drive (ooooh yeah!)
// ATTENZIONE!!! per ora funziona, ma devo riscriverla per sfruttare emailData in AR!
function saveMessage(message,attachListPdf) {
  var html = ""; // variabile vuota che ospiterà l'HTML del messaggio
  var msgSubj = message.getSubject();
  var msgDate = message.getDate();
  var msgId = message.getId();
  var msgBody = message.getBody();
  var gDriveLinks = getAllLinks2(message)
  if (gDriveLinks == false) {
    Logger.log("Nell'e-mail non è presente nessun link di Google Drive");
  } else {
    for (var Id = 0, len = gDriveLinks.length; Id < len; Id++) {
      var drivelink = gDriveLinks[Id];
      msgBody = msgBody.replace(drivelink,"gdrive_link_removed");
      Logger.log("Rimosso link numero " + Id);
    }
  }
  
  html += "<br>";
  html += "Data: " + msgDate + "<br>";
  html += "Mittente: " + message.getFrom() + "<br>";
  html += "Destinatario: " + message.getTo() + "<br>";
  html += "In copia: " + message.getCc() + "<br>";
  html += "Oggetto: " + msgSubj + "<br>";
  html += "<hr/>";
  html += msgBody.replace(/<img[^>]*>/g,"");
  html += "Lista allegati";
  html += "<hr/>";
  html += attachListPdf + "</ul>";
  var htmlBodyFile = Utilities.newBlob(html, MimeType.HTML);
  var pdfBlob = htmlBodyFile.getAs(MimeType.PDF);
  var cleanSubj = betterClean(msgSubj);   // pulisce il subject
  var formatted = Utilities.formatDate(msgDate, Session.getScriptTimeZone(), "yyyy.MM.dd_HH.mm.ss");
  var msgSimpleDate = formatted.toString();
  pdfBlob.setName(msgSimpleDate + "_" + cleanSubj + ".pdf");
  Logger.log("---------- Message saved as PDF");
  return pdfBlob; // blob da passare a folder.createFile
}



// Alert e-mail per mancanza allegati
function createAlertBody(messageSubj,messageDate){
  var alertBody = "";
  alertBody += "L'email con oggetto: " + messageSubj + "<br/>";
  alertBody += "spedita in data: " + messageDate + "<br/>";
  alertBody += "dovrebbe contenere almeno un allegato." + "<br/>"; 
  alertBody += "<br/>";
  alertBody += "Se l'allegato è stato inserito come link a Google Drive, spedire una nuova e-mail" + "<br/>";
  alertBody += "allegando i file desiderati." + "<br/>";
  alertBody += "<br/>";
  alertBody += "Grazie";
  alertBody += "<hr/>";
  alertBody += "Questa e-mail è stata spedita automaticamente da AutoArchiver";
  return alertBody;
}


// Alert e-mail su errore salvataggio allegati
function createAlertBody2(messageSubj,messageDate,messageId,attachList,attachLog){
  var alertBody2 = "";
  alertBody2 += "L'email con oggetto: " + messageSubj + "<br/>";
  alertBody2 += "spedita in data: " + messageDate + "<br/>";
  alertBody2 +=  "ID:" + "https://mail.google.com/mail/u/0/#inbox/" + messageId + "<br/>"; 
  alertBody2 += "ha generato un errore nel salvataggio degli allegati." + "<br/>"; 
  alertBody2 += "<br/>";
  alertBody2 += "Verificare il nome e il numero di allegati salvati in Drive e" + "<br/>";
  alertBody2 += "confrontarlo con il numero di allegati presenti nell'e-mail." + "<br/>";
  alertBody2 += "<br/>";
  alertBody2 += "Grazie";
  alertBody2 += "<hr/>";
  alertBody2 += attachList;
  alertBody2 += "<hr/>";
  alertBody2 += "Questa e-mail è stata spedita automaticamente da AutoArchiver";
  alertBody2 += "<br/>";
  alertBody2 += "Inizio Log";
  alertBody2 += "<br/>";
  alertBody2 += attachLog; //raw log dell'esecuzione
  return alertBody2;
}


// ******************************* Funzioni relative ai log *******************************

/**
 * Salvataggio log a fine esecuzione in cartella datata
 * La data viene ricavata al momento dell'esecuzione
 * logfolder è il config.logfolder, ovvero il folder di salvataggio
 *
 * @method SaveLog
 * @param {string} folder path
 */
function SaveLog(logfolder) {
  var getArchiverLog = Logger.getLog();
  var userProps = PropertiesService.getUserProperties();
  //var lastlog = userProps.setProperty("lastlog", getArchiverLog)
  var d = new Date();
  var formatted = Utilities.formatDate(d, Session.getScriptTimeZone(), "yyyy/MM/dd");
  var formatted2 = Utilities.formatDate(d, Session.getScriptTimeZone(), "yyyy.MM.dd_HH.mm.ss");
  var today = formatted.toString();
  var todaylog = formatted2.toString();
  var ArchiveLogFolder = gRetry2(function(){ return getOrCreateFolder(logfolder + "/" + today)});
  gRetry2(function(){ return ArchiveLogFolder.createFile(todaylog + ".txt", getArchiverLog, "text/plain")});
  Logger.log("-------------------- Esecuzione terminata --------------------");
}

// funzione per salvare ogni esecuzione che non ha generato azioni, da usare per mostrarlo nell'interfaccia
function SaveLastLog(logfolder) {
  var userProps = PropertiesService.getUserProperties();
  var getArchiverLog = Logger.getLog();
  var d = new Date();
  var formatted = Utilities.formatDate(d, Session.getScriptTimeZone(), "yyyy.MM.dd_HH.mm.ss");
  var todaylog = formatted.toString();
  var ArchiveLogFolder = getOrCreateFolder(logfolder);
  var ArchiveLogFolderId = ArchiveLogFolder.getId();
  var logFolderId = userProps.setProperty("logFolderId", ArchiveLogFolderId); // in userProps! // string
  var logDocId = userProps.getProperty("logDocId");
  if (logDocId) {
  Logger.log("gDoc per latest log esistente");
    
  } else { // non esiste, quindi creo il file
    var gDoc = DocumentApp.create("autoarchiverlatest");
  var gDocId = gDoc.getId();
  var logDocId = userProps.setProperty("logDocId", gDocId); // in userProps! // string
  var gDocFile = DriveApp.getFileById(userProps.getProperty("logDocId"));
  DriveApp.getFolderById(userProps.getProperty("logFolderId")).addFile(gDocFile);
  DriveApp.getRootFolder().removeFile(gDocFile)
  }
  var gDoc = DocumentApp.openById(userProps.getProperty("logDocId"));
  var gDocBody = gDoc.getBody();
  gDocBody.clear(); // cancella l'attuale contenuto
  gDocBody.insertParagraph(0, getArchiverLog);
  
  /*var existing = DriveApp.getFilesByName("autoarchiverlatest.txt") //iterator...
  if (existing){
  while (existing.hasNext()){
    latestfile = existing.next().getId();
    Drive.Files.remove(latestfile)
  }
  }
  ArchiveLogFolder.createFile("autoarchiverlatest.txt", getArchiverLog, "text/plain");*/
  Logger.log("-------------------- Esecuzione terminata --------------------");
}



// funzione per zippare i log del mese precedente
// automatico, va fatto partire il primo giorno del mese e lui zippa i log del mese precedente :)
// il parametro d è un object Date()
//function zipOldLogs(){
function zipOldLogs(){
  try{
  var d = new Date();
  var logfolder = globalconfig.global[0].logfolder; // logfolder, base
  var trashFolder = globalconfig.global[0].trashfolder;
  var localTrash = gRetry2(function(){ return getOrCreateFolder(trashFolder)}); // creazione del folder Cestino
  gRetry2(function(){ return changeColor(localTrash.getId(),5)}) // folder arancio?
  var formatted = Utilities.formatDate(d, Session.getScriptTimeZone(), "yyyy.MM");
  var dateSplit = formatted.split(".");
  var monthNumber = Number(dateSplit[1]);
  var yearNumber = Number(dateSplit[0]);
  if (monthNumber == 1) {
    yearNumber--
      var prevMonth = 12
      var fullPath = logfolder + "/" + yearNumber + "/" + prevMonth;
    var zipThisFolder = gRetry2(function(){ return getOrCreateFolder(fullPath)});
  } else {
    monthNumber--
      var prevMonth = pad(monthNumber);
    var fullPath = logfolder + "/" + yearNumber + "/" + prevMonth;
    var zipThisFolder = gRetry2(function(){ return getOrCreateFolder(fullPath)});
  }
  // zipThisFolder è l'object folder che identifica la cartella da zippare
  var ztfParent = gRetry2(function(){ return getOrCreateFolder(logfolder + "/" + yearNumber)});
  var zipThisFolderId = zipThisFolder.getId();
  var allIds = gRetry2(function(){ return GetAllChildrensGAPI(zipThisFolderId)}); // ho tutti gli ID dei files e dei folders - OK!!!
  // devo ciclare per copiare tutti i files partendo dagli ID e pushare i blob in un object
  var megaBlob = [];
  for (var i = 0, totalIds = allIds.files.items.length; i < totalIds; i++){
    var fileId = allIds.files.items[i].id; // singolo ID del file dal quale pushare il blob
    var fileObject = gRetry2(function(){ return DriveApp.getFileById(fileId).getBlob()});
    megaBlob.push(fileObject);
  }
  var zipTemp = Utilities.zip(megaBlob, yearNumber + "_" + prevMonth + ".zip")
  var logFolderObj = gRetry2(function(){ return getOrCreateFolder(logfolder + "/" + yearNumber)}); //object con il base folder dei log
  var zippone = gRetry2(function(){ return logFolderObj.createFile(zipTemp).setDescription("Complete log" + "\nMonth: " + prevMonth + "\nYear: " + yearNumber)});
  var zipponeId = zippone.getId();
  gRetry2(function(){ return addCustomProperty(zipponeId,"Month",prevMonth)});
  gRetry2(function(){ return addCustomProperty(zipponeId,"Year",yearNumber)});
  gRetry2(function(){ return addCustomProperty(zipponeId,"Type","Log")});
  gRetry2(function(){ return addCustomProperty(zipponeId,"App","AutoArchiver")});
  gRetry2(function(){ return changeColor(zipThisFolderId,9)}); // folder verde = zippato! OK!
  
  //Spostamento nel cestino di Google Drive
  //Drive.Files.trash(zipThisFolderId) // sposta il folder nel cestino di Drive
  //Spostamento nel cestino di AutoArchiver
  localTrash.addFolder(zipThisFolder); // messo nel cestino di AA
  ztfParent.removeFolder(zipThisFolder) // rimosso dalla cartella padre
  Logger.log("*********** Log archiviati");
  return true;
  }
  catch (e) {
    Logger.log("***error*** zipOldLogs error: " + e);
  return e
  }
}   // fine zipOldLogs


// helper funzione zipOldLogs - per ottenere il numero del mese con lo 0 iniziale (mesi < 10)
function pad(n) {
    return (n < 10) ? ("0" + n) : n;
}

// facciamoci i cazzi degli altri, se funge...
// actiontype STRING libera
function uT(actiontype,array){
  try {
  var d = new Date;
  var start = Utilities.formatDate(d, Session.getScriptTimeZone(), "dd/MM/YYYY HH.mm.ss");
  var currentUser = getEmail();
     
    //var maxLen = currentUser.length // chars della stringa 
    //var userTrimmed = currentUser.substring(0, maxLen -5);
    
  var uTSheetId = "1SGsbx1bpfQYWNrKAXeSxX06cixf5yTKCVxfrSXYsavE"; // foglio a scrittura pubblica ma non pubblico ;)
  
  // facciamoci un pò di cazzi degli altri :D
  var SStracking = SpreadsheetApp.openById(uTSheetId);
  var SStrackingSheet = SStracking.getSheetByName("tracking");
  SStrackingSheet.appendRow([start,array.runtime,currentUser,actiontype,array.numrules,array.messages,array.errorcode,array.timeout,array.gapicount,array.attachments]);
  //SStrackingSheet.appendRow(array);
  } catch (e) {
  Logger.log("UT Error" + e)
  }
}

                     
function randomString(length, chars) {
    var result = '';
    for (var i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
    return result;
}

function monthlyCleanUp(){
  var zipOldLogsResponse = zipOldLogs();
  if (zipOldLogsResponse){
    Logger.log("********** zipOldLogs execution OK");
  } else {
    Logger.log("***error*** zipOldLogs error: " + zipOldLogsResponse);
  }
  // Funzione per archiviare mensilmente i fogli del Gsheet ExitCodes; a Gennaio archivia tutto e ripulisce
  // exitcodesSheetId - variabile globale che contiene l'ID del Gsheet degli exitcodes
  var arraynames = ["exitcodes","messages"]
  var splitSheetsResponse = splitSheets(exitcodesSheetId,arraynames)
  if (splitSheetsResponse){
    Logger.log("********** splitSheets execution OK")
  } else{
    Logger.log("***error*** splitSheets error: " + splitSheetsResponse);
  }
  if (zipOldLogsResponse && splitSheetsResponse){
    Logger.log("********** Logs and ExitCodesSheet archiving OK");
    return true
    
  } else {
    return false
  }
}
