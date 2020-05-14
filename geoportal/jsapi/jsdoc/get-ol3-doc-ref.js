var http = require("http");
var jsdom = require("jsdom");
var jquery = require("jquery");

jsdom.env({
    url: "https://openlayers.org/en/v3.20.1/apidoc/index.html",
    done: function(err, window) {
        $ = jquery(window);
        console.log("exports.registerOl3Link = function(helper) {");
        $('[data-name]').each(function (index, element) {
            if (element.querySelector('a') != null) {
                console.log(
                    "    helper.registerLink('" +
                    element.getAttribute("data-name") +
                    "', 'https://openlayers.org/en/v3.20.1/apidoc/" +
                    element.querySelector("a").getAttribute("href") +
                    "');"
                )
            }
        });
        console.log("}");
    }
});
