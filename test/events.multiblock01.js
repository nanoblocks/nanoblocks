describe('2 blocks on 1 node', function() {
    beforeEach(function() {
        var that = this;
        this.setHTML = function(html) {
            that.$html = $(html);
            that.$html.appendTo(document.body);
            return that.$html;
        };

        var clicks = this.clicks = [];
        var returns = this.returns = {};
        var onClickBlock = function() {
            clicks.push(this.name);
            return returns[this.name];
        };

        nb.define('block1', { events: { click: onClickBlock } });
        nb.define('block2', { events: { click: onClickBlock } });
        nb.define('block-parent', { events: {click: onClickBlock } });
    });

    afterEach(function() {
        this.$html.remove();
    });

    it('all get the click', function() {
        this.setHTML(
            '<div data-nb="block-parent">' +
                '<div class="inner" data-nb="block1 block2"></div>' +
            '</div>'
        ).find('.inner').trigger('click');
        expect(this.clicks).to.be.eql( [ 'block1', 'block2', 'block-parent' ] );
    });

    it('block1 returns `false`: click is still handled by block2 but not by parent block', function() {
        this.returns['block1'] = false;
        this.setHTML(
            '<div data-nb="block-parent">' +
                '<div class="inner" data-nb="block1 block2"></div>' +
            '</div>'
        ).find('.inner').trigger('click');
        expect(this.clicks).to.be.eql( [ 'block1', 'block2' ] );
    });

    it('block2 returns `false`: click is handled by both block1 and block2 but not by parent block', function() {
        this.returns['block2'] = false;
        this.setHTML(
            '<div data-nb="block-parent">' +
                '<div class="inner" data-nb="block1 block2"></div>' +
            '</div>'
        ).find('.inner').trigger('click');
        expect(this.clicks).to.be.eql( [ 'block1', 'block2' ] );
    });

    it('blocks receive click in the same order they where specified in the `data-nb` attribute', function() {
        this.setHTML(
            '<div data-nb="block-parent">' +
                '<div class="inner" data-nb="block2 block1"></div>' +
            '</div>'
        ).find('.inner').trigger('click');
        expect(this.clicks).to.be.eql( [ 'block2', 'block1', 'block-parent' ] );
    });
});
