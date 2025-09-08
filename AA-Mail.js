/********** AutoArchiver - AAmail - elaborazione e-mail **********/
function aamail() {
  /********** Inizio **********/
  Logger.clear(); // pulisce il log dalle operazioni precedenti
  Logger.log(localized.log[0].msg); // Archiver START
  Logger.log("********** Archiver version: %s",scriptVersion); // stamp the version in the log for version checking
  Logger.log("********** Archiver build: %s",scriptBuild); // stamp the build in the log for version checking
  
  var runId = randomString(16, '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ');
  var runByUser = getEmail();
  Logger.log(localized.log[45].msg, runId);
  
  /*********** Configurazione ***********/
  var procLabel = globalconfig.global[0].processedlabel; // string
  var errLabel = globalconfig.global[0].errorlabel; // string
  var warnLabel = globalconfig.global[0].warninglabel; // string
  var logfolder = globalconfig.global[0].logfolder; // logfolder
  var newThan = globalconfig.global[0].newerthan; // number - default timeframe, 14d
  var maxRunTime = globalconfig.global[0].maxruntime; // number
  var sleepTime = globalconfig.global[0].sleeptime; // number
  var errorMail = globalconfig.global[0].errormail; // stringa - email alla quale mandare gli errori - nel caso fosse vuota, prende la mail dell'utente corrente
  if (errorMail == false){
    Logger.log(localized.log[17].msg); // no indirizzo per email di errore - uso l'indirizzo dell'utente
    errorMail = runByUser;
  };
  
  /********** Creazione delle etichette di servizio in Gmail: Processate, Errori, Avvisi **********/
  var processedLabel = getOrCreateLabel(procLabel);
  var errorLabel = getOrCreateLabel(errLabel); // si chiamava retryLabel!
  var warningLabel = getOrCreateLabel(warnLabel);
  Logger.log(localized.log[38].msg); // etichette in Gmail create
  
  /********** imposta le due variabili per il controllo del tempo massimo di esecuzione **********/
  var end, start;
  start = new Date; // per il controllo del tempo massimo di esecuzione...
  
  Logger.log(localized.log[1].msg); // Inizio elaborazione regole
  /*
  * var di controllo che conta i PDF salvati - usata alla fine per stabilire se è stato fatto qualcosa
  * e quindi salvare il LOG - forse conviene mettere qui fuori anche le altre variabili di controllo? tipo alertSent?
  */
  var savedPDF = 0; 
  var howmanymsg = 0;
  var howmanyattach = 0;
  var msgIdsForExit = []; // array vuota per mettere TUTTI i message ID ... serve, perchè in caso di timeout mi dice quali ID ha elaborato rispetto a quelli totali restituiti da buildquery
  var linkIdsForExit = []; // array vuota per mettere TUTTI i link ID di Drive

  var statusMbox = isMboxChanged(); // controllo status mailbox

  var aaAPIcount = 0; // il valore arriverà dalla nuova routine  di check regole
  if (statusMbox == "changed"){ // loop IF status changed
    
    /* IF statusMbox Changed, eseguo il loop delle regole
    *  totalrules: ruleMax, // quante regole attive sono state trovate
    *  activerules: finallyTheRules, // regole complete di tutti i dati
    *  messageIds: messageIds, // i message ID relativi alle regole di cui sopra; l'index corrisponde
    *  messagesfound: grandTotalMsg, // quanti messaggi sono stati individuati
    *  gapicalls: GAPIListMessagesCalls // numero totale delle chiamate API effettuate
    */
   
   var activeRulesFound = buildQueryAndReturnActiveRules(config.rules); //il prefisso active e all andrebbe invertito...mah
    if (activeRulesFound != false){
    var allTheRules = activeRulesFound.activerules; // qui le regole complete
      var allTheIds = activeRulesFound.messageIds; // e qui solo gli ID relativi
    var gapiCalls = activeRulesFound.gapicalls;
    aaAPIcount = gapiCalls
    } else {
      aaAPIcount = activeRulesFound.gapicalls;
      var allTheRules = 1 // variabile fasulla SOLO per giustificare il break che aggiungo
    }

    if (activeRulesFound.messagesfound > 0){ // ho trovato delle regole che restituiscono dei msgID da elaborare
      for (var ruleNum = 0, ruleMax = allTheRules.length; ruleNum < ruleMax; ruleNum++) { // Ciclo FOR di elaborazione regole 
        
        var rule = allTheRules[ruleNum]; // carico la SINGOLA regola, che contiene le opzioni
        /* CARICO anche i msgIDs relativi alla regola in questione, visto che già li ho!*/
        var ruleMsgIds = allTheIds[ruleNum] // carico la lista degli ID risultanti dalla regola; l'index è lo stesso
        
      var ruleName = rule.name; // string
      var doArchive = rule.archive; // boolean // nel loop originale qui ci sono var e loop per il controllo delle email etichettate come errori...
      /* queste due opzioni sono inutili quando si usa la funzione freePathBuilder, e vanno impostate su free in caso si usi il vecchio foglio config */
      var doDated = rule.dated; // TRUE,FALSE,FREE !!!MANDATORY!!!
      var singleType = rule.singletype; // string: msgdate, simple, none e +FREE  !!!MANDATORY!!!
      var doDelete = rule.deletemsg; // boolean - cancella il messaggio e-mail
      var doTrash = rule.trashmsg; // boolean - cancella uno o più allegati
      var doLabel = rule.addlabel; // boolean - aggiunge l'etichetta prendendola dal nome del folder
      var doNotify = rule.notify; // boolean // invia email di notifica agli indirizzi specificati
      if (doNotify) {
        var notifyTo = rule.notifyto; 
      } // string - se notify == EXISTS (popolata, perchè ha tre possibili valori: generic, specific, attachlist), 
      //qui ci sarà la lista dei destinatari della notifica. vuota o false, viene ignorata
      var doSaveMsg = rule.savemsg; // boolean
      var doSaveAttach = rule.saveattach; // boolean - devo salvare allegati? triggera anche l'alert
      if (rule.folder == false) { // se il folder è vuoto, imposto un nome basandomi sulla data di esecuzione dello script
        Logger.log(localized.log[2].msg);
        var formatted = Utilities.formatDate(start, Session.getScriptTimeZone(), "yyyy.MM.dd_HH.mm.ss");
        var today = formatted.toString();
        var folderName = today + "/" + localized.log[9].msg;
      } else {
        var folderName = rule.folder;
      }
      var doAlert = rule.attachalert; // invia e-mail al mittente nel caso manchino gli allegati
      var doUnZip = rule.unzip; // BOOLEAN - per ora...
      Logger.log(localized.log[3].msg, ruleName); // elaboro regola "NOME" // DA SPOSTARE!!!
      

        for (var k = 0, l = ruleMsgIds.length; k < l; k++){
          
          var uniqueID = ruleMsgIds[k]; // dovrebbe essere uguale
          // var uniqueID = ruleMsgIds[k].msgId; // attivare quando in uscita avrò TUTTI i valori della mail
          
          // ********** IMPORTANTE!!! i valori li devo ottenere dalla chiamata GAPI e non da GmailApp.
          msgIdsForExit.push(uniqueID); // metto tutti gli ID elaborati nella variabilona CHE NOn SERVE perchè già ce l'ho dall'uscita di buildquery...
          
          // ********** per il controllo del tempo massimo di esecuzione...
          end = new Date; 
          var runTime = (end.getTime() - start.getTime()) / 1E3; // per il controllo del tempo massimo di esecuzione
          
          // ********** popolo subito le variabili che mi servono dal singolo messaggio
          var message = gRetry2(function(){return GmailApp.getMessageById(uniqueID)}); // expBackOff 16-09-2016
          
          // aggiungere funzione per accorpare tutta sta roba...
          var emailData2 = buildEmailData(message); // tutte le info sul messaggio, attachments compresi
          
          var messageDate = message.getDate();
          var msgDateFormatted = Utilities.formatDate(messageDate, Session.getScriptTimeZone(), "yyyy/MM/dd/HH.mm.ss");
          var msgDateSplit = msgDateFormatted.split("/");
          var msgMonth = replaceAll_(msgDateSplit[1],months)
          var messageSubj = message.getSubject(); 
          var arbFolder = checkFolderInSubject(messageSubj); // Qui si identifica, se presente, il folder arbitrario
          var messageFrom = message.getFrom();
          
          // creo array con i dati dell'email - NOVITA'!!!
          var emailData = {uniqueID: uniqueID, // id
                           msgDate: messageDate, // data completa
                           msgYear: msgDateSplit[0], // solo anno
                           msgMonthNum: msgDateSplit[1], // solo mese, numerale
                           msgMonth: msgMonth, // solo mese, letterale
                           msgDay: msgDateSplit[2], // solo giorno
                           msgHour: msgDateSplit[3], // solo orario
                           msgFrom: messageFrom, // email from
                           msgSubj: messageSubj // oggetto, non pulito
                          };
          
          Logger.log("++++++++++ test buildEmailData");
            // 13-09-2016 - AGGIUNGERE NUOVA FUNZIONE PER LEGGERE LE LABEL DEL MESSAGGIO, SE PRESENTI-
          // vanno passate per gli exit codes, e vanno aggiunte alle variabili popolate all'inizio in quanto
          // mi servono per il freeform path builder
          // E SERVONO ANCHE PER RICONTROLLARE I MESSAGGI PRIMA di eseguire qualsiasi operazione:
          // questo perchè ora le query sono fatte tutte all'inizio e se lo bstatus di un messaggio cambia DOPO
          // la query, è possibile una seconda esecuzione di aa-mail per errore ;)
          
          var attachments = message.getAttachments(); // blob con tutti gli allegati NORMALI... adesso li conto
          var attachLinksInMsg = getAllLinks2(message); // controllo link drive - da FALSE se non ci sono links
          if (attachLinksInMsg != false) {
            // attachNum è un cumulativo degli allegati normali e dei links... se è maggiore di 0, vuol dire che qualcosa c'è
            var attachNum = attachments.length + attachLinksInMsg.length
          } else {
            var attachNum = attachments.length; // numero totale di allegati trovati
          }
          howmanyattach += attachNum // sommo gli allegati a howmanyattach ad ogni elaborazione messaggio
          // controllo tempo trascorso
          Logger.log(localized.log[4].msg, messageSubj,uniqueID); // Elaborazione messaggio:
          Logger.log(localized.log[5].msg, runTime, maxRunTime); // tempo trascorso...
          if (runTime >= maxRunTime) { // timeOut script
            Logger.log(localized.log[6].msg, runTime); // tempo max trascorso! timeout!
            Logger.log(localized.log[8].msg); // salvataggio log esecuzione
            gRetry2(function(){SaveLog(logfolder)});
            
            // EXITCODES! operazioni eseguite, uscita per TIMEOUT!!! - ruleNum identifica la regola dove si è interrotta l'esecuzione
            var exitCodes = {}
            var ecmessageids = msgIdsForExit.length > 0 ? msgIdsForExit.toString() : "noIds";
            var eclinkids = linkIdsForExit.length > 0 ? linkIdsForExit.toString() : "noIds";
            exitCodes.runid = runId;
            exitCodes.runby = runByUser;
            exitCodes.start = start;
            exitCodes.end = end;
            exitCodes.numrules = ruleNum + "-" + rule.name;
            exitCodes.runtime = runTime;
            exitCodes.operations = true;
            exitCodes.messageids = ecmessageids;
            exitCodes.messages = howmanymsg;
            exitCodes.attachments = howmanyattach;
            exitCodes.linkids = eclinkids;
            exitCodes.errorcode = alertSent;
            exitCodes.timeout = true;
            exitCodes.mboxstatus = statusMbox;
            exitCodes.gapicount = aaAPIcount;
            return exitCodes;
          } // fine controllo tempo trascorso
          
          var attachList = []; // variabile vuota che ospiterà solo il nome dell'allegato
          var attachListPdf = "<ul>"; // variabile vuota che ospiterà il nome e il link dell'allegato per appenderlo all'HTML 
          var attachListInBody = ""
          
          // verificare se vengono eseguite le restanti condizioni però...
          if (doDelete) { // se il messaggio è da cancellare SENZA archiviazione, la regola viene eseguita subito!
            message.moveToTrash();
            Logger.log(localized.log[10].msg, messageDate,messageSubj); // cancellato messaggio
          } // fine cancellazione messaggio - doDelete
          
          // AGGIUNGERE LOGGING SU EXITCODES PER doDelete!
          
          //Logger.log(localized.log[4].msg, messageSubj, uniqueID); // Elaborazione messaggio: // duplicato
          
          Logger.log(localized.log[12].msg, attachNum); //trovati N allegati totali (normali e link drive)
          if (attachLinksInMsg != false) {
            Logger.log(localized.log[13].msg, attachLinksInMsg.length) // sono allegati Google Drive - solo Files, non folders!
            var attachNum = attachments.length + attachLinksInMsg.length;
          } 
          
          
          Logger.log(localized.log[14].msg); // Lista allegati
          
          // il check allegati lo faccio subito qui oppure sotto? meglio sotto, così
          // nel log ho cmq traccia degli allegati ma poi skippo il loop e mando alert      
          if (attachNum > 0 || attachLinksInMsg != false ) { // ci sono allegati, ecco i nomi
            
            if (attachNum > 0) {
              for (var m = 0, n = attachments.length; m < n; m++) {
                var attachListNames = attachments[m];
                attachList.push(attachListNames.getName())
              }
            }
            
            if (attachLinksInMsg != false) {
              for (var o = 0, p = attachLinksInMsg.length; o < p; o++) {
                try {
                  var driveAttachListNames = DriveApp.getFileById(attachLinksInMsg[o]);
                  attachList.push(driveAttachListNames.getName())
                } catch (e) {
                  Logger.log(localized.log[41].msg + e); // se il link non è un file, dovrebbe skippare
                }
              }
            }
            
            for (var q = 0, r = attachList.length; q < r; q++){
              Logger.log("--------------------" + attachList[q] );
            }
            
          } else { // non ci sono allegati, chiudo la lista
            attachListPdf += "<li>" + localized.log[42].msg + "</a></li>"; // lista allegati vuota
          };

          //********************************************* CREAZIONE PATH ***************************************************************
          var finalFolder = buildFinalPath(rule,arbFolder,emailData); // e questo è il BLOCCONE in una sola funzione... se funziona!
          //********************************************* FINE CREAZIONE PATH **********************************************************
          
          // ********** Imposto descrizione
          var folder = getOrCreateFolder(finalFolder);
          gRetry2(function(){folder.setDescription(localized.log[43].msg)}); // creato da AA

          // ********** Custom properties - folder
          Logger.log("********** Imposto Custom Properties");
          var folderID = folder.getId();
          //gRetry2(function(){addCustomProperty(folderID,"App","AutoArchiver")}); // + expBackOff 15-09-2016
          //gRetry2(function(){addCustomProperty(folderID,"Rule",ruleName)}); // + expBackOff 15-09-2016
          //gRetry2(function(){addCustomProperty(folderID,"Folder",finalFolder)}); // + expBackOff 15-09-2016
          gRetry2(function(){changeColor(folderID,3)}); // + expBackOff 15-09-2016
          
          Logger.log(localized.log[25].msg) // impostazione metadati + colore folder
          Logger.log(localized.log[26].msg, finalFolder) // il folder dove salvare è...
          
          /********************************************* FINE CREAZIONE PATH ****************************************************************/
          
          // Ho la destinazione, continuo con l'elaborazione
          // dovrei valutare  prima gli allegati - mi serve per avere la lista allegati con l'url per il PDF - fatto
          // dovrei poi valutare l'opzione per salvare il PDF della mail - fatto
          // ed infine la fase di etichettatura/archiviazione/log
          // la notifica deve partire SOLO se non ci sono stati errori nel salvataggio allegati;
          
          var attachRes = 0; //mi serve per il loop seguente
          var alertSent = 0; // variabile di controllo per verificare se alert allegati è scattato - qui è a 0
          // attenzione, il conto dei link di drive deve essere aggiornato in modo da corripondere ad attachres = attachnum
          
          if (doSaveAttach == true && attachNum > 0 || attachLinksInMsg != false ) { // loop salvataggio allegati - credo sia errata la logica
            Logger.log("********** Inizio salvataggio allegati"  )
            if (attachNum > 0) { // IF - se ci sono allegati normali, allora esegue
              for (var s = 0, t = attachments.length; s < t; s++) { // ciclo FOR attIdx
                attachRes++;
                var attachment = attachments[s];
                // test funzione unzipping 24-05-2016 WIP!!!
                if (doUnZip){
                  var attachmentType = attachment.getContentType();
                  Logger.log(localized.log[44].msg, attachmentType);
                  /*USARE SWITCH CASE*/
                  if (attachmentType == "application/zip"){ //inizio IF zip
                    var zipName = attachment.getName();
                    var unzippedBlobs = Utilities.unzip(attachment)
                    for (var z = 0; z < unzippedBlobs.length; z++){ // inizio ciclo per ogni blob nello zip
                      var singleBlob = unzippedBlobs[z];
                      var singleBlobType = singleBlob.getContentType();
                      var singleBlobName = singleBlob.getName() // la stringa comprende anche il path se ci sono sottocartelle!
                      var theName = singleBlobName.split("/")
                      Logger.log("Type:" + singleBlobType + " - " + "Name:" + singleBlobName)
                      if (singleBlobType != null){ // IF not null
                        var selectLastString = theName.length -1
                        var zippedFile = folder.createFile(theName[selectLastString],singleBlob).setDescription("Oggetto: " + messageSubj + "\nData: " + messageDate +
                                                                                                                "\nLink: https://mail.google.com/mail/u/0/#inbox/" + uniqueID +
                                                                                                                "\nFile contenuto nello Zip: " + zipName);
                        Logger.log(localized.log[24].msg); // descrizione file impostata
                        // inserire restanti metadati
                        // inserire in footer email
                      } // fine IF not null
                    } // fine ciclo blob in zip
                    
                    // se lascio così, salva anche lo zip non compresso, in teoria.. ESATTO!
                  } // fine IF ZIP
                } // fine IF doUnzip
                
                // ********** salvo l'attachment
                var file = folder.createFile(attachment); 
                // ********** set Description
                gRetry2(function(){file.setDescription("Oggetto: " + messageSubj + "\nData: " + messageDate +
                                                       "\nLink: https://mail.google.com/mail/u/0/#inbox/" + uniqueID +
                                                       "\nAllegato: " + attachRes + " di " + attachNum)}); // + ExpBackOff 15-09-2016
                Logger.log(localized.log[24].msg); // descrizione file impostata
                
                var fileID = file.getId();
                var fileName = file.getName();
                var fileURL = file.getUrl();
                // ********** Custom properties - attachments
                //gRetry2(function(){addCustomProperty(fileID,"App","AutoArchiver")}); // + expBackOff 15-09-2016
                //gRetry2(function(){addCustomProperty(fileID,"Rule",ruleName)}); // + expBackOff 15-09-2016
                //gRetry2(function(){addCustomProperty(fileID,"uniqueID",uniqueID)}); // + expBackOff 15-09-2016
                
                // ********** custom metadata
                //gRetry2(function(){addCustomProperty(fileID,"RootFolder",folderName)}); // + expBackOff 15-09-2016
                //gRetry2(function(){addCustomProperty(fileID,"Folder",finalFolder)}); // + expBackOff 15-09-2016
                
                Logger.log(localized.log[25].msg); // metadati file impostati
                linkIdsForExit.push(fileID) // e metto il link Id di Drive nella variabilona
                
                try {
                  var SSexitcodes = SpreadsheetApp.openById(exitcodesSheetId);
                  var SSexitSheet = SSexitcodes.getSheetByName("messages");
                  SSexitSheet.appendRow([runId,runByUser,start,ruleName,uniqueID,fileName,fileID,fileURL,finalFolder,"https://drive.google.com/drive/folders/"+folderID]);
                } catch (e) {
                  Logger.log(localized.log[47].msg, e); // exitcodes error
                }
                
                attachListPdf += "<li><a href='" + fileURL + "'>" + fileName + "</a></li>";
                attachListInBody += "<div style='font-size:normal;text-transform:uppercase;font-weight:bold'>" + fileName + "</div>";
                attachListInBody += "<div style='font-style:italic;'><a href='" + fileURL + "'>" + "Link a Google Drive: " + fileName + "</a></div><br>";
                Utilities.sleep(sleepTime); // piccola pausa dopo il salvataggio del file
              }// fine ciclo FOR attIdx
            }// fine IF allegati normali - attachNum > 0
            
            
            // loop per links di drive... WIP! 22-04-2016 sembra ok!
            
            if (attachLinksInMsg != false) {
              for (var u = 0, v = attachLinksInMsg.length; u < v; u++) {
                
                try {
                  var attachmentID = DriveApp.getFileById(attachLinksInMsg[u]);
                  var fileName = attachmentID.getName();
                  attachRes++; // il file esiste e verrà processato, quindi aumento di 1 il counter
                  
                  var file = attachmentID.makeCopy(fileName,folder).setDescription("Oggetto: " + messageSubj + "\nData: " + messageDate +
                                                                                   "\nLink: https://mail.google.com/mail/u/0/#inbox/" + uniqueID +
                                                                                   "\nAllegato: " + attachRes + " di " + attachNum);
                  
                  Logger.log(localized.log[24].msg); // descrizione file impostata
                  var fileID = file.getId(); // l'ID del nuovo file, ovvero la copia
                  var fileURL = file.getUrl();
                  var fileName = file.getName();
                  
                  // Custom properties - attachments Drive Links // occhio che sono buggate e lente!!!
                  //gRetry2(function(){addCustomProperty(fileID,"App","AutoArchiver")}); // expBackOff 12-10-2016
                  //gRetry2(function(){addCustomProperty(fileID,"Rule",ruleName)}); // expBackOff 12-10-2016
                  //gRetry2(function(){addCustomProperty(fileID,"RootFolder",folderName)}); // expBackOff 12-10-2016
                  //gRetry2(function(){addCustomProperty(fileID,"Folder",finalFolder)}); // expBackOff 12-10-2016
                  /*if (arbFolder == false) {
                    addCustomProperty(fileID,"RootFolder",folderName);
                    addCustomProperty(fileID,"Folder",finalFolder);
                    addCustomProperty(fileID,"uniqueID",uniqueID);
                  } else {
                    addCustomProperty(fileID,"RootFolder",folderName);
                    addCustomProperty(fileID,"DatedFolder",partPath);
                    addCustomProperty(fileID,"Folder",finalFolder);
                  }*/
                  Logger.log(localized.log[25].msg); // metadati file impostati
                  linkIdsForExit.push(fileID) // e metto il link Id di Drive nella variabilona
                  
                  try {
                    var SSexitcodes = SpreadsheetApp.openById(exitcodesSheetId);
                    var SSexitSheet = SSexitcodes.getSheetByName("messages");
                    SSexitSheet.appendRow([runId,runByUser,start,ruleName,uniqueID,fileName,fileID,fileURL,finalFolder,"https://drive.google.com/drive/folders/"+folderID]);
                  } catch (e) {
                    Logger.log(localized.log[47].msg, e); // exitcodes error
                  }
                  
                  attachListPdf += "<li><a href='" + file.getUrl() + "'>" + file.getName() + "</a></li>";
                  Utilities.sleep(sleepTime); // piccola pausa dopo il salvataggio del file
                  
                } catch (e) {
                  Logger.log(localized.log[41].msg + " " + e); // se il link non è un file, dovrebbe skippare
                  // questo try/catch dovrebbe essere inutile
                } // fine try/catch in caso di link Drive fasullo ;)
              }
            } // fine loop attachment drive
            
            
            if (attachRes == attachNum) { // loop di verifica per gli allegati // tiene conto anche dei links in drive
              Logger.log(localized.log[23].msg); // tutti gli allegati sono stati salvati
            } else {
              // test per ottenere il numero di allegati NON salvati
              var notSavedAttachs = attachNum - attachRes
              Logger.log(localized.log[16].msg, notSavedAttachs); // alert, allegati non salvati WIP!
              Logger.log(localized.log[15].msg, attachList.toString()) // questi sono gli allegati salvati in drive... WIP!
              modifyMessage('me', uniqueID, [warnLabel]);
              var attachLog = Logger.getLog(); // aggiunta variabile che copia il log esecuzione per aggiungerlo alla mail
              var alertBody2 = createAlertBody2(messageSubj, messageDate, uniqueID, attachList.toString(), attachLog);
              GmailApp.sendEmail(errorMail, "Attenzione - Errore nel salvataggio degli allegati!", "", { // aggiungere variabile per scegliere dinamicamente un destinatario!
                htmlBody: alertBody2,
                name: 'Archiviazione automatica Google Drive'
              });
              alertSent = 1; // alert scattato!
            } // fine loop verifica allegati
          } // fine loop salvataggio allegati
          
          if (doSaveAttach == true && attachNum == 0 && doAlert == true) { // se devo salvare allegati MA gli allegati non ci sono e ho impostato l'alert, scatta alert
            var alertBody = createAlertBody(messageSubj, messageDate); // creazione e-mail
            GmailApp.sendEmail(messageFrom, "Attenzione - Allegati mancanti!", "", { // l'avviso viene inviato al mittente del messaggio!
              htmlBody: alertBody,
              name: 'Archiviazione automatica Google Drive'
            });
            modifyMessage('me', uniqueID, [warnLabel]); // aggiungo l'etichetta "Avvisi" nel caso l'alert sia scattato 
            alertSent = 1;
            Logger.log(localized.log[27].msg); // allegati mancanti! alert inviato!
          }
          
          // Loop salvataggio email in PDF, solo se l'alert non è scattato
          if (doSaveMsg && alertSent == 0) {
            if (doSaveMsg == "simple"){
              var simpleMessage = saveMessage(message, attachListPdf);
              var savedMessage = folder.createFile(simpleMessage);
              var savedMessageId = savedMessage.getId();
              var savedMessageURL = savedMessage.getUrl();
              gRetry2(function(){savedMessage.setDescription("Oggetto: " + messageSubj + "\nData: " + messageDate +  "\nLink: https://mail.google.com/mail/u/0/#inbox/" + uniqueID)});
              savedPDF++
                
            } else if (doSaveMsg == "pretty"){
              var prettyMessage = messageToPdf(message);
              var prettyPdfDate = Utilities.formatDate(messageDate, Session.getScriptTimeZone(), "yyyy.MM.dd_HH.mm.ss");
              prettyPdfDate =  prettyPdfDate.toString();
              var prettyCleanSubj = betterClean(messageSubj);   // pulisce il subject
              prettyMessage.setName(prettyPdfDate + "_" + prettyCleanSubj + ".pdf");
              var savedMessage = folder.createFile(prettyMessage);
              var savedMessageId = savedMessage.getId();
              var savedMessageURL = savedMessage.getUrl();
              gRetry2(function(){savedMessage.setDescription("Oggetto: " + messageSubj + "\nData: " + messageDate +  "\nLink: https://mail.google.com/mail/u/0/#inbox/" + uniqueID)});
              savedPDF++
                
            } else if (doSaveMsg == "eml"){
              var emlFile = message.getRawContent();
              var emlName = betterClean(messageSubj);
              var savedMessage = folder.createFile(emlName + ".eml",emlFile,'message/rfc822');
              var savedMessageId = savedMessage.getId();
              var savedMessageURL = savedMessage.getUrl();
            }
            
            try {
                    var SSexitcodes = SpreadsheetApp.openById(exitcodesSheetId);
                    var SSexitSheet = SSexitcodes.getSheetByName("messages");
                    SSexitSheet.appendRow([runId,runByUser,start,ruleName,uniqueID,messageSubj,savedMessageId,savedMessageURL,finalFolder,"https://drive.google.com/drive/folders/"+folderID]);
                  } catch (e) {
                    Logger.log(localized.log[47].msg, e) // exitcodes error
                  }
            
          } // fine loop salvataggio email in PDF
          
          // nota: se qualche allegato non è stato salvato, dal PDF salvato posso verificare COSA ha salvato e fare
          // un confronto... perchè nel PDF c'è la lista dei file processati con successo...
          // non vale per l'opzione pretty, per ora...
          
          // ********** etichettatura Processate
          gRetry2(function(){modifyMessage('me', uniqueID, [procLabel])});
          Logger.log(localized.log[28].msg, procLabel) // aggiungo label per distinguere già elaborati
          
          // ********** etichettatura con nome Folder
          if (doLabel) {
            // IF per avere nome corretto label in caso di uso di freePath Builder
            if (singleType == "free" && doDated == "free"){
              var buildFolder = [];
              var freeFolder = folderName.split("/");
              for (var i = 0; i < freeFolder.length; i++) {
                if (freeFolder[i].match("@")) {
                  // skip value!
                } else {
                  buildFolder.push(freeFolder[i]);
                }
                var transformFolder = buildFolder.join().replace(/[,]/g,"/");
                
              }// FUNZIONA!!! - si ma è un casino, e se sono tutte keyword non funziona ;)
              Logger.log("********** Estraggo etichetta da folder FreeForm: " + transformFolder)
              
              var folderLabel = getOrCreateLabel(transformFolder); // se non esiste, creo in GMail l'etichetta del Folder
              gRetry2(function(){modifyMessage('me', uniqueID, [transformFolder])}); // + expbackOff
              Logger.log(localized.log[7].msg, transformFolder) // aggiungo label per archiviazione
              
            } else { //folderLabel normale
              var folderLabel = getOrCreateLabel(folderName); // se non esiste, creo in GMail l'etichetta del Folder
              gRetry2(function(){modifyMessage('me', uniqueID, [folderName])}); // + expbackOff
              Logger.log(localized.log[7].msg, folderName) // aggiungo label per archiviazione
            }
          }
          
          // ********** invio email di notifica con messaggio personalizzato
          if (doNotify && alertSent == 0) { // SE notify è TRUE (generic, specific, ecc) e non ho inviato email di alert, allora...
            Logger.log(localized.log[29].msg) // preparo e-mail di notifica...
            var notifyhtml = ""; // variabile vuota che ospiterà l'HTML del messaggio
            var specificBody = message.getBody().replace(/<img[^>]*>/g, "");
            var genericBody = localized.log[40].msg; // sono stati salvati i seguenti allegati
            
            switch (doNotify) {
              case "generic":
                notifyhtml += genericBody;
                notifyhtml += "<hr/>";
                notifyhtml += attachListPdf + "</ul>";
                break;
                
              case "specific":
                notifyhtml += specificBody; // il body dell'email
                notifyhtml += "<br>";
                notifyhtml += "<hr/>";
                notifyhtml += "Lista allegati";
                notifyhtml += attachListPdf + "</ul>";
                break;
                
              case "attachlist":
                notifyhtml += specificBody;
                notifyhtml += "<br><br>";
                notifyhtml += attachListInBody;
                break;
            }
            
            // se il subject contiene le @@ lo pulisco ::: 
            if (arbFolder) {
              messageSubj = messageSubj.replace((/@/g),"");
            }
            
            GmailApp.sendEmail(notifyTo, messageSubj, "", {
              htmlBody: notifyhtml,
              name: messageFrom, // prima era 'Archiviazione automatica Google Drive'
              replyTo: messageFrom,
            });
            Logger.log(localized.log[30].msg) // e-mail di notifica inviata!
          }// fine loop email notifica
          
          // ********** la mail viene archiviata solo se non sono scattati errori
          if (doArchive && alertSent == 0) {
            gRetry2(function(){modifyMessage('me', uniqueID, [], ['INBOX'])}); // + expbackOff
            Logger.log(localized.log[31].msg, messageSubj); // archiviazione messaggio...
            message.markRead();
          }
          
          // ********** la mail viene cancellata, se previsto nella regola
          if (doTrash && alertSent == 0) {
            var numTrashed = 0;
            gRetry2(function(){message.moveToTrash()}); // + expBackOff
            Logger.log(localized.log[10].msg, messageSubj,uniqueID); // cancellazione messaggio
            numTrashed++
            try {
              var SSexitcodes = SpreadsheetApp.openById(exitcodesSheetId);
              var SSexitSheet = SSexitcodes.getSheetByName("messages");
              SSexitSheet.appendRow([runId,runByUser,start,ruleName,uniqueID,"doTrash","doTrash","doTrash","doTrash","doTrash"]);
            } catch (e) {
              Logger.log(localized.log[47].msg, e); // exitcodes error
            }
            
          }
          Logger.log(localized.log[11].msg); // avanti!!!
          howmanymsg++ // aggiunge 1 ad ogni messaggio elaborato
        } // fine ciclo FOR id messaggi
        
        // ho skippato il loop di elaborazione ID messaggi perchè la ricerca è vuota
        Logger.log(localized.log[32].msg); // non ci sono messaggi - fine loop
      } // Fine ciclo FOR elaborazione regole, se ci sono altre regole continua sennò esce
    } // FINE IF activeRulesFound.messagesfound > 0
  }; // fine IF StatusMbox CHANGED
  
  // ********* controllo tempo trascorso
  end = new Date;
  var runTime = (end.getTime() - start.getTime()) / 1E3;
  Logger.log(localized.log[37].msg, runTime); // elaborazione completata in
  
  if (attachRes > 0 || savedPDF > 0 || numTrashed > 0) { // aggiunto numTrashed >0  per vedere se lo status cambia in operations == true
    Logger.log(localized.log[35].msg); // salvataggio log
    SaveLog(logfolder);
    
    // EXITCODES! --- operazioni eseguite, NO TIMEOUT
    var exitCodes = {}
    var ecmessageids = msgIdsForExit.length > 0 ? msgIdsForExit.toString() : "noIds";
    var eclinkids = linkIdsForExit.length > 0 ? linkIdsForExit.toString() : "noIds";
    exitCodes.runid = runId;
    exitCodes.runby = runByUser;
    exitCodes.start = start;
    exitCodes.end = end;
    exitCodes.numrules = ruleMax;
    exitCodes.runtime = runTime;
    exitCodes.operations = true;
    exitCodes.messageids = ecmessageids;
    exitCodes.messages = howmanymsg;
    exitCodes.attachments = howmanyattach;
    exitCodes.linkids = eclinkids;
    exitCodes.errorcode = alertSent;
    exitCodes.timeout = false;
    exitCodes.mboxstatus = statusMbox;
    exitCodes.gapicount = aaAPIcount;
    return exitCodes;

  } else {
    Logger.log(localized.log[33].msg); // Nessuna operazione eseguita
    Logger.log(localized.log[34].msg, attachRes,savedPDF); // Allegati, PDF
    Logger.log(localized.log[36].msg); // Nessun log da salvare
    Logger.log(localized.log[39].msg); // Nessun log da salvare, ma lo salvo in logfolder/autoarchiverlatest per vederlo dal log
    gRetry2(function(){SaveLastLog(logfolder)}); // ecco il log temporaneo in caso di nessuna operazione
    
    // // EXITCODES! --- nessuna operazione eseguita, NO TIMEOUT
    var exitCodes = {}
    var ecmessageids = msgIdsForExit.length > 0 ? msgIdsForExit.toString() : "noIds";
    var eclinkids = linkIdsForExit.length > 0 ? linkIdsForExit.toString() : "noIds";
    exitCodes.runid = runId;
    exitCodes.runby = runByUser;
    exitCodes.start = start;
    exitCodes.end = end;
    exitCodes.numrules = 0;
    exitCodes.runtime = runTime;
    exitCodes.operations = false;
    exitCodes.messageids = 0;
    exitCodes.messages = howmanymsg;
    exitCodes.attachments = howmanyattach;
    exitCodes.linkids = eclinkids;
    exitCodes.errorcode = 0;
    exitCodes.timeout = false;
    exitCodes.mboxstatus = statusMbox;
    exitCodes.gapicount = aaAPIcount;
    return exitCodes;
  }
} // fine funzione