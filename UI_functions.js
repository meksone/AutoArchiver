// doGet per creazione interfaccia e funzioni legate all'interfaccia

// codice da usare in modalità semplice (no interfaccia admin e user)

function doGet() {
      return HtmlService
      .createTemplateFromFile('mainapp')
      .evaluate()
      .setSandboxMode(HtmlService.SandboxMode.IFRAME)
      .setTitle("AutoArchiver Web App");
}



/*
// codice con gestione interfaccia admin e user; da usare solo in ambiente di dominio
function doGetDomain() { //rimuovere domain per usarla al posto della doGet normale
  var adminconfig = JSONconfigFromSheet("admins","admins"); // 
  var currentUser = getEmail()
  for (var i=0, tot=adminconfig.admins.length; i<tot; i++) { // questo loop ha la lunghezza dell'array in cache
    var testing = adminconfig.admins[i].admins;
    if (testing == currentUser){
      Logger.log("Benvenuto Maestro");
      return HtmlService
      .createTemplateFromFile('index-admin') 
      .evaluate()
      .setSandboxMode(HtmlService.SandboxMode.IFRAME);
    } else {
      Logger.log("Nessun admin loggato, mostro interfaccia utente")
      return HtmlService
      .createTemplateFromFile('index-user')
      .evaluate()
      .setSandboxMode(HtmlService.SandboxMode.IFRAME);
    }
  }
}
*/

// funzione di test, ripresa dalla guida di GAS
function getEmail() {
  return Session.getEffectiveUser().getEmail();
}

// Per creare un output da un file HTML
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename)
  .getContent();
}

function passId(idname){
 return idname;
}

function noAction(){
return "hello"
}


 

function deleteAllProps(){
  var userProps = PropertiesService.getUserProperties();
  userProps.deleteAllProperties()
}

// funzione per caricare una userprop da servire poi all'HTML

function getgDocBody(key){
  var userProps = PropertiesService.getUserProperties();
  var logDocId = userProps.getProperty(key)
  var gDoc = DocumentApp.openById(logDocId); // ho il documento
var gDocBody = gDoc.getBody();
  var style = {};
  style[DocumentApp.Attribute.HORIZONTAL_ALIGNMENT] = DocumentApp.HorizontalAlignment.RIGHT;
  style[DocumentApp.Attribute.FONT_FAMILY] = 'Roboto';
  style[DocumentApp.Attribute.FONT_SIZE] = 12;
  var gDocStyled = gDocBody.setAttributes(style);
  var gDocBodyText = gDocBody.getText() // dovrei avere il body come stringa di testo
  return gDocBodyText; //plain text
}

//TEST! 04-10-2016
// http://stackoverflow.com/questions/30518585/refresh-a-div-or-whole-page-in-google-script-html-service
// non va
function getNewHtml(e) {
      var html = HtmlService
        .createTemplateFromFile('mainapp')
        .evaluate()
        .getContent()
      .setSandboxMode(HtmlService.SandboxMode.IFRAME)
      .setTitle("AutoArchiver Web App");
      return html;
    }

function configDone(){
  var isDone = setUpAA();
  if (isDone){
  return "<p>La configurazione è stata eseguita <strong> con successo </strong><br> Ora è possibile ricaricare la pagina per visualizzare la configurazione definitiva</p>"
  } else {
  return "Setup failed, see e-mail for details";
  }
}

