/* 
https://gist.github.com/peterherrmann/2700284

Examples:
Calls an anonymous function that concatenates a greeting with the current Apps user's email
var example1 = GASRetry.call(function(){return "Hello, " + Session.getActiveUser().getEmail();});
Calls an existing function
var example2 = GASRetry.call(myFunction);
Calls an anonymous function that calls an existing function with an argument
var example3 = GASRetry.call(function(){myFunction("something")});
Calls an anonymous function that invokes DocsList.setTrashed on myFile and logs retries with the Logger.log function.
var example4 = GASRetry.call(function(){myFile.setTrashed(true)}, Logger.log);

@param {Function} func The anonymous or named function to call.
@param {Function} optLoggerFunction Optionally, you can pass a function that will be used to log 

to in the case of a retry. For example, Logger.log (no parentheses) will work.
@return {*} The value returned by the called function.

*/

// funzione modificata, i retry sono 4, con intervalli da 1,2,4,8, per un massimo di 15 secondi di delay
// esempio per la funzione addCustomProperty, che restituisce spesso errore alla riga 248, ovvero alla chiamata Drive.Properties.insert(property, fileId);
// come devo scrivere la cosa? forse così: gRetry(function(){myFile.setTrashed(true)}, Logger.log);
// NOTA! forse Logger.log lo devo mettere fra virgolette...NO!

// NON USARE! USARE GRETRY2!

// rewrite della funzione per rendere logger.log NON OPZIONALE (e risolvere in modo becero i problemi, i suppose)
// Se la funzione da richiamare deve restituire un valore, usare funzione anonima + return, così gRetry2(function(){ return myFunction(params)});
function gRetry2(func) {
  var funcname = func.toString();
  for (var n=0; n<5; n++) {
    try {
        return func();
    } catch(e) {
      Logger.log("gRetry attempt n " + n + " - The function " + funcname + " returns the error: " + e)
      if (n == 4) {
        throw e;
      } 
      Utilities.sleep((Math.pow(2,n)*1000) + (Math.round(Math.random() * 1000)));
    }    
  }
}