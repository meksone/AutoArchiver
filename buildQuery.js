/*
per verificare in poche chiamate API se c'è qualche regola che triggera un risultato
il limite per ogni query è di 1024 caratteri...
il parametro serve ad indicare l'array di regole da caricare ;) ottimo per il testing
*/
function buildQueryAndReturnActiveRules(configrules){
  var start = new Date;
  var chunkDimension = 5 // utile per testing
  var GAPIListMessagesCalls = 0; // tiene traccia del numero delle chiamate API
  var allTheRules = configrules // array con tutte le regole e tutte le opzioni; dopo l'esecuzione di buildQuery, le query si aggiornano anche nella var principale
  buildQuery(allTheRules); // trasforma le query e modifica la stessa array
  var allTheRulesChunked = chunkArrayInGroups(allTheRules, chunkDimension) // in gruppi di chunkDimension, con sotto 17 voci di config per rule - gli id corrispondono a aggregatedFlattened
  var allTheRulesOR =[];
  var allTheRulesORchunked =[];
  var allTheRulesORConcat =[];
  var finallyTheRules = []
  
  var messageIds = [] // 
  
  // nuovo! 
  var messageObjects = []; // TEST
  var messageData = []; // TEST
  
  var grandTotalMsg = 0;
  var grandTotalAtt = 0;
  
  var singleCheck = []; // gruppo di query da controllare per esteso
  var groupCheck = []; // gruppo di query AGGREGATE da controllare 
  
  // ********** formatto la query e aggiungo OR alla fine per la concatenazione
  for (var ruleNum = 0, ruleMax = allTheRules.length; ruleNum < ruleMax; ruleNum++) {
    var rule = allTheRules[ruleNum]; // carico la regola...
    if (ruleNum == ruleMax-1){
      allTheRulesOR.push(rule.filter)
    } else {
      var ruleConcat = rule.filter + " OR ";
      allTheRulesOR.push(ruleConcat)
    }
  };
  
  // ********** Qui divido l'array in gruppi di chunkDimension (di solito 5, la var chunkDimension);
  allTheRulesORchunked = chunkArrayInGroups(allTheRulesOR, chunkDimension); 
  var concat = "";
  for (var chunksIdx = 0, chunksMax = allTheRulesORchunked.length; chunksIdx < chunksMax; chunksIdx++){
    for (var subChunksIdx = 0, subchunksMax = allTheRulesORchunked[chunksIdx].length; subChunksIdx < subchunksMax; subChunksIdx++){
      concat += allTheRulesORchunked[chunksIdx][subChunksIdx]
    }
    allTheRulesORConcat.push(concat); // pusho la query concatenata nell'object, e ottengo un'array composta da query in gruppi di dimensione "chunkDimension" 
    concat = ""; // reset
  };
  
  // ********** Controllo che ogni query concatenata non superi i 1024 caratteri
  for (var concatId = 0, concatMax = allTheRulesORConcat.length; concatId < concatMax; concatId++){
    if (allTheRulesORConcat[concatId].length > 1024){
      Logger.log("**alert*** Query %s Lenght TOO LONG!!!",concatId)
      singleCheck.push(concatId); // questi chunk di regole vanno controllati singolarmente
    } else {
      Logger.log("********** Query %s Lenght OK!",concatId)
      groupCheck.push(concatId); // questi chunk di regole si possono controllare in modo concatenato
    }
  };
  
  // ********** Se singleCheck è contiene qualcosa, vuol dire che ci sono dei chunks da controllare per intero
  if (isEmpty(singleCheck) == false){ // START - IF SingleCheck - se l'array è popolata, segnala gli id dei chunk da controllare per intero
    for (var i = 0, j = singleCheck.length; i < j; i++){
      var checkChunkId = singleCheck[i];
      var foundMessages = 0
      var found = 0
      for (var chunkId = 0, chunkMax = allTheRulesChunked[checkChunkId].length; chunkId < chunkMax; chunkId++){
        var queryResult = gRetry2(function(){return GAPIlistMessages2('me', allTheRulesChunked[checkChunkId][chunkId].filter)});
        GAPIListMessagesCalls++ // contatore delle chiamate API
          if (isEmpty(queryResult) != true){
            // lista dei MsgID
            var msgId = []; // array dei message ID
            var msgObj = []; // array degli object
            var msgData = []; // object con i dati del messaggio
            for (var idx = 0, jdx = queryResult.messages.length; idx < jdx; idx++){
              msgId.push(queryResult.messages[idx].id);
              var message = gRetry2(function(){return GmailApp.getMessageById(queryResult.messages[idx].id)}); // TEST
              var emailData = buildEmailData(message) // TEST
              msgObj.push(message) // TEST
              
                 // TEST nuova funzione addlabel = firstlabel WIP 07-11-2016
              if (allTheRulesChunked[checkChunkId][chunkId].addlabel == "firstlabel"){
              var finalPath = "ciao";
                emailData["msgFolderPath"] = finalPath; // sostituzione da FALSE a stringa con path...
              
              } else {
              var finalPath = buildFinalPath(allTheRulesChunked[checkChunkId][chunkId],emailData.msgArbFolder,emailData); // TEST
                emailData["msgFolderPath"] = finalPath; // sostituzione da FALSE a stringa con path...
              }
                
              msgData.push(emailData) // TEST
              grandTotalAtt = grandTotalAtt + emailData.msgAttachNum
              
            }
            
            // ********** PUSH DATA!
            messageIds.push(msgId); // push dei msgID
            messageObjects.push(msgObj) // push dei messageObjectsTEST 
            messageData.push(msgData) // push di emailData TEST
            finallyTheRules.push(allTheRulesChunked[checkChunkId][chunkId]);
            
            // ********** Update Totals
            found = queryResult.messages.length;
            foundMessages = foundMessages + found
            grandTotalMsg = grandTotalMsg + found
            queryResult = void 0 // test RESET queryresult per stare sereni visto che dopo la riuso
          }
      }
    }
  } // END - IF singleCheck
  
  queryResult = void 0 // test RESET delle var per stare sereni visto che dopo la riuso
  foundMessages = void 0
  found = void 0
  
  // Alla fine di questa sub, i chunks che devono essere controllati per esteso hanno già popolato la variabile finale
  // e questo permette di risparmiare altre chiamate API (quelle in fondo)
  
  // ********** Controllo dei chunk concatenati
  // se la ricerca è null, va al prossimo chunk concatenato; se trova qualcosa tiene traccia del numero totale dei messaggi, 
  // spacchetta il chunk e pesca i msgID fino ad arrivare al numero "n" che ha trovato poco prima
  for (var i = 0, j = groupCheck.length; i < j; i++){ // START - GroupCheck
    checkChunkId = groupCheck[i]; // riuso le variabili di prima
    Logger.log("********** Checking messages in concatenated chunk %s",checkChunkId);
    queryResult = gRetry2(function(){return GAPIlistMessages2('me', allTheRulesORConcat[checkChunkId])});
    GAPIListMessagesCalls++ // contatore delle chiamate API
      
      if (isEmpty(queryResult)){ // Se vuota, non ci sono risultati dalla query concatenata
        Logger.log("********** No messages in concatenated chunk %s",checkChunkId);
      } else { // ho trovato qualcosa...
        var totalMessages = queryResult.messages.length; // quanti messaggi ho trovato?
        var foundMessages = 0
        var found = 0
        
        for (chunkId = 0, chunkMax = allTheRulesChunked[checkChunkId].length; chunkId < chunkMax; chunkId++){
          if (totalMessages == foundMessages){
            Logger.log("********** Found %s / %s messages in chunk %s - All done, breakin the loop!",foundMessages,totalMessages,checkChunkId);
            break;} // esce se trova il numero di messageID dell'intero chunk (var totalMessages)
          Logger.log("********** Inspecting concatenated chunk %s - rule %s",checkChunkId,chunkId);
          queryResult = gRetry2(function(){return GAPIlistMessages2('me', allTheRulesChunked[checkChunkId][chunkId].filter)});
          GAPIListMessagesCalls++ // contatore delle chiamate API
            
            if (isEmpty(queryResult) != true){
              // lista dei MsgID
              var msgId = []; // array dei message ID
              var msgObj = []; // array degli object
              var msgData = []; // object con i dati del messaggio
              for (var idx = 0, jdx = queryResult.messages.length; idx < jdx; idx++){
                msgId.push(queryResult.messages[idx].id);
                var message = gRetry2(function(){return GmailApp.getMessageById(queryResult.messages[idx].id)}); // TEST
                var emailData = buildEmailData(message) // TEST
                msgObj.push(message) // TEST
                
                // TEST nuova funzione addlabel = firstlabel WIP 07-11-2016
              if (allTheRulesChunked[checkChunkId][chunkId].addlabel == "firstlabel"){
              var finalPath = "ciao";
                emailData["msgFolderPath"] = finalPath; // sostituzione da FALSE a stringa con path...
              
              } else {
              var finalPath = buildFinalPath(allTheRulesChunked[checkChunkId][chunkId],emailData.msgArbFolder,emailData); // TEST
                emailData["msgFolderPath"] = finalPath; // sostituzione da FALSE a stringa con path...
              }
                
                msgData.push(emailData) // TEST
                grandTotalAtt = grandTotalAtt + emailData.msgAttachNum
                
              }
              
              // ********** PUSH DATA!
              messageIds.push(msgId); // push dei msgID
              messageObjects.push(msgObj) // push dei messageObjectsTEST 
              messageData.push(msgData) // push di emailData TEST
              finallyTheRules.push(allTheRulesChunked[checkChunkId][chunkId]);
              
              // ********** Update Totals
              found = queryResult.messages.length;
              foundMessages = foundMessages + found
              grandTotalMsg = grandTotalMsg + found
              queryResult = void 0 // test RESET queryresult per stare sereni visto che dopo la riuso
            }
        } // END - totalMessages == foundMessages
      } // END - queryResult = isEmpty false
  } // END - groupCheck 
  
  var resultingValues = { 
    totalrules: ruleMax, // integer - quante regole attive sono state trovate
    activerules: finallyTheRules, // array - regole complete di tutti i dati
    messageIds: messageIds, // array - i message ID relativi alle regole di cui sopra; l'index corrisponde
    messageObjects: messageObjects, //TEST
    messageData: messageData, // tutti i dati dell'email, attachments compresi in forma di objects
    messagesfound: grandTotalMsg, // integer - quanti messaggi sono stati individuati
    attachsfound: grandTotalAtt, // integer - totale degli allegati trovati
    gapicalls: GAPIListMessagesCalls // integer - numero totale delle chiamate API effettuate
  }
  
  if (resultingValues.activerules.length > 0){
    
    var end = new Date;
    var runTime = (end.getTime() - start.getTime()) / 1E3;
    Logger.log("********** Found %s active rules, builded the object in %s seconds",resultingValues.activerules.length, runTime); // olè!
    
    return resultingValues;
    Logger.log("Stop");
  } else {
    Logger.log("********** No active rules found"); // olè!
    return false;
  }
} // fine buildQueryAndReturnActiveRules

// HELPER di checkQueryAndReturnActiveRule
// bisogna passargli l'array con le regole
// come risultato, modifica l'array e la query di ogni regola viene trasformata in base alle opzioni della regola stessa e della global config.
function buildQuery(allTheRules){
  for (var ruleNum = 0, ruleMax = allTheRules.length; ruleNum < ruleMax; ruleNum++) {
    // Ciclo FOR di elaborazione regole, identico a quello di aa-mail
    // non ci sono però le variabili come doDated ecc...
    var rule = allTheRules[ruleNum]; // carico la regola numero...
    var gSearchExp = "(" + rule.filter + " -label:" + globalconfig.global[0].processedlabel + " -in:trash";
    var timeFrame = rule.timeframe;
    if (timeFrame) { 
      gSearchExp += " " + timeFrame;
    } else {
      gSearchExp += " newer_than:" + globalconfig.global[0].newerthan;
    } 
    allTheRules[ruleNum].filter = gSearchExp + ")";
  }
  Logger.log("********** buildQuery executed. Queries updated in %s rules",ruleMax);
  return allTheRules
}

function TESTbuildqueryandreturnactiverules(){
var AR = buildQueryAndReturnActiveRules(TESTconfig.rules);
Logger.log("end");
}


// restituisce un'array con tutti i dati dell'email in un colpo solo
// parametro: object email
// alla sua esecuzione, OVVIAMENTE, il valore attachURL è sempre FALSE in quanto l'URL non è presente in questo stadio dell'esecuzione...
// una volta salvato l'allegato, il valore diventerà l'URL di Drive, trasformando i dati di emailData...

function buildEmailData(message){
  var messageDate = message.getDate();
  var msgDateFormatted = Utilities.formatDate(messageDate, Session.getScriptTimeZone(), "yyyy/MM/dd/HH.mm.ss");
  var msgDateSplit = msgDateFormatted.split("/");
  var msgMonth = replaceAll_(msgDateSplit[1],months)
  var messageSubj = message.getSubject(); 
  var messageBody = message.getBody().replace(/<img[^>]*>/g, ""); // senza i tag immagine...
  var arbFolder = checkFolderInSubject(messageSubj); // Qui si identifica il folder arbitrario - false se non presente
  var messageFrom = message.getFrom();
  var attachments = message.getAttachments();

  
  // ********** estrazione info allegato + blob allegato
  var msgAttachs = [];
  for (var i = 0, attachLen = attachments.length; i < attachLen; i++){
    var attach = attachments[i]; // il singolo attachment
    var attachName = attach.getName(); // string
    var attachSize = attach.getSize(); // integer
    var attachType = attach.getContentType(); // string
    var attachBlob = attach;
    msgAttachs.push({
      attachName: attachName,
      attachSize: attachSize,
      attachType: attachType,
      attachBlob: attachBlob,
      attachURL: false,
      attachID: false,
      isDriveFile: false
    });
  }
  
  var driveData = buildDriveFileData(message); // false se non ci sono attach di Drive
  if (driveData){
    for (var driveId = 0, driveIdLen = driveData.length; driveId < driveIdLen; driveId++){
      msgAttachs.push(driveData[driveId])
    }
  } else {
    var driveIdLen = 0;
  } // non ci sono allegati come file Drive, quindi il valore è 0
  // ********** fine estrazione info allegato
  
  //Lista etichette
  // HOTFIX 2020-11-05 a quanto pare restituisce errore Requested Entity Not Found... non si sa perchè, random.
  // Visto che mi sembra che la lista etichette non serva a nulla (spero), disattivo qui la chiamata API e anche dopo nell'array tolgo il dato delle etichette...
  // speriamo di non fare cazzate
  
  // HOTFIX 2020-11-05 var msgInfo = GAPIgetMessageInfo("me",message.getId()); // array con tutti gli ID delle label
  // HOTFIX 2020-11-05 var allLabels = GAPIGetOnlyUserLabels(msgInfo.labelIds); // array con i nomi delle Label utente
  // bisogna individuare l'etichetta root; la root è sempre la più corta e non contiene alcuna "/"
  var rootLabel = "";

 

  
  
  
  
  // creo array con i dati dell'email - NOVITA'!!!
  var emailData = {uniqueID: message.getId(), // id
                   msgDate: messageDate, // data completa
                   msgYear: msgDateSplit[0], // solo anno
                   msgMonthNum: msgDateSplit[1], // solo mese, numerale
                   msgMonth: msgMonth, // solo mese, letterale
                   msgDay: msgDateSplit[2], // solo giorno
                   msgHour: msgDateSplit[3], // solo orario
                   msgFrom: messageFrom, // email from
                   msgSubj: messageSubj, // oggetto, non pulito
                   msgBody: messageBody, // body dell'email, pulito dai tag <img>
                   msgArbFolder: arbFolder, // folder arbitrario, se presente // BOOLEAN
                   msgAttachs: msgAttachs, // array con i dati degli attachments + gli attachments, sia normali che link di Drive
                   msgAttachNum: msgAttachs.length, // integer - tutti gli allegati
                   msgDriveAttNum: driveIdLen,// integer o 0 - solo i file di Drive
                   //msgLabels: allLabels, // array con i nomi delle labels - DISATTIVATO! HOTFIX 2020-11-05
                   msgFolderPath: false // parte con false ma poi dovrà essere aggiornato
                  };
  return emailData;
}


function buildDriveFileData(message) {
  //var start = new Date; // start...
  
  var expression = /([d]\/)[-\w]{25,}/g;
  var matching = message.getBody().match(expression);
  var driveID = [];
  if (matching == null) {
    return false; // se non ci sono link a drive restituisce FALSE
  } else {
    for (var i=0; i < matching.length; i++){
      var stripChars = matching[i].replace("d/","")
      driveID.push(stripChars);
    }
    
    // driveID è un'array che può avere duplicati e falsi links... ora la pulisco
    // magari con underscore? yes!
  
    var deDupe = _.uniq(driveID);
    
    Logger.log("********** getDriveFileData: " + deDupe);
    
    // array pulita dai duplicati, ora controllo se sono files...
    // var cleanedFileList = [];
    var driveFileData = []; // dati in uscita dalla funzione
    for (var i = 0, deDupeLen = deDupe.length; i < deDupeLen; i++){
      try {
        var driveFile = DriveApp.getFileById(deDupe[i]);
        // ********** se è un link valido, esegue il codice 
        var driveFileName = driveFile.getName(); //string
        var driveFileSize = driveFile.getSize(); //integer
        var driveFileType = driveFile.getMimeType(); // string
        var driveFileBlob = driveFile.getBlob() // the blob
        driveFileData.push({
          attachName: driveFileName,
          attachSize: driveFileSize,
          attachType: driveFileType,
          attachBlob: driveFileBlob,
          attachURL: false,
          attachID: false,
          isDriveFile: true
        });
        //cleanedFileList.push(deDupe[i]);
      } catch (e) {
        Logger.log("********** getDriveFileData: not a Google Drive File! - " + e);
      }
    }
    
    //var end = new Date
    //var runTime = (end.getTime() - start.getTime()) / 1E3;
    //Logger.log("++++++++++ getDriveFileData RunTime: " + runTime)
    return driveFileData;
  }
}

// Funzione per creare in un colpo solo i vari attachList per PDF, email ecc...(con link e senza link)
function buildAttachList(AR){ // passare solo l'array degli allegati di emailData
  // è questo l'object da passare !!! AR.messageData[ruleId][msgId].msgAttachs
  var attachListTextOnly = "<ul>";
  var attachListWithLinks = "<ul>";
  var attachListInBody = "";
  
  if (isEmpty(AR) != true){ // ********** Non ci sono allegati, lista vuota
  for (var i = 0, attLen = AR.length; i < attLen; i++){
    var attachData = AR[i];
    attachListTextOnly += "<li>" + attachData.attachName + "</li>";
    attachListWithLinks += "<li><a href='" + attachData.attachURL + "'>" + attachData.attachName + "</a></li>";
    attachListInBody += "<div style='font-size:normal;text-transform:uppercase;font-weight:bold'>" + attachData.attachName + "</div>";
    attachListInBody += "<div style='font-style:italic;'><a href='" + attachData.attachURL + "'>" + "Link a Google Drive: " + attachData.attachName + "</a></div><br>";
  }
  } else {
  attachListTextOnly += "<li> Nessun allegato </li>";
  }
  // ********** Chiusura lista
  attachListTextOnly += "</ul>";
  attachListWithLinks += "</ul>";
  
  return { 
    attachListTextOnly: attachListTextOnly,
    attachListWithLinks: attachListWithLinks,
    attachListInBody: attachListInBody
  };
}


function TESTbuildAttachList(){
// dati fasulli di test
  var emailData = {uniqueID: "1234567890", // id
                   msgDate: new Date, // data completa
                   msgYear: "2016", // solo anno
                   msgMonthNum: "10", // solo mese, numerale
                   msgMonth: "10_Ottobre", // solo mese, letterale
                   msgDay: "13", // solo giorno
                   msgHour: "06:06:06", // solo orario
                   msgFrom: "'Manuel Serrenti' <meksone@gmail.com>", // email from
                   msgSubj: "Test emailData", // oggetto, non pulito
                   msgBody: "<div><strong>Ciao!</strong></div>", // body dell'email, pulito dai tag <img>
                   msgArbFolder: false, // folder arbitrario, se presente // BOOLEAN
                   msgAttachs: [
                     {
                       attachName: "Normal file name",
                       attachSize: 444444,
                       attachType: "PDF",
                       attachBlob: "BlobAttach",
                       attachURL: "https://link444444",
                       attachID: "id444444",
                       isDriveFile: false
                     },
                     {
                       attachName: "Drive file name",
                       attachSize: 111111,
                       attachType: "text/txt",
                       attachBlob: "BlobDrive",
                       attachURL: "https://link111111",
                       attachID: "id111111",
                       isDriveFile: true
                       
                     }
                   ], // array con i dati degli attachments + gli attachments ;)
                   //i dati dei link di Drive (files in formato blob come gli attach normali) - FALSE se assenti
                   msgAttachNum: 2, // integer
                   msgDriveAttNum: 1 // integer
                  };
  var testing = buildAttachList(emailData.msgAttachs)
  var UStest = _.keys(emailData, "isDriveFile")
  //var UStestFilter = _.countBy(emailData, ("isDriveFile" in emailData.keys) );
  var TESTfilter = emailData.msgAttachs.filter(function(v){ return v["isDriveFile"] == true; }).length
Logger.log("end");
}


