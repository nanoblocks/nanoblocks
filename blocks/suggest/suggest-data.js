(function($){

// ----------------------------------------------------------------------------------------------------------------- //

/**
 * Data source.
 */
var ds = function() {};

ds.prototype.init = function() {
    this.cache = {};
};

ds.prototype.has = function(key) {};

ds.prototype.get = function(key, callback) {};

ds.prototype.getSync = function(key) {};

ds.prototype.prepareData = function(data) { return data; };

// ----------------------------------------------------------------------------------------------------------------- //

/**
 * Ajax data source.
 * @param {Object} options.
 */
var ajaxDS = function(options) {
    this.super_.init();

    this.url = options.url;
    this.retry_count = (typeof options.retry_count === 'undefined') ? 3 : +options.retry_count;
    this.max_items = options.max_items;
    this.timeout = options.timeout;

    this.requests = {};
};

nb.inherit(ajaxDS, ds);

// ----------------------------------------------------------------------------------------------------------------- //

ajaxDS.prototype.get = function(req) {
    if (!(req.key in this.requests)) {
        this._createRequest(req);
    }
    this.requests[req.key].retry();
};

// ----------------------------------------------------------------------------------------------------------------- //

ajaxDS.prototype.getSync = function(key) {
    return this.cache[key];
};

// ----------------------------------------------------------------------------------------------------------------- //

ajaxDS.prototype.has = function(key) {
    return (key in this.cache);
};

// ----------------------------------------------------------------------------------------------------------------- //

/**
 * @param {{ key: string, onstart: function(), onsuccess: function(Object), onerror: function() }} req Request params.
 */
ajaxDS.prototype._createRequest = function(req) {
    var that = this;

    if (req.key in this.requests) {
        return;
    }

    var data = {
        'text': req.key,
        'max': this.max_items
    };

    var request = {
        "retries_left": this.retry_count,
        'retry': null
    };

    request.retry = function() {
        if (request.retries_left === 0) {
            req.onfail(); // Sorry, no more retries.
            delete that.requests[req.key]; // Clear old request. Maybe at some moment (later) we can get needed data.
            return;
        }

        req.onstart();

        $.ajax({
            'url': that.url,
            'type': 'GET',
            'data': data,
            'dataType': 'jsonp',
            'success': function(data) {
                var parsed_data = that.prepareData(data);
                that.cache[req.key] = parsed_data;
                req.onsuccess(parsed_data);
            },
            'error': function() {
                request.retry();
            },
            'timeout': that.timeout
        });

        request.retries_left--;
    };

    this.requests[req.key] = request;
};

// ----------------------------------------------------------------------------------------------------------------- //

nb.suggest = {};
nb.suggest.ajaxDS = ajaxDS;

}(jQuery));