define(['jquery', 'app/printers', 'debounce'], function ($, Printers) {  

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

//Adds default login data
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

//Payloads for requests
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
var request0 = function () {
  getRequest('/app', {}, function () {
    stateReady();
  });
};

// Log in with credentials
var request1 = function (user, pass) {
  postRequest('/app', loginData(user, pass), function (response) {
    var foot = response.substring(response.length - 500);
    if (foot.indexOf('Invalid username or password') < 0
      && foot.indexOf('You must enter a value for') < 0) {
      stateLogin();
      setInfoFromResponse(response);
      request2();
    } else {
      stateDenied();
    }
  });
}

var request2 = function () {
  // "Web Print"
  getRequest('/app?service=page/UserWebPrint', web_print_payload, function (response) {
    //"Submit Job"
    getRequest('/app?service=action/1/UserWebPrint/0/$ActionLink', {}, function (response) {
      return response;
    });
  });
}

var startPrint = function (data) {
  printMessage("Starting job");
  statePrinting();
  findPrinter(data, 1);
}


var buildPrinterDict = function (data) {
  printMessage("Building printer dictionary");
}

// Navigate to correct printer page
var findPrinter = function (data, attempt) {
  printMessage("Finding printer...");
  var url = '/app?service=direct/1/UserWebPrintSelectPrinter/table.tablePages.linkPage&sp=AUserWebPrintSelectPrinter%2Ftable.tableView&sp=' + attempt;
  getRequest(url, {}, function (response) {
    var re = new RegExp("value=\"([0-9]+)\".*\r" + data.printer.replace("\\", "\\\\").split(" ")[0]);  //split gets rid of (virtual)
    var select = response.match(re);
    if (select != null) {
      printMessage("Printer found");
      request3(data, select[1]);
    } else {
      console.log("Printer not found on page " + attempt);
      if (attempt < 3) {
        findPrinter(data, (attempt + 1));
      } else {
        printError("Printer not found.");
        stateLogin();
      }
    }
  });
}

// Submit printer selection
var request3 = function (data, select) {
  var newpayload = select_printer_payload;
  newpayload['$RadioGroup'] = select;
  postRequest('/app', newpayload, function (response) {
    request4(data, select);
  });
}


// Submit print options and account selection - doesn't yet regard data.options
var request4 = function (data, select) {
  var newpayload = print_options_payload;
  newpayload['$RadioGroup'] = select;
  postRequest('/app', newpayload, function (response) {
    //Pulling out UID for use in the next request
    var re = new RegExp("uploadUID = \'([0-9]+)\'");
    var uploadUID = response.match(re)[1];
    request5(data, uploadUID);
  });
}

// Upload pt. 1
var request5 = function (data, uploadUID) {
  var url = '/upload/'+ uploadUID;
  uploadRequest(url, data, function(response) {
    request6(data);
  });
}

// Upload pt. 2
var request6 = function (data) {
  postRequest('/app', upload_file_payload, function(response) {
    printMessage("File uploaded");
    release(0);
  });
}

// Repeatedly tries to release files from queue
var release = function (attempt) {
  console.log("Attempt: "+attempt);
  if (attempt > 20) {
    printError("Job not sent to webprint.")
    stateLogin();
  } else {
    request7(function (response) {
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
        request8(finalurl);
      } else {
        setTimeout(function(){release(attempt+1)}, 500);
      }
    });
  }
}

// Checks if documents are ready for release
var request7 = function (successCallback) {
  getRequest('/app?service=page/UserReleaseJobs', {}, successCallback);
}

var request8 = function (url) {
  getRequest(url, {}, function (response) {
    var re = new RegExp("<a href=.*sp=(.*)\">");
    var printname = response.match(re);
    if (printname != null) {
      request9(printname[1]);
    }
  });
}

//For releasing from virtual printers
var request9 = function (printname) {
  var url = "/app?service=direct/1/UserReleaseJobs/$ReleaseStationJobs.$DirectLink&sp=Sprint&sp="+printname;
  getRequest(url, {}, function (response) {
    printMessage("Job complete.")
    stateLogin();
    return response;
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
var statePrinting = function () {
  sessionState = 4;
}

/******************************
  Login info storage and file validation
 ******************************/

var storeLoginInfo = function (user, pass) {
  localStorage.setItem('user', user);
  localStorage.setItem('pass', pass);
}

var validExts = ['xlam','xls','xlsb','xlsm','xlsx','xltm','xltx','pot','potm','potx','ppam','pps','ppsm',
                'ppsx','ppt','pptm','pptx','doc','docm','docx','dot','dotm','dotx','rtf','pdf','xps'];

//Regex from http://stackoverflow.com/a/17355937
var isValid = function (file) {
    if (file.size >= 100000000) {
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
var closestPrinter;

//Workaround for global variable
var setClosest = function (closest) {
  closestPrinter = closest;
  console.log("Closest is "+ closestPrinter.name);
}

/******************************
  Interactivity initialization
 ******************************/

$(document).ready(function () {

  stateInitial();
  request0();
  Printers.getClosestPrinter(function (closest) {
    setClosest(closest);
  });

  if (localStorage.getItem('user') != null) {
    var user = localStorage.getItem('user');
    var pass = localStorage.getItem('pass');
    $('.js-login-user').val(user);
    $('.js-login-password').val(pass);
    request1(user, pass);
  }

  $('.js-login input').bind('input propertychange', $.debounce(500, function () {
      var user = $('.js-login-user').val();
      var pass = $('.js-login-password').val();
      storeLoginInfo(user, pass);
      if (user && pass) {
        request1(user, pass);
      }
    }));

  $(':file').change(function() {
    fileToUpload = this.files[0];
  });

  $("#printButton").click(function () {
    if (sessionState == 0) {
      printError("Not connected to server.");
    } else if (sessionState == 2) {
      printError("Not logged in.");
    } else if (fileToUpload == null) {
      printError("No file chosen.");
    } else if (! isValid(fileToUpload)) {
      printError("Invalid file.");
    } else if (sessionState == 4) {
      printMessage("Job in progress, please wait.");
    } else {
      var formdata = new FormData();
      formdata.append(fileToUpload.name, fileToUpload);
      var data = {
        username: $(".js-login-user").val(),
        password: $(".js-login-password").val(),
        //printer: $("#printers").val(),
        printer: closestPrinter.long_name,
        copies: 1,
        file: formdata
      };
      startPrint(data);
    }
  });
});

/******************************
  Helper functions
 ******************************/

var printMessage = function (message) {
  $('.status-console').css('color', 'black');
  $('.status-console').text(message);
}

var printError = function (message) {
  $('.status-console').css('color', 'red');
  $('.status-console').text(message);
}

var setInfoFromResponse = function (response) {
  var username = $('.js-login-user').val();
  var name = response.match(new RegExp(username + '\\s\\((.+?)\\)'))[1];
  var balance = parseFloat(response.match(/\$(\d+\.\d+)/)[1]);
  var percent = balance / 96 * 100;
  $('.js-name').text(name);
  $('.js-balance').text(balance);
  $('.js-used').css('width', '' + percent + '%');
}

});
