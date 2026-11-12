/********** AutoArchiver - AAmail - elaborazione e-mail **********/
function wipaamail() {
  var start; // variabili per il controllo del tempo trascorso
  start = new Date; // per il controllo del tempo massimo di esecuzione...
  Logger.clear(); // pulisce il log dalle operazioni precedenti
  Logger.log(localized.log[0].msg); // Archiver START
  Logger.log("********** Archiver version: %s",scriptVersion); // stamp the version in the log for version checking
  Logger.log("********** Archiver build: %s",scriptBuild); // stamp the build in the log for version checking
  
  var runId = randomString(16, '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ');
  var runByUser = getEmail();
  Logger.log(localized.log[45].msg, runId);
  
  // ********** Configurazione globale (presa dal global space) //
  var logfolder = globalconfig.global[0].logfolder; // logfolder
  var maxRunTime = globalconfig.global[0].maxruntime; // number
  var sleepTime = globalconfig.global[0].sleeptime; // number
  var errorMail = globalconfig.global[0].errormail; // stringa - email alla quale mandare gli errori - nel caso fosse vuota, prende la mail dell'utente corrente
  if (errorMail == false){
    Logger.log(localized.log[17].msg); // no indirizzo per email di errore - uso l'indirizzo dell'utente
    errorMail = runByUser;
  };
  
  // Variabili da dichiarare all'inizio
  var alertSent = false; // l'alert viene inizializzato con FALSE
  var exitLinkIds = []
  // si popola mano mano che i messaggi vengono elaborati; i primi tre valori li inserisco subito
  // e inizializzo i restanti valori. Durante l'esecuzione l'object viene aggiornato
  var exitCodes = { 
    runid: runId,
    runby: runByUser,
    start: start,
    end: "not set", // si aggiorna con timeOut al check del tempo trascorso
    numrules: "not set", // si aggiorna con activeRules
    runtime: "not set", // si aggiorna con timeOut al check del tempo trascorso
    operations: "not set", // si aggiorna con operatore ternario alla fine: var operations = AR != false ? true : false;
    messageids: "not set", // si aggiorna con AR.messageIds[ruleId]
    messages: "not set", // si aggiorna con AR.messagesfound
    attachments: "not set", // si aggiorna con AR.attachsfound
    linkids: "not set", // si aggiorna con la var exitLinkIds
    errorcode: alertSent, // parte con FALSE ma si deve aggiornare SEMPRE anche dopo
    timeout: "not set", // si aggiorna con timeOut al check del tempo trascorso
    mboxstatus: "not set", // si aggiorna con statusMbox
    gapicount: "not set" // si aggiorna con AR.gapicalls
  }
    
  
  // prendo l'object label oppure creo la label se non esiste
  gRetry2(function(){getOrCreateLabel(globalconfig.global[0].processedlabel)}); // Etichetta Processate
  gRetry2(function(){getOrCreateLabel(globalconfig.global[0].errorlabel)}); // Etichetta Errori
  gRetry2(function(){getOrCreateLabel(globalconfig.global[0].warninglabel)}); // Etichetta Avvisi
  Logger.log(localized.log[38].msg); // etichette in Gmail create
  
  // START MAIN LOOP
  Logger.log(localized.log[1].msg); // Inizio elaborazione regole
  
  var statusMbox = isStatusChanged(); // controllo status mailbox, TRUE, FALSE o (e) in caso di errore
  // ********** Update ExitCodes
  exitCodes.mboxstatus = statusMbox
  
  if (statusMbox){ // START - IF Status Changed TRUE Loop
    var AR = buildQueryAndReturnActiveRules(TESTconfig.rules); // ********** Individuo le regole attive
    
    if (AR){ // START - Loop regole attive - TRUE esegue tutto, FALSE salta
      
      // START OUTER LOOP - Loop Regole
      for (var ruleId = 0, activeRules = AR.activerules.length; ruleId < activeRules; ruleId++){
        var ARRule = AR.activerules[ruleId]
        // ********** Update ExitCodes
        exitCodes.numrules = activeRules
        
        // START TIME CONTROL
        var timeOut = isTimeOut(start);
        if (timeOut.timeout == true) { //START TIMEOUT
          Logger.log(localized.log[8].msg); // ********** salvataggio log esecuzione
          gRetry2(function(){SaveLog(logfolder)});
          // ********** Update ExitCodes
          exitCodes.timeout = timeOut.timeout
          exitCodes.runtime = timeOut.runtime
          exitCodes.end = timeOut.end
          return exitCodes
          } // END TIMEOUT
        // END TIME CONTROL
        
        Logger.log(localized.log[3].msg, ARRule.name); // elaboro regola "NOME" 
        
        for (var msgId = 0, msgsData = AR.messageData[ruleId].length; msgId < msgsData; msgId++){ // START INNER LOOP - messages per rules idx
          
          // ********** Update ExitCodes
          exitCodes.messageids = AR.messageIds[ruleId];
          exitCodes.messages = AR.messagesfound;
          exitCodes.messages = AR.gapicalls;
          exitCodes.attachments = AR.attachsfound;
          
          Logger.log(localized.log[4].msg, AR.messageData[ruleId][msgId].msgSubj,AR.messageIds[ruleId][msgId]); // Elaborazione messaggio:
          
          if (ARRule.deletemsg) { // se il messaggio è da cancellare SENZA archiviazione, la regola viene eseguita subito!
            AR.messageObjects[ruleId][msgId].moveToTrash();
            Logger.log(localized.log[10].msg, AR.messageData[ruleId][msgId].msgDate,AR.messageData[ruleId][msgId].msgSubj); // cancellato messaggio
            break; // testare e vedere come si comporta e dove esce, altrimenti usare labeled loop
          }
          
          if (ARRule.saveattach){ // START IF saveAttach
            Logger.log("********** Inizio salvataggio allegati");

            Logger.log(localized.log[12].msg, AR.messageData[ruleId][msgId].msgAttachs.length); //trovati N allegati totali (normali e link drive)
            Logger.log(localized.log[26].msg, AR.messageData[ruleId][msgId].msgFolderPath) // il folder dove salvare è...
            var folder = getOrCreateFolder(AR.messageData[ruleId][msgId].msgFolderPath);
            var folderID = folder.getId();
            gRetry2(function(){folder.setDescription(localized.log[43].msg)}); // creato da AA
            Logger.log("********** Imposto Colore Folder");
            gRetry2(function(){changeColor(folderID,3)}); // colore rosso, rimane rosso se ci sono errori (es: allegati obbligatori mancanti)
            Logger.log(localized.log[25].msg) // impostazione metadati + colore folder
            
            var attTotNum = AR.messageData[ruleId][msgId].msgAttachs.length; // numero di allegati totali trovati nella regola ID[n], msg[n]
            var attDriveNum = AR.messageData[ruleId][msgId].msgAttachs.filter(function(v){ return v["isDriveFile"] == true; }).length; // attachments di Drive
            //var attNormNum = (attTotNum - attDriveNum); // numero di allegati normali - NON USATA, servirà per distinguere gli allegati Drive
            if (attTotNum > 0){ // START AttNum > 0 - Non è implicito che ci siano allegati, perchè c'è l'alert da far scattare, nel caso...
              
              for (var attIdx = 0; attIdx < attTotNum; attIdx++){ // START Loop allegati
                //if (AR.messageData[ruleId][msgId].msgAttachs[attIdx].isDriveFile){
                //continue;} // WIP - nel caso volessi escludere gli attachments di Drive...ma per ora no ;)
                var attSaved = attIdx; attSaved++ // ********** numero allegati manuale (++ per correggere lo 0 dell'index)
                  
                  // WIP 22-03-2017 .setContentTypeFromExtension() per correzione salvataggio file log... mah...
                  // non funziona...
                  var attachBlob = AR.messageData[ruleId][msgId].msgAttachs[attIdx].attachBlob
                  var attachType = AR.messageData[ruleId][msgId].msgAttachs[attIdx].attachType
                  var attachment = attachBlob.setContentType(attachType);
                  
                  //DEBUG
                   //var TESTATTACHNAME = attachment.getName();
                  //DEBUG
                //Logger.log(TESTATTACHNAME);
                  
                  var file = folder.createFile(attachment);
                gRetry2(function(){file.setDescription("Oggetto: " + AR.messageData[ruleId][msgId].msgSubj + 
                                                       "\nData: " + AR.messageData[ruleId][msgId].msgDate +
                                                       "\nLink: https://mail.google.com/mail/u/0/#inbox/" + AR.messageIds[ruleId][msgId] +
                                                       "\nAllegato: " + attSaved + " di " + attTotNum + "( " + attDriveNum + " link Drive)")}); // ********** Descrizione file
                Logger.log(localized.log[24].msg); // descrizione file impostata
                
                // recupero URL e ID dei file appena creati per aggiornare l'object AR
                var fileID = file.getId();
                var fileURL = file.getUrl();
                // ********** Update dell'object principale
                AR.messageData[ruleId][msgId].msgAttachs[attIdx]["attachURL"] = fileURL
                AR.messageData[ruleId][msgId].msgAttachs[attIdx]["attachID"] = fileID
                
                // ********** Update ExitCodes VAR
                exitLinkIds.push(fileID);
                
                
                try { // ********** Append row in foglio ExitCodes/Messages
                  var SSexitcodes = SpreadsheetApp.openById(exitcodesSheetId);
                  var SSexitSheet = SSexitcodes.getSheetByName("messages");
                  SSexitSheet.appendRow([runId,runByUser,start,ARRule.name,AR.messageIds[ruleId][msgId],AR.messageData[ruleId][msgId].msgAttachs[attIdx].attachName,AR.messageData[ruleId][msgId].msgAttachs[attIdx].attachID,AR.messageData[ruleId][msgId].msgAttachs[attIdx].attachURL,AR.messageData[ruleId][msgId].msgFolderPath,"https://drive.google.com/drive/folders/"+folderID]);
                } catch (e) {
                  Logger.log(localized.log[47].msg, e); // exitcodes error
                }
              }// END Loop allegati
              
              // ATTENZIONE!!! devo togliere tutte le  sub di save del messaggio in PDF e localizzarle dopo il salvataggio
              // degli attachments e anche dopo l'eventuale check per gli errori!!!
              // che cazzo m'è venuto in mente...
              if (attSaved == attTotNum) { // ********** loop di verifica per gli allegati 
                Logger.log(localized.log[23].msg); // tutti gli allegati sono stati salvati
                // visto che non ci sono stati errori, cambio colore del folder
                gRetry2(function(){changeColor(folderID,9)}) // verde pisello, dovrebbe essere tutto ok!
                Logger.log(localized.log[25].msg) // impostazione metadati + colore folder
                
              } else { // ********** il numero di allegati non corrisponde!
                Logger.log("********** Errore nel salvataggio degli allegati!");
                //
                // IMPORTANTE!!! IMPORTANTE!!! IMPORTANTE!!! Inserire sub per invio email di errore!!! IMPORTANTE!!! IMPORTANTE!!! IMPORTANTE!!!
                //
                alertSent = true; // e qui, indico che l'alert è scattato
                // ********** Update ExitCodes
                exitCodes.errorcode = alertSent
              }
              
            } else if (ARRule.attachalert == true){ // La regola dice di salvare gli allegati, è attivo l'alert sugli allegati e non ci sono allegati = scatta avviso!
              Logger.log("********** Mancano gli allegati! Creo file di promemoria nella cartella e invio e-mail di avviso");
              folder.createFile("Allegati mancanti.txt", "Questa e-mail dovrebbe contenere degli allegati" +
                                "\nData: " + AR.messageData[ruleId][msgId].msgDate +
                                "\nOggetto: " + AR.messageData[ruleId][msgId].msgSubj +
                                "\nMessage-ID: " + AR.messageIds[ruleId][msgId] +
                                "\nLink: https://mail.google.com/mail/u/0/#inbox/" + AR.messageIds[ruleId][msgId]);
              
              var alertBody = createAlertBody(AR.messageData[ruleId][msgId].msgSubj, AR.messageData[ruleId][msgId].msgDate); // creazione e-mail
              GmailApp.sendEmail(AR.messageData[ruleId][msgId].msgFrom, "Attenzione - Allegati mancanti!", "", { // l'avviso viene inviato al mittente del messaggio!
                htmlBody: alertBody,
                name: 'Archiviazione automatica Google Drive'
              });
              modifyMessage('me', AR.messageIds[ruleId][msgId], [globalconfig.global[0].warninglabel]); // aggiungo l'etichetta "Avvisi" nel caso l'alert sia scattato 
              Logger.log(localized.log[27].msg); // allegati mancanti! alert inviato!
              
            } else { // // La regola dice di salvare gli allegati, NON è attivo l'alert sugli allegati e non ci sono allegati = viene creato il file nel folder ma non viene mandata l'email
              Logger.log("********** Mancano gli allegati! Creo solo il file di promemoria nella cartella");
              folder.createFile("Allegati mancanti.txt", "Questa e-mail dovrebbe contenere degli allegati" +
                                "\nData: " + AR.messageData[ruleId][msgId].msgDate +
                                "\nOggetto: " + AR.messageData[ruleId][msgId].msgSubj +
                                "\nMessage-ID: " + AR.messageIds[ruleId][msgId] +
                                "\nLink: https://mail.google.com/mail/u/0/#inbox/" + AR.messageIds[ruleId][msgId]);
            } // END IF AttNum > 0
            
          } else { // END IF saveAttach - ELSE non devo salvare gli allegati...
            Logger.log("********** Non devo salvare allegati")
          } // END ELSE saveAttach
          
          Logger.log("***check*** exit SaveAttach loop - Operazioni finali in INNER LOOP");
          
          if (ARRule.savemsg != false){ // salvataggio e-mail in formato PDF
            var folder = getOrCreateFolder(AR.messageData[ruleId][msgId].msgFolderPath); // creazione folder dove salvare l'e-mail in PDF
            var folderID = folder.getId();
            gRetry2(function(){folder.setDescription(localized.log[43].msg)}); // creato da AA
            // devo assicurarmi di avere la variabile popolata: se ho deciso di NON salvare allegati, allora devo ridichiararla qui
            var attTotNum = AR.messageData[ruleId][msgId].msgAttachs.length; // numero di allegati totali trovati nella regola ID[n], msg[n]

            // ********** Step 1 - Salvataggio e-mail in formato PDF/EML
            // ********** START SaveMsg PDF
            
            var attachLists = buildAttachList(AR.messageData[ruleId][msgId].msgAttachs); // passare solo l'array degli allegati di emailData
            if (ARRule.savemsg == "simple" && attTotNum > 0 ){ // START IF savemsg PDF
              if (ARRule.saveattach == false){ // anche se ci sono allegati, posso aver deciso di NON salvarli, quindi l'attachlist deve essere senza links
                var msgPDFblob = saveMessage(AR.messageObjects[ruleId][msgId], attachLists.attachListTextOnly)
                Logger.log("********** Imposto Colore Folder");
                gRetry2(function(){changeColor(folderID,6)}); // giallo taxi, così...tanto per...
              }
              else {
                var msgPDFblob = saveMessage(AR.messageObjects[ruleId][msgId], attachLists.attachListWithLinks);
              }
              var msgPDF = folder.createFile(msgPDFblob);
              gRetry2(function(){msgPDF.setDescription("Oggetto: " + AR.messageData[ruleId][msgId].msgSubj + 
                                                       "\nData: " + AR.messageData[ruleId][msgId].msgDate + 
                                                       "\nLink: https://mail.google.com/mail/u/0/#inbox/" + 
                                                       AR.messageData[ruleId][msgId].uniqueID)});
            }
            if (ARRule.savemsg == "simple" && attTotNum == 0 ){
              var msgPDFblob = saveMessage(AR.messageObjects[ruleId][msgId], attachLists.attachListTextOnly);
              var msgPDF = folder.createFile(msgPDFblob);
              gRetry2(function(){msgPDF.setDescription("Oggetto: " + AR.messageData[ruleId][msgId].msgSubj + 
                                                       "\nData: " + AR.messageData[ruleId][msgId].msgDate + 
                                                       "\nLink: https://mail.google.com/mail/u/0/#inbox/" + 
                                                       AR.messageData[ruleId][msgId].uniqueID)});
              Logger.log("********** Imposto Colore Folder");
              gRetry2(function(){changeColor(folderID,6)}); // giallo taxi, così...tanto per...
            }
            if (ARRule.savemsg == "pretty"){
              var prettyMessage = messageToPdf(AR.messageObjects[ruleId][msgId]);
              prettyMessage.setName(Utilities.formatDate(AR.messageData[ruleId][msgId].msgDate, Session.getScriptTimeZone(), "yyyy.MM.dd_HH.mm.ss").toString() + "_" + betterClean(AR.messageData[ruleId][msgId].msgSubj) + ".pdf");
              var msgPDF = folder.createFile(prettyMessage);
              gRetry2(function(){savedMessage.setDescription("Oggetto: " + AR.messageData[ruleId][msgId].msgSubj + 
                                                             "\nData: " + AR.messageData[ruleId][msgId].msgDate +  
                                                             "\nLink: https://mail.google.com/mail/u/0/#inbox/" + 
                                                             AR.messageData[ruleId][msgId].uniqueID)});
              Logger.log("********** Imposto Colore Folder");
              gRetry2(function(){changeColor(folderID,6)}); // giallo taxi, così...tanto per...
            }
            if (ARRule.savemsg == "eml"){
              var emlFile = AR.messageObjects[ruleId][msgId].getRawContent();
              //var emlName = betterClean(AR.messageData[ruleId][msgId].msgSubj);
              var savedMessage = folder.createFile(betterClean(AR.messageData[ruleId][msgId].msgSubj) + ".eml",emlFile,'message/rfc822');
              //var savedMessageId = savedMessage.getId();
              //var savedMessageURL = savedMessage.getUrl();
              Logger.log("********** Imposto Colore Folder");
              gRetry2(function(){changeColor(folderID,6)}); // giallo taxi, così...tanto per...
            }
          } // END SaveMsg PDF

          // inserire tutte le operazioni del caso: le operazioni sull'attach sono state eseguite, ora bisogna
          // 1 - salvare il PDF OK
          // 2 - etichettare come processata OK
          // 3 - etichettare con nome folder OK normale e OK FreePathBuilder (primi due elementi)
          // 4 - archiviare email (true o false) OK
          // 5 - inviare notifica (specific, attachlist, false) OK
          // 6 - cancellare email (true o false) OK
          // 7 - controllare il tempo trascorso ed eventualmente triggerare il timeout +  scrivere exitcodes/messages - WIP
          // 8 - scrivere l'exitcodes/messages normale, no Timeout
          // 9 - Salvare log di fine esecuzione
          
          // ********** Step 2 - Aggiungere etichetta Processate
          gRetry2(function(){modifyMessage('me', AR.messageData[ruleId][msgId].uniqueID, [globalconfig.global[0].processedlabel])});
          Logger.log(localized.log[28].msg, globalconfig.global[0].processedlabel); // aggiungo label per distinguere già elaborati
          
          // ********** Step 3 - Etichettare con nome folder
          // il folder è già scritto in formato stringa con "/" come separatore in AR.messageData[ruleId][msgId].msgFolderPath
          if (ARRule.addlabel == true) { // START IF AddLabel TRUE
            if (ARRule.dated == "free" || ARRule.singletype == "free"){ // FreePathBuilder!
              var splitFolderPath = AR.messageData[ruleId][msgId].msgFolderPath.split("/");
              
              if (splitFolderPath.length > 1) { // il path è composto da almeno 2 keywords
                var twoSlicesOfPath = splitFolderPath[0].toString() + "/" + splitFolderPath[1].toString();
                gRetry2(function(){modifyMessage('me', AR.messageData[ruleId][msgId].uniqueID, [twoSlicesOfPath])}); // aggiungo l'etichetta
                Logger.log(localized.log[7].msg, twoSlicesOfPath);
              } else if (splitFolderPath.length == 1){
                gRetry2(function(){modifyMessage('me', AR.messageData[ruleId][msgId].uniqueID, [AR.messageData[ruleId][msgId].msgFolderPath])}); // aggiungo l'etichetta
                Logger.log(localized.log[7].msg, AR.messageData[ruleId][msgId].msgFolderPath) // Label aggiunta per migliorare l'archiviazione
              } // END IF splitFolderPath.length
            } else { // Etichetta ripresa dal nome del folder di archiviazione
              gRetry2(function(){modifyMessage('me', AR.messageData[ruleId][msgId].uniqueID, [ARRule.folder])}); // aggiungo l'etichetta
              Logger.log(localized.log[7].msg, ARRule.folder) // Label aggiunta per migliorare l'archiviazione
            }
          } // END IF AddLabel TRUE
          
          // ********** Step 4 - Archiviare e-mail
          if (ARRule.archive == true) {
            gRetry2(function(){modifyMessage('me', AR.messageData[ruleId][msgId].uniqueID, [], ['INBOX'])}); // + expbackOff
            Logger.log(localized.log[31].msg, AR.messageData[ruleId][msgId].msgSubj); // archiviazione messaggio...
            AR.messageObjects[ruleId][msgId].markRead();
          }
          
          // ********** Step 5 - Inviare notifica
          // SE notify è diverso da FALSE e non ho inviato email di alert, eseguo
          if (ARRule.notify != false && alertSent == false) { // START Notify Loop
            Logger.log(localized.log[29].msg) // preparo e-mail di notifica...
            
            switch (ARRule.notify) { // ********** Generic, specific, attachlist, false o vuoto
              case "generic":
                var notifyhtml = ""; // variabile vuota che ospiterà l'HTML del messaggio
                notifyhtml += localized.log[40].msg;
                notifyhtml += "<hr/>";
                notifyhtml += attachLists.attachListWithLinks + "</ul>";
                break;
                
              case "specific":
                var notifyhtml = ""; // variabile vuota che ospiterà l'HTML del messaggio
                notifyhtml += AR.messageData[ruleId][msgId].msgBody; // il body dell'email
                notifyhtml += "<br>";
                notifyhtml += "<hr/>";
                //notifyhtml += "Lista allegati";
                notifyhtml += attachLists.attachListWithLinks + "</ul>";
                break;
                
              case "attachlist":
                var notifyhtml = ""; // variabile vuota che ospiterà l'HTML del messaggio
                notifyhtml += AR.messageData[ruleId][msgId].msgBody;
                notifyhtml += "<br><br>";
                notifyhtml += attachLists.attachListInBody;
                break;
            }
            
            // ********** Se il subject contiene le @@ lo pulisco
            if (AR.messageData[ruleId][msgId].msgArbFolder == true) {
              var cleanSubj = AR.messageData[ruleId][msgId].msgSubj.replace((/@/g),"");
            } else {
              var cleanSubj = AR.messageData[ruleId][msgId].msgSubj;
            }
            
            GmailApp.sendEmail(ARRule.notifyto, cleanSubj, "", {
              htmlBody: notifyhtml,
              name: AR.messageData[ruleId][msgId].msgFrom, // prima era 'Archiviazione automatica Google Drive'
              replyTo: AR.messageData[ruleId][msgId].msgFrom
            });
            Logger.log(localized.log[30].msg) // e-mail di notifica inviata!
          }// END Notify Loop
          
          // ********** Step 6 - Cancellare e-mail dopo elaborazione
          if (ARRule.trashmsg == true && alertSent == false) {
            gRetry2(function(){AR.messageObjects[ruleId][msgId].moveToTrash()});
            Logger.log(localized.log[10].msg, AR.messageData[ruleId][msgId].msgSubj, AR.messageData[ruleId][msgId].uniqueID); // cancellazione messaggio
            try {
              var SSexitcodes = SpreadsheetApp.openById(exitcodesSheetId);
              var SSexitSheet = SSexitcodes.getSheetByName("messages");
              SSexitSheet.appendRow([runId,runByUser,start,ARRule.name,AR.messageIds[ruleId][msgId],"doTrash","doTrash","doTrash","doTrash","doTrash"]);
            } catch (e) {
              Logger.log(localized.log[47].msg, e); // Exitcodes error
            }
            
          }
          
          // ********** Step 6 - Controllo timeout + scrittura exitcodes
          // Dopo aver eseguito tutte le operazioni sull'e-mail, devo verificare che non ci sia pericolo di timeout;
          // il controllo deve essere nell'INNER LOOP, ovvero nell'elaborazione dei messaggi trovati all'interno di ogni singola regola;
          
          // START TIME CONTROL
          var timeOut = isTimeOut(start);
          if (timeOut.timeout == true) { //START TIMEOUT
            Logger.log(localized.log[8].msg); // ********** salvataggio log esecuzione
            gRetry2(function(){SaveLog(logfolder)});
            // ********** Update ExitCodes
            exitCodes.timeout = timeOut.timeout
            exitCodes.runtime = timeOut.runtime
            exitCodes.end = timeOut.end
            return exitCodes
          } // END TIMEOUT
          // END TIME CONTROL
          
          
          Logger.log(localized.log[11].msg); // avanti!!!
        } 
        // END INNER LOOP - messages per rules idx

        
      } 
      // END OUTER LOOP - Loop Regole
      
    }
    // END - Loop regole attive
    
  }
  // END - IF Status Changed TRUE Loop
  
  // ********** Update ExitCodes
  exitCodes.linkids = exitLinkIds
  var operations = AR != false ? true : false; // se AR è diverso da false, allora operations è TRUE
  exitCodes.operations = operations // aggiorno di conseguenza il valore della key operations dell'oggetto exitCodes
  if (AR == false) {
    Logger.log(localized.log[33].msg); // Nessuna operazione eseguita
    Logger.log(localized.log[36].msg); // Nessun log da salvare
    Logger.log(localized.log[39].msg); // Salvo in logfolder/autoarchiverlatest una traccia per visualizzazione tramite GUI
    gRetry2(function(){SaveLastLog(logfolder)}); // ecco il log temporaneo in caso di nessuna operazione
  }
}
// END - funzione AA-Mail