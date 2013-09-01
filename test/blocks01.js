describe('init', function() {
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

    it('nb.block() will init only the top level block', function() {
        var $node = this.setHTML(
            '<div data-nb="block-parent">' +
                '<div data-nb="block1"/>' +
                '<div data-nb="block2"/>' +
            '</div>'
        );
        nb.block( $node[0] );
        expect(this.events).to.be.eql({ init: [ 'block-parent' ] });
    });

    it('top level block auto init does not cause children blocks to init', function() {
        this.setHTML(
            '<div data-nb="block-parent">' +
                '<div data-nb="block1"/>' +
                '<div data-nb="block2"/>' +
            '</div>'
        ).trigger('click');
        expect(this.events).to.be.eql({ init: [ 'block-parent' ], click: [ 'block-parent' ] });
    });

    it('nb.init() will init all blocks including parent block with _init class', function() {
        var $node = this.setHTML(
            '<div data-nb="block-parent" class="_init">' +
                '<div data-nb="block1"/>' +
                '<div data-nb="block2" class="_init"/>' +
            '</div>'
        );
        nb.init( $node[0] );
        expect(this.events).to.be.eql({ 'init': [ 'block-parent', 'block2' ] });
    });

    it('block.children() will init all children blocks', function() {
        var $node = this.setHTML(
            '<div data-nb="block-parent">' +
                '<div data-nb="block1">' +
                    '<div data-nb="block2"/>' +
                '</div>' +
            '</div>'
        );
        var block = nb.block( $node[0] );
        block.children();
        expect(this.events).to.be.eql({ init: [ 'block-parent', 'block1', 'block2' ] });
    });

});
