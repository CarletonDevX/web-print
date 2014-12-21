define(['jquery', 'app/printers', 'spin', 'debounce'], function ($, Printers, spin) {  

/******************************
  Request helpers
 ******************************/

//GET from the print server
var getRequest = function (url, data, successHandler) {
  $.ajax({
    type: 'GET',
    url: 'https://print.ads.carleton.edu:9192'+url,
    data: data,
    xhrFields: {withCredentials: true},
    success: successHandler,
    error: function () {console.log('error in get')}
  });
}

//POST to the print server
var postRequest = function (url, data, successHandler) {
  $.ajax({
    type: 'POST',
    url: 'https://print.ads.carleton.edu:9192'+url,
    data: data,
    xhrFields: {withCredentials: true},
    success: successHandler,
    error: function () {console.log('error in post')}
  });
};

//UPLOAD a file to the server
var uploadRequest = function (url, data, successHandler) {
  $.ajax({
  url: 'https://print.ads.carleton.edu:9192'+url,
  type: 'POST',
  xhr:  function() {  // Custom XMLHttpRequest
            var myXhr = $.ajaxSettings.xhr();
            if(myXhr.upload){ // Check if upload property exists
                myXhr.upload.addEventListener('progress',function () {}, false); // For handling the progress of the upload
            }
            return myXhr;
        },
  data: data.file,
  success: successHandler,
  error: function (e) {console.log(e);},
  cache: false,
  contentType: false,
  processData: false,
  });
}

var loginData = function (user, pass) {
  return {
    'service': 'direct/1/Home/$Form$0',
    'sp': 'S0',
    'Form0': '$Hidden$0,$Hidden$1,inputUsername,inputPassword,$PropertySelection,$Submit$0',
    '$Hidden$0': 'true',
    '$Hidden$1': 'X',
    'inputUsername': user,
    'inputPassword': pass,
    '$PropertySelection': 'en',
    '$Submit$0': 'Log in'
  }
}

/******************************
  Request payloads
 ******************************/

web_print_payload = {
  'service': 'page/UserWebPrint'
}

var select_printer_payload = {
  'service': 'direct/1/UserWebPrintSelectPrinter/$Form',
  'sp': 'S0',
  'Form0': '$Hidden,$Hidden$0,$TextField,$Submit,$RadioGroup,$Submit$0,$Submit$1',
  '$Hidden': '',
  '$Hidden$0': '',
  '$TextField': '',
  '$RadioGroup': '0',
  '$Submit$1': '2. Print Options and Account Selection »'
};

var print_options_payload = {
  'service': 'direct/1/UserWebPrintOptionsAndAccountSelection/$Form',
  'sp': 'S0',
  'Form0': 'copies,$RadioGroup,$TextField$0,$Submit,$Submit$0',
  'copies': '1',
  '$RadioGroup': '0',
  '$Submit': '3. Upload Documents »'
};

var upload_file_payload = {
  'service': 'direct/1/UserWebPrintUpload/$Form$0',
  'sp': 'S1',
  'Form1': ''
};



/******************************
  Requests
 ******************************/

// Begin session by accessing login page
var connectToServer = function () {
  getRequest('/app', {}, function () {
    stateReady();
  });
};

// Log in with credentials
var attemptLogin = function (user, pass) {
  stateBusy();
  postRequest('/app', loginData(user, pass), function (response) {
    var foot = response.substring(response.length - 500);
    if (foot.indexOf('Invalid username or password') < 0
      && foot.indexOf('You must enter a value for') < 0) {
      storeLoginInfo(user, pass);
      setInfoFromResponse(response);
      navigateToPage();
    } else {
      stateDenied();
    }
  });
}

var navigateToPage = function () {
  // "Web Print"
  getRequest('/app?service=page/UserWebPrint', web_print_payload, function (response) {
    //"Submit Job"
    getRequest('/app?service=action/1/UserWebPrint/0/$ActionLink', {}, function (response) {
        checkPrinterInfo();
        stateLogin();
    });
  });
}

var startPrint = function (data) {
  printMessage("Starting job...");
  stateBusy();
  if (localStorage.getItem(data.printer.split(" ")[0]) == null) {
    storePrinterInfo(1, function () {
      findPrinter(data, localStorage.getItem(data.printer.split(" ")[0]));
    });
  } else {
    findPrinter(data, localStorage.getItem(data.printer.split(" ")[0]));
  }
}

// Navigate to correct page and find radio button
var findPrinter = function (data, page) {
  printMessage("Finding printer...");
  var url = '/app?service=direct/1/UserWebPrintSelectPrinter/table.tablePages.linkPage&sp=AUserWebPrintSelectPrinter%2Ftable.tableView&sp=' + page;
  getRequest(url, {}, function (response) {
    var re = new RegExp("value=\"([0-9]+)\" .*\r" + data.printer.replace("\\", "\\\\"));
    var select = response.match(re);
    if (select != null) {
      printMessage("Printer found...");
      submitSelection(data, select[1]);
    } else {
      printError("Printer not found.");
      stateLogin();
    }
  });
}

// Submit printer selection
var submitSelection = function (data, select) {
  var newpayload = select_printer_payload;
  newpayload['$RadioGroup'] = select;
  postRequest('/app', newpayload, function (response) {
    submitOptions(data, select);
  });
}


// Submit print options and account selection - doesn't yet regard data.options
var submitOptions = function (data, select) {
  var newpayload = print_options_payload;
  newpayload['$RadioGroup'] = select;
  newpayload['copies'] = data.copies;
  postRequest('/app', newpayload, function (response) {
    //Pulling out UID for use in the next request
    var re = new RegExp("uploadUID = \'([0-9]+)\'");
    var uploadUID = response.match(re)[1];
    uploadFile(data, uploadUID);
  });
}

// Upload!
var uploadFile = function (data, uploadUID) {
  var url = '/upload/'+ uploadUID;
  uploadRequest(url, data, function(response) {
    postRequest('/app', upload_file_payload, function(response) {
      if ($(".printer-release").is(':checked')){
        attemptRelease(data, 0, parseInt(data.copies));
      } else {
        finishPrint();
      }
    });
  });
}

// Repeatedly tries to release files from queue
var attemptRelease = function (data, attempt, copies) {
  if (copies == 0) {
    finishPrint(data);
  } else if (attempt > 20) {
    printError("Job did not print.");
    stateLogin();
  } else {
    printMessage("Releasing page " + copies + "...");
    checkForRelease(function (response) {
      var lines = response.split("\n");
      var url = null;
      for (i = 0; i < lines.length; i++) {
        if (lines[i].indexOf('UserReleaseJobs/$ReleaseStationJobs.release') > -1) {
          url = lines[i];
        }
      }
      if (url != null){
        var hrefs = [];
        var words = url.split(" ");
        //Write a regex for this..?
        for (i = 0; i < words.length; i++) {
          if (words[i].indexOf('href') > -1) {
            hrefs.push(words[i]);
          }
        }
        var finalurl = hrefs[0].substring(6, hrefs[0].length-1).replace('&amp;', '&');
        releaseFromQueue(data, finalurl, copies);
      } else {
        setTimeout(function(){attemptRelease(data, attempt+1, copies)}, 500);
      }
    });
  }
}

// Checks if documents are ready for release
var checkForRelease = function (successCallback) {
  getRequest('/app?service=page/UserReleaseJobs', {}, successCallback);
}

var releaseFromQueue = function (data, url, copies) {
  getRequest(url, {}, function (response) {
    //Check if it's virtual
    if (new RegExp("This job may be printed at one of several possible printers").test(response)) {
      var re = new RegExp("<a href=.*sp=(.*)\">");
      var printname = response.match(re);
      releaseFromVirtual(data, printname[1], copies);
    } else {
      attemptRelease(data, 0, copies-1);
    }
  });
}

//For releasing from virtual printers
var releaseFromVirtual = function (data, printname, copies) {
  var url = "/app?service=direct/1/UserReleaseJobs/$ReleaseStationJobs.$DirectLink&sp=Sprint&sp="+printname;
  getRequest(url, {}, function (response) {
    attemptRelease(data, 0, copies-1);
  });
}

var finishPrint = function (data) {
  printMessage("Job complete.");
  //Check if it needs to log in again
  var url = '/app?service=direct/1/UserWebPrintSelectPrinter/table.tablePages.linkPage&sp=AUserWebPrintSelectPrinter%2Ftable.tableView&sp=1';
  getRequest(url, {}, function (response) {
    if (new RegExp("<title>Login</title>").test(response)){
      attemptLogin(data.username, data.password);
    } else {
      stateLogin();
    }
  });
  
}

/******************************
  State changes
 ******************************/

// 0. Page load
var stateInitial = function () {
  sessionState = 0;
}

// 1. Session started with print server
var stateReady = function () {
  console.log("Print server accessed.")
  sessionState = 1;
}

// 2. Login attempt failed
var stateDenied = function () {
  sessionState = 2;
  $('.js-login input').addClass('invalid');
  $('.js-login input').removeClass('valid');
}

// 3. Logged in
var stateLogin = function () {
  sessionState = 3;
  $('.js-login input').addClass('valid');
  $('.js-login input').removeClass('invalid');
}

// 4. Printing
var stateBusy = function () {
  sessionState = 4;
}

/******************************
  Login info storage and file validation
 ******************************/

var storeLoginInfo = function (user, pass) {
  localStorage.setItem(0, obfuscate(user));
  localStorage.setItem(1, obfuscate(pass));
}

//Silly ascii manipulation so passwords aren't clearly visible. 
//We should stop storing login info in local storage asap though.
var obfuscate = function (pass) {
  var newpass = "";
  for (i in pass) {
    newpass = newpass.concat(String.fromCharCode(158-pass.charCodeAt(i)));
  }
  return newpass;
}

var validExts = ['xlam','xls','xlsb','xlsm','xlsx','xltm','xltx','pot','potm','potx','ppam','pps','ppsm',
                'ppsx','ppt','pptm','pptx','doc','docm','docx','dot','dotm','dotx','rtf','pdf','xps'];

var isValid = function (file) {
    if (file.size >= 104857600) {
      return false;
    } else {
      return (new RegExp('(' + validExts.join('|').replace(/\./g, '\\.') + ')$')).test(file.name);
    }
}

/*************************
  Global Variables
**************************/

var sessionState;
var fileToUpload;
var printerDict;

/******************************
  Interactivity initialization
 ******************************/

$(document).ready(function () {

  printerDict = Printers.printers;

  stateInitial();
  connectToServer();

  //building copies drop-down
  var copyselect = '';
  for (i=1;i<=10;i++){
      copyselect += '<option value=' + i + '>' + i + '</option>';
  }
  $('.printer-copies').html(copyselect);

  //building printers drop-down
  var printerselect = '';
  for (i in printerDict){
    var printername = printerDict[i].name;
    printerselect += '<option value=' + printerDict[i].long_name + '>' + printerDict[i].name + '</option>';
  }
  $('.printer-select').html(printerselect);
  $(".printer-select").prop("selectedIndex", -1);

  Printers.getClosestPrinter(function (closest) {
    $(".printer-select").val(closest.long_name);
    checkPrinterStatus(closest.long_name, 1);
  });

  //retrieving login info
  if (localStorage.getItem(0) != null) {
    var user = obfuscate(localStorage.getItem(0));
    var pass = obfuscate(localStorage.getItem(1));
    $('.js-login-user').val(user);
    $('.js-login-password').val(pass);
    attemptLogin(user, pass);
  }

  //printer field change
  $('.printer-select').change(function() {
    checkPrinterStatus($(".printer-select").val(), 1);
  });

  //login field change
  $('.js-login input').bind('input propertychange', $.debounce(500, function () {
      var user = $('.js-login-user').val();
      var pass = $('.js-login-password').val();
      if (user && pass) {
        attemptLogin(user, pass);
      }
    }));

  //file change
  $(':file').change(function() {
    fileToUpload = this.files[0];
  });

  $('.printer-input').change(function () {
    var filename = $(this).val().split('\\').pop();
    if (filename) {
      $('.printer-input-label').html(filename);
      $('.printer-input-label').addClass('printer-input-label--hasFile');
    }
  });

  $(".printer-send").click(function () {
    if (sessionState != 4) {
      if (sessionState == 0) {
        printError("Not connected to server.");
      } else if (sessionState == 2) {
        printError("Not logged in.");
      } else if (fileToUpload == null) {
        printError("No file chosen.");
      } else if (! isValid(fileToUpload)) {
        printError("Invalid file type.");
      } else {
        var formdata = new FormData();
        formdata.append(fileToUpload.name, fileToUpload);
        var data = {
          username: $(".js-login-user").val(),
          password: $(".js-login-password").val(),
          printer: $(".printer-select").val(),
          copies: $(".printer-copies").val(),
          file: formdata
        };
        startPrint(data);
      }
    }
  });
});

/******************************
  Helper functions
 ******************************/


var printMessage = function (message) {
  $('.printer-status').removeClass('printer-status--error');
  $('.printer-status').text(message);
}

var printError = function (message) {
  console.log("HI!");
  $('.printer-status').text(message);
  $('.printer-status').addClass('printer-status--error');
}

var setInfoFromResponse = function (response) {
  var username = $('.js-login-user').val();
  //console.log(response);
  var name = response.match(new RegExp(username + '\\s\\((.+?)\\)'))[1];
  var balance = parseFloat(response.match(/\$(\d+\.\d+)/)[1]);
  var percent = balance / 96 * 100;
  $('.js-name').text(name);
  $('.js-balance').text(balance);
  $('.js-used').css('width', '' + percent + '%');
}

var checkPrinterStatus = function (printer, attempt) {
  if (attempt < 4){
    var url_end;
    switch (attempt) {
      case 1: 
        url_end = "startid=1&endid=101";
        break;
      case 2:
        url_end = "startid=101&endid=201";
        break;
      case 3:
        url_end = "startid=201&endid=301";
        break;
    }

    //GET from printer status page
    $.ajax({
      type: 'GET',
      url: 'https://print.ads.carleton.edu/printers/ipp_0001.asp?' + url_end,
      data: {},
      xhrFields: {withCredentials: true},
      success: function (response) {
        var re = new RegExp(printer.substring(5)+".*>(.*)");
        lines = response.split("</font></font></td>");
        for (i in lines) {
          var message = lines[i].match(re);
          if (message != null) {
            if (message[1] != "Ready"){
              printError("Warning: " + message[1] + ".");
              return;
            }
          }
        }
        checkPrinterStatus(printer, attempt +1);
      },
      error: function () {console.log('error in get')}
    });
  } else {
    printMessage("Printer online.");
  }
}

var checkPrinterInfo = function () {
  var currtime = Math.floor(new Date().getTime()/60000);
  console.log(currtime-localStorage.getItem('lastStored') + " minutes since last update.");
  if (localStorage.getItem('lastStored') == null || currtime-localStorage.getItem('lastStored') > 1440) {
    storePrinterInfo(1, function (){
      checkPrinterStatus($(".printer-select").val(), 1);    
    });
  } else {
    console.log("Printer info is up-to-date.")
  }
}

//Puts printer page values in local storage. Called from checkPrinterInfo() and startPrint()
var storePrinterInfo = function (attempt, callback) {
  stateBusy();
  if (attempt < 4) {
    printMessage("Updating printer information. Please wait...");
    console.log("Storing info on page " + attempt);
    var url = '/app?service=direct/1/UserWebPrintSelectPrinter/table.tablePages.linkPage&sp=AUserWebPrintSelectPrinter%2Ftable.tableView&sp=' + attempt;
    getRequest(url, {}, function (response) {
      var lines = response.split("\n");
      var re = new RegExp("value=\"[0-9]+\".*\r(.*)");
      for (i in lines) {
        var select = lines[i].match(re);
        if (select != null) {
          localStorage.setItem(select[1], attempt);
        }
      }
      storePrinterInfo(attempt+1, callback);
    });
  } else {
    printMessage("Printer information updated.")    
    var currtime = Math.floor(new Date().getTime()/60000);
    localStorage.setItem('lastStored', currtime);
    if (callback != null) {
      callback();
    } else {
      stateLogin();
    }
  }    
}

});