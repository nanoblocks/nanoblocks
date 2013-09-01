describe('children', function() {
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

        nb.define('block-parent', { events: {
            'init': onEvent,
            'click': onEvent
        }});
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

    it('block.children() init and return nested blocks', function() {
        var $node = this.setHTML(
            '<div data-nb="block-parent">' +
                '<div data-nb="block1">' +
                    '<div data-nb="block2"/>' +
                '</div>' +
            '</div>'
        );
        var block = nb.block( $node[0] );
        var children = block.children();

        expect(children.length).to.be.eql(2);
        expect(children.map(function(child) { return child.name; })).to.be.eql([ 'block1', 'block2' ]);
        expect(this.events).to.be.eql({ init: [ 'block-parent', 'block1', 'block2' ] });
    });

    it('block.children() init and return multiple blocks, defined on same node', function() {
        var $node = this.setHTML(
            '<div data-nb="block-parent">' +
                '<div data-nb="block1 block2"/>' +
            '</div>'
        );
        var block = nb.block( $node[0] );
        var children = block.children();

        expect(children.length).to.be.eql(2);
        expect(children.map(function(child) { return child.name; })).to.be.eql([ 'block1', 'block2' ]);
        expect(this.events).to.be.eql({ init: [ 'block-parent', 'block1', 'block2' ] });
    });

});
