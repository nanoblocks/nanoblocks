describe('local events', function() {
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
            'blur': onEvent
        }});
        nb.define('block2', { events: {
            'blur .inner': onEvent
        }});
    });

    afterEach(function() {
        this.$html.remove();
    });

    it('local event cannot init the block', function() {
        this.setHTML(
            '<input type="text" data-nb="block1"/>'
        ).trigger('blur');
        expect(this.events).to.be.eql({});
    });

    it('listen local dom events', function() {
        var $node = this.setHTML(
            '<input type="text" data-nb="block1"/>'
        );
        nb.block( $node[0] );
        $node.trigger('blur');
        expect(this.events).to.be.eql({ 'blur': [ 'block1' ] });
    });

    // @doc
    // NOTE: blur will be converted to focusout because it can bubble (from jquery by design)
    it('listen local dom events on nested elements', function() {
        var $node = this.setHTML(
            '<div data-nb="block2">' +
                '<input class="inner" type="text">' +
            '</div>'
        );
        nb.block( $node[0] );
        $node.find('.inner').trigger('blur');
        expect(this.events).to.be.eql({ 'focusout': [ 'block2' ] });
    });

});
