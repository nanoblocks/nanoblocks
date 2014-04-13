describe('popup', function() {
    beforeEach(function() {
        this.$body = $(document.body);

        this.popupNode = $('<div class="popup _hidden" data-nb="popup">Hi, I am popup</div>').appendTo(document.body);
        this.parentPopupNode = $('<div class="popup _hidden" data-nb="popup">Hi, I am parent popup</div>').appendTo(document.body);
        this.childPopupNode = $('<div class="popup _hidden" data-nb="popup">Hi, I am child popup</div>').appendTo(document.body);

        this.popup = nb.block(this.popupNode[0]);
        this.parentPopup = nb.block(this.parentPopupNode[0]);
        this.childPopup = nb.block(this.childPopupNode[0]);
    });

    afterEach(function() {
        this.popup.destroy();
        this.parentPopup.destroy();
        this.childPopup.destroy();

        this.popupNode.remove();
        this.parentPopupNode.remove();
        this.childPopupNode.remove();
    });

    describe('single popup close', function() {

        it('esc must close it', function(done) {
            var that = this;
            this.popup.trigger('open', { where: document.body });

            this.$body.trigger($.Event('keydown', { keyCode: 27 }));

            setTimeout(function() {
                expect(that.popupNode.is(':visible')).to.eql(false);
                done();
            }, 10);
        });

    });

    describe('do not close if ignoreEsc specified', function() {

        it('esc should not close popup', function(done) {
            var that = this;
            this.popup.ignoreEsc = true;
            this.popup.trigger('open', { where: document.body });

            this.$body.trigger($.Event('keydown', { keyCode: 27 }));

            setTimeout(function() {
                expect(that.popupNode.is(':visible')).to.eql(true);
                done();
            }, 10);
        });

    });

    describe('close inner popup first', function() {

        it('ESC should close only child popup', function(done) {
            var that = this;
            this.parentPopup.trigger('open', { where: document.body });
            this.childPopup.trigger('open', { where: this.parentPopupNode, parent: this.parentPopup });

            this.$body.trigger($.Event('keydown', { keyCode: 27 }));

            setTimeout(function() {
                expect(that.parentPopupNode.is(':visible')).to.eql(true);
                expect(that.childPopupNode.is(':visible')).to.eql(false);
                done();
            }, 10);
        });

        it('next ESC should close parent popup', function(done) {
            var that = this;

            this.$body.trigger($.Event('keydown', { keyCode: 27 }));

            setTimeout(function() {
                expect(that.parentPopupNode.is(':visible')).to.eql(false);
                expect(that.childPopupNode.is(':visible')).to.eql(false);
                done();
            }, 10);
        });

    });

    describe('stop ESC keydown propagation if some popup closed', function() {

        it('ESC must be stopped', function(done) {
            var that = this;
            var evt = $.Event('keydown', { keyCode: 27 });

            this.popup.trigger('open', { where: document.body });

            this.$body.trigger(evt);

            setTimeout(function() {
                expect(evt.isImmediatePropagationStopped()).to.eql(true);
                expect(evt.isPropagationStopped()).to.eql(true);
                done();
            }, 10);
        });

        it('ESC should not be stopped if no popup was closed', function() {
            var that = this;
            var evt = $.Event('keydown', { keyCode: 27 });

            this.$body.trigger(evt);

            setTimeout(function() {
                expect(evt.isImmediatePropagationStopped()).to.eql(false);
                expect(evt.isPropagationStopped()).to.eql(false);
                done();
            }, 10);
        });

    });

});
