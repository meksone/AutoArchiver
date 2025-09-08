/********** AutoArchiver - AAmail - elaborazione e-mail **********/
function aamail() {
  var processInfo = initializeAAMailProcess();
  var runConfig = loadAAMailConfig(processInfo.runByUser);
  var labels = createAAMailLabels(runConfig);

  var runId = processInfo.runId;
  var runByUser = processInfo.runByUser;
  
  /********** imposta le due variabili per il controllo del tempo massimo di esecuzione **********/
  var end, start;
  start = new Date; // per il controllo del tempo massimo di esecuzione...
  
  Logger.log(localized.log[1].msg); // Inizio elaborazione regole

  var savedPDF = 0; 
  var howmanymsg = 0;
  var howmanyattach = 0;
  var msgIdsForExit = [];
  var linkIdsForExit = [];

  var statusMbox = isMboxChanged();

  var aaAPIcount = 0;
  if (statusMbox == "changed"){
    
   var activeRulesFound = buildQueryAndReturnActiveRules(config.rules);
    if (activeRulesFound != false){
      var allTheRules = activeRulesFound.activerules;
      var allTheIds = activeRulesFound.messageIds;
      var gapiCalls = activeRulesFound.gapicalls;
      aaAPIcount = gapiCalls
    } else {
      aaAPIcount = activeRulesFound.gapicalls;
      var allTheRules = 1
    }

    if (activeRulesFound.messagesfound > 0){
      for (var ruleNum = 0, ruleMax = allTheRules.length; ruleNum < ruleMax; ruleNum++) {
        
        var rule = allTheRules[ruleNum];
        var ruleMsgIds = allTheIds[ruleNum]
        
        var ruleName = rule.name;
        var doArchive = rule.archive;
        var doDated = rule.dated;
        var singleType = rule.singletype;
        var doDelete = rule.deletemsg;
        var doTrash = rule.trashmsg;
        var doLabel = rule.addlabel;
        var doNotify = rule.notify;
        if (doNotify) {
          var notifyTo = rule.notifyto;
        }
        var doSaveMsg = rule.savemsg;
        var doSaveAttach = rule.saveattach;
        if (rule.folder == false) {
          Logger.log(localized.log[2].msg);
          var formatted = Utilities.formatDate(start, Session.getScriptTimeZone(), "yyyy.MM.dd_HH.mm.ss");
          var today = formatted.toString();
          var folderName = today + "/" + localized.log[9].msg;
        } else {
          var folderName = rule.folder;
        }
        var doAlert = rule.attachalert;
        var doUnZip = rule.unzip;
        Logger.log(localized.log[3].msg, ruleName);

        for (var k = 0, l = ruleMsgIds.length; k < l; k++){
          
          var uniqueID = ruleMsgIds[k];
          
          msgIdsForExit.push(uniqueID);
          
          end = new Date; 
          var runTime = (end.getTime() - start.getTime()) / 1E3;
          
          var message = gRetry2(function(){return GmailApp.getMessageById(uniqueID)});
          
          var emailData2 = buildEmailData(message);
          
          var messageDate = message.getDate();
          var msgDateFormatted = Utilities.formatDate(messageDate, Session.getScriptTimeZone(), "yyyy/MM/dd/HH.mm.ss");
          var msgDateSplit = msgDateFormatted.split("/");
          var msgMonth = replaceAll_(msgDateSplit[1],months)
          var messageSubj = message.getSubject(); 
          var arbFolder = checkFolderInSubject(messageSubj);
          var messageFrom = message.getFrom();
          
          var emailData = {uniqueID: uniqueID,
                           msgDate: messageDate,
                           msgYear: msgDateSplit[0],
                           msgMonthNum: msgDateSplit[1],
                           msgMonth: msgMonth,
                           msgDay: msgDateSplit[2],
                           msgHour: msgDateSplit[3],
                           msgFrom: messageFrom,
                           msgSubj: messageSubj
                          };
          
          Logger.log("++++++++++ test buildEmailData");
          
          var attachments = message.getAttachments();
          var attachLinksInMsg = getAllLinks2(message);
          if (attachLinksInMsg != false) {
            var attachNum = attachments.length + attachLinksInMsg.length
          } else {
            var attachNum = attachments.length;
          }
          howmanyattach += attachNum

          Logger.log(localized.log[4].msg, messageSubj,uniqueID);
          Logger.log(localized.log[5].msg, runTime, runConfig.maxRunTime);
          if (runTime >= runConfig.maxRunTime) {
            Logger.log(localized.log[6].msg, runTime);
            Logger.log(localized.log[8].msg);
            gRetry2(function(){SaveLog(runConfig.logfolder)});
            
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
          }
          
          var attachList = [];
          var attachListPdf = "<ul>";
          var attachListInBody = ""
          
          if (doDelete) {
            message.moveToTrash();
            Logger.log(localized.log[10].msg, messageDate,messageSubj);
          }
          
          Logger.log(localized.log[12].msg, attachNum);
          if (attachLinksInMsg != false) {
            Logger.log(localized.log[13].msg, attachLinksInMsg.length)
            var attachNum = attachments.length + attachLinksInMsg.length;
          } 
          
          Logger.log(localized.log[14].msg);
          
          if (attachNum > 0 || attachLinksInMsg != false ) {
            
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
                  Logger.log(localized.log[41].msg + e);
                }
              }
            }
            
            for (var q = 0, r = attachList.length; q < r; q++){
              Logger.log("--------------------" + attachList[q] );
            }
            
          } else {
            attachListPdf += "<li>" + localized.log[42].msg + "</a></li>";
          };

          var finalFolder = buildFinalPath(rule,arbFolder,emailData);
          
          var folder = getOrCreateFolder(finalFolder);
          gRetry2(function(){folder.setDescription(localized.log[43].msg)});

          Logger.log("********** Imposto Custom Properties");
          var folderID = folder.getId();
          gRetry2(function(){changeColor(folderID,3)});
          
          Logger.log(localized.log[25].msg)
          Logger.log(localized.log[26].msg, finalFolder)
          
          var attachRes = 0;
          var alertSent = 0;
          
          if (doSaveAttach == true && attachNum > 0 || attachLinksInMsg != false ) {
            Logger.log("********** Inizio salvataggio allegati"  )
            if (attachNum > 0) {
              for (var s = 0, t = attachments.length; s < t; s++) {
                attachRes++;
                var attachment = attachments[s];
                if (doUnZip){
                  var attachmentType = attachment.getContentType();
                  Logger.log(localized.log[44].msg, attachmentType);
                  if (attachmentType == "application/zip"){
                    var zipName = attachment.getName();
                    var unzippedBlobs = Utilities.unzip(attachment)
                    for (var z = 0; z < unzippedBlobs.length; z++){
                      var singleBlob = unzippedBlobs[z];
                      var singleBlobType = singleBlob.getContentType();
                      var singleBlobName = singleBlob.getName()
                      var theName = singleBlobName.split("/")
                      Logger.log("Type:" + singleBlobType + " - " + "Name:" + singleBlobName)
                      if (singleBlobType != null){
                        var selectLastString = theName.length -1
                        var zippedFile = folder.createFile(theName[selectLastString],singleBlob).setDescription("Oggetto: " + messageSubj + "\nData: " + messageDate +
                                                                                                                "\nLink: https://mail.google.com/mail/u/0/#inbox/" + uniqueID +
                                                                                                                "\nFile contenuto nello Zip: " + zipName);
                        Logger.log(localized.log[24].msg);
                      }
                    }
                  }
                }
                
                var file = folder.createFile(attachment); 
                gRetry2(function(){file.setDescription("Oggetto: " + messageSubj + "\nData: " + messageDate +
                                                       "\nLink: https://mail.google.com/mail/u/0/#inbox/" + uniqueID +
                                                       "\nAllegato: " + attachRes + " di " + attachNum)});
                Logger.log(localized.log[24].msg);
                
                var fileID = file.getId();
                var fileName = file.getName();
                var fileURL = file.getUrl();
                
                Logger.log(localized.log[25].msg);
                linkIdsForExit.push(fileID)
                
                try {
                  var SSexitcodes = SpreadsheetApp.openById(exitcodesSheetId);
                  var SSexitSheet = SSexitcodes.getSheetByName("messages");
                  SSexitSheet.appendRow([runId,runByUser,start,ruleName,uniqueID,fileName,fileID,fileURL,finalFolder,"https://drive.google.com/drive/folders/"+folderID]);
                } catch (e) {
                  Logger.log(localized.log[47].msg, e);
                }
                
                attachListPdf += "<li><a href='" + fileURL + "'>" + fileName + "</a></li>";
                attachListInBody += "<div style='font-size:normal;text-transform:uppercase;font-weight:bold'>" + fileName + "</div>";
                attachListInBody += "<div style='font-style:italic;'><a href='" + fileURL + "'>" + "Link a Google Drive: " + fileName + "</a></div><br>";
                Utilities.sleep(runConfig.sleepTime);
              }
            }
            
            if (attachLinksInMsg != false) {
              for (var u = 0, v = attachLinksInMsg.length; u < v; u++) {
                
                try {
                  var attachmentID = DriveApp.getFileById(attachLinksInMsg[u]);
                  var fileName = attachmentID.getName();
                  attachRes++;
                  
                  var file = attachmentID.makeCopy(fileName,folder).setDescription("Oggetto: " + messageSubj + "\nData: " + messageDate +
                                                                                   "\nLink: https://mail.google.com/mail/u/0/#inbox/" + uniqueID +
                                                                                   "\nAllegato: " + attachRes + " di " + attachNum);
                  
                  Logger.log(localized.log[24].msg);
                  var fileID = file.getId();
                  var fileURL = file.getUrl();
                  var fileName = file.getName();
                  Logger.log(localized.log[25].msg);
                  linkIdsForExit.push(fileID)
                  
                  try {
                    var SSexitcodes = SpreadsheetApp.openById(exitcodesSheetId);
                    var SSexitSheet = SSexitcodes.getSheetByName("messages");
                    SSexitSheet.appendRow([runId,runByUser,start,ruleName,uniqueID,fileName,fileID,fileURL,finalFolder,"https://drive.google.com/drive/folders/"+folderID]);
                  } catch (e) {
                    Logger.log(localized.log[47].msg, e);
                  }
                  
                  attachListPdf += "<li><a href='" + file.getUrl() + "'>" + file.getName() + "</a></li>";
                  Utilities.sleep(runConfig.sleepTime);
                  
                } catch (e) {
                  Logger.log(localized.log[41].msg + " " + e);
                }
              }
            }
            
            if (attachRes == attachNum) {
              Logger.log(localized.log[23].msg);
            } else {
              var notSavedAttachs = attachNum - attachRes
              Logger.log(localized.log[16].msg, notSavedAttachs);
              Logger.log(localized.log[15].msg, attachList.toString())
              modifyMessage('me', uniqueID, [labels.warning.getName()]);
              var attachLog = Logger.getLog();
              var alertBody2 = createAlertBody2(messageSubj, messageDate, uniqueID, attachList.toString(), attachLog);
              GmailApp.sendEmail(runConfig.errorMail, "Attenzione - Errore nel salvataggio degli allegati!", "", {
                htmlBody: alertBody2,
                name: 'Archiviazione automatica Google Drive'
              });
              alertSent = 1;
            }
          }
          
          if (doSaveAttach == true && attachNum == 0 && doAlert == true) {
            var alertBody = createAlertBody(messageSubj, messageDate);
            GmailApp.sendEmail(messageFrom, "Attenzione - Allegati mancanti!", "", {
              htmlBody: alertBody,
              name: 'Archiviazione automatica Google Drive'
            });
            modifyMessage('me', uniqueID, [labels.warning.getName()]);
            alertSent = 1;
            Logger.log(localized.log[27].msg);
          }
          
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
              var prettyCleanSubj = betterClean(messageSubj);
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
                    Logger.log(localized.log[47].msg, e)
                  }
            
          }
          
          gRetry2(function(){modifyMessage('me', uniqueID, [runConfig.procLabel])});
          Logger.log(localized.log[28].msg, runConfig.procLabel)
          
          if (doLabel) {
            if (singleType == "free" && doDated == "free"){
              var buildFolder = [];
              var freeFolder = folderName.split("/");
              for (var i = 0; i < freeFolder.length; i++) {
                if (freeFolder[i].match("@")) {
                } else {
                  buildFolder.push(freeFolder[i]);
                }
                var transformFolder = buildFolder.join().replace(/[,]/g,"/");
                
              }
              Logger.log("********** Estraggo etichetta da folder FreeForm: " + transformFolder)
              
              var folderLabel = getOrCreateLabel(transformFolder);
              gRetry2(function(){modifyMessage('me', uniqueID, [transformFolder])});
              Logger.log(localized.log[7].msg, transformFolder)
              
            } else {
              var folderLabel = getOrCreateLabel(folderName);
              gRetry2(function(){modifyMessage('me', uniqueID, [folderName])});
              Logger.log(localized.log[7].msg, folderName)
            }
          }
          
          if (doNotify && alertSent == 0) {
            Logger.log(localized.log[29].msg)
            var notifyhtml = "";
            var specificBody = message.getBody().replace(/<img[^>]*>/g, "");
            var genericBody = localized.log[40].msg;
            
            switch (doNotify) {
              case "generic":
                notifyhtml += genericBody;
                notifyhtml += "<hr/>";
                notifyhtml += attachListPdf + "</ul>";
                break;
                
              case "specific":
                notifyhtml += specificBody;
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
            
            if (arbFolder) {
              messageSubj = messageSubj.replace((/@/g),"");
            }
            
            GmailApp.sendEmail(notifyTo, messageSubj, "", {
              htmlBody: notifyhtml,
              name: messageFrom,
              replyTo: messageFrom,
            });
            Logger.log(localized.log[30].msg)
          }
          
          if (doArchive && alertSent == 0) {
            gRetry2(function(){modifyMessage('me', uniqueID, [], ['INBOX'])});
            Logger.log(localized.log[31].msg, messageSubj);
            message.markRead();
          }
          
          if (doTrash && alertSent == 0) {
            var numTrashed = 0;
            gRetry2(function(){message.moveToTrash()});
            Logger.log(localized.log[10].msg, messageSubj,uniqueID);
            numTrashed++
            try {
              var SSexitcodes = SpreadsheetApp.openById(exitcodesSheetId);
              var SSexitSheet = SSexitcodes.getSheetByName("messages");
              SSexitSheet.appendRow([runId,runByUser,start,ruleName,uniqueID,"doTrash","doTrash","doTrash","doTrash","doTrash"]);
            } catch (e) {
              Logger.log(localized.log[47].msg, e);
            }
            
          }
          Logger.log(localized.log[11].msg);
          howmanymsg++
        }
        
        Logger.log(localized.log[32].msg);
      }
    }
  };
  
  end = new Date;
  var runTime = (end.getTime() - start.getTime()) / 1E3;
  Logger.log(localized.log[37].msg, runTime);
  
  if (attachRes > 0 || savedPDF > 0 || numTrashed > 0) {
    Logger.log(localized.log[35].msg);
    SaveLog(runConfig.logfolder);
    
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
    Logger.log(localized.log[33].msg);
    Logger.log(localized.log[34].msg, attachRes,savedPDF);
    Logger.log(localized.log[36].msg);
    Logger.log(localized.log[39].msg);
    gRetry2(function(){SaveLastLog(runConfig.logfolder)});
    
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
}

function initializeAAMailProcess() {
  Logger.clear();
  Logger.log(localized.log[0].msg);
  Logger.log("********** Archiver version: %s", scriptVersion);
  Logger.log("********** Archiver build: %s", scriptBuild);

  var runId = randomString(16, '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ');
  var runByUser = getEmail();
  Logger.log(localized.log[45].msg, runId);

  return {
    runId: runId,
    runByUser: runByUser
  };
}

function loadAAMailConfig(runByUser) {
    var runConfig = {
        procLabel: globalconfig.global[0].processedlabel,
        errLabel: globalconfig.global[0].errorlabel,
        warnLabel: globalconfig.global[0].warninglabel,
        logfolder: globalconfig.global[0].logfolder,
        newThan: globalconfig.global[0].newerthan,
        maxRunTime: globalconfig.global[0].maxruntime,
        sleepTime: globalconfig.global[0].sleeptime,
        errorMail: globalconfig.global[0].errormail
    };

    if (!runConfig.errorMail) {
        Logger.log(localized.log[17].msg);
        runConfig.errorMail = runByUser;
    }
    return runConfig;
}

function createAAMailLabels(runConfig) {
    var processedLabel = getOrCreateLabel(runConfig.procLabel);
    var errorLabel = getOrCreateLabel(runConfig.errLabel);
    var warningLabel = getOrCreateLabel(runConfig.warnLabel);
    Logger.log(localized.log[38].msg);
    return {
        processed: processedLabel,
        error: errorLabel,
        warning: warningLabel
    }
}