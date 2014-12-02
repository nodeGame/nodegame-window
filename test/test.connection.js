describe('Connection test:', function() {
    it('true should be true', function() {
        true.should.be.true;
    });

    it('document should exist', function() {
        document.should.be.ok;
    });

    it('global node should exist', function() {
        window.should.have.property('node');
    });

    it('global W should exist', function() {
        window.should.have.property('W');
    });

    it('global Y should not exist', function() {
        window.should.not.have.property('Y');
    });
});
