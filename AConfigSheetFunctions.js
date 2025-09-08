// Funzioni relative allo spreadsheet
// aggiungere funzioni per prendere config da interfaccia e popolare lo sheet
// legge il Foglio Google (sheet) e lo mette in una'array chiamata (propertysetname)
// la chiamata all'ID del Gsheet è hardcoded... è possibile spostarla come parametro e rendere la funzione più flessibile... 
function JSONconfigFromSheet(sheet,propertysetname){
  var data = {}
  var userProps = PropertiesService.getUserProperties(); // carico le UserProperties per poterle leggere dopo
  var id = userProps.getProperty("configId"); // prende l'iD dello sheet della config dalle userProperties...
  var ss = SpreadsheetApp.openById(id);
  //var result = data[sheet] = readData_(ss, sheet); // usando questo otterrei anche la  variabile "result" che contiene solo i dati senza l'intestazione "global"... lo tengo va
  data[propertysetname] = readData_(ss, sheet);
  return data
}

// Script originale qui
// http://pipetree.com/qmacro/blog/2013/10/sheetasjson-google-spreadsheet-data-as-json/
function readData_(ss, sheetname, properties) {
  try {
    if (typeof properties == "undefined") {
      properties = getHeaderRow_(ss, sheetname);
      properties = properties.map(function(p) { return p.replace(/\s+/g, '_'); });
    }
    var rows = getDataRows_(ss, sheetname);
    var data = [];
    for (var r = 0, l = rows.length; r < l; r++) {
      var row = rows[r];
      var record = {};
      for (var p in properties) {
        record[properties[p]] = convert_(row[p]);
      }
      data.push(record);
    }
    return data;
  } catch (e) {
    return null
  }
}

function convert_(value) {
  try {
    if (value === "true") return true;
    if (value === "false") return false;
    if(!value) return false;
    return value;
  } catch (e) {
    return null
  }
}

function getDataRows_(ss, sheetname) {
  try {
    var sh = ss.getSheetByName(sheetname);
//    var valoririga = sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).getValues();
//    Logger.log(valoririga)
    return sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).getValues();
  } catch (e) {
    return null
  }
}

function getHeaderRow_(ss, sheetname) {
  try {
    var sh = ss.getSheetByName(sheetname);
//    var valoriheaderriga = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
//    Logger.log(valoriheaderriga)
    return sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  } catch (e) {
    return null
  }
}

// cancella righe e colonne vuote e toglie tutta la formattazione
// http://stackoverflow.com/questions/26386492/deleting-all-empty-rows-in-a-google-spreadsheet
function delEmptyRowsCols(id){
  // l'ID non è più hardcoded, lo prende dalle UserProps :)
  // 1C72M5rQ4kUQ_jC8rxYFCFg5zldKDZb8sOzNcVap2l0A - master sheet
  // var userProps = PropertiesService.getUserProperties();
  // var id = userProps.getProperty("configId"); // il gsheet delle opzioni
  var sheet = "rules"; // selezionare il foglio
  var ss = SpreadsheetApp.openById(id);
  // pensare di modificare la funzione per poter pulire tutti i fogli in un colpo solo... for loop
  var shs = ss.getSheets() // array con tutti gli sheets
  
  //var sh = ss.getSheetByName(sheet);
  for (var i = 0, j = shs.length; i < j; i++){
    var ssname = shs[i].getName();
    var sh = ss.getSheetByName(ssname);
    
    var data = sh.getDataRange().getValues();
    var targetData = new Array(); // evitare questa sintassi
    for(n=0;n<data.length;++n){
      if(data[n].join().replace(/,/g,'')!=''){ targetData.push(data[n])};
      Logger.log(data[n].join().replace(/,/g,''))
    }
    sh.getDataRange().clear();
    sh.getRange(1,1,targetData.length,targetData[0].length).setValues(targetData);
    // ed infine rimuove le righe vuote in eccesso alla fine
    var maxRows = sh.getMaxRows(); 
    var lastRow = sh.getLastRow();
    if (maxRows-lastRow != 0){
      sh.deleteRows(lastRow+1, maxRows-lastRow);
    }
    // e anche le colonne vuote
    var maxColumns = sh.getMaxColumns(); 
    var lastColumn = sh.getLastColumn();
    if (maxColumns-lastColumn != 0){
      sh.deleteColumns(lastColumn+1, maxColumns-lastColumn);
    }
  }
}




/*
21-09-2016 - nuova funzione per archiviare i fogli di un Gsheet su base mensile
sheetID = id del foglio
arraynames = array dei nomi dei fogli sui quali intervenire

return TRUE no errori
return FALSE errori
*/
function splitSheets(sheetID,arraynames){
  // modalità operativa
  var copySheets = true; // copia i fogli indicati
  var cleanSheets = true; // pulisce i fogli indicati
  var checkFronzenRows = true; // controlla se ci sono righe bloccate e nel caso le sblocca
  var deleteRows = true; // cancella le righe vuote tranne le prime due
  var freezeFirstRow = true; // blocca di nuovo la prima riga di ogni foglio
  
  try{
    // creazione data e variabili collegate
    var d = new Date();
    var formatted = Utilities.formatDate(d, Session.getScriptTimeZone(), "yyyy/MM/dd/HH.mm.ss");
    var stringaSplit = formatted.split("/"); // 0 year 1 month 2 day 3 hour
    var actualYear = stringaSplit[0];
    var actualMonth = stringaSplit[1];
    var prevYear = actualYear-1;
    var prevMonth = actualMonth-1;
    prevMonth = pad(prevMonth);
    var ss = SpreadsheetApp.openById(sheetID); // apro il GoogleSheet
    var ssSheetNames = arraynames; // lista dei nomi fornita in array
    
    // se siamo a Gennaio, bisogna fare un pò di modifiche
    if (actualMonth == "01"){ // per fare test, mettere numero mese corrente
      actualYear = prevYear // uso l'anno precedente
      actualYear.toString();
      prevMonth = "12"; // uso il mese precedente
    }
    // Copia dei fogli esistenti
    if (copySheets == true){
      for (var i = 0, j = ssSheetNames.length; i < j; i++){
        var sheetname = ssSheetNames[i]; // i nomi dei fogli master
        var copySheets = ss.getSheetByName(sheetname).copyTo(ss).setName(actualYear + "-" + prevMonth + "_" + sheetname);
      }
      Logger.log("********** Fogli archiviati");
      
      if (actualMonth == "01"){ // per fare test, mettere numero mese corrente
        
      }
    }
    // Pulizia del contenuto delle righe
    if (cleanSheets == true){
      for (var i = 0, j = ssSheetNames.length; i < j; i++){
        var clear = ssSheetNames[i];
        var sheetToClear = ss.getSheetByName(clear);
        var numRows = sheetToClear.getLastRow();
        var numCols = sheetToClear.getLastColumn();
        sheetToClear.getRange(2,1,numRows,numCols).clear();
      }
      Logger.log("********** Fogli ripuliti");
    }
    // Controllo righe bloccate ed eventuale sblocco
    if (checkFronzenRows == true){  
      for (var i = 0, J = ssSheetNames.length; i < j; i++){
        var frozenSheetName = ssSheetNames[i];
        var unfrozeRow = ss.getSheetByName(frozenSheetName);
        var frozenRowNum = unfrozeRow.getFrozenRows();
        if (frozenRowNum == 0) {
          Logger.log("********** Nessuna riga bloccata nel foglio %s",frozenSheetName);
        } else {
          unfrozeRow.setFrozenRows(0); // sblocca tutto
          Logger.log("********** Riga sbloccata nel foglio %s",frozenSheetName);
        }
      }
    }
    // Rimozione righe in eccesso
    if (deleteRows == true){
      for (var i = 0, j = ssSheetNames.length; i < j; i++){
        var cleanSheet = ssSheetNames[i]
        var cleanSS = ss.getSheetByName(cleanSheet);
        // rimuove le righe vuote
        var maxRows = cleanSS.getMaxRows(); 
        var lastRow = cleanSS.getLastRow();
        if (maxRows-lastRow != 0){
          cleanSS.deleteRows(lastRow+2, maxRows-lastRow-1);
          Logger.log("********** Righe in eccesso rimosse");
        }
        
        // e anche le colonne vuote
        var maxColumns = cleanSS.getMaxColumns(); 
        var lastColumn = cleanSS.getLastColumn();
        if (maxColumns-lastColumn != 0){
          cleanSS.deleteColumns(lastColumn+1, maxColumns-lastColumn);
          Logger.log("********** Colonne in eccesso rimosse");
        }
      }
    }
    // Blocco della prima riga dopo la pulizia
    if (freezeFirstRow == true){
      for (var i = 0, j = ssSheetNames.length; i < j; i++){
        var SheetNameToFreeze = ssSheetNames[i];
        var freezeRow = ss.getSheetByName(SheetNameToFreeze);
        var freezeRowNum = freezeRow.getFrozenRows();
        if (freezeRowNum == 0) {
          Logger.log("********** Nessuna riga bloccata nel foglio %s, blocco la prima riga",SheetNameToFreeze);
          freezeRow.setFrozenRows(1); // blocca la prima riga 
        } else {
          
          Logger.log("********** Ci sono righe bloccate nel foglio %s",SheetNameToFreeze);
        }
      }
    }
    // ritorna il caso di Gennaio...
    if (actualMonth == "01"){
      Logger.log("********** Siamo a Gennaio, occorre archiviare!");
      // copio l'attuale Gsheet in un altro GSheet per archiviare il log annuale
      var destFolder = getOrCreateFolder(globalconfig.global[0].logfolder);
      var archived = DriveApp.getFileById(sheetID).makeCopy(actualYear + "_" + ss.getName(), destFolder);
      Logger.log("********** Foglio ExitCodes copiato");
      var archivedID = archived.getId();
      var archivedSS = SpreadsheetApp.openById(archivedID);
      for (var i = 0, j = ssSheetNames.length; i < j; i++){ // cancello i due fogli principali
        var archSheet = archivedSS.getSheetByName(ssSheetNames[i]);
        archivedSS.deleteSheet(archSheet);
      }
      Logger.log("********** Foglio ExitCodes archiviato e ripulito");
      // ora ritorno sullo sheet principale, cancello tutto e ripristino dal master
      Utilities.sleep(1000);
      var ssSheets = ss.getSheets(); // qui la variabile contiene TUTTI i fogli: i backup mensili e i due principali, per la pulizia di fine anno
      
      // riprendo il contenuto del master exit codes
      var ssMaster = SpreadsheetApp.openById(masterExitCodesId);
      var ssMasterSheets = ssMaster.getSheets(); // qui ho i due fogli master
      for (i = 0, j = ssMasterSheets.length; i < j; i++){
        var sheetToCopy = ssMasterSheets[i];
        var copiedSheet = sheetToCopy.copyTo(ss);
        copiedSheet.setName("temp_" + sheetToCopy.getName())
      }
      for (var i = 0, j = ssSheets.length; i < j; i++){
        var delSheet = ssSheets[i];
        ss.deleteSheet(delSheet)
      }
      Logger.log("********** Fogli ripresi dal master");
      
      // finisco col togliere "temp_" dai nomi dei nuovi sheets
      ssSheets = ss.getSheets(); // richiamo la stessa variabile di prima, ma adesso ha solo i due principali con "temp_" come prefisso
      for (i = 0, j = ssSheets.length; i < j; i++){
        var renameTempSheets = ssSheets[i].getName();
        var cleanName = renameTempSheets.replace("temp_","");
        ssSheets[i].setName(cleanName);
      }
      Logger.log("********** Fogli rinominati, foglio pronto");
    }
    return true //esecuzione terminata con successo
  }catch(e){
    Logger.log(e);
    return e // esecuzione con errori
  }
}

//http://stackoverflow.com/questions/21145080/moving-a-column-in-google-spreadsheet
// funzione per spostare una colonna...
// ssID = id del gsheet, sheetName = nome del foglio, colonna da spostare, dove spostarla (prima di)
//test sheet = 1ZdGpokNfxPbqreN_-HySiuy67-W_F1IIM7y3_HEqAWc

function TESTmoveColumn(){
  var ssID = "1ZdGpokNfxPbqreN_-HySiuy67-W_F1IIM7y3_HEqAWc"
  var sheetName = "exitcodes";
moveColumn(ssID,sheetName,2, 9)
moveColumn(ssID,sheetName,9, 8)
}

function moveColumn(ssID,sheetName,iniCol, finCol) {
  // iniCol - Column of interest. (Integer)
  // finCol - Column where you move your initial column in front of.(Integer)
  // Ex:
  // Col A  B  C  D  E
  //     1  2  3  4  5
  //     6  7  8  9  10
  //     11    12 13 14
  // Want to move Column B in between Column D/E.
  // moveColumn(2,4);
  // Col A  B  C  D  E
  //     1  3  4  2  5
  //     6  8  9  7  10
  //     11 12 13    14
  var ss = SpreadsheetApp.openById(ssID);
  var sh = ss.getSheetByName(sheetName);
  var lRow = sh.getMaxRows();
  if (finCol > iniCol) {
    sh.insertColumnAfter(finCol);
    var iniRange = sh.getRange(1, iniCol, lRow);
    var finRange = sh.getRange(1, finCol+1, lRow);
    iniRange.copyTo(finRange);
    sh.deleteColumn(iniCol);
  }
  else {
    sh.insertColumnAfter(finCol);
    var iniRange = sh.getRange(1, iniCol+1 , lRow);
    var finRange = sh.getRange(1, finCol+1, lRow);
    iniRange.copyTo(finRange);
    sh.deleteColumn(iniCol + 1);    
  }
}

function TESTswapColumn(){
    var ssID = "1ZdGpokNfxPbqreN_-HySiuy67-W_F1IIM7y3_HEqAWc"
  var sheetName = "exitcodes";
swapColumn(ssID,sheetName,9, 1) 


}


function swapColumn(ssID,sheetName,iniCol, finCol) {
  var ss = SpreadsheetApp.openById(ssID);
  var sh = ss.getSheetByName(sheetName);
  var lRow = sh.getMaxRows();
  
    if (finCol > iniCol) {
  sh.insertColumnAfter(finCol);
  var iniRange = sh.getRange(1, iniCol, lRow);
  var finRange = sh.getRange(1, finCol+1, lRow);
  iniRange.copyTo(finRange)
  
  iniRange = sh.getRange(1, finCol, lRow);
  finRange = sh.getRange(1, iniCol, lRow);
  iniRange.copyTo(finRange)
  sh.deleteColumn(finCol)
    } else {
      
        sh.insertColumnAfter(finCol);
  var iniRange = sh.getRange(1, iniCol+1, lRow);
  var finRange = sh.getRange(1, finCol+1, lRow);
  iniRange.copyTo(finRange)
  
  iniRange = sh.getRange(1, finCol, lRow);
  finRange = sh.getRange(1, iniCol+1, lRow);
  iniRange.copyTo(finRange)
  sh.deleteColumn(finCol)
      
      //non lo so ancora
    
    }
  
  }
