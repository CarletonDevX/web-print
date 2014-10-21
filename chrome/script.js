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
                myXhr.upload.addEventListener('progress',function () {console.log("In progress...");}, false); // For handling the progress of the upload
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
  console.log("Request0");
  getRequest('/app', {}, function () {
    stateReady();
  });
};

// Log in with credentials
var request1 = function (user, pass) {
  console.log("Request1");
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

// User web print page
var request2 = function () {
  console.log("Request2");
  getRequest('/app?service=page/UserWebPrint', web_print_payload, function (response) {
    return response;
  });
}

var startPrint = function (data) {
  findPrinter(data, 1);
}

// Navigate to correct printer page
var findPrinter = function (data, attempt) {
  console.log("Finding printer...");
  var url = '/app?service=direct/1/UserWebPrintSelectPrinter/table.tablePages.linkPage&sp=AUserWebPrintSelectPrinter%2Ftable.tableView&sp=' + attempt;
  getRequest(url, {}, function (response) {
    var re = new RegExp("value=\"([0-9]+)\".*\r" + data.printer.replace("\\", "\\\\").split(" ")[0]);  //split gets rid of (virtual)
    var select = response.match(re);
    if (select != null) {
      request3(data, select[1]);
    } else {
      console.log("Printer not found on page " + attempt);
      if (attempt < 3) {
        findPrinter(data, (attempt + 1));
      } else {
        console.log("Printer not found.");
      }
    }
  });
}

// Submit printer selection
var request3 = function (data, select) {
  console.log("Request3");
  var newpayload = select_printer_payload;
  newpayload['$RadioGroup'] = select;
  postRequest('/app', newpayload, function (response) {
    request4(data, select);
  });
}


// Submit print options and account selection - doesn't yet regard data.options
var request4 = function (data, select) {
  console.log("Request4");
  var newpayload = print_options_payload;
  newpayload['$RadioGroup'] = select;
  postRequest('/app', newpayload, function (response) {
    //Pulling out UID for use in the next request
    var re = new RegExp("uploadUID = \'([0-9]+)\'");
    var uploadUID = response.match(re)[1];
    //console.log(uploadUID);
    request5(data, uploadUID);
  });
}

// Upload pt. 1
var request5 = function (data, uploadUID) {
  console.log("Request5");
  var url = '/upload/'+ uploadUID;
  uploadRequest(url, data, function(response) {
    request6(data);
  });
}

// Upload pt. 2
var request6 = function (data) {
  console.log("Request6");
  postRequest('/app', upload_file_payload, function(response) {
    console.log("Uploaded.");
    release();
  });
}

// Repeatedly tries to release files from queue
var release = function () {
  console.log("Releasing");
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
      setTimeout(release, 500);
    }
  });
}

// Checks if documents are ready for release
var request7 = function (successCallback) {
  getRequest('/app?service=page/UserReleaseJobs', {}, successCallback);
}

var request8 = function (url) {
  console.log("Request8");
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
  console.log("Request9");
  //console.log(printname);
  var url = "/app?service=direct/1/UserReleaseJobs/$ReleaseStationJobs.$DirectLink&sp=Sprint&sp="+printname;
  getRequest(url, {}, function (response) {
    return response;
  });
}

/******************************
  State changes
 ******************************/

var sessionState;

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
  $('#userpass input').css('border-color', 'red');
}

// 3. Logged in
var stateLogin = function () {
  console.log("Logged in.");
  sessionState = 3;
  $('#userpass input').css('border-color', 'cyan');
}

// 4. File uploaded
var stateUploaded = function () {
  console.log("File uploaded.");
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

/******************************
  Interactivity initialization
 ******************************/

$(document).ready(function () {
  stateInitial();
  request0();
  navigator.geolocation.getCurrentPosition(selectClosestPrinter);

  if (localStorage.getItem('user') != null) {
    var user = localStorage.getItem('user');
    var pass = localStorage.getItem('pass');
    $('#username').val(user);
    $('#password').val(pass);
    request1(user, pass);
  }

  $('#userpass input').bind('input propertychange', $.debounce(500, function () {
      var user = $('#username').val();
      var pass = $('#password').val();
      storeLoginInfo(user, pass);
      if (user && pass) {
        request1(user, pass);
      }
    }));

  var fileToUpload;

  $(':file').change(function() {
    fileToUpload = this.files[0];
  });

  $("#printButton").click(function () {
    if (sessionState != 3) {
      console.log("NOT LOGGED IN");
    } else if (fileToUpload == null) {
      console.log("NO FILE UPLOADED");
    } else if (! isValid(fileToUpload)) {
      console.log("INVALID FILE");
    } else {
      var formdata = new FormData();
      formdata.append(fileToUpload.name, fileToUpload);
      var data = {
        username: $("#username").val(),
        password: $("#password").val(),
        //printer: $("#printers").val(),
        printer: 'print\\SAYL-Public-X4600 (virtual)',
        copies: 1,
        file: formdata
      };
      startPrint(data);
    }
  });
});

/******************************
  Printer data
 ******************************/

var printers = [
  {
    name: '1st Cassat',
    long_name: 'print\\CASS101-X4600',
    longitude: -93.151206,
    latitude: 44.460058,
  },
  {
    name: '4th Libe',
    long_name: 'print\\LIBR-Public-X5550 (virtual)',
    longitude: -93.154705,
    latitude: 44.462281,
  },
  {
    name: 'Upper Sayles',
    long_name: 'print\\SAYL-Public-X4600 (virtual)',
    longitude: -93.156028,
    latitude: 44.461604,
  },
  {
    name: 'Weitz 028',
    long_name: 'print\\WCC028-CC5051',
    longitude: -93.156182,
    latitude: 44.456656,
  },
  {
    name: 'Weitz 138',
    long_name: 'print\\WCC138-X6360',
    longitude: -93.156286,
    latitude: 44.456792,
  },
  {
    name: 'Willis',
    long_name: 'print\\WILL119-X4600',
    longitude: -93.156000,
    latitude: 44.460783,
  },
  {
    name: '3rd CMC',
    long_name: 'print\\CMC305-X4600',
    longitude: -93.153771,
    latitude: 44.462505
  }
];

/******************************
  Helper functions
 ******************************/

var selectClosestPrinter = function (location) {
  var lon = location.coords.longitude;
  var lat = location.coords.latitude;
  var closest = null;
  var closest_distance_sq = Infinity;
  for (var i in printers) {
    var dx = lon - printers[i].longitude;
    var dy = lat - printers[i].latitude;
    var distance_sq = dx * dx + dy * dy;
    if (distance_sq < closest_distance_sq) {
      closest_distance_sq = distance_sq;
      closest = printers[i];
    }
  }
  console.log("Closest printer is " + closest.name);
}

var setInfoFromResponse = function (response) {
  var username = $('#username').val();
  var name = response.match(new RegExp(username + '\\s\\((.+?)\\)'))[1];
  var balance = parseFloat(response.match(/\$(\d+\.\d+)/)[1]);
  var percent = balance / 96 * 100;
  $('.js-name').text(name);
  $('.js-balance').text(balance);
  $('.js-used').css('width', '' + percent + '%');
}