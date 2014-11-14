define([], function () {

//LDC, HUE
  var printers = [
    {
      name: '1st Cassat',
      long_name: 'print\\CASS101-X4600',
      longitude: -93.151206,
      latitude: 44.460058,
    },
    {
      name: '4th Libe',
      long_name: 'print\\LIBR-Public-X5550',
      longitude: -93.154705,
      latitude: 44.462281,
    },
    {
      name: 'Upper Sayles',
      long_name: 'print\\SAYL-Public-X4600',
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

  return {
    getClosestPrinter: function (callback) {
        navigator.geolocation.getCurrentPosition(function (location) {
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
        callback(closest);
      });
    },
    printers: printers
  };
});
