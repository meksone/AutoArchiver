// Funzioni helper interne, per debugging e testing

// Cancella singola UserProps
function deleteSingleProp(){
  key = "logDocId"; // ID del gDoc autoarchiverlatest
  var userProps = PropertiesService.getUserProperties();
  userProps.deleteProperty(key);
  Logger.log("User Property cancellata");
}


// Imposta singola UserProps
function manualSetProps(){
  var userProps = PropertiesService.getUserProperties();
    userProps.setProperty("aa-runs","1") //
  //userProps.setProperty("exitCodesId","1g-tDSujdFq8uXF3bXnaFi_ajM2OBtiLRlZT9wGY9-Ss") // per evitare di triggerare il setup per l'utente drive@virtax.it durante i test
  //logDocID 1k9oYZfhUhdNU0DR7uOcy2dUNZDOYQUDVi7PceIrLRqU
  //userProps.setProperty("configId", "1C72M5rQ4kUQ_jC8rxYFCFg5zldKDZb8sOzNcVap2l0A") // ID dello sheet in uso per drive@virtax.it
  Logger.log("User Property impostata");
}



// lancio manuale della funzione zipOldLogs: la data viene trasformata in oggetto Date(); ricordare che viene zippato il mese precedente ;)
function LaunchOfzipOldLogs(){
  //var date = new Date("2015/02/01");
  //var date = new Date();
  zipOldLogs(); 
 }



// Log the URL used to grant access to the script.
function AuthURL(){
 var authInfo = ScriptApp.getAuthorizationInfo(ScriptApp.AuthMode.FULL);
 var info = authInfo.getAuthorizationUrl();
  var toString = info.toString();
   Logger.log(info);

}

// Log the authorization status (REQUIRED or NOT_REQUIRED).
function AuthStatus(){
 var authInfo = ScriptApp.getAuthorizationInfo(ScriptApp.AuthMode.FULL);
 var info = authInfo.getAuthorizationStatus();
  var toString = info.toString();
  var globaltest = folderId
  Logger.log(globaltest);
 Logger.log(authInfo.getAuthorizationStatus());
}

function triggersInfo(){
var triggers = ScriptApp.getProjectTriggers();
 for (var i = 0; i < triggers.length; i++) {
   var triggerId = triggers[i].getUniqueId()
   var triggerHandler = triggers[i].getHandlerFunction()
   var triggerEvent = triggers[i].getEventType()
   var triggerSource = triggers[i].getTriggerSource()
   var triggerProps = triggerId + "," + triggerHandler + "," + triggerEvent + "," + triggerSource;
   Logger.log("Trigger ID: %s - Trigger Handler: %s - Trigger Event: %s - Trigger Source: %s", triggerId,triggerHandler,triggerEvent,triggerSource)
 }
}


/*
* TEST MODULO
*/

function testModulo(){
var runs = 1000
var mod = 500
if (runs > 2 && runs % mod == 0){
  var result = runs % mod
Logger.log("Mando email!");
  Logger.log("risultato " + result);
  
}
}

function nonRicordoLeArrayCazzo(){
  var exitCodesOnOps = {}
  exitCodesOnOps.key1 = "value1";
  exitCodesOnOps.key2 = "value2";


  Logger.log("end")




}

/*
// TEST NAMESPACE
var testHelpers = {

    triggersInfo2: function() {
var triggers = ScriptApp.getProjectTriggers();
 for (var i = 0; i < triggers.length; i++) {
   var triggerId = triggers[i].getUniqueId()
   var triggerHandler = triggers[i].getHandlerFunction()
   var triggerEvent = triggers[i].getEventType()
   var triggerSource = triggers[i].getTriggerSource()
   var triggerProps = triggerId + "," + triggerHandler + "," + triggerEvent + "," + triggerSource;
   Logger.log("Trigger ID: %s - Trigger Handler: %s - Trigger Event: %s - Trigger Source: %s", triggerId,triggerHandler,triggerEvent,triggerSource)
 }
},

    bar: function() {
    }
};

function launchTestHelperFunction(){
var test = testHelpers.triggersInfo2()
Logger.log(test)
}

*/