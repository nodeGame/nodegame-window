describe('Connection test:', function() {
    it('global node should exist', function() {
        window.should.have.property('node');
    });

    it('global W should exist', function() {
        window.should.have.property('W');
    });
});
