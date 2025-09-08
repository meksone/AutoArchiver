// rewrite della funzione
// utilizzo di adv services per cercare le email (no thread, smessaggi singoli)
// switch case per determinare se spedire zip in  allegato (attach < 25MB) o links di drive (attach > 25MB)
// DAJE! inizio lavori 18-03-2016! 
// implemento anche il tempo massimo di esecuzione... attenzione: se la funzione viene però richiamata da gmail2gdrive, allora dovrei toglierlo... ragionarci

// attenzione che questa funzione non utilizza il processedLabel per scartare i messaggi, ma alla fine dell'elaborazione toglie l'etichetta Zip

function SendZipsOrLinks() { // Salva le email in Zip e quindi restituisce una mail all'utente con gli allegati in Zip da inoltrare :) - o magari i link di Drive ;D
 setGlobalOptions(); //imposta le opzioni globali - anche Archiver la richiama... si può centralizzare? si, se sposto la chiamata a questa funzione in gmail2gdrive
 Logger.log("function SendZips starting"); // tradurre tutte le stringhe del log...
 var scriptOpts = PropertiesService.getScriptProperties(); // idem come sopra
  
 // Variabili globali e varie
 var baseFolder = scriptOpts.getProperty("zipfolder");

    // qui ottengo la data di esecuzione dello script... mi serve dopo per il folder dove mettere gli zip
    var d = new Date();
	var formatted = Utilities.formatDate(d, Session.getScriptTimeZone(), "yyyy.MM.dd");
    var today = formatted.toString();
    
  
  
 var temp = scriptOpts.getProperty("tempzipfolder"); // forse lo cambio mettendo un folder basato du day-time dell'esecuzione... è proprio qui sopra!
 var procLabel = scriptOpts.getProperty("processedLabel"); // <--- uguale allo script principale
 var ziplogfolder = scriptOpts.getProperty("ziplogfolder");
 var zipLabel = scriptOpts.getProperty("ziplabel");
 var sleepTime = scriptOpts.getProperty("sleepTime");
 var lang = scriptOpts.getProperty("language");
 var gSearchZip = "label:" + zipLabel; // imposto la chiave di ricerca
  // variabili di lavoro impostate
 
 // check MAX exec time START
 var end, start;
 start = new Date;
 // check MAX exec time START

 // nuova funzione usando GAPI per la ricerca - restituisce array con ID 
 var msgZiparray = GAPIlistMessages('me', gSearchZip); // ritorna un'array con gli ID delle e-mail da zippare - Gmail API!  
 Logger.log(msgZiparray); // ecco gli ID
  
  // ora, ho gli ID e devo decidere se creare uno zip da allegare o un link di drive (> 25MB)
  var totals = checkSizeByID(msgZiparray); // e qui dovrei avere le dimensioni  e il conteggio degli allegati
  var howmanymsg = msgZiparray.messages.length;
  var howmanyattach = totals.totalattach;
  var totalsize = totals.totalsize;
  Logger.log("ho trovato " + howmanymsg + " messaggi"); // ed ecco quante email
  Logger.log("con la bellezza di " + howmanyattach + " allegati"); // ecco quanti allegati in totale
  Logger.log("con un totale di" + totalsize + "MB"); // ecco le dimensioni di tutto
  // bene , ho tutto ciò che mi serve per procedere :)
  
  var doZip = (howmanymsg > 0 && totalsize < 25); // True == zip, false == link
  var userEmail = Session.getActiveUser(); // IMPORTANTE! da qui prende l'utente che sta facendo girare lo script
  // se lo script è installato per utente, non serve a molto... se invece è centralizzato, serve ancora meno... valutare se usare variabili prese dalla mail originale
 
 
// non ricordo che logica ho usato qui... se lo script gira e non ci sono email da processare da errore (allegato troppo grande)...
 switch (doZip) {

  case false: // magari, se scatta questo case, far partire la procedura che salva in Drive invece di quella che restituisce l'email con gli zip ;)
   Logger.log("le dimensioni superano i 25 MB: non posso creare l'e-email");
   var htmlAlert = "";
   htmlAlert += "Dimensione degli allegati: " + totalSize + " Megabytes<br />";
   htmlAlert += "<hr />";
   htmlAlert += "Si consiglia di inviare gli allegati mediante link a Google Drive <br />";
   MailApp.sendEmail({
    to: userEmail,
    subject: "Attenzione, dimensioni allegati eccessive per una e-mail",
    htmlBody: htmlAlert,
   });
   break;
     
         
    case true: // dimensioni sotto i 25, creo gli zip da restituire come allegati all'email all'utente.
          try { // USO NUOVA funzione search Gmail API --- reimplementare il try catch
    for (var IDIdx = 0; IDIdx < msgZiparray.messages.length; IDIdx++) { // elaborazione ID messaggi
     var newmsgZipID = msgZiparray.messages[IDIdx];
     var uniqueZipID = newmsgZipID.id;
     end = new Date; // per il controllo del tempo massimo di esecuzione...
     var runTime = (end.getTime() - start.getTime()) / 1E3; // per il controllo del tempo massimo di esecuzione
     // popolo subito le variabili che mi servono dal singolo messaggio
     var message = GmailApp.getMessageById(uniqueZipID); // e finalmente ho la stessa condizione del vecchio loop
     var newZipFolder = getOrCreateFolder(temp); // crea folder temporaneo per l'elaborazione dello zip
     var messageId = message.getId();
     var messageDate = Utilities.formatDate(message.getDate(), Session.getScriptTimeZone(), "dd.MM.yyyy-HH.mm.ss");
     var messageFrom = message.getFrom();
     var messageTo = message.getTo();
     var messageCC = message.getCc();
     var messageSubject = message.getSubject();
     var messageBody = message.getBody();
     var messageAttachments = message.getAttachments();
     var newFolderName = messageDate + "_" + clean(messageSubject); // Create the new folder to contain the message
      
      //var composeDailyZipFolder = baseFolder + "/" + today; // non serve: togliere
	//var dailyZipFolder = getOrCreateFolder(composeDailyZipFolder); 
	//ArchiveLogFolder.createFile(ArchiverRunOn + ".txt", getArchiverLog, "text/plain");
	
      
      
     var completePath = baseFolder + "/" + today + "/" + newFolderName; // variabile per creare tutto il path - NUOVA
     var newFolder = getOrCreateFolder(completePath);
      
      Logger.log("-------------------- Tutte le e-mail zippate verranno salvate in " + completePath);
     
     // qui estraggo i dati che mi servono per costruire il PDF del messaggio
     var html = ""; // Message formatting - header and body part
     var attachments = ""; // per la lista allegati del messaggio in PDF - versione apertura in locale
     var attachmentsForDrive = ""; // per la lista allegati del messaggio in PDF - versione apertura in Drive - WIP
     
     html += "Data: " + messageDate + "<br />";
     html += "Da: " + messageFrom + "<br />";
     html += "A: " + messageTo + "<br />";
     html += "CC: " + messageCC + "<br />";
     html += "Oggetto: " + messageSubject + "<br />";
     html += "<hr />";
     html += messageBody.replace(/<img[^>]*>/g, ""); //remove all inline images
     html += "<hr />";

     for (var i = 0; i < messageAttachments.length; i++) { // salvo allegati in AutoArchiver/Zip/DAY-TIME/DATA_SUBJECT-EMAIL
      var attachmentName = messageAttachments[i].getName();
      var attachmentContentType = messageAttachments[i].getContentType();
      var attachmentBlob = messageAttachments[i].copyBlob();
      newFolder.createFile(attachmentBlob);
      //attachments += "<li><a href='" + "file:///" + messageAttachments[i].getName() + "'>" + messageAttachments[i].getName() + "</a></li>";
      // questa non l faccio popolare da qui, ma dopo, in una sola passata in modo da fare in un colpo la versione locale + drive
     }
      // e qui ho finito di estrarre gli allegati in AutoArchiver/Zip/DAY-TIME/DATA_SUBJECT-EMAIL
      
      var fileIterator = newFolder.getFiles(); // ottengo un iterator con la lista di tutti i files!!! ecco perchè ero contrariato!
      var fileBlob = []; //blob vuoto da popolare con l'iteratore
     while (fileIterator.hasNext()) {
       var thisFile = fileIterator.next();
       var thisFileName = thisFile.getName();
      fileBlob.push(thisFile.getBlob());
      attachmentsForDrive += "<li><a href='" + thisFile.getUrl() + "'>" + thisFileName + "</a></li>";
      attachments += "<li><a href='" + "file:///" + thisFileName + "'>" + thisFileName + "</a></li>";
     } // ed ora il blob è popolato! mi serve per passare tutto alla prossima funzione e creare lo zippone globale del messaggio
      

     //var footer = "<strong>Allegati:</strong><ul>"; // Brand new - enumerate files in folder - for Attachments list NON USATA???
     // creo un secondo html per la versione con i link di drive
     var htmlForDrive = html;
      
      // html completo per pdf locale
      html += attachments + "</ul>"; // New message formatting - footer part
      
      // html completo per pdf da drive
      htmlForDrive += attachmentsForDrive + "</ul>"; //
     
     var htmlBodyFile = newFolder.createFile('body.html', html, "text/html"); // creo HTML per PDF link locali
     var htmlBodyFileForDrive = newFolder.createFile('bodyForDrive.html', htmlForDrive, "text/html"); // // creo HTML per PDF link Drive
     var pdfBlob = htmlBodyFile.getAs('application/pdf'); // locali
     var pdfBlobForDrive = htmlBodyFileForDrive.getAs('application/pdf'); //drive
      

     pdfBlob.setName("Messaggio - " + newFolderName + ".pdf");
            // provo a pushare il pdfBlob dentro fileBlob, così lo piazzo nello zippone - SUPERWIP!!! e FUNZIONA!
            fileBlob.push(pdfBlob); // questo lo pusho nella var con i blob per lo zippone
     pdfBlobForDrive.setName("Messaggio - " + newFolderName + ".pdf");
     newFolder.createFile(pdfBlobForDrive); // questo lo salvo in drive come PDF; olè!
      
      // e quindi cancello i file HTML
     var htmlBodyFileID = htmlBodyFile.getId(); // mi serve l'ID per poter cancellare il file con Drive API...
     var htmlBodyFileIDForDrive = htmlBodyFileForDrive.getId(); // mi serve l'ID per poter cancellare il file con Drive API...
     Drive.Files.remove(htmlBodyFileID); // Drive API, questo file è completamente cancellato!
     Drive.Files.remove(htmlBodyFileIDForDrive); // Drive API, questo file è completamente cancellato!
     //var fileIterator = newFolder.getFiles(); // ottengo un iterator con la lista di tutti i files!!! ecco perchè ero contrariato!
      
      
            
     /*var fileBlob = []; //blob vuoto da popolare con l'iteratore
     while (fileIterator.hasNext()) {
      fileBlob.push(fileIterator.next().getBlob())
      attachmentsForDrive += "<li><a href='" + fileIterator.next().getUrl() + "'>"
     }*/ // ed ora il blob è popolato! mi serve per passare tutto alla prossima funzione e creare lo zippone globale del messaggio

     var zipInTemp = Utilities.zip(fileBlob, newFolderName + ".zip"); // proprio qui, lo zippone
     newZipFolder.createFile(zipInTemp); // crea lo zip dentro il folder TEMP 
     var newFolderID = newFolder.getId(); 
     //Drive.Files.remove(newFolderID); // Drive API - e quindi cancella il folder  dell'email elaborata MA ANCHE NO!!! l'ho commentato
     //Logger.log("cartella " + newFolder.getName() + " cancellata");
    //}
 // fino a qui debug direi OK
    modifyMessage('me', messageId, [procLabel], [zipLabel]); // aggiunge etichetta processate e toglie etichetta - con GMAIl API
   }

   var zipHtml = ""; // elenca gli zip e crea l'email da inviare
   zipHtml += "Ecco di seguito la lista delle e-mail in allegato:<br />";
   zipHtml += "<hr />";

   var zipList = "<ul>";
   var putAttach = [];
   var zipFolder = getOrCreateFolder(temp).getFiles(); // ...e prendo tutti i file nel folder Temp
   while (zipFolder.hasNext()) { // e qui li itero...
     zipobj = zipFolder.next();
    zipList += "<li>" + zipobj.getName() + "</li>";
    putAttach.push(zipobj.getBlob());
   }
   zipHtml += zipList + "</ul>";
   zipHtml += "<br />";
   zipHtml += "Ognuno dei file allegati in formato .zip contiene:<br />";
   zipHtml += "<ul>";
   zipHtml += "<li>il messaggio originale dell'e-mail in formato PDF;</li>";
   zipHtml += "<li>tutti gli allegati contenuti nel messaggio originale</li>";
   zipHtml += "</ul>"; // New message formatting - footer part

   // get all the attachments and put directly in email
   /*var getAttach = getOrCreateFolder(temp).getFiles(); // ridondante! sostituita con zipFolder... ce n'era un'altra da queste parti...
   var putAttach = [];
   while (getAttach.hasNext()) {
    putAttach.push(getAttach.next().getBlob())
   }*/

   MailApp.sendEmail({
    to: userEmail,
    subject: "Lista Allegati",
    htmlBody: zipHtml,
    attachments: putAttach,
   });

   // rimuove gli zip nella cartella temp in quanto adesso sono in allegato all'e-mail
   var tempID = getOrCreateFolder(temp).getId();
   Drive.Files.remove(tempID); // magico DRIVE API, cancella tutto senza lasciar traccia ;)
   Logger.log("cartella " + temp + " cancellata!");
   SaveLog(ziplogfolder);
   
    } catch (e) {
    Logger.log(e);
    } //fine del try catch - e non so se è utile o meno,  e soprattutto il log lo posso vedere SOLO se mi sbrigo a verificare 
   break;

  default:
   Logger.log("default");
 }
}