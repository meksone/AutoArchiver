// https://mashe.hawksey.info/2012/09/google-app-script-scheduling-timed-triggers/
// esecuzione di una funzione in un orario specifico
// WIP 03/10/2016
 
function checkSchedule(schedule){ // FUNZIONA!!!
  var now = new Date();
  var formatted = Utilities.formatDate(now, Session.getScriptTimeZone(), "MM.dd.yyyy.HH.mm");
  var nowSplit = formatted.split(".");
  
  // in questi orari non deve girare MAI nulla, a parte il monthlycleanup
  // lo scheduler esclude già questi orari, ma lo lascio in quanto in futuro sarà possibile creare il proprio scheduler
  var alwaysSleepStart = new Date(nowSplit[0] +"/"+ 01 +"/"+ nowSplit[2] +" "+ "00:00");
  var alwaysSleepEnd = new Date(nowSplit[0] +"/"+ 01 +"/"+ nowSplit[2] +" "+ "00:20"); 
  if (now > alwaysSleepStart && now < alwaysSleepEnd){
    Logger.log("********** Cleanup time, nothing must run until 00:20!");
    var archivingOk = gRetry2(function(){return monthlyCleanUp()});
    if (archivingOk == false){
    Logger.log("********** Something went wrong with archiving");
    } 
      return false;
    }
  
  // se sono fuori dall'orario del monthlycleanup, allora eseguo lo scheduler
  for (var i in schedule){
    var start = new Date(schedule[i].start);
    var end = new Date(schedule[i].end);
    
    if (now > start && now < end){
      Logger.log("********** Working hours, I'm at your service");
      return true;
    } else {
      Logger.log("********** Sleeping time, see you later");
      return false;
    }
  }
}

/// helper per checkSchedule
function createSchedule(start,end){
  return {
    start: start,
    end: end
  };
}


// checkSchedule + createSchedule
function workOrSleep(){
  var now = new Date();
  var formatted = Utilities.formatDate(now, Session.getScriptTimeZone(), "MM.dd.yyyy.HH.mm");
  var nowSplit = formatted.split(".");
  Logger.log("******** this is the NON FORMATTED date:" + now);
  Logger.log("******** this is the formatted date:" + formatted);
  // start ed end possono essere presi dal configsheet o dalle userprops, ma per lo sheet occorre un update dello script con passaggio di versione
  var schedule = [];
  schedule.push(createSchedule(nowSplit[0] +"/"+ nowSplit[1] +"/"+ nowSplit[2] +" "+ "00:15",nowSplit[0] +"/"+ nowSplit[1] +"/"+ nowSplit[2] +" "+ "23:59")); // working time
  // per ora lo scheduler controlla solo il primo elemento dell'array...gli altri li ignora
  //schedule.push(createSchedule(nowSplit[0] +"/"+ nowSplit[1] +"/"+ nowSplit[2] +" "+ "14:00",nowSplit[0] +"/"+ nowSplit[1] +"/"+ nowSplit[2] +" "+ "19:00")); // working evening
  //schedule.push(createSchedule(nowSplit[0] +"/"+ nowSplit[1] +"/"+ nowSplit[2] +" "+ "21:00",nowSplit[0] +"/"+ nowSplit[1] +"/"+ nowSplit[2] +" "+ "23:00")); // post working
  //schedule.push(createSchedule(nowSplit[0] +"/"+ nowSplit[1] +"/"+ nowSplit[2] +" "+ "01:00",nowSplit[0] +"/"+ nowSplit[1] +"/"+ nowSplit[2] +" "+ "02:00")); // sleepwalking...
  //schedule.push(createSchedule(nowSplit[0] +"/"+ nowSplit[1] +"/"+ nowSplit[2] +" "+ "05:00",nowSplit[0] +"/"+ nowSplit[1] +"/"+ nowSplit[2] +" "+ "06:00")); // light sleep...
  
  
  var mustwork = checkSchedule(schedule)
  Logger.log("********** There's anything I must do? ...%s",mustwork)
  return mustwork;
}
