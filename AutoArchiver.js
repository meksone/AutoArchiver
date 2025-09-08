// Global variables
// Quando l'utente non ha eseguito il setup (alreadySetup != yes) non carica le config di base;
// Quando alreadySetup == yes, allora vengono caricate nel global (this.)
  var _ = Underscore.load();


/************************ master config files*********************/
var masterConfigId = "1Zz8azKqgmcxzrGzb10rxvvM33EcotaCDgMdQDYBMokE";
var masterExitCodesId = "1TFa4OZeimAYRJYMdCL6Fu-9omaiU5SNy_IUx697i8n4";
/************************ master config files *********************/

var userProps = PropertiesService.getUserProperties();
if (userProps.getProperty("alreadySetup") == "yes"){ // carica le globali solo se se è stato eseguito il primo setup ;)
  var scriptVersion = "0.22c";
  var scriptBuild = "UT24102016";
  userProps.setProperty("scriptVersion",scriptVersion); // IMPORTANTE! Aggiornare QUI e nello sheet Global - quando si fa il salto di versione, ovviamente, altrimenti triggera un casino di roba!
  userProps.setProperty("scriptBuild",scriptBuild); // la build non viene controllata - è utile per riconoscere chi usa una DEV e chi usa una EXEC ;)
  
  // Controllo della versione; ritorna NULL se non esiste il foglio "version" nella config dell'utente (vecchia config)
  var version = JSONconfigFromSheet("version","version");
  var exitcodesSheetId = userProps.getProperty("exitCodesId"); // ID dello SS exitcodes in userprops
  
  // questa routine gira con la stessa frequenza di AA - ovvero si autocorregge in caso di errori :)  
  if (version.version == null) { // foglio version mancante < v0.22b
    Logger.log("********** Update configurazione per versione inferiore a 0.22b");
    updateConfig();
  } else if (version.version[0].version != scriptVersion) { // foglio presente, versione su sheet != da userprops
    Logger.log("********** Update configurazione per update versione");
    updateConfig(); // la commento per evitare casini, quando farò un update la decommenterò e terrò monitorata la situazione
  } else {
    Logger.log("********** Nessun update, versione aggiornata");
  }
  
  /******************* blocco config ******************/
  var globalconfig = JSONconfigFromSheet("global","global"); // carico il foglio global e creo l'array global
  var lang = globalconfig.global[0].lang;   // carico la lingua, ita o eng
  switch (lang) { // config ITA
    case "ita":
      var localized = JSONconfigFromSheet("ita","log"); // stringhe del logger
      var months = JSONconfigFromSheet("mesi","months"); // stringhe per i mesi
      months = months.months[0]; // riduco di un livello l'array
      break;
    case "eng": // config ENG
      var localized = JSONconfigFromSheet("eng","log"); // stringhe del logger
      var months = JSONconfigFromSheet("months","months"); // stringhe per i mesi
      months = months.months[0]; // riduco di un livello l'array
      break;
  }
  
  // carico le rules, indipendentemente dalla lingua
  var config = JSONconfigFromSheet("rules","rules"); // prende la configurazione di AutoArchiver
  var TESTconfig = JSONconfigFromSheet("rules_TEST","rules"); // prende la configurazione di AutoArchiver
} // fine alreadysetup
// fine Global Variables - questo blocco gira al di fuori di qualsiasi funzione e quindi popola il global - occhio al polluting!


function Archiver(){
  // Archiver è diventato un contenitore governato da uno scheduler che decide cosa lanciare e come;
  // Per ora, c'è solo AA-mail, ma in futuro ci sarà anche SendZip e probabilmente altro...
  // INSERIRE prima del lancio di aa-mail un'altro check per identificare se è il primo del mese, mezzanotte, in modo da far girare subito l'archiviazione mensile
  
  /*Modalità UT*/
  var UT = true;
  
  /* ******************AA-mail + logging + update runs + achievements ********************* */
  if (workOrSleep()){ // se è il primo del mese, parte anche monthlyCleanup, quindi restituisce false fino alle 00:20
  var aamailResult = aamail(); // restituisce un'array ASSOCIATIVA con gli exitCodes...
  var exitCodesArray = extractValues(aamailResult); // da array ASSOCIATIVA ad array con SOLO VALORI
  try { // Logging ExitCodes + UT
    var SSexitcodes = SpreadsheetApp.openById(exitcodesSheetId);
    var SSexitSheet = SSexitcodes.getSheetByName("exitcodes");
    SSexitSheet.appendRow(exitCodesArray);
    // UT
    if (UT){
    uT("Archiver",aamailResult);
    }
    
  } catch (e) {
    Logger.log("********** ExitCodes Error: " + e)
  } // fine logging exitcodes + UT
    
  if (aamailResult.runtime > 0){ // Update numero di esecuzioni = runtime > 0 = +1; runs = null (ovvero: primissima esecuzione) = 1
    aaUpdateRuns();
  }
  AAachievement(); // Controllo numero esecuzioni - ogni 500 esecuzioni parte e-mail di achievements :)
  }
  /* ******************AA-mail + logging + update runs + achievements ********************* */
  
  /* Lista degli exitCodes in uscita da aa-mail - l'ordine deve essere identico a questa lista e deve essere identico in aa-mail
  var aaid = aamailResult.runid;
  var aarunby = aamailResult.runby;
  var aastart = aamailResult.start;
  var aaend = aamailResult.end;
  var aarules = aamailResult.numrules;
  var aaruntime = aamailResult.runtime; // numero
  var aaoperations = aamailResult.operations; // BOOLEAN
  var aamessagesid = aamailResult.messageids;
  var aamessages = aamailResult.messages;
  var aaattachments = aamailResult.attachments;
  var aalinkids = aamailResult.linkids;
  var aaerrorcode = aamailResult.errorcode; // 0 = no errors >0 = errors!
  var aatimeout = aamailResult.timeout;
  var aamboxstatus = aamailResult.mboxstatus;
  var aaAPIcount = aamailResult.gapicount;
  */
  
} // fine Archiver