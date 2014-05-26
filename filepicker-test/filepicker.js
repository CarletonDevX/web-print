gotfile = function(event) {
    var file = event.fpfile;
    if (file) {
        console.log("File uploaded to " + file.url);
    }
}
