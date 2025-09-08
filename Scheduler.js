// https://mashe.hawksey.info/2012/09/google-app-script-scheduling-timed-triggers/
// esecuzione di una funzione in un orario specifico
// WIP 03/10/2016
// Refactored for V8 runtime compatibility.
 
function checkSchedule(schedule){
  var now = new Date();
  
  // Monthly cleanup check: first day of the month, between 00:00 and 00:20.
  if (now.getDate() === 1 && now.getHours() === 0 && now.getMinutes() < 20) {
    Logger.log("********** Cleanup time, nothing must run until 00:20!");
    var archivingOk = gRetry2(function(){return monthlyCleanUp()});
    if (archivingOk == false){
      Logger.log("********** Something went wrong with archiving");
    } 
    return false;
  }
  
  // Check if the current time is within any of the scheduled working hours.
  for (var i = 0; i < schedule.length; i++) {
    var start = schedule[i].start;
    var end = schedule[i].end;
    
    if (now >= start && now < end){
      Logger.log("********** Working hours, I'm at your service");
      return true;
    }
  }

  Logger.log("********** Sleeping time, see you later");
  return false;
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

  // The schedule is for the current day.
  // The configuration for start and end times could be moved to User Properties or a configuration sheet.
  var schedule = [];

  // Working time for today from 00:15 to 23:59
  var workStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 15, 0);
  var workEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 0);

  schedule.push(createSchedule(workStart, workEnd));
  
  // The original code had other schedules commented out. If they are needed, they can be added here in the same way.
  // For example:
  // var eveningStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 0, 0);
  // var eveningEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 19, 0, 0);
  // schedule.push(createSchedule(eveningStart, eveningEnd));
  
  var mustwork = checkSchedule(schedule)
  Logger.log("********** There's anything I must do? ...%s", mustwork)
  return mustwork;
}
