describe("Inline CSS links", function () {
    var doc, anotherCssLink, cssLink, extractCssUrlSpy, joinUrlSpy, ajaxSpy,
        adjustPathsOfCssResourcesSpy, loadCSSImportsForRulesSpy, loadAndInlineCSSResourcesForRulesSpy, workAroundWebkitBugIgnoringTheFirstRuleInCSSSpy,
        callback;

    beforeEach(function () {
        doc = document.implementation.createHTMLDocument("");

        extractCssUrlSpy = spyOn(rasterizeHTMLInline.css, "extractCssUrl").andCallFake(function (cssUrl) {
            if (/^url/.test(cssUrl)) {
                return cssUrl.replace(/^url\("?/, '').replace(/"?\)$/, '');
            } else {
                throw "error";
            }
        });
        joinUrlSpy = spyOn(rasterizeHTMLInline.util, "joinUrl");
        ajaxSpy = spyOn(rasterizeHTMLInline.util, "ajax");
        adjustPathsOfCssResourcesSpy = spyOn(rasterizeHTMLInline.css, 'adjustPathsOfCssResources');
        loadCSSImportsForRulesSpy = spyOn(rasterizeHTMLInline.css, 'loadCSSImportsForRules').andCallFake(function (cssRules, baseUrl, cache, alreadyLoadedCssUrls, callback) {
            callback(false, []);
        });
        loadAndInlineCSSResourcesForRulesSpy = spyOn(rasterizeHTMLInline.css, 'loadAndInlineCSSResourcesForRules').andCallFake(function (cssRules, baseUrl, cache, callback) {
            callback(false, []);
        });
        workAroundWebkitBugIgnoringTheFirstRuleInCSSSpy = spyOn(rasterizeHTMLInline.css, 'workAroundWebkitBugIgnoringTheFirstRuleInCSS').andCallFake(function (content) {
            return content;
        });

        callback = jasmine.createSpy("loadAndInlineCssCallback");

        cssLink = window.document.createElement("link");
        cssLink.href = "url/some.css";
        cssLink.rel = "stylesheet";
        cssLink.type = "text/css";

        anotherCssLink = window.document.createElement("link");
        anotherCssLink.href = "url/another.css";
        anotherCssLink.rel = "stylesheet";
        anotherCssLink.type = "text/css";

        ajaxSpy.andCallFake(function (url, options, success, error) {
            // href will return absolute path, attributes.href.nodeValue relative one
            if (url === cssLink.href || url === cssLink.attributes.href.nodeValue) {
                success("p { font-size: 14px; }");
            } else if (url === anotherCssLink.href || url === anotherCssLink.attributes.href.nodeValue) {
                success("a { text-decoration: none; }");
            } else {
                error(url);
            }
        });
    });

    it("should do nothing if no linked CSS is found", function () {
        rasterizeHTMLInline.loadAndInlineCssLinks(doc, callback);

        expect(callback).toHaveBeenCalled();
        expect(doc.head.getElementsByTagName("style").length).toEqual(0);
    });

    it("should not touch non-CSS links", function () {
        var faviconLink = window.document.createElement("link");
        faviconLink.href = "favicon.ico";
        faviconLink.type = "image/x-icon";

        doc.head.appendChild(faviconLink);

        rasterizeHTMLInline.loadAndInlineCssLinks(doc, callback);

        expect(callback).toHaveBeenCalled();
        expect(doc.head.getElementsByTagName("style").length).toEqual(0);
        expect(doc.head.getElementsByTagName("link").length).toEqual(1);
    });

    it("should inline linked CSS", function () {
        doc.head.appendChild(cssLink);

        rasterizeHTMLInline.loadAndInlineCssLinks(doc, callback);

        expect(callback).toHaveBeenCalled();
        expect(doc.head.getElementsByTagName("style").length).toEqual(1);
        expect(doc.head.getElementsByTagName("style")[0].textContent).toEqual("p { font-size: 14px; }");
        expect(doc.head.getElementsByTagName("link").length).toEqual(0);
    });

    it("should inline linked CSS without a type", function () {
        var noTypeCssLink = window.document.createElement("link");
        noTypeCssLink.href = cssLink.href;
        noTypeCssLink.rel = "stylesheet";

        doc.head.appendChild(noTypeCssLink);

        rasterizeHTMLInline.loadAndInlineCssLinks(doc, callback);

        expect(callback).toHaveBeenCalled();
        expect(doc.head.getElementsByTagName("style").length).toEqual(1);
        expect(doc.head.getElementsByTagName("style")[0].textContent).toEqual("p { font-size: 14px; }");
        expect(doc.head.getElementsByTagName("link").length).toEqual(0);
    });

    it("should inline multiple linked CSS and keep order", function () {
        var inlineCss = window.document.createElement("style");

        inlineCss.type = "text/css";
        inlineCss.textContent = "span { margin: 0; }";

        doc.head.appendChild(cssLink);
        doc.head.appendChild(inlineCss);
        doc.head.appendChild(anotherCssLink);

        rasterizeHTMLInline.loadAndInlineCssLinks(doc, callback);

        expect(callback).toHaveBeenCalled();
        expect(doc.head.getElementsByTagName("style").length).toEqual(3);
        expect(doc.head.getElementsByTagName("style")[0].textContent.trim()).toEqual("p { font-size: 14px; }");
        expect(doc.head.getElementsByTagName("style")[1].textContent.trim()).toEqual("span { margin: 0; }");
        expect(doc.head.getElementsByTagName("style")[2].textContent.trim()).toEqual("a { text-decoration: none; }");
        expect(doc.head.getElementsByTagName("link").length).toEqual(0);
    });

    it("should not add inline CSS if no content given", function () {
        var emptyCssLink = window.document.createElement("link");
        emptyCssLink.href = "url/empty.css";
        emptyCssLink.rel = "stylesheet";
        emptyCssLink.type = "text/css";

        doc.head.appendChild(emptyCssLink);

        // Circumvent Firefox having an issue locally loading empty files and returning a "404" instead.
        ajaxSpy.andCallFake(function (url, options, success) {
            success("");
        });

        rasterizeHTMLInline.loadAndInlineCssLinks(doc, callback());

        expect(callback).toHaveBeenCalled();
        expect(doc.head.getElementsByTagName("style").length).toEqual(0);
        expect(doc.head.getElementsByTagName("link").length).toEqual(0);
    });

    it("should inline CSS imports", function () {
        doc.head.appendChild(cssLink);

        rasterizeHTMLInline.loadAndInlineCssLinks(doc, callback);

        expect(loadCSSImportsForRulesSpy).toHaveBeenCalled();
        expect(loadCSSImportsForRulesSpy.mostRecentCall.args[0][0].cssText).toMatch(/p \{\s*font-size: 14px;\s*\}/);
    });

    it("should inline CSS resources", function () {
        doc.head.appendChild(cssLink);

        rasterizeHTMLInline.loadAndInlineCssLinks(doc, callback);

        expect(loadAndInlineCSSResourcesForRulesSpy).toHaveBeenCalled();
        expect(loadAndInlineCSSResourcesForRulesSpy.mostRecentCall.args[0][0].cssText).toMatch(/p \{\s*font-size: 14px;\s*\}/);
    });

    it("should respect the document's baseURI when loading linked CSS", function () {
        joinUrlSpy.andCallFake(function (base, rel) {
            return "url/" + rel;
        });

        doc = rasterizeHTMLTestHelper.readDocumentFixture("externalCSS.html");

        rasterizeHTMLInline.loadAndInlineCssLinks(doc, callback);

        expect(callback).toHaveBeenCalled();
        expect(joinUrlSpy).toHaveBeenCalledWith(doc.baseURI, "some.css");

        expect(doc.getElementsByTagName("style").length).toEqual(1);
        expect(doc.getElementsByTagName("style")[0].textContent).toEqual("p { font-size: 14px; }");
        expect(doc.getElementsByTagName("link").length).toEqual(0);

        expect(loadCSSImportsForRulesSpy.mostRecentCall.args[1]).toEqual(doc.baseURI);
        expect(loadAndInlineCSSResourcesForRulesSpy.mostRecentCall.args[1]).toEqual(doc.baseURI);
    });

    it("should respect optional baseUrl when loading linked CSS", function () {
        joinUrlSpy.andCallFake(function (base, rel) {
            return "url/" + rel;
        });

        doc = rasterizeHTMLTestHelper.readDocumentFixtureWithoutBaseURI("externalCSS.html");

        rasterizeHTMLInline.loadAndInlineCssLinks(doc, {baseUrl: jasmine.getFixtures().fixturesPath}, callback);

        expect(callback).toHaveBeenCalled();
        expect(joinUrlSpy).toHaveBeenCalledWith(jasmine.getFixtures().fixturesPath, "some.css");

        expect(loadCSSImportsForRulesSpy.mostRecentCall.args[1]).toEqual(jasmine.getFixtures().fixturesPath);
        expect(loadAndInlineCSSResourcesForRulesSpy.mostRecentCall.args[1]).toEqual(jasmine.getFixtures().fixturesPath);
    });

    it("should favour explicit baseUrl over document.baseURI when loading linked CSS", function () {
        var baseUrl = jasmine.getFixtures().fixturesPath;

        joinUrlSpy.andCallFake(function (base, rel) {
            return "url/" + rel;
        });

        doc = rasterizeHTMLTestHelper.readDocumentFixture("externalCSS.html");
        expect(doc.baseURI).not.toBeNull();
        expect(doc.baseURI).not.toEqual("about:blank");
        expect(doc.baseURI).not.toEqual(baseUrl);

        rasterizeHTMLInline.loadAndInlineCssLinks(doc, {baseUrl: jasmine.getFixtures().fixturesPath}, callback);

        expect(callback).toHaveBeenCalled();
        expect(joinUrlSpy).toHaveBeenCalledWith(jasmine.getFixtures().fixturesPath, "some.css");

        expect(loadCSSImportsForRulesSpy.mostRecentCall.args[1]).toEqual(jasmine.getFixtures().fixturesPath);
        expect(loadAndInlineCSSResourcesForRulesSpy.mostRecentCall.args[1]).toEqual(jasmine.getFixtures().fixturesPath);
    });

    it("should map resource paths relative to the stylesheet", function () {
        var cssWithRelativeResource;

        cssWithRelativeResource = window.document.createElement("link");
        cssWithRelativeResource.href = "below/some.css";
        cssWithRelativeResource.rel = "stylesheet";
        cssWithRelativeResource.type = "text/css";

        doc.head.appendChild(cssWithRelativeResource);

        joinUrlSpy.andCallThrough();
        ajaxSpy.andCallFake(function (url, options, success) {
            if (url === "some_url/below/some.css") {
                success('div { background-image: url("../green.png"); }\n' +
                    '@font-face { font-family: "test font"; src: url("fake.woff"); }');
            }
        });

        rasterizeHTMLInline.loadAndInlineCssLinks(doc, {baseUrl: "some_url/"}, callback);

        expect(adjustPathsOfCssResourcesSpy).toHaveBeenCalledWith("below/some.css", jasmine.any(Object));
    });

    it("should circumvent caching if requested", function () {
        doc.head.appendChild(cssLink);

        rasterizeHTMLInline.loadAndInlineCssLinks(doc, {cache: false}, callback);

        expect(ajaxSpy).toHaveBeenCalledWith(cssLink.attributes.href.nodeValue, {
            cache: false
        }, jasmine.any(Function), jasmine.any(Function));
        expect(callback).toHaveBeenCalled();

        expect(loadCSSImportsForRulesSpy.mostRecentCall.args[2]).toBeFalsy();
        expect(loadAndInlineCSSResourcesForRulesSpy.mostRecentCall.args[2]).toBeFalsy();
    });

    it("should not circumvent caching by default", function () {
        doc.head.appendChild(cssLink);

        rasterizeHTMLInline.loadAndInlineCssLinks(doc, callback);

        expect(ajaxSpy).toHaveBeenCalledWith(cssLink.attributes.href.nodeValue, {
            cache: true
        }, jasmine.any(Function), jasmine.any(Function));
        expect(callback).toHaveBeenCalled();

        expect(loadCSSImportsForRulesSpy.mostRecentCall.args[2]).toBeTruthy();
        expect(loadAndInlineCSSResourcesForRulesSpy.mostRecentCall.args[2]).toBeTruthy();
    });

    it("should apply workaround for WebKit", function () {
        doc.head.appendChild(cssLink);

        workAroundWebkitBugIgnoringTheFirstRuleInCSSSpy.andCallFake(function () {
            return "workaround css";
        });

        rasterizeHTMLInline.loadAndInlineCssLinks(doc, callback);

        expect(doc.head.getElementsByTagName("style")[0].textContent).toEqual("workaround css");
    });

    describe("error handling", function () {
        var brokenCssLink, anotherBrokenCssLink;

        beforeEach(function () {
            brokenCssLink = window.document.createElement("link");
            brokenCssLink.href = "a_document_that_doesnt_exist.css";
            brokenCssLink.rel = "stylesheet";
            brokenCssLink.type = "text/css";

            anotherBrokenCssLink = window.document.createElement("link");
            anotherBrokenCssLink.href = "another_document_that_doesnt_exist.css";
            anotherBrokenCssLink.rel = "stylesheet";
            anotherBrokenCssLink.type = "text/css";

            joinUrlSpy.andCallThrough();
        });

        it("should report an error if a stylesheet could not be loaded", function () {
            doc.head.appendChild(brokenCssLink);

            rasterizeHTMLInline.loadAndInlineCssLinks(doc, {baseUrl: "some_base_url/"}, callback);

            expect(callback).toHaveBeenCalledWith([{
                resourceType: "stylesheet",
                url: "some_base_url/a_document_that_doesnt_exist.css",
                msg: "Unable to load stylesheet some_base_url/a_document_that_doesnt_exist.css"
            }]);
        });

        it("should only report a failing stylesheet as error", function () {
            doc.head.appendChild(brokenCssLink);
            doc.head.appendChild(cssLink);

            rasterizeHTMLInline.loadAndInlineCssLinks(doc, callback);

            expect(callback).toHaveBeenCalledWith([{
                resourceType: "stylesheet",
                url: "a_document_that_doesnt_exist.css",
                msg: jasmine.any(String)
            }]);
        });

        it("should report multiple failing stylesheets as error", function () {
            doc.head.appendChild(brokenCssLink);
            doc.head.appendChild(anotherBrokenCssLink);

            rasterizeHTMLInline.loadAndInlineCssLinks(doc, callback);

            expect(callback).toHaveBeenCalledWith([jasmine.any(Object), jasmine.any(Object)]);
            expect(callback.mostRecentCall.args[0][0]).not.toEqual(callback.mostRecentCall.args[0][1]);
        });

        it("should report errors from inlining resources", function () {
            doc.head.appendChild(cssLink);

            loadCSSImportsForRulesSpy.andCallFake(function (cssRules, baseUrl, cache, alreadyLoadedCssUrls, callback) {
                callback(false, ["import inline error"]);
            });
            loadAndInlineCSSResourcesForRulesSpy.andCallFake(function (cssRules, baseUrl, cache, callback) {
                callback(false, ["resource inline error"]);
            });

            rasterizeHTMLInline.loadAndInlineCssLinks(doc, callback);

            expect(callback).toHaveBeenCalledWith(["import inline error", "resource inline error"]);
        });

        it("should report an empty list for a successful stylesheet", function () {
            doc.head.appendChild(cssLink);

            rasterizeHTMLInline.loadAndInlineCssLinks(doc, callback);

            expect(callback).toHaveBeenCalledWith([]);
        });
    });
});