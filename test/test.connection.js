describe('Basic connection:', function() {
    it('global node should exist', function() {
        expect(window).to.have.property('node');
    });

    it('global W should exist', function() {
        expect(window).to.have.property('W');
    });
});


describe('Caching:', function() {
    var cachedURIs = [
        '/ultimatum/languageSelection.html',
        '/ultimatum/en_/instructions.html',
        '/ultimatum/en_/quiz.html',
        '/ultimatum/en_/bidder.html',
        '/ultimatum/en_/resp.html',
        '/ultimatum/en_/postgame.html',
        '/ultimatum/en_/ended.html'
    ];

    before(function(done) {
        if (!W.getFrame()) W.generateFrame();

        W.preCache(cachedURIs, function() { done(); });
    });

    it('should have preloaded given pages', function() {
        var i;

        expect(W.cache).to.exist;

        for (i = 0; i < cachedURIs.length; ++i) {
            expect(W.cache).to.have.property(cachedURIs[i])
                .with.property('contents').String;
        }
    });

    it('should display a cached page correctly', function(done) {
        W.loadFrame('/ultimatum/en_/instructions.html', function() {
            var documentElement;
            var body;
            var container;

            documentElement = W.getFrameDocument().documentElement;
            expect(documentElement).to.exist;

            body = documentElement.getElementsByTagName('body')[0];
            expect(body).to.exist;
            expect(body).to.have.property('children').that.is.not.empty;

            container = body.children[0];
            expect(container).to.have.property('children').that.is.not.empty;

            expect(container.children[0].tagName).to.equal('H1');
            expect(container.children[0].innerHTML).to.equal(
                'Instructions of the Ultimatum Game. ' +
                'Please read them carefully');

            done();
        }, { cache: { loadMode: 'cache' } });
    });

    /*
    it('should cache/load scripted pages correctly', function(done) {
        W.loadFrame('html/scripttest.html', function() {
            (iframe.contentDocument ? iframe.contentDocument
                : iframe.contentWindow.document).
                getElementById('scripttest_field').innerHTML.should.equal('1');

            W.loadFrame('html/scripttest.html', function() {
                var contentDocument = iframe.contentDocument
                    ? iframe.contentDocument
                    : iframe.contentWindow.document;
                var testfield =
                    contentDocument.getElementById('scripttest_field');

                testfield.innerHTML.should.equal('2');
                testfield.innerHTML = '0';

                W.loadFrame('html/scripttest.html', function() {
                    var contentDocument = iframe.contentDocument
                        ? iframe.contentDocument
                        : iframe.contentWindow.document;
                    var testfield =
                        contentDocument.getElementById('scripttest_field');

                    testfield.innerHTML.should.equal('3');
                    testfield.innerHTML = '0';

                    W.loadFrame('html/scripttest.html', function() {
                        (iframe.contentDocument ? iframe.contentDocument
                            : iframe.contentWindow.document).
                            getElementById('scripttest_field').innerHTML
                            .should.equal('1');

                        done();
                    }, { cache: { loadMode: 'cache', storeMode: 'onLoad' } });
                }, { cache: { loadMode: 'cache', storeMode: 'onClose' } });
            }, { cache: { loadMode: 'cache', storeMode: 'onLoad' } });
        }, { cache: { loadMode: 'reload', storeMode: 'onLoad' } });
    });
    */
});
