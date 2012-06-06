rasterizeHTML.js
================

Renders HTML into the browser's canvas.

How it works
------------

For security reasons rendering HTML into a canvas is severly limited. Firefox offers such a function via ctx.drawWindow(), but only with Chrome privileges (see https://developer.mozilla.org/en/Drawing_Graphics_with_Canvas).

As described in http://robert.ocallahan.org/2011/11/drawing-dom-content-to-canvas.html and https://developer.mozilla.org/en/HTML/Canvas/Drawing_DOM_objects_into_a_canvas however it is possible by embedding the HTML into an SVG image as a &lt;foreignObject&gt; and then drawing the resulting image via ctx.drawImage().

To cope with the existing limitations, rasterizeHTML.js will load external images and stylesheets and store them inline via data: URIs or inline style elements respectively.

Limitations
-----------

This code is experimental.

SVG is not allowed to link to external resources, as such all used resources need to be embedded using data: URIs. However resources can only be loaded if from the same origin, unless CORS is used.

Testing
-------

$ ./run_tests.sh

checks the code against JSHint and runs the unit tests via PhantomJS. Alternatively point your browser to test/SpecRunner.html (under Chrome you will need to load the page through a webserver).

Possibly due to a bug with the same origin policy under Webkit certain tests that need to read the canvas will fail.

Demo
----

See example.html

Author
------
Christoph Burgmer christoph.burgmer@gmail.com