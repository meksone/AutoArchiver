// funzioni di test per capire Underscore

// raggruppare array in base al messageID - sarà utile quando avrò creato la struttura per usare un "foglio operazioni" al posto del looping attuale
// WIP 06-10-2016

function TESTgroupByMessageId(){
  var array = [
    {
      id: 001,
      attachId: "attach1",
      folder: "folder1"
    },
    {
      id: 001,
      attachId: "attach2",
      folder: "folder1"
    },
     {
      id: 001,
      attachId: "attach3",
      folder: "folder1"
    },
     {
      id: 002,
      attachId: "002attach1",
      folder: "folder2"
     }
  ];
  
  var result = _.groupBy(array, "id");
  Logger.log(result)
}; // OK funziona

