/********************************************* CREAZIONE PATH ****************************************************************/
// comincio a stabilire quale sarà il path dove salvare tutto (allegati e/o PDF del messaggio)
function buildFinalPath(rule,arbFolder,emailData){
  try {
  if (rule.folder == false) { // se il folder è vuoto, imposto un nome basandomi sulla data di esecuzione dello script
    Logger.log(localized.log[2].msg);
    var actual = new Date();
    var formatted = Utilities.formatDate(actual, Session.getScriptTimeZone(), "yyyy.MM.dd_HH.mm.ss");
    var today = formatted.toString();
    var folderName = today + "/" + localized.log[9].msg;
  } else {
    var folderName = rule.folder;
  }
  
  switch (rule.dated) { // questa variabile, come anche le altre, richiamata così è locale al loop ma in realtà è anche dentro le global e nelle active rules
    case true:
      if (arbFolder != false) {
        var partPath = datedPath2(arbFolder)
        Logger.log(localized.log[18].msg, partPath); // folder datato arbitrario (data da email) - path parziale
      } else {
        var messageDateString = Utilities.formatDate(emailData.msgDate, Session.getScriptTimeZone(), "dd.MM.yyyy");
        var partPath = datedPath2(messageDateString);
        Logger.log(localized.log[19].msg, partPath); // folder datato automatico - path parziale
      }
      break;
      
    case false:
      var partPath = false ;
      
      if (arbFolder != false) {
        var partPath = arbFolder;
        Logger.log(localized.log[20].msg, partPath); // Folder non datato in automatico, data arbitraria. Path parziale
      }
      Logger.log(localized.log[21].msg); // folder stabilito da regola, no datazione, no arbitrario
      break;
      
    case "free":
      if (arbFolder != false) {
        var partPath = arbFolder;
        Logger.log(localized.log[18].msg, partPath); // Folder arbitrario, data da email. Path parziale
      } else {
        var partPath = false ;
      }
      Logger.log(localized.log[46].msg);
      break;
  } // fine switch doDated
  
  switch (rule.singletype) {
    case "msgdate":
      var SingleFolderDate = Utilities.formatDate(emailData.msgDate, Session.getScriptTimeZone(), "dd.MM.yyyy_HH.mm.ss");
      var SingleFolderSubj = betterClean(emailData.msgSubj);
      var SingleCleanedFolder = SingleFolderDate + "_" + SingleFolderSubj;
      if (partPath == false) { // not dated
        var finalFolder = folderName + "/" + SingleCleanedFolder;
      } else {
        var finalFolder = folderName + "/" + partPath + "/" + SingleCleanedFolder;
      }
      break;
      
    case "msgdateusa":
      var SingleFolderDate = Utilities.formatDate(emailData.msgDate, Session.getScriptTimeZone(), "yyyy.MM.dd_HH.mm.ss");
      var SingleFolderSubj = betterClean(emailData.msgSubj);
      var SingleCleanedFolder = SingleFolderDate + "_" + SingleFolderSubj;
      if (partPath == false) { // not dated
        var finalFolder = folderName + "/" + SingleCleanedFolder;
      } else {
        var finalFolder = folderName + "/" + partPath + "/" + SingleCleanedFolder;
      }
      break;
      
    case "subfolder":
      var SingleNotCleanedFolder = emailData.msgSubj;
      if (partPath == false) { // not dated
        var finalFolder = folderName + "/" + SingleNotCleanedFolder;
      } else {
        var finalFolder = folderName + "/" + partPath + "/" + SingleNotCleanedFolder;
      }
      break;
      
    case "none":
      if (partPath == false) { // not dated
        var finalFolder = folderName;
      } else {
        var finalFolder = folderName + "/" + partPath
      }
      break;
      
    case "simple":
      var SingleCleanedFolder = betterClean(emailData.msgSubj); // test nuova funzione 1-7-2016!
      
      if (partPath == false) { // not dated
        var finalFolder = folderName + "/" + SingleCleanedFolder;
      } else {
        var finalFolder = folderName + "/" + partPath + "/" + SingleCleanedFolder;
      }
      break;
      
    case "sender":
      var SingleCleanedFolder = betterClean(emailData.msgSubj); // test nuova funzione 1-7-2016!
      var cleanedFrom = betterClean(emailData.msgFrom);
      
      if (partPath == false) { // not dated
        var finalFolder = folderName + "/" + cleanedFrom + "/" + SingleCleanedFolder;
      } else {
        var finalFolder = folderName + "/" + cleanedFrom + "/" + partPath + "/" + SingleCleanedFolder;
      }
      break;
      
    case "free":
      Logger.log(localized.log[46].msg);
      break;
  } // fine Switch SingleType
  // nella variabile finalFolder ho la stringa con il nome completo del folder da creare;

 Logger.log(folderName);
          if (rule.singletype == "free" && rule.dated == "free"){ // FreePathBuilder!
            var finalFolder = freePathBuilder(folderName,emailData,partPath)
            }
    return finalFolder;
  } catch (e) {
      Logger.log("********** buildFinalPath Error: " + e);
      return e;
    }
}