/******************************
  Request helpers
 ******************************/

//GET from the print server
var getRequest = function(successHandler) {
  $.ajax({
    type: 'GET',
    url: 'https://print.ads.carleton.edu:9192/app',
    xhrFields: {withCredentials: true},
    success: successHandler,
    error: function() {console.log('error in get')}
  });
}

//POST to the print server
var postRequest = function(data, successHandler) {
  $.ajax({
    type: 'POST',
    url: 'https://print.ads.carleton.edu:9192/app',
    data: data,
    xhrFields: {withCredentials: true},
    success: successHandler,
    error: function() {console.log('error in post')}
  });
};

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

/******************************
  Requests
 ******************************/

// 0. Begin session by accessing login page
var request0 = function() {
  getRequest(function() {
    stateReady();
  });
};

// 1. Log in with credentials
var request1 = function(user, pass) {
  //console.log('Trying to log in with ' + user + ', ' + pass);
  postRequest(loginData(user, pass), function(response) {
    var foot = response.substring(response.length - 500);
    if (foot.indexOf('Invalid username or password') < 0
      && foot.indexOf('You must enter a value for') < 0) {
      stateLogin();
    } else {
      stateDenied();
    }
  });
}

// 2. Print a generic document
var request3 = function(data) {
  console.log("Printing with", data);
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
  //console.log("Login attempt failed.");
  sessionState = 2;
  $('#userpass input').css('border-color', 'red');
}

// 3. Logged in
var stateLogin = function() {
  console.log("Logged in.");
  sessionState = 3;
  $('#userpass input').css('border-color', 'cyan');
}

/******************************
  Interactivity initialization
 ******************************/

$(document).ready(function() {
  stateInitial();
  request0();

  $('#userpass input').bind('input propertychange', $.debounce(500, function() {
    var user = $('#username').val();
    var pass = $('#password').val();
    if (user && pass) {
      request1(user, pass);
    }
  }));

  $("#printButton").click(function() {
    var data = {
        username: $("#username").val(),
        password: $("#password").val(),
        printer: $("#printers").val(),
        file: $("#file").val()
    };
    if(sessionState != 3){
      console.log("NOT LOGGED IN");
    } else {
      request3(data);
    }
    //console.log(data.username);
    //console.log(data.password);
    //console.log(data.printer);
    //console.log(data.file);
  });
});
