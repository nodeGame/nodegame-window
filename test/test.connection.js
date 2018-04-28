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
        '/testergame/test/instructions.html',
        '/testergame/test/quiz.html'
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
                .with.property('contents').string;
        }
    });

    it('should display a cached page correctly', function(done) {
        W.loadFrame('/testergame/test/instructions.html', function() {
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
                'Instructions of the Tester Game. ' +
                'Please read them carefully');

            done();
        }, { cache: { loadMode: 'cache' } });
    });

    it('should cache/load scripted pages correctly', function(done) {
        var scriptPath = '/testergame/test/scripttest.html';
        var fieldId = 'scripttest_field';

        var stage1 = function() {
            var testfield = W.getFrameDocument().getElementById(fieldId);

            expect(testfield).to.exist;
            expect(testfield.innerHTML).to.equal('1');

            W.loadFrame(scriptPath, stage2,
                { cache: { loadMode: 'cache', storeMode: 'onLoad' } });
        };

        var stage2 = function() {
            var testfield = W.getFrameDocument().getElementById(fieldId);

            expect(testfield).to.exist;
            expect(testfield.innerHTML).to.equal('2');
            testfield.innerHTML = '0';

            W.loadFrame(scriptPath, stage3,
                { cache: { loadMode: 'cache', storeMode: 'onClose' } });
        };

        var stage3 = function() {
            var testfield = W.getFrameDocument().getElementById(fieldId);

            expect(testfield).to.exist;
            expect(testfield.innerHTML).to.equal('3');
            testfield.innerHTML = '0';

            W.loadFrame(scriptPath, stage4,
                    { cache: { loadMode: 'cache', storeMode: 'onLoad' } });
        };

        var stage4 = function() {
            var testfield = W.getFrameDocument().getElementById(fieldId);

            expect(testfield).to.exist;
            expect(testfield.innerHTML).to.equal('1');

            done();
        };

        W.loadFrame(scriptPath, stage1,
                { cache: { loadMode: 'reload', storeMode: 'onLoad' } });
    });
});
