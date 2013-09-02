describe('block init', function() {
    beforeEach(function() {
        var that = this;
        this.setHTML = function(html) {
            that.$html = $(html);
            that.$html.appendTo(document.body);
            return that.$html;
        };

        var events = this.events = {};
        var returns = this.returns = {};

        var onEvent = function(evt) {
            var type = typeof evt === 'string' ? evt : evt.type;

            events[type] = events[type] || [];
            returns[type] = returns[type] || {};

            events[type].push(this.name);

            return returns[type][this.name];
        };

        nb.define('block1', { events: {
            'init': onEvent
        }});
        nb.define('block2', { events: {
            'init': onEvent
        }});
    });

    afterEach(function() {
        this.$html.remove();
    });

    it('hasBlock()', function() {
        var node = this.setHTML(
            '<div data-nb="block1 block2"/>'
        )[0];

        expect( nb.hasBlock(node) ).to.be.eql(false);

        nb.block(node, null, 'block1');
        expect( nb.hasBlock(node) ).to.be.eql(true);
        expect( nb.hasBlock(node, 'block1') ).to.be.eql(true);
        expect( nb.hasBlock(node, 'block2') ).to.be.eql(false);

        nb.block(node, null, 'block2');
        expect( nb.hasBlock(node) ).to.be.eql(true);
        expect( nb.hasBlock(node, 'block1') ).to.be.eql(true);
        expect( nb.hasBlock(node, 'block2') ).to.be.eql(true);
    });

    it('init all blocks on one node', function() {
        var $node = this.setHTML(
            '<div data-nb="block1 block2"/>'
        );
        nb.block( $node[0] );
        expect(this.events).to.be.eql({ init: [ 'block1', 'block2' ] });
    });

    it('init specific block on node', function() {
        var $node = this.setHTML(
            '<div data-nb="block1 block2"/>'
        );
        nb.block( $node[0], null, 'block2' );
        expect(this.events).to.be.eql({ init: [ 'block2' ] });
    });

});
