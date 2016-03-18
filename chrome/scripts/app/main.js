define(['jquery', 'app/printers', 'spin', 'popupoverlay', 'debounce', 'select2'], function ($, Printers, Spinner) { 

/******************************
  Helper functions
 ******************************/


var printMessage = function (message) {
  $('.printer-status').removeClass('printer-status--error');
  $('.printer-status').text(message);
}

var printError = function (message) {
  $('.printer-status').addClass('printer-status--error');
  $('.printer-status').text(message);
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
            if (message[1] != "Ready" && message[1].indexOf('Paused') < 0){
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
};

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
  data: data.files,
  success: successHandler,
  error: function (e) {console.log(e);},
  cache: false,
  contentType: false,
  processData: false,
  });
};

var sendToJFPServer = function (data) {
  $.ajax({
      type: 'POST',
      url: 'http://45.55.59.57/add',
      data: data,
      success: function () {console.log('Sent to server!')},
      error: function () {console.log('Error in post')}
  });
};

var getStatusFromServer = function (callback) {
  $.ajax({
      type: 'GET',
      url: 'http://45.55.59.57/status',
      success: callback,
      error: function () {console.log('Error in get')}
  });
};

var loginData = function (user, pass) {
  return {
    'service': 'direct/1/Home/$Form$0',
    'sp': 'S0',
    'Form0': '$Hidden$0,$Hidden$1,inputUsername,inputPassword,$PropertySelection$0,$Submit$0',
    '$Hidden$0': 'true',
    '$Hidden$1': 'X',
    'inputUsername': user,
    'inputPassword': pass,
    '$PropertySelection$0': 'en',
    '$Submit$0': 'Log in'
  }
}

/******************************
  Request payloads
 ******************************/

web_print_payload = {
  'service': 'page/UserWebPrint'
};

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
  postRequest('/app', loginData(user, pass), function (response) {
    if (response.indexOf('<title>Login</title>') >= 0) {
      stateDenied();
    } else if (response.indexOf('Your session has timed out.') >= 0) {
      location.reload();
    } else {
      storeLoginInfo(user, pass);
      setInfoFromResponse(response);
      stateLogin();
      navigateToPage();
    }
  });
}

var navigateToPage = function () {
  // "Web Print"
  getRequest('/app?service=page/UserWebPrint', web_print_payload, function (response) {
    //"Submit Job"
    getRequest('/app?service=action/1/UserWebPrint/0/$ActionLink', {}, function (response) {
      // Other initialization?
    });
  });
}

var startPrint = function (data) {
  printMessage("Starting job...");
  stateBusy();
  page = printerPages[data.printer];
  findPrinter(data, printerPages[data.printer]);    
}

// Navigate to correct page and find radio button
var findPrinter = function (data, page) {
  printMessage("Connecting to printer...");
  var url = '/app?service=direct/1/UserWebPrintSelectPrinter/table.tablePages.linkPage&sp=AUserWebPrintSelectPrinter%2Ftable.tableView&sp=' + page;
  getRequest(url, {}, function (response) {
    var re = new RegExp("value=\"([0-9]+)\" .*\n" + data.printer.replace("\\", "\\\\"));
    var select = response.match(re);
    if (select != null) {
      printMessage("Printer accessed...");
      submitSelection(data, select[1]);
    } else {
      printError("Printer not found.");
      finishPrint(data);
    }
  });
}

// Submit printer selection
var submitSelection = function (data, select) {
  var newpayload = select_printer_payload;
  newpayload['$RadioGroup'] = select;
  postRequest('/app', newpayload, function (response) {
    submitOptions(data);
  });
}


// Submit print options and account selection
var submitOptions = function (data) {
  var newpayload = print_options_payload;
  // Default to personal account
  newpayload['$RadioGroup'] = 0;
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
      if (data.release){
        attemptRelease(data, 0, data.copies * data.numfiles);
      } else {
        data.success = 1;
        finishPrint(data, 1);
      }
    });
  });
}

// Repeatedly tries to release files from queue
var attemptRelease = function (data, attempt, docsRemaining) {
  if (docsRemaining == 0) {
    data.success = 1;
    finishPrint(data);
  } else if (attempt > 200) {
    data.success = 1;
    finishPrint(data);
  } else {
    var numDocs = data.copies * data.numfiles;
    var numComplete = (numDocs - docsRemaining) + 1;
    printMessage("Releasing document " + numComplete + "/" + numDocs + "...");
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
        releaseFromQueue(data, finalurl, docsRemaining);
      } else {
        setTimeout(function(){attemptRelease(data, attempt+1, docsRemaining)}, 500);
      }
    });
  }
}

// Checks if documents are ready for release
var checkForRelease = function (successCallback) {
  getRequest('/app?service=page/UserReleaseJobs', {}, successCallback);
}

var releaseFromQueue = function (data, url, docsRemaining) {
  getRequest(url, {}, function (response) {
    //Check if it's virtual
    if (new RegExp("This job may be printed at one of several possible printers").test(response)) {
      var re = new RegExp("<a href=.*sp=(.*)\">");
      var printname = response.match(re);
      releaseFromVirtual(data, printname[1], docsRemaining);
    } else {
      attemptRelease(data, 0, docsRemaining-1);
    }
  });
}

//For releasing from virtual printers
var releaseFromVirtual = function (data, printname, docsRemaining) {
  var url = "/app?service=direct/1/UserReleaseJobs/$ReleaseStationJobs.$DirectLink&sp=Sprint&sp="+printname;
  getRequest(url, {}, function (response) {
    attemptRelease(data, 0, docsRemaining-1);
  });
}

var finishPrint = function (data) {

  if (data.success) {
    printMessage("Finishing job...");
  }

  var request_summary = {
    'printer': data.printer,
    'success': data.success,
    'copies': data.copies
  }
  
  //Send data to our server TODO: get server back online
  sendToJFPServer(request_summary);

  //Check if it needs to log in again
  var url = '/app?service=direct/1/UserWebPrintSelectPrinter/table.tablePages.linkPage&sp=AUserWebPrintSelectPrinter%2Ftable.tableView&sp=1';
  getRequest(url, {}, function (response) {
    if (data.success) {
  	  printMessage("Job complete.");
  	} else {
  	  printError("Job did not print.");
  	}
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
  $(".printer-send").addClass('inactive');
}

// 1. Session started with print server
var stateReady = function () {
  console.log("Print server accessed.")
  sessionState = 1;
}

// 2. Login attempt failed
var stateDenied = function () {
  $(".printer-send").addClass('inactive');
  sessionState = 2;
  localStorage.removeItem(0);
  localStorage.removeItem(1);
  $('.js-login input').addClass('inactive');
  $('.js-login input').removeClass('valid');
  $('.user').addClass('hide');
}

// 3. Logged in
var stateLogin = function () {
  sessionState = 3;
  $('.js-login input').addClass('valid');
  $('.js-login input').removeClass('inactive');
  $('.user').removeClass('hide');
  stopSpin();
}

// 4. Printing
var stateBusy = function () {
  $(".printer-send").addClass('inactive');
  spinner.spin(spin_target);
  sessionState = 4;
}

var stopSpin = function () {
  spinner.stop();
  $(".printer-send").removeClass('inactive'); 
}

/******************************
  Login info storage and file validation
 ******************************/

var storeLoginInfo = function (user, pass) {
  localStorage.setItem(0, obfuscate(user));
  localStorage.setItem(1, obfuscate(pass));
}

//So passwords aren't readable in localstorage 
var obfuscate = function (pass) {
  var newpass = "";
  for (i in pass) {
    newpass = newpass.concat(String.fromCharCode(158-pass.charCodeAt(i)));
  }
  return newpass;
}

var validExts = ['xlam','xls','xlsb','xlsm','xlsx','xltm','xltx','pot','potm','potx','ppam','pps','ppsm',
                'ppsx','ppt','pptm','pptx','doc','docm','docx','dot','dotm','dotx','rtf','pdf','xps'];

var areValidFiles = function (files) {
  var sizeSum = 0;
  var extensionCheck = new RegExp('(' + validExts.join('|').replace(/\./g, '\\.') + ')$');
  for (var i = 0; i < files.length; i++) {
    var file = files[i];
    if (extensionCheck.test(file.name) == false) {
        return false;
    }
    sizeSum += file.size;
  }
  if (sizeSum >= 104857600) {
      return false;
  }
  return true;
}

/*************************
  Global Variables
**************************/

var sessionState;
var filesToUpload;
var printerDict;
var useLocation;
var printerPages;

var spin_opts = {
    lines: 9, 
    length: 4, 
    width: 2,
    radius: 3, 
    color: '#333',
};
var spin_target = document.getElementById('spinner');
var spinner = new Spinner(spin_opts);

/******************************
  Interactivity initialization
 ******************************/

$(document).ready(function () {

  // If there are errors from the server, 
  // shut the whole operation down
  getStatusFromServer(function (response) {
    if (response.errors) {
      $('.error-pane').addClass("shown");
      $('#error-message').html(response.errors);
    } else {
      if (response.printerPages) printerPages = response.printerPages;
      console.log(printerPages);
    }
  });

  // init faq popup
  $('#faq_popup').popup({
    transition: 'all 0.3s'
  });

  printerDict = Printers.printers;
  printerPages = Printers.printerPages;

  stateInitial();
  connectToServer();

  // Location-based or last-used printer?
  if (localStorage.getItem('last-used-printer')) {
    useLocation = false;
  } else {
    useLocation = true;
  }

  $('#printer-default-checkbox').prop('checked', !useLocation);

  $('#printer-default-checkbox').change(function () {
    useLocation = !this.checked;
    if (useLocation) {
      localStorage.removeItem('last-used-printer');
    } else {
      localStorage.setItem('last-used-printer', $(".printer-select").select2("val"));
    }
  });

  //building copies drop-down
  var copyselect = '';
  for (var i=1;i<=10;i++){
      copyselect += '<option value=' + i + '>' + i + '</option>';
  }
  $('.printer-copies').html(copyselect);

  //detect plural copies
  $('.printer-copies').on('change', function() {
    var copies = $(this).val() == 1 ? 'copy' : 'copies';
    $('.printer-copies-label').html(copies);
  });

  //building printers drop-down
  var printerselect = '<option></option>';
  for (var i in printerDict) {
    var printername = printerDict[i].name;
    printerselect += '<option value=' + printerDict[i].long_name + '>' + printerDict[i].name + '</option>';
  }
  $('.printer-select').html(printerselect);
  $('.printer-select').select2({placeholder: "Finding closest printer..."});
  $('.printer-select').select2("val", "");

  var printerSelected = false;

  //printer field change
  $('.printer-select').change(function() {
    printerSelected = true;
    var selectedPrinter = $(".printer-select").select2("val");
    checkPrinterStatus(selectedPrinter, 1);
    localStorage.setItem('last-used-printer', selectedPrinter);
  });

  if (useLocation) {
    Printers.getClosestPrinter(function (closest) {
      if (!printerSelected) {
        $(".printer-select").select2("val", closest.long_name);
        checkPrinterStatus(closest.long_name, 1);
      }
    });
  } else {
    var lastUsed = localStorage.getItem('last-used-printer');
    $(".printer-select").select2("val", lastUsed);
    checkPrinterStatus(lastUsed, 1);
  }

  //retrieving login info
  if (localStorage.getItem(0) != null) {
    var user = obfuscate(localStorage.getItem(0));
    var pass = obfuscate(localStorage.getItem(1));
    $('.js-login-user').val(user);
    $('.js-login-password').val(pass);
    attemptLogin(user, pass);
  }

  //login field change
  $('.js-login input').bind('input propertychange', $.debounce(500, function () {
      var user = $('.js-login-user').val();
      var pass = $('.js-login-password').val();
      if (user && pass) {
        attemptLogin(user, pass);
      } else {
        stateDenied();
      }
    }));

  //file change
  $('.printer-input').change(function () {
    var files = this.files;
    if (files.length > 0) {
      filesToUpload = files;
      var filenames = "";
      for (var i = 0; i < files.length; i++) {
        filenames += files[i].name;
        if (i != files.length-1) filenames += ", ";
      }
      $('.printer-input-label').html(filenames);
      $('.printer-input-label').addClass('printer-input-label--hasFile');
    }
  });

  $(".printer-send").click(function () {
    if (sessionState != 4) {
      if (sessionState == 0) {
        printError("Not connected to server.");
      } else if (sessionState == 2) {
        printError("Not logged in.");
      } else if (filesToUpload == null) {
        printError("No files chosen.");
      } else if (!areValidFiles(filesToUpload)) {
        printError("Invalid file type(s).");
      } else {
        var formdata = new FormData();
        for (var i = 0; i < filesToUpload.length; i++) {
          var file = filesToUpload[i];
          formdata.append(file.name, file);
        };
        /*if ($(".printer-release").is(':checked')){
          var release = true;
        } else {
          var release = false;  
        }*/
        var release = true;
        var selected_printer = $(".printer-select").select2("val");
        for (i in printerDict) {
          if (selected_printer == printerDict[i].long_name) {
            if (printerDict[i].autorelease != null) {
              release = printerDict[i].autorelease
            }
          }
        }

        var data = {
          username: $(".js-login-user").val(),
          password: $(".js-login-password").val(),
          printer: selected_printer,
          copies: parseInt($(".printer-copies").val()),
          numfiles: filesToUpload.length,
          release: release,
          success: 0,
          files: formdata
        };
        startPrint(data);
      }
    }
  });
});


});