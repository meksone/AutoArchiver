/* ******************************* Advanced Services *******************************

 GMAIL API - per modificare in maniera precisa un singolo messaggio in un thread
 il problema nasce dal fatto che .addLabel funziona per thread interi e non per singoli messaggi all'interno del thread, quindi
 sono costretto ad usare le API
 http://stackoverflow.com/questions/30798530/gmailapp-add-label-to-specific-message-not-the-thread

* Modify the Labels a Message is associated with.
* Throws if unsuccessful.
* see https://developers.google.com/gmail/api/v1/reference/users/messages/modify
*
* @param  {String} userId           User's email address. The special value 'me'
*                                   can be used to indicate the authenticated user.
* @param  {String} messageId        ID of Message to modify.
* @param  {String[]} labelsToAdd    Array of Label names to add.
* @param  {String[]} labelsToRemove Array of Label names to remove.
*
* @returns {Object}                 Users.messages resource, see reference. 

modifyMessage('me', messageId, ['stack','overflow']);       // add two labels
modifyMessage('me', messageId, null, ['stack','overflow']); // remove two labels
*/

function modifyMessage(userId, messageId, labelsToAdd, labelsToRemove) {
  labelsToAdd = labelsToAdd || [];
  labelsToRemove = labelsToRemove || [];
  // see https://developers.google.com/gmail/api/v1/reference/users/messages/modify
  var url = 'https://www.googleapis.com/gmail/v1/users/${userId}/messages/${id}/modify'
  .replace("${userId}","me")
  .replace("${id}", messageId );
  var headers = {
    Authorization: 'Bearer ' + ScriptApp.getOAuthToken()
  };
  var addLabelIds = [];
  for (var i=0; i<labelsToAdd.length; i++) {
    addLabelIds[i] = getLabelId_( labelsToAdd[i] );
  }
  var removeLabelIds = [];
  for (var i=0; i<labelsToRemove.length; i++) {
    removeLabelIds[i] = getLabelId_( labelsToRemove[i], false );
  }
  var request = {
    'addLabelIds': addLabelIds,
    'removeLabelIds': removeLabelIds
  };
  var params = {
    method: "post",
    contentType: "application/json",
    headers: headers,
    payload: JSON.stringify(request),
    muteHttpExceptions: true
  };
  //var check = UrlFetchApp.getRequest(url, params); // for debugging
  var response = UrlFetchApp.fetch(url, params);
  
  var result = response.getResponseCode();
  if (result == '200') {  // OK
    return JSON.parse(response.getContentText());
  }
  else {
    // This is only needed when muteHttpExceptions == true
    var err = JSON.parse(response.getContentText());
    throw new Error( 'Error (' + result + ") " + err.error.message );
  }
}

/**
* Get the Label ID for the given LabelName. If Label isn't found, it will be created
* depending on the state of ok2Create.
* Throws if unsuccessful.
* See https://developers.google.com/gmail/api/v1/reference/users/messages/modify.
*
* @param {String}   labelName        Name of label to retrieve ID for.
* @param {Boolean}  ok2Create        (optional) Set true if a label should be created when not found.
*                                    Default is true.
*
* @returns {String}                  ID of Label, or null if not found or created.
*/
function getLabelId_( labelName, ok2Create ) {
  if (typeof ok2Create == 'undefined') ok2Create = true;
  
  var id = null;
  // see https://developers.google.com/gmail/api/v1/reference/users/labels/list
  var url = 'https://www.googleapis.com/gmail/v1/users/${userId}/labels'
  .replace("${userId}","me")  // The user's email address. The special value me can be used to indicate the authenticated user.
  var headers = {
    Authorization: 'Bearer ' + ScriptApp.getOAuthToken()
  };
  var params = {
    method: "get",
    contentType: "application/json",
    headers: headers,
    muteHttpExceptions: true
  };
  
  //var check = UrlFetchApp.getRequest(url, params); // for debugging
  var response = UrlFetchApp.fetch(url, params);
  
  var result = response.getResponseCode();
  if (result == '200') {  // OK
    var labels = JSON.parse(response.getContentText()).labels;
    var found = false;
    for (var i=0; i<labels.length & !found; i++) {
      if (labels[i].name == labelName) {
        found = true;
        id = labels[i].id;
      }
    }
    if (!found && ok2Create) {
      id = createLabel( labelName );
    }
    return id;
  }
  else {
    // This is only needed when muteHttpExceptions == true
    var err = JSON.parse(response.getContentText());
    throw new Error( 'Error (' + result + ") " + err.error.message );
  }
}

/**
* Create Label for given `labelName`.
* Throws if unsuccessful.
* See https://developers.google.com/gmail/api/v1/reference/users/messages/modify.
*
* @param {String}   labelName        Name of label to create
* @returns {String}                  ID of Label.
*/
function createLabel( labelName ) {
  var id = null;
  // see https://developers.google.com/gmail/api/v1/reference/users/labels/create
  var url = 'https://www.googleapis.com/gmail/v1/users/${userId}/labels'
  .replace("${userId}","me")  // The user's email address. The special value me can be used to indicate the authenticated user.
  var headers = {
    Authorization: 'Bearer ' + ScriptApp.getOAuthToken()
  };
  var request = {
    'name': labelName
  };
  var params = {
    method: "post",
    contentType: "application/json",
    headers: headers,
    payload: JSON.stringify(request),
    muteHttpExceptions: true
  };
  
  var check = UrlFetchApp.getRequest(url, params); // for debugging, era commentato
  var response = UrlFetchApp.fetch(url, params);
  
  var result = response.getResponseCode();
  if (result == '200') {  // OK
    var label = JSON.parse(response.getContentText());
    id = label.id;
    return id;
  }
  else {
    // This is only needed when muteHttpExceptions == true
    var err = JSON.parse(response.getContentText());
    throw new Error( 'Error (' + result + ") " + err.error.message );
  }
}


// rewrite della funzione GAPIlistMessages usando Advanced Services e non FetchUrl, che sarebbe poi l'approccio corretto.
// UCCAZZO, funziona... quante righe di codice inutile...

// anche questa funzione da eRoRRI: empty response, ed esce da Archiver saltando tutto già dalla fase di verifica delle query
function GAPIlistMessages2(userId, query) {
    var res = Gmail.Users.Messages.list(userId, {
      q: query,
      fields: "messages(id,payload/headers)" //fields: "messages/id"
      
    });
  Logger.log("---------- MessageIDs: " + res)
    return res;
}


// Funzione per ottenere il body del messaggio tramite Gmail API come dati strutturati
// Mi serve per trovare le etichette associate al singolo messaggio
// Trova tutte le etichette, anche quelle di sistema, e restituisce un'array
function GAPIgetMessageInfo(userId,messageid){
  //var res = Gmail.Users.Messages.get(userId='me', messageid, 'full');
  var res = Gmail.Users.Messages.get(userId, messageid, {
    //format: "raw",
    fields: "labelIds"
  });
  return res; // array
}


// Funzione per eliminare le etichette di sistema e ottenere solo le etichette utente
// va passata l'array ottenuta da GAPIgetMessageInfo
// Restituisce a sua volta un'altra array, filtrata
function GAPIGetOnlyUserLabels(labelIdArray){
  var labelNamesArray = [];
  for (var i=0; i<labelIdArray.length; i++) {
    if (labelIdArray[i].match(/Label_/g)){
      var labelName = Gmail.Users.Labels.get('me', labelIdArray[i])
      // filtrare solo le userlabels...
      labelNamesArray.push(labelName['name']);
    } else {
      // scarta tutte le labels che non iniziano per "Label_"... quindi quelle di sistema :)
    }
  }
  return labelNamesArray
}

// funzione di test per GAPIgetMessageInfo - e funziona, olè - DELETE
function TESTGAPIgetMessageInfo(){
  var userid = 'me';
  var messageid = "15843d2cbee6e02a"; // messaggio senza etichette
  var messageLabels = GAPIgetMessageInfo(userid,messageid);
  Logger.log(messageLabels);
  
}

// funzione di TEST per ottenere le label dell'utente di un messaggio
function TESTgetLabelz(){
var allLabels = GAPIgetMessageInfo("me","1583f4e290c975fd"); // array con tutte le labels
  var onlyUserLabels = GAPIGetOnlyUserLabels(allLabels.labelIds);
  var selectedLabel = [];
  for (var i = 0; i < onlyUserLabels.length; i++){     
  var wantedLabel = onlyUserLabels[i];
    if (wantedLabel.match(/@/g)){
    selectedLabel.push(wantedLabel)
    } else {
    // null
    }
    
  }
  Logger.log("end")
  

}