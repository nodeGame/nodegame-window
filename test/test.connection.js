describe('Basic connection:', function() {
    it('global node should exist', function() {
        window.should.have.property('node');
    });

    it('global W should exist', function() {
        window.should.have.property('W');
    });
});


describe('Caching:', function() {
    var langPath = 'en_/';
    var cachedURIs = [
        '/ultimatum/languageSelection.html',
        '/ultimatum/' + langPath + 'quiz.html',
        '/ultimatum/' + langPath + 'bidder.html',
        '/ultimatum/' + langPath + 'resp.html',
        '/ultimatum/' + langPath + 'postgame.html',
        '/ultimatum/' + langPath + 'ended.html'
    ];

    before(function(done) {
        W.preCache(cachedURIs, function() { done(); });
    });

    it('should have preloaded given pages', function() {
        var i;

        W.cache.should.exist;

        for (i = 0; i < cachedURIs.length; ++i) {
            W.cache.should.have.property(cachedURIs[i])
                .with.property('contents').String;
        }
    });

    /*
    it('should display a cached page correctly', function(done) {
        W.loadFrame('html/instructions.html', function() {
            var documentElement = (iframe.contentDocument ? iframe.contentDocument
                : iframe.contentWindow.document).documentElement;
            var body = documentElement.getElementsByTagName('body')[0];

            iframe.should.exist;
            documentElement.should.exist;
            body.should.exist;
            body.should.have.property('children').that.is.not.empty;

            body.children[0].tagName.should.equal('H1');
            body.children[0].innerHTML.trim().should.equal(
                'Instructions of the Ultimatum Game. ' +
                'Please read them carefully');

            done();
        }, { cache: { loadMode: 'cache' } });
    });

    it('should cache/load scripted pages correctly', function(done) {
        W.loadFrame('html/scripttest.html', function() {
            (iframe.contentDocument ? iframe.contentDocument
                : iframe.contentWindow.document).
                getElementById('scripttest_field').innerHTML.should.equal('1');

            W.loadFrame('html/scripttest.html', function() {
                var contentDocument = iframe.contentDocument ? iframe.contentDocument
                    : iframe.contentWindow.document;
                var testfield = contentDocument.getElementById('scripttest_field');

                testfield.innerHTML.should.equal('2');
                testfield.innerHTML = '0';

                W.loadFrame('html/scripttest.html', function() {
                    var contentDocument = iframe.contentDocument ? iframe.contentDocument
                        : iframe.contentWindow.document;
                    var testfield = contentDocument.getElementById('scripttest_field');

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
