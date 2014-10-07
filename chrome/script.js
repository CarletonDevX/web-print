/******************************
  Request helpers
 ******************************/

//GET from the print server
var getRequest = function(url, data, successHandler) {
  $.ajax({
    type: 'GET',
    url: 'https://print.ads.carleton.edu:9192'+url,
    data: data,
    xhrFields: {withCredentials: true},
    success: successHandler,
    error: function() {console.log('error in get')}
  });
}

//POST to the print server
var postRequest = function(url, data, successHandler) {
  $.ajax({
    type: 'POST',
    url: 'https://print.ads.carleton.edu:9192'+url,
    data: data,
    xhrFields: {withCredentials: true},
    success: successHandler,
    error: function() {console.log('error in post')}
  });
};

//UPLOAD a file to the server
var uploadRequest = function(url, data, successHandler) {
  $.ajax({
  url: url,
  type: 'POST',
  xhr: function() {return $.ajaxSettings.xhr();},
  data: data.file,
  success: function(r) {console.log(r);},
  error: function(e) {console.log(e);},
  cache: false,
  contentType: false,
  processData: false,
  });
}

//Adds default login data
var loginData = function(user, pass) {
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
    '$RadioGroup': '7',
    '$Submit$1': '2. Print Options and Account Selection »'
};

var print_options_payload = {
    'service': 'direct/1/UserWebPrintOptionsAndAccountSelection/$Form',
    'sp': 'S0',
    'Form0': 'copies,$RadioGroup,$TextField$0,$Submit,$Submit$0',
    'copies': '1',
    '$RadioGroup': '7',
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

// 0. Begin session by accessing login page
var request0 = function() {
  console.log("Request0");
  getRequest('/app', {}, function() {
    stateReady();
  });
};

// 1. Log in with credentials
var request1 = function(user, pass) {
  console.log("Request1");
  postRequest('/app', loginData(user, pass), function(response) {
    var foot = response.substring(response.length - 500);
    if (foot.indexOf('Invalid username or password') < 0
      && foot.indexOf('You must enter a value for') < 0) {
      stateLogin();
      storeLoginInfo(user, pass);
      //Seemingly extraneous requests that make it work
      request2();
    } else {
      stateDenied();
    }
  });
}

// 2. User web print page
var request2 = function() {
  console.log("Request2");
  getRequest('/app?service=page/UserWebPrint', web_print_payload, function(response) {
    request3();
  });
}

// 3. Submit job
var request3 = function() {
  console.log("Request3");
  getRequest('/app?service=action/1/UserWebPrint/0/$ActionLink', {}, function(response) {
    return response; //Anything I should be doing here?
  });
}

// 4. Navigate to correct printer page - depends on printer
var request4 = function(data) {
  //postRequest()
  console.log("Request4");
  request5(data);
}

// 5. Submit printer selection - doesn't yet regard data.printer
var request5 = function(data) {
  console.log("Request5");
  postRequest('/app', select_printer_payload, function(response) {
    request6(data);
  });
}


// 6. Submit print options and account selection - doesn't yet regard data.options
var request6 = function(data) {
  console.log("Request6");
  postRequest('/app', print_options_payload, function(response) {
      var uploadUID = '';
      var lines = response.split("\n");
      //Pulling out UID for use in the next request
      for (i = 0; i < lines.length; i++){
        if (lines[i].indexOf('var uploadUID') > -1){
          uploadUID = lines[i].substring(lines[i].length-7, lines[i].length-2);
          console.log(uploadUID);
        }
      }
      request7(data, uploadUID);
  });
}

var request7 = function(data, uploadUID) {
  console.log("Request7");
  var url = '/upload/'+ uploadUID;
  //debugger
  uploadRequest(url, data.file, function(response) {
    console.log(response);
  });
}

/******************************
  State changes
 ******************************/

var sessionState;

// 0. Page load
var stateInitial = function() {
  sessionState = 0;
}

// 1. Session started with print server
var stateReady = function() {
  console.log("Print server accessed.")
  sessionState = 1;
}

// 2. Login attempt failed
var stateDenied = function() {
  sessionState = 2;
  $('#userpass input').css('border-color', 'red');
}

// 3. Logged in
var stateLogin = function() {
  console.log("Logged in.");
  sessionState = 3;
  $('#userpass input').css('border-color', 'cyan');
}

// 4. File uploaded
var stateUploaded = function() {
  console.log("File uploaded.");
  sessionState = 4;

}

/******************************
  Login info storage
 ******************************/

var storeLoginInfo = function(user, pass){
  localStorage.setItem('user', user);
  localStorage.setItem('pass', pass);
}

/******************************
  Interactivity initialization
 ******************************/

$(document).ready(function() {
  stateInitial();
  request0();
  navigator.geolocation.getCurrentPosition(selectClosestPrinter);

  if(localStorage.getItem('user') != null){
    var user = localStorage.getItem('user');
    var pass = localStorage.getItem('pass');
    $('#username').val(user);
    $('#password').val(pass);
    request1(user, pass);
  }

  $('#userpass input').bind('input propertychange', function() {
      var user = $('#username').val();
      var pass = $('#password').val();
      request1(user, pass);
    });

  $("#printButton").click(function() {
    var data = {
        username: $("#username").val(),
        password: $("#password").val(),
        printer: $("#printers").val(),
        copies: 1,
        file: new FormData($("#fileform")[0])
    };
    if(sessionState != 3){
      console.log("NOT LOGGED IN");
    } else {
      //Begin the series of print requests
      request4(data);
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

var selectClosestPrinter = function(location) {
  var lon = location.coords.longitude;
  var lat = location.coords.latitude;
  console.log('' + lat + ', ' + lon);
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
