/*
TODO:
1. 1940, 1950 no data for Alaska, Hawaii
2. Refactor/Lint
3. Do for occupation trends?
*/

function unique(array) {
/* http://stackoverflow.com/questions/10191941/jquery-unique-on-an-array-of-strings */
  return $.grep(array, function(el, index) {
      return index === $.inArray(el, array);
  });
}

function sortArrays(tarray, toutarray, txcatout) {
  tarray = tarray.sort(Comparator);
  $.each(tarray, function (x, y) {
    txcatout.push(y[0]);
    if (y[0] == "US") {
      toutarray.push({y: y[1], color: 'red'});
    }
    else {
      toutarray.push(y[1]);
    };
  });
};

function Comparator(a, b) {
  // sorts by descending - flip signs to sort ascending
   if (a[1] > b[1]) return -1;
   if (a[1] < b[1]) return 1;
   return 0;
}

function pushData(dobj, things) {
  dobj.push({'year': things[0],
          'ind': things[1],
          'pop': parseFloat(things[2]),
          'pct': parseFloat(things[3]) * 100,
          'chgPct': parseFloat(things[4]),
          'stname': things[5],
          'stabbr': things[6],
          'maxInd': parseFloat(things[7])
      });
}
var default_colors = ['#7cb5ec', '#434348', '#90ed7d', '#f7a35c', '#8085e9',
   '#f15c80', '#e4d354', '#2b908f', '#f45b5b', '#91e8e1']

$(document).ready(function () {
  var chartdata = [];
  var ind_array = [];
  var st_array = [];
  var natseries = [];
  var timer, btnYearValue;

  $.get('data.tsv', function (idata, status) {
      var lines = idata.split('\n');

      $.each(lines, function(lineNo, line) {
        var items = line.split('\t');
        if (lineNo > 0) {
          if (parseFloat(items[0]) <= 2000 || parseFloat(items[0]) === 2010 || parseFloat(items[0]) === 2015) {
            pushData(chartdata, items);
            if (items[5] === "National") {
              ind_array.push(items[1]);
            } else {
              st_array.push(items[5]);
            }
          }
        }
      });
      ind_array = unique(ind_array);
      st_array = unique(st_array);

      for (var i = 0; i < ind_array.length; i += 1) {
        if (ind_array[i]) {
          var temp2 = {"name": null, "data": [], visible: false};
          $.each($.grep(chartdata, function (n, i) {
            return n.stname === "National";
          }), function (itemno, item) {
            if (item.ind === ind_array[i]) {
              temp2["name"] = ind_array[i];
              if (ind_array[i] === "Agriculture and mining" || ind_array[i] === "Manufacturing") {
                temp2.visible = true;
              } else {
                temp2.visible = false;
              }
              temp2["data"].push([item.year, item.pct]);
            }
          });
          natseries.push(temp2);
        };
      };

      function drillMap(pyear, pstate) {
        if (timer) {
          clearInterval(timer);
        };

        var drillDat = $.grep(chartdata, function (n, i) {
          return n.year <= pyear && n.stname === pstate;
        });
        var drillDatCurrDist = $.grep(drillDat, function (n, i) {
          return n.year === pyear;
        });
        var mapCurrDist = [];
        var mapSeries = [];
        var colorToUse = [];
        $.each(drillDatCurrDist, function (i, n) {
          mapCurrDist.push([n.ind, n.pct]);
        });
        mapCurrDist.sort(function (a, b) {
          return b[1] - a[1];
        });
        $.each(mapCurrDist, function (itemno, item) {
          colorToUse.push(default_colors[ind_array.indexOf(item[0])]);
        });

        for (var i = 0; i < ind_array.length; i += 1) {
          if (ind_array[i]) {
            temp2 = {"name": null, "data": [], visible: false, color: null};
            $.each(drillDat, function (itemno, item) {
              if (item.ind === ind_array[i]) {
                temp2["name"] = ind_array[i];
                if (ind_array[i] === mapCurrDist[0][0]) {
                  temp2.visible = true;
                } else {
                  temp2.visible = false;
                }
                temp2["data"].push([item.year, item.pct]);
                temp2["color"] = default_colors[ind_array.indexOf(ind_array[i])]
              }
            });
            mapSeries.push(temp2);
          };
        };

        $("#mapModal").modal('show');
        $("#modal-title").html("Employment changes for " + pstate);
        $("#modal-distyr").highcharts({
          chart: {
            type: "bar"
          },
          title: {
            text: "Industry employment in " + pyear
          },
          xAxis: {
            type: "category"
          },
          yAxis: {
            title: ""
          },
          tooltip: {
            pointFormatter: function() {
              return "<b>" + pyear + ": </b>" + this.y.toFixed(1) + ' %';
            }
          },
          credits: {
            enabled: false
          },
          legend: {
            enabled: false
          },
          plotOptions: {
            series: {
              colorByPoint: true,
              colors: colorToUse
            }
          },
          series: [{
            data: mapCurrDist
          }]
        });
        if (pyear !== "1940") {
          $("#modal-disttime").highcharts({
            chart: {
              type: "line"
            },
            title: {
              text: "Employment change from 1940-" + pyear
            },
            xAxis: {
              type: "category"
            },
            yAxis: {
              title: {
                text: ''
              },
              plotLines: [{
                value: 0,
                width: 1,
                color: '#808080'
              }]
            },
            credits: {
              text: "Click on legend to toggle data series"
            },
            tooltip: {
              formatter: function () {
                return ('<span style="font-size: 80%">' + this.key + '</span>' +
                  '<br><span style="color:'+ this.series.color +'">\u25CF</span> ' + this.series.name + ": " +
                  '<b>' + this.y.toFixed(1) + "%<b>");
              }
            },
            series: mapSeries
          });
        } else {
          $("#modal-disttime").empty();
        }

      };

      /* Return data for specified year with largest industry for each state */
      function data2map(pyear) {
        var mapdata = $.grep(chartdata, function (n, i) {
          return n.year === pyear && n.stname !== "National" && n.maxInd === 1;
        })
        /* Create an array of unique industries to color the states */
        var maxindarray = [];
        $.each(mapdata, function (i, n) {
          maxindarray.push(n.ind);
        });
        maxindarray = unique(maxindarray);
        /* Loop over array to create data for map */
        var mapMaxInd = [];
        var mapMax = []
        for (i = 0; i < maxindarray.length; i += 1) {
          mapMaxInd.push({"name": maxindarray[i], "from": i, "to": i + 1, color: default_colors[ind_array.indexOf(maxindarray[i])]});
          /* Loop over data to create values */
          for (j = 0; j < mapdata.length; j += 1) {
            if (mapdata[j].ind === maxindarray[i]) {
              mapMax.push({"stname":mapdata[j].stname, "stabbr": mapdata[j].stabbr, "value": i, "pct":  mapdata[j].pct});
            }
          }
        }

        $('#map_state').highcharts('Map', {
            chart : {
                borderWidth : 1,
            },
            title : {
                text : 'Industry with largest employment: ' + pyear
            },
            legend: {
                layout: 'horizontal',
                borderWidth: 0,
                backgroundColor: 'rgba(255,255,255,0.85)',
                floating: true,
                verticalAlign: 'top',
                y: 25
            },
            mapNavigation: {
                enabled: true
            },
            credits: {
              enabled: false
            },
            colorAxis: {
              dataClasses: mapMaxInd
            },
            legend: {
              align: "center",
              verticalAlign: "bottom",
              layout: "horizontal"
            },
            plotOptions: {
              series: {
                point: {
                  events: {
                    click: function () {
                      //console.log(this.name);
                      //console.log(this['postal-code']);
                      btnYearValue = $(".btn-years.active").text();
                      drillMap(btnYearValue, this.name);
                    }
                  }
                }
              }
            },
            series : [{
                animation: {
                    duration: 1000
                },
                data : mapMax,
                name: "Industry with highest employment",
                mapData: Highcharts.maps['countries/us/us-all'],
                joinBy: ['postal-code', 'stabbr'],
                dataLabels: {
                    enabled: false /*,
                    color: '#FFFFFF',
                    format: '{point.state}' */
                },
                tooltip: {
                  headerFormat: "<b>{point.key}: <b><br>",
                  pointFormatter: function() {
                    return "<b>" +  mapMaxInd[this.value].name + ": </b>" + this.pct.toFixed(1) + ' % <br> Click for details';
                  }
                  /* pointFormat: '{point.stname}: {point.pct:.1f} %' */
                }
            }]
        });
      };
      data2map("2015");
      $("#b1940").click(function () {
        data2map("1940");
      });
      $("#b1950").click(function () {
        data2map("1950");
      });
      $("#b1960").click(function () {
        data2map("1960");
      });
      $("#b1970").click(function () {
        data2map("1970");
      });
      $("#b1980").click(function () {
        data2map("1980");
      });
      $("#b1990").click(function () {
        data2map("1990");
      });
      $("#b2000").click(function () {
        data2map("2000");
      });
      $("#b2010").click(function () {
        data2map("2010");
      });
      $("#b2015").click(function () {
        data2map("2015");
      });
      $("#bbackward").click(function () {
        data2map("1940");
      });
      $("#bforward").click(function () {
        data2map("2015");
      });

      $("#bsbackward").click(function () {
        if ($("#b2015").hasClass("active")) {
          $("#b2010").click();
        } else if ($("#b2010").hasClass("active")) {
          $("#b2000").click();
        } else if ($("#b2000").hasClass("active")) {
          $("#b1990").click();
        } else if ($("#b1990").hasClass("active")) {
          $("#b1980").click();
        } else if ($("#b1980").hasClass("active")) {
          $("#b1970").click();
        } else if ($("#b1970").hasClass("active")) {
          $("#b1960").click();
        } else if ($("#b1960").hasClass("active")) {
          $("#b1950").click();
        } else if ($("#b1950").hasClass("active")) {
          $("#b1940").click();
        }
      });
      $("#bsforward").click(function () {
        if ($("#b2010").hasClass("active")) {
          $("#b2015").click();
        } else if ($("#b2000").hasClass("active")) {
          $("#b2010").click();
        } else if ($("#b1990").hasClass("active")) {
          $("#b2000").click();
        } else if ($("#b1980").hasClass("active")) {
          $("#b1990").click();
        } else if ($("#b1970").hasClass("active")) {
          $("#b1980").click();
        } else if ($("#b1960").hasClass("active")) {
          $("#b1970").click();
        } else if ($("#b1950").hasClass("active")) {
          $("#b1960").click();
        } else if ($("#b1940").hasClass("active")) {
          $("#b1950").click();
        }
      });

      $("#startPlay").click(function () {
          var yearsToCycle = ["1950", "1960", "1970", "1980", "1990", "2000", "2010", "2015"];
          $("#b1940").click();
          var cnt = 0;
          timer = setInterval(function() { /* setTimeout? */
            if (cnt === yearsToCycle.length) {
              clearInterval(timer);
            }
            $("#b" + yearsToCycle[cnt]).click();
            cnt += 1;
          }, 5000);
      });

      $("#stopPlay").click(function () {
        clearInterval(timer);
      });

      function natchgchart(ptitle) {
        $("#schg").highcharts({
          chart: {
            type: "bar"
          },
          title: {
            text: ptitle
          },
          xAxis: {
            type: "category"
          },
          yAxis: {
            max: 100,
            title: ""
          },
          tooltip: {
            pointFormatter: function() {
              return "<b>" + this.series.name + ": </b>" + this.y.toFixed(1) + ' %';
            }
          },
          credits: {
            text: "Click on legend to toggle data series"
          },
          legend: {
            align: "right",
            verticalAlign: "middle",
            layout: "vertical"
          },
          plotOptions: {
            series: {
              stacking: "normal"
            }
          },
          series: natseries
        })
      }
      natchgchart(ptitle = "Employment in agriculture, mining and manufacturing declined from over 40 percent to less than 15 percent between 1940 and 2015");

      $("#b1").click(function () {
        $.each(natseries, function (itemno, item) {
          if (item.name === "Agriculture and mining" || item.name === "Manufacturing") {
            item.visible = true;
          } else {
            item.visible = false;
          };
        });
        natchgchart(ptitle = "Employment in agriculture, mining and manufacturing declined from over 40 percent to less than 15 percent between 1940 and 2015");
      });

      $("#b2").click(function () {
        $.each(natseries, function (itemno, item) {
          if (item.name === "Educational services and public administration" || item.name === "Health care and social services" || item.name === "Professional, management, and administrative services") {
            item.visible = true;
          } else {
            item.visible = false;
          };
        });
        natchgchart(ptitle = "Their decline has been replaced by employment in services which increased from 10 percent to almost 40 percent between 1940 and 2015");
      });

      $("#b3").click(function () {
        $.each(natseries, function (itemno, item) {
          item.visible = true;
        });
        natchgchart(ptitle = "Employment shares for all industries 1940-2015");
      });

      $(".btn-narrate .btn").click(function(){
          $(".btn-narrate .btn").removeClass("active");
          $(this).addClass("active");
        });
      $(".btn-years").click(function(){
          $(".btn-years").removeClass("active");
          $(this).addClass("active");
        });

    });

});
