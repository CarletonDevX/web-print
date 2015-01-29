define([], function () {

  var printers = [
    { name: 'Cassat 101', long_name: 'print\\CASS101-X4600', longitude: -93.151206, latitude: 44.460058, page: 1 },
    { name: 'CLST 100 (Color)', long_name: 'print\\CLST100-CC5051', page: 1 },
    { name: 'CMC 020 (Color)', long_name: 'print\\CMC020-CC5051', page: 1 },
    { name: 'CMC 104 (Color)', long_name: 'print\\CMC104-CC5051', page: 1 },
    { name: 'CMC 121 (Color)', long_name: 'print\\CMC121H-CC5051', page: 1 },
    { name: 'CMC 201', long_name: 'print\\CMC201-X4600', page: 1 },
    { name: 'CMC 305', long_name: 'print\\CMC305-X4600', longitude: -93.153771, latitude: 44.462505, page: 1 },
    { name: 'Cowling 108 (Color)', long_name: 'print\\COWL108-CC5051', page: 1 },
    { name: 'Facilities 318 (Color)', long_name: 'print\\FACI318-CC5051', page: 1 },
    { name: 'Facilities 335', long_name: 'print\\FACI335-LJ4250', page: 1 },
    { name: 'Goodhue 102', long_name: 'print\\GOOD102-X4500', page: 1 },
    { name: 'Goodhue 103', long_name: 'print\\GOOD103-X6350', page: 1 },
    { name: 'Goodhue 103 (Color)', long_name: 'print\\GOOD103-CC5051', page: 1 },
    { name: 'Goodhue 156', long_name: 'print\\GHUE156-X5550', longitude: -93.149809, latitude: 44.462625 , page: 1 },
    { name: 'HOPN 104 (Color)', long_name: 'print\\HOPN104-CC5051', page: 1 },
    { name: 'Hulings 007', long_name: 'print\\HUL007A-X3600', page: 1 },
    { name: 'Hulings 010', long_name: 'print\\HUL010-X3600', page: 1 },
    { name: 'Hulings 014', long_name: 'print\\HUL014-X6350', page: 1 },
    { name: 'Hulings 100 (Color)', long_name: 'print\\HUL100-CC5051', page: 1 },
    { name: 'Laird 115 (Color)', long_name: 'print\\LAIR115-CC5051', page: 1 },
    { name: 'Laird 118 (Color)', long_name: 'print\\LAIR118-CC5051', page: 1 },
    { name: 'Laird 208', long_name: 'print\\LAIR208-X4600', page: 1 },
    { name: 'Laird 208 (Color)', long_name: 'print\\LAIR208-CC5051', page: 1 },
    { name: 'Laird 300', long_name: 'print\\LAIR300-X4500', page: 1 },
    { name: 'LAST 110 (Color)', long_name: 'print\\LAST110-CC5051', page: 1 },
    { name: 'LDC 220 (Color)', long_name: 'print\\LDC220-CC5051', page: 2 },
    { name: 'LDC 243', long_name: 'print\\LDC243-X5550', longitude: -93.151494, latitude: 44.461044, page: 2 },
    { name: 'Leighton 128', long_name: 'print\\LEIG128-X4500', page: 2 },
    { name: 'Leighton 217', long_name: 'print\\LEIG217-X4510', page: 2 },
    { name: 'Leighton 218 (Color)', long_name: 'print\\LEIG218-CC5051', page: 2 },
    { name: 'Leighton 231', long_name: 'print\\LEIG231-X4600', page: 2 },
    { name: 'Leighton 326', long_name: 'print\\LEIG326-X4600', page: 2 },
    { name: 'Leighton 326 (Color)', long_name: 'print\\LEIG326-CC5051', page: 2 },
    { name: 'Leighton 414', long_name: 'print\\LEIG414-LJM602', page: 2 },
    { name: 'Library 400', long_name: 'print\\LIBR-Public-X5550', longitude: -93.154705, latitude: 44.462281, page: 2 },
    { name: 'Library 400 (Color)', long_name: 'print\\LIBR400-CC5051', page: 2 },
    { name: 'Mudd 075', long_name: 'print\\MUDD075-X4510', page: 2 },
    { name: 'Mudd 161 (Color)', long_name: 'print\\MUDD161-CC5051', page: 2 },
    { name: 'Mudd 163', long_name: 'print\\MUDD163-X7760', page: 2 },
    { name: 'Mudd 169', long_name: 'print\\MUDD169-X4600', longitude: -93.152491, latitude: 44.461017, page: 2 },
    { name: 'Music Hall 200', long_name: 'print\\MUSI200-X4600', longitude: -93.153594, latitude: 44.461406, page: 2 },
    { name: 'Olin 007', long_name: 'print\\OLIN007-X6350', page: 2 },
    { name: 'Olin 011', long_name: 'print\\OLIN011-X3600', page: 2 },
    { name: 'Olin 104', long_name: 'print\\OLIN104-X4510', page: 2 },
    { name: 'Olin 112', long_name: 'print\\OLIN112-X4510', page: 2 },
    { name: 'Olin 125 (Color)', long_name: 'print\\OLIN125-CC5051', page: 2 },
    { name: 'Olin 215 (Color)', long_name: 'print\\OLIN215-CC5051', page: 2 },
    { name: 'Olin 301', long_name: 'print\\OLIN301-X4600', longitude: -93.152821, latitude: 44.461334, page: 3 },
    { name: 'Olin 311', long_name: 'print\\OLIN311-X6350', page: 3 },
    { name: 'Olin 311 (Color)', long_name: 'print\\OLIN311-CC5051', page: 3 },
    { name: 'Rec Center 105 (Color)', long_name: 'print\\RSC105-CC5051', page: 3 },
    { name: 'Rec Center 235 (Color)', long_name: 'print\\RSC235-CC5051', page: 3 },
    { name: 'Sayles Lab', long_name: 'print\\SAYL-Public-X5550', longitude: -93.156028, latitude: 44.461604, page: 3 },
    { name: 'Sayles 050', long_name: 'print\\SAYL050-X6360', page: 3 },
    { name: 'Sayles 057', long_name: 'print\\SAYL057-CC5051', page: 3 },
    { name: 'Sayles 109', long_name: 'print\\SAYL109A-X4510', page: 3 },
    { name: 'Sayles 150', long_name: 'print\\SAYL150-X4510', page: 3 },
    { name: 'Scoville 014 (Color)', long_name: 'print\\SCOV014-CC5051', page: 3 },
    { name: 'Severance 014 (Color)', long_name: 'print\\SEVY014-CC5051', page: 3 },
    { name: 'Severance 129 (Color)', long_name: 'print\\SEVY129-CC5051', page: 3 },
    { name: 'Strong House 107 (Color)', long_name: 'print\\STRG107-CC5051', page: 3 },
    { name: 'TWCO 100 (Color)', long_name: 'print\\TWCO100-CC5051', page: 3 },
    { name: 'Weitz 003', long_name: 'print\\WCC003-X3610', page: 3 },
    { name: 'Weitz 028 (Color)', long_name: 'print\\WCC028-CC5051', longitude: -93.156182, latitude: 44.456656, page: 3 },
    { name: 'Weitz 138', long_name: 'print\\WCC138-X6360', longitude: -93.156286, latitude: 44.456792, page: 3 },
    { name: 'Weitz 146', long_name: 'print\\WCC146-X4500', page: 3 },
    { name: 'Weitz 225 (Color)', long_name: 'print\\WCC225-CC5051', page: 3 },
    { name: 'West Gym 200 (Color)', long_name: 'print\\WEST200-CC5051 ', page: 3 },
    { name: 'Willis 119', long_name: 'print\\WILL119-X4600', longitude: -93.156000, latitude: 44.460783, page: 3 },
    { name: 'Willis 310 (Color)', long_name: 'print\\WILL310-CC5051 ', page: 3 },
    { name: 'Willis 409', long_name: 'print\\WILL409-X4600', page: 3 }
  ];

  return {
    getClosestPrinter: function (callback) {
        navigator.geolocation.getCurrentPosition(function (location) {
        var lon = location.coords.longitude;
        var lat = location.coords.latitude;
        var closest = null;
        var closest_distance_sq = Infinity;
        for (var i in printers) {
          if (printers[i].longitude != null) {
            var dx = lon - printers[i].longitude;
            var dy = lat - printers[i].latitude;
            var distance_sq = dx * dx + dy * dy;
            if (distance_sq < closest_distance_sq) {
              closest_distance_sq = distance_sq;
              closest = printers[i];
            }
          }
        }
        callback(closest);
      });
    },
    printers: printers
  };
});
