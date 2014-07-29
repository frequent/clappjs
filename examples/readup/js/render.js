/* ====================================================================== */
/*                                Render                                  */
/* ====================================================================== */
declare("render", ["utilities"], function (module_list) {
  var render = {};

  render.set = function (content_dict, url_dict) {
    console.log(content_dict)
  };

  return render;
});

/*jslint indent: 2, maxlen: 80, nomen: true, todo: true */
/*global */

// this module should render content and fetch modules necessary to do it.
// it should keep the same logic as the previous loader, which means there
// will be a loop which runs over "storage" if requested and finishes with
// another loop to generate whatever data

// should be recursive and JSON based as before.

// Question is how to start
// I need an initial configuration file, which should initialize JIO
// where does this file come from? It should be from storage, but as it will
// setup storage, this won't work, so via Ajax.

// Also I'm mixing too many things here. The "rendering" part should be
// exchangeable, because I would like to use JQM or Famous for example.

// The question is where this part is addd to the process. In my current setup
// everything assembles into a single fragment, which is appended. If I'm using
// famous, I cannot append like that, I must follow what famous wants. Mh.

// Also to build content for a page I should first try to define the JSON
// scheme, which will describe how a page has to look like. HATE...? I guess.

// So the issue will be how to describe a page or content element in JSON.
// My generator just took a "graph" ------------> of elements and rendered
// them. THe elements were stored in a "gadget" definition, so this could be
// done in json now and served via jIO in HATEFORMAT.

// So HATE will describe what a container should look like by using a JSON
// skeleton. Na this will be fun.

// ===========================================================================
// HATE says the client should receive enough information in a respons to be
// able to navigate
// Crap, because clients will never know what rel=comment means and that
// communication with comments means to use POST
// Client should be HATE compliant = will get links and know how to navigate
// HATEOAS uses a stateless server
// HATEOAS = workflow = page:states hyperlink:transition
//

// all HATE-Links are JIO "paths"
{
    "content": [ {
        "price": 499.00,
        "description": "Apple tablet device",
        "name": "iPad",
        "links": [ {
            "rel": "self",
            "href": "http://localhost:8080/product/1"
        } ],
        "attributes": {
            "connector": "socket"
        }
    }, {
        "price": 49.00,
        "description": "Dock for iPhone/iPad",
        "name": "Dock",
        "links": [ {
            "rel": "self",
            "href": "http://localhost:8080/product/3"
        } ],
        "attributes": {
            "connector": "plug"
        }
    } ],
    "links": [ {
        "rel": "product.search",
        "href": "http://localhost:8080/product/search"
    } ]
}   