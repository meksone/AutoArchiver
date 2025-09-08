/*
 Funzione per creare tutte le cartelle e i file necessari al primo setup di AA
 Creare cartella AutoArchiver
 Creare cartella AutoArchiver/Log
 Creare cartella AutoArchiver/Cestino
 Creare cartella AutoArchiver/Config
 Copiare autoarchiver_config_sample in /Config
 config sample 1yG1XK93ljwr8eL_IH_A3nz-4jpUmkkq8cLcjNqzA9zY
 */

function setUpAA(){
  try{ // inglobo la routine in un try/catch, perchè questa deve essere più sicura possibile
    
    // aggiungere un'altra variabile in userprops in modo da stabilire se è stata già eseguita la prima config e nel caso NON eseguirla di nuovo - OK!
    var userProps = PropertiesService.getUserProperties();
    var alreadySetup = userProps.getProperty("alreadySetup");
    if (alreadySetup != "yes"){ // se il primo setup non è stato eseguito, allora eseguo la routine - occhio, che se trova "repeat" esegue di nuovo il setup!
      var rootFolder = getOrCreateFolder("AutoArchiver");
      var rootFldId = rootFolder.getId();
      gRetry2(function(){changeColor(rootFldId,3)}); //colore 3 Rosso
      var cfgFldr = getOrCreateFolder("AutoArchiver/Config"); // object con il folder...
      var cfgFolderId = cfgFldr.getId();
      gRetry2(function(){changeColor(cfgFolderId,17)}); //colore 17 Velluto Blu
      var aaFolder = getOrCreateFolder("AutoArchiver/AutoArchiver");
      var aaFolderId = aaFolder.getId();
      gRetry2(function(){changeColor(aaFolderId,16)}); //colore 16 Blu Cielo
      var logFldrPath = "AutoArchiver/AutoArchiver/Log"; // lo devo mettere così perchè non può ancora caricare le global config, e mi serve un path in formato string per la funzione SaveLog...
      var logFldr = getOrCreateFolder(logFldrPath);
      var logFldrId = logFldr.getId();
      gRetry2(function(){changeColor(logFldrId,19)}); // colore 19 Grigio topo
      var trashFolder = getOrCreateFolder("AutoArchiver/Cestino");
      var trashFldId = trashFolder.getId();
      gRetry2(function(){changeColor(trashFldId,5)}); // colore 5 Aranciata

      // Prendo i master
      var sampleConfigFile = DriveApp.getFileById(masterConfigId); //copio il file template della config - GLOBAL VARIABLE
      var sampleExitCodesFile = DriveApp.getFileById(masterExitCodesId); //copio il file template degli exitcodes - GLOBAl VARIABLE
      // Copio i master
      var localconfigFile = sampleConfigFile.makeCopy("autoarchiver_config",cfgFldr);
      var localexitcodesFile = sampleExitCodesFile.makeCopy("exit_codes",logFldr);
      // Ottengo gli Id dei file di configurazione dell'utente
      var localConfigId = localconfigFile.getId(); // ottengo l'ID del gsheet della config - LOCAL VAR per USER
      var localExitId = localexitcodesFile.getId(); // ottengo l'ID del gsheet della config  - LOCAL VAR per USER
      
      // Scrivo le UserProperties - PER USER/PER SCRIPT
      //userProps.deleteAllProperties() // per sicurezza, prima di tutto cancella tutto
      
      /* impostazione delle userprops per check stato mbox - 14-09-2016
      * UserProps
      * oldMboxMsg - newMboxMsg
      * oldMboxHist - nexMboxHist
      */
      
      // Ottengo lo user profile da chiamata API
      var getUserProfile = gRetry2(function(){return Gmail.Users.getProfile('me')}); // + expbackOff!
      var oldMboxMsg = getUserProfile.messagesTotal; // numero messaggi totale
      var oldMboxHist = getUserProfile.historyId; // progressivo non lineare history
      /* imposto le userproperties
      userProps.setProperty("oldMboxMsg", oldMboxMsg);  per controllo status mbox
      userProps.setProperty("oldMboxHist", oldMboxHist);  per controllo status mbox
      userProps.setProperty("configId", localConfigId);  id del nuovo sheet opzioni
      userProps.setProperty("exitCodesId", localExitId);  id del nuovo sheet exitcodes
      userProps.setProperty("configFolderId",cfgFolderId);  id del config folder
      userProps.setProperty("logFolderId", logFldrId);  id del log folder
      userProps.setProperty("trashFolderId",trashFldId);  id del cestino
      userProps.setProperty("alreadySetup","yes");  e ho indicato che il setup è stato lanciato
      */
      var allProps = {oldMboxMsg: oldMboxMsg,
                      oldMboxHist: oldMboxHist,
                      configId: localConfigId,
                      exitCodesId: localExitId,
                      configFolderId: cfgFolderId,
                      logFolderId: logFldrId,
                      trashFolderId: trashFldId,
                      alreadySetup: "yes"};
      gRetry2(function(){userProps.setProperties(allProps, true)}); //+ expBackOff

      /******************* blocco config *****************
      Carico la config globale (ora che il file è nel Drive dell'utente)
      */
      var globalconfig = JSONconfigFromSheet("global","global"); // carico il foglio global e creo l'array global
      var lang = globalconfig.global[0].lang;   // carico la lingua, ita o eng
      switch (lang) { // config ITA
        case "ita":
          var localized = JSONconfigFromSheet("ita","log"); // stringhe del logger
          //localized = localized.log[0];
          var months = JSONconfigFromSheet("mesi","months"); // stringhe per i mesi
          months = months.months[0]; // riduco di un livello l'array
          break;
        case "eng": // config ENG
          var localized = JSONconfigFromSheet("eng","log"); // stringhe del logger
          var months = JSONconfigFromSheet("months","months"); // stringhe per i mesi
          months = months.months[0]; // riduco di un livello l'array
          break;
      }
      /******************* end blocco config ******************/
      
      // creazione label
      var procLabel = globalconfig.global[0].processedlabel; // processate
      var errLabel = globalconfig.global[0].errorlabel; // errori
      var warnLabel = globalconfig.global[0].warninglabel; // avvisi
      
      // Creazione delle etichette di servizio in Gmail: Processate, Errori, Avvisi
      gRetry2(function(){getOrCreateLabel("AutoArchiver")}); // questa è hardcoded
      gRetry2(function(){getOrCreateLabel(procLabel)});
      gRetry2(function(){getOrCreateLabel(errLabel)});
      gRetry2(function(){getOrCreateLabel(warnLabel)});

      
      //Imposto i trigger in automatico
      var triggerArchiver = gRetry2(function(){return setTriggerArchiver()}); // true se ok
      //var triggerOldLogs = gRetry2(function(){return setTriggerOldLogs()}); // true se ok
      
      // salvo il Log del setup, che è MOLTO scarno! da rimpolpare!
      gRetry2(function(){SaveLog(logFldrPath)}); // salvataggio log
      return true
      
    } else { // la procedura di setup è stata già eseguita
      Logger.log("Setup already launched");
    }// fine IF alreadySetup
  } catch (e) {
    Logger.log("********** Setup Failed **********");
    var currentUser = getEmail();
    var setupHtmlBody = ""
    setupHtmlBody += "La prima configurazione non è riuscita<br>";
    setupHtmlBody += "Per ripetere l'installazione, seguire questi passi:<br>";
    setupHtmlBody += "<ul>";
    setupHtmlBody += "<li>Nell'interfaccia principale, cliccare su 'Configurazione'</li>";
    setupHtmlBody += "<li>Cliccare su 'Cancella tutte le UserProps';</li>";
    setupHtmlBody += "<li>Aggiornare la pagina (Windows: tasto F5, Mac: Comando+R);</li>"
    setupHtmlBody += "<li>Tornare di nuovo in 'Configurazione';</li>";
    setupHtmlBody += "<li>Cliccare su 'Esegui la prima configurazione';</li></ul>";
    setupHtmlBody += "<hr>";
    setupHtmlBody += "Se la procedura di configurazione non arriva mai a buon fine, inoltrare questa e-mail a:<br>";
    setupHtmlBody += "meksone+autoarchiver@gmail.com<br>";
    setupHtmlBody += "Dettaglio dell'errore (utile allo sviluppatore)<br>";
    setupHtmlBody += e;
    GmailApp.sendEmail(currentUser, "Configurazione non riuscita", "", {
              htmlBody: setupHtmlBody,
              name: 'AutoArchiver - Error!'
            });
  }
}

function reSetUpAA(){
  try {
  // prende i folder di default di AA e ne crea una copia, in modo da poter ripetere il setup senza cancellare ciò che è stato già fatto
  // funzione di sicurezza per evitare di eseguire questa funzione per l'utente drive@virtax.it
  var currentUser = getEmail();
  var userProps = PropertiesService.getUserProperties();
  var alreadySetup = userProps.getProperty("alreadySetup"); // setup eseguito?
  var exitCodesId = userProps.getProperty(" exitCodesId"); // ID exit codes
  var configId = userProps.getProperty("configId"); // id sheet Config
  var d = new Date;
  var formattedDate = Utilities.formatDate(d, Session.getScriptTimeZone(), "yyyy-MM-dd_HH.mm.ss");
  
  if (alreadySetup == "yes" && currentUser != "drive@virtax.it"){ // non scatta mai per l'utente drive ;)
    
    /******************* blocco config minimale ******************/
    
    var globalconfig = JSONconfigFromSheet("global","global"); // carico il foglio global e creo l'array global
    var rulesfld = globalconfig.global[0].rulesfolder; //string

    /******************* blocco config minimale ******************/
    
    var cfgFldr = getOrCreateFolder(rulesfld); // object con il folder...
    var cfgFolderId = cfgFldr.getId();
    gRetry2(function(){cfgFldr.setName("Config_Backup_" + formattedDate)});
    gRetry2(function(){cfgFldr.setDescription(formattedDate + " Config backup")});
    gRetry2(function(){changeColor(cfgFolderId,3)}); // colore Rosso
    
    var configSheet = DriveApp.getFileById(configId);
    gRetry2(function(){configSheet.setName("autoarchiver_config_" + formattedDate)});
    gRetry2(function(){configSheet.setDescription(formattedDate + " AutoArchiver Config backup")});
    
    var exitCodeSheet = DriveApp.getFileById(exitCodesId);
    gRetry2(function(){exitCodeSheet.setName("exit_codes_" + formattedDate)});
    gRetry2(function(){exitCodeSheet.setDescription(formattedDate + " AutoArchiver Exit Codes Backup")});
    
    gRetry2(function(){userProps.setProperty("alreadySetup", "repeat")}); // imposto la property a repeat...occhio, che in caso di setup, se trova repeat, lo esegue!
  }
  } catch (e) {
    Logger.log("********** Re-Setup Failed **********");
    var currentUser = getEmail();
    var setupHtmlBody = ""
    setupHtmlBody += "La ripetizione della prima configurazione non è riuscita<br>";
    setupHtmlBody += "Si consiglia di ripetere la procedura dall'inizio.<br><br>";
    setupHtmlBody += "Dopo la configurazione, è possibile recuperare le proprie impostazioni dalla cartella della App in Google Drive ;<br>";
    setupHtmlBody += "Per ripetere l'installazione, seguire questi passi:<br>";
    setupHtmlBody += "<ul>";
    setupHtmlBody += "<li>Nell'interfaccia principale, cliccare su 'Configurazione'</li>";
    setupHtmlBody += "<li>Cliccare su 'Cancella tutte le UserProps';</li>";
    setupHtmlBody += "<li>Aggiornare la pagina (Windows: tasto F5, Mac: Comando+R);</li>"
    setupHtmlBody += "<li>Tornare di nuovo in 'Configurazione';</li>";
    setupHtmlBody += "<li>Cliccare su 'Esegui la prima configurazione';</li></ul>";
    setupHtmlBody += "<hr>";
    setupHtmlBody += "Se la procedura di configurazione non arriva mai a buon fine, inoltrare questa e-mail a:<br>";
    setupHtmlBody += "meksone+autoarchiver@gmail.com<br>";
    setupHtmlBody += "Dettaglio dell'errore (utile allo sviluppatore)<br>";
    setupHtmlBody += e;
    GmailApp.sendEmail(currentUser, "Configurazione non riuscita", "", {
      htmlBody: setupHtmlBody,
      name: 'AutoArchiver - Error!'
    });
  } // fine alreadySetup True
  setUpAA() // ripeto il setup
  Logger.log("********** Repeating the setup procedure");
}


/*
* 
* TEST 29-05-2016
* quando vengono modificate le colonne o aggiunti dei fogli nella config generale,
* lanciando questa funzione su ogni client si autoaggiorna il config sheet in base alle novità.
*
* @ method updateConfig
* @ param {string} modalità operativa (rollback,test,track,normal)
*/
function updateConfig(){
/******************** control ***********************/
  var execmodes = ["rollback","test","track","normal"]
  var execmode = execmodes[1];
  Logger.log("updateConfig: " + execmode)
  
  switch (execmode) {
    case "rollback": // 0
      var UT = false
      var renameAndDeleteSheets = false
      var copySheets = false
      var clearSS = false
      var restore = false
      var cleanColsAndRows = false
      var revertNames = true
      break;
    case "test": // 1
      var UT = false
      var renameAndDeleteSheets = true
      var copySheets = true
      var clearSS = true
      var restore = true
      var cleanColsAndRows = true
      var revertNames = false
      break;
    case "track": // 2
      var UT = true
      var renameAndDeleteSheets = false
      var copySheets = false
      var clearSS = false
      var restore = false
      var cleanColsAndRows = false
      var revertNames = false
      break;
    case "normal": // 3
      var UT = true
      var renameAndDeleteSheets = true
      var copySheets = true
      var clearSS = true
      var restore = true
      var cleanColsAndRows = true
      var revertNames = false
      break;
  }
  /******************** end control ***********************/
  
  var userProps = PropertiesService.getUserProperties();
  var SStoUpdateId = userProps.getProperty("configId") // controllo versione foglio/script. se diverso, scatta procedura all'esecuzione di Archiver
  // var suffix = Utilities.formatDate(d, Session.getScriptTimeZone(), "yyMMdd-HHmmss"); // per ora la disattivo, mi serve una var statica
  var suffix = "backup";
  var currentUser = getEmail();
  
  // vediamo se mi dice chi sta accedendo alla funzione...
  if (UT){
  uT("update");
  }

  /*
  * Google Sheet di configurazione MASTER
  * apro il foglio master
  */
  var masterSS = SpreadsheetApp.openById(masterConfigId); // apro il foglio MASTER
  var targetSS = SpreadsheetApp.openById(SStoUpdateId);
  
  // prendo i nomi degli sheet del foglio master e creo un'array
  var masterSgetNames = masterSS.getSheets();
  var masterNames = [];
  for (var i = 0, j = masterSgetNames.length; i < j; i++){
   var name = masterSgetNames[i].getName();
    masterNames.push(name)
    Logger.log("********** Lista fogli master ottenuta");
  }
 
  // rinomino in massa tutti i fogli che corrispondono a quelli del master
  // la rinomina viene fatta con la variabile  suffix, che per ora è fissa su backup ma posso usare anche una stringa Data
  // se già presenti i fogli + suffix, verrano eliminati PRIMA

  
  if (renameAndDeleteSheets){
    for (var i = 0, j = masterNames.length; i < j; i++){
      var sheetname = masterNames[i]; // i nomi dei fogli master
      var sheetnameBck = masterNames[i] + "." + suffix;
      
      var sheetnameBckExist = targetSS.getSheetByName(sheetnameBck);
      var sheetnameExist = targetSS.getSheetByName(sheetname);
      
      if (sheetnameBckExist){targetSS.deleteSheet(sheetnameBckExist)}
      if (sheetnameExist){sheetnameExist.setName(sheetname + "." + suffix)}
    }// fogli rinominati e/o cancellati
    
    /*// cancello i fogli estranei - per ora no usata...pericolosa!
    var exnames = targetSS.getSheets();
    var extranames = [];
    for (k = 0, l = exnames.length; k < l; k++){
    var exname = exnames[k].getName();
      if  (sheetnameExist || sheetnameBckExist == exname) {
        //nothing
      } else {
      extranames.push(exname);
      }
    }
    for (var m = 0, n = extranames.length; m < n; m++){
    var extraneous = targetSS.getSheetByName(extranames[m]);
     targetSS.deleteSheet(extraneous) ; //
    }*/
    Logger.log("********** Fogli esistenti rinominati")
  }
  
  // copio i fogli dal master al foglio dell'utente
  // i fogli rules, global e admins vengono trattati in modo diverso, dopo...
  if (copySheets){
    for (var i = 0, j = masterNames.length; i < j; i++){
      var sheetname = masterNames[i]; // i nomi dei fogli master
      var sheetFrom = masterSS.getSheetByName(sheetname).copyTo(targetSS).setName(sheetname);
    }
    Logger.log("********** Nuovi fogli copiati");
  }
  var specialSheets = ["admins","global","rules"];

  // Ora ho tutti i fogli dell'utente rinominati e i master copiati nello SS dell'utente
  // ora devo ripulire il foglio rules e admins
  if (clearSS) {
    for (var i = 0, j = specialSheets.length; i < j; i++){
      var clear = specialSheets[i];
      var sheetToClear = targetSS.getSheetByName(clear);
      var numRows = sheetToClear.getLastRow();
      var numCols = sheetToClear.getLastColumn();
      sheetToClear.getRange(2,1,numRows,numCols).clear();
    }
    Logger.log("********** Fogli principali ripuliti");
  }
  
  // per finire (quasi) ricopio le rules e gli admins dal vecchio foglio dell'utente
  if (restore){
    for (var i = 0, j = specialSheets.length; i < j; i++){
      var newUserConfig = specialSheets[i];
      var oldUserConfig = newUserConfig + "." + suffix;
      var restoreFrom = targetSS.getSheetByName(oldUserConfig); // foglio utente, vecchia config
      var targetSheet = targetSS.getSheetByName(newUserConfig); // Nuova config
      var numRows = restoreFrom.getLastRow();
      var numCols = restoreFrom.getLastColumn();
      var dataToRestore = restoreFrom.getRange(2,1,numRows,numCols).getValues();
      var targetRange = targetSheet.getDataRange().offset(1,0,numRows,numCols).setValues(dataToRestore);
    }
    Logger.log("********** Impostazioni utente ripristinate nei nuovi fogli");
  }
  
  // elimino le righe e le colonne vuote...
  if (cleanColsAndRows){
    for (var i = 0, j = specialSheets.length; i < j; i++){
      var cleanSheet = specialSheets[i]
      var cleanSS = targetSS.getSheetByName(cleanSheet);
      // rimuove le righe vuote
      var maxRows = cleanSS.getMaxRows(); 
      var lastRow = cleanSS.getLastRow();
      if (maxRows-lastRow != 0){
        cleanSS.deleteRows(lastRow+1, maxRows-lastRow);
      }
      // e anche le colonne vuote
      var maxColumns = cleanSS.getMaxColumns(); 
      var lastColumn = cleanSS.getLastColumn();
      if (maxColumns-lastColumn != 0){
        cleanSS.deleteColumns(lastColumn+1, maxColumns-lastColumn);
      }
    } 
  }
  
  /******************** only for testing ***********************/
  if (revertNames) {
    for (var i = 0, j = masterNames.length; i < j; i++){
      var deleteSheet = targetSS.getSheetByName(masterNames[i]);
      targetSS.deleteSheet(deleteSheet);
    }
    var updSSgetNames = targetSS.getSheets();
    for (var i = 0, j = updSSgetNames.length; i < j; i++){
      var sheet = updSSgetNames[i];
      var name = sheet.getName();
      var newname = name.replace("." + suffix,"")
      sheet.setName(newname);
    }
    Logger.log("fogli rinominati e nuovi fogli cancellati")
  }
  /******************** only for testing ***********************/
  
} // fine update loop

